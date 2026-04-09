// Edge Function: Calculate Group Scores
// Trigger: Cron (weekly) or HTTP POST
// Calculates weekly scores for all groups

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScoreResult {
  groupId: string
  groupName: string
  week: number
  year: number
  totalScore: number
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const results: ScoreResult[] = []
  const now = new Date()
  const currentWeek = getISOWeek(now)
  const currentYear = getISOYear(now)
  
  // Calculate for previous week (last completed week)
  let targetWeek = currentWeek - 1
  let targetYear = currentYear
  if (targetWeek < 1) {
    targetWeek = 52
    targetYear = currentYear - 1
  }

  try {
    // Get all groups
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('id, name')

    if (groupsError) throw groupsError
    if (!groups || groups.length === 0) {
      return new Response(
        JSON.stringify({ calculated: 0, message: 'No groups found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    for (const group of groups) {
      try {
        // Get active members count
        const { data: members, error: membersError } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', group.id)
          .eq('status', 'active')

        if (membersError) throw membersError
        const memberCount = members?.length || 0
        if (memberCount === 0) continue

        // Get updates for target week
        const { data: updates, error: updatesError } = await supabase
          .from('updates')
          .select('user_id, status, delivered_at')
          .eq('group_id', group.id)
          .eq('week_number', targetWeek)
          .eq('year', targetYear)

        if (updatesError) throw updatesError

        const submittedCount = updates?.filter(u => u.status === 'submitted').length || 0
        
        // Calculate punctuality
        let onTimeCount = 0
        for (const update of (updates || [])) {
          if (update.status === 'submitted' && update.delivered_at) {
            // Use the database function to check deadline
            const { data: deadline } = await supabase.rpc('get_week_deadline', {
              p_group_id: group.id,
              p_week: targetWeek,
              p_year: targetYear,
            })
            
            if (deadline && new Date(update.delivered_at) <= new Date(deadline)) {
              onTimeCount++
            }
          }
        }

        // Get average streak of members
        const userIds = members?.map(m => m.user_id) || []
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('streak_count')
          .in('id', userIds)

        const avgStreak = profiles && profiles.length > 0
          ? profiles.reduce((sum, p) => sum + (p.streak_count || 0), 0) / profiles.length
          : 0

        // Calculate scores
        const completionRate = (submittedCount / memberCount) * 100
        const punctualityScore = submittedCount > 0 ? (onTimeCount / submittedCount) * 100 : 0
        
        // Weighted total score
        const totalScore = (completionRate * 0.5) + (avgStreak * 5) + (punctualityScore * 0.3)

        // Save to database
        const { error: insertError } = await supabase
          .from('group_scores')
          .upsert({
            group_id: group.id,
            week_number: targetWeek,
            year: targetYear,
            completion_rate: completionRate,
            avg_streak: avgStreak,
            punctuality_score: punctualityScore,
            total_score: totalScore,
            calculated_at: now.toISOString(),
          }, {
            onConflict: 'group_id,week_number,year'
          })

        if (insertError) throw insertError

        results.push({
          groupId: group.id,
          groupName: group.name,
          week: targetWeek,
          year: targetYear,
          totalScore: Math.round(totalScore * 100) / 100,
        })
      } catch (err) {
        console.error(`Error calculating score for group ${group.id}:`, err)
      }
    }

    return new Response(
      JSON.stringify({
        calculated: results.length,
        week: targetWeek,
        year: targetYear,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal error', details: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ISO week number
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

// ISO year
function getISOYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  return d.getUTCFullYear()
}
