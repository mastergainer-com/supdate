// Edge Function: Schedule Reminders
// Trigger: Cron (daily) or HTTP POST
// Creates reminder entries for upcoming deadlines

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScheduleResult {
  groupId: string
  userId: string
  reminderType: string
  scheduledAt: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const results: ScheduleResult[] = []
  const now = new Date()

  try {
    // Get all active group memberships with group settings
    const { data: memberships, error: membershipError } = await supabase
      .from('group_members')
      .select(`
        user_id,
        group_id,
        groups!inner(id, name, deadline_day, deadline_time),
        user_profiles!inner(id, telegram_chat_id, email)
      `)
      .eq('status', 'active')

    if (membershipError) throw membershipError
    if (!memberships || memberships.length === 0) {
      return new Response(
        JSON.stringify({ scheduled: 0, message: 'No active memberships' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    for (const membership of memberships) {
      try {
        const group = membership.groups
        const profile = membership.user_profiles

        if (!group.deadline_day && group.deadline_day !== 0) continue

        // Calculate next deadline
        const deadline = calculateNextDeadline(group.deadline_day, group.deadline_time)
        if (!deadline) continue

        // Check if deadline is within next 48 hours
        const hoursUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)
        if (hoursUntil > 48) continue

        // Determine channel
        const channel = profile.telegram_chat_id ? 'telegram' : 'email'

        // Schedule 24h reminder if deadline is ~24h away
        if (hoursUntil >= 23 && hoursUntil <= 25) {
          const reminder24h = new Date(deadline.getTime() - 24 * 60 * 60 * 1000)
          
          // Check if already scheduled
          const { data: existing24h } = await supabase
            .from('reminders')
            .select('id')
            .eq('user_id', membership.user_id)
            .eq('group_id', membership.group_id)
            .eq('reminder_type', '24h')
            .eq('status', 'pending')
            .maybeSingle()

          if (!existing24h) {
            await supabase.from('reminders').insert({
              user_id: membership.user_id,
              group_id: membership.group_id,
              reminder_type: '24h',
              channel,
              scheduled_at: reminder24h.toISOString(),
            })

            results.push({
              groupId: membership.group_id,
              userId: membership.user_id,
              reminderType: '24h',
              scheduledAt: reminder24h.toISOString(),
            })
          }
        }

        // Schedule 2h reminder if deadline is ~2h away
        if (hoursUntil >= 1.5 && hoursUntil <= 2.5) {
          const reminder2h = new Date(deadline.getTime() - 2 * 60 * 60 * 1000)

          // Check if already scheduled
          const { data: existing2h } = await supabase
            .from('reminders')
            .select('id')
            .eq('user_id', membership.user_id)
            .eq('group_id', membership.group_id)
            .eq('reminder_type', '2h')
            .eq('status', 'pending')
            .maybeSingle()

          if (!existing2h) {
            await supabase.from('reminders').insert({
              user_id: membership.user_id,
              group_id: membership.group_id,
              reminder_type: '2h',
              channel,
              scheduled_at: reminder2h.toISOString(),
            })

            results.push({
              groupId: membership.group_id,
              userId: membership.user_id,
              reminderType: '2h',
              scheduledAt: reminder2h.toISOString(),
            })
          }
        }
      } catch (err) {
        console.error(`Error scheduling for user ${membership.user_id}:`, err)
      }
    }

    return new Response(
      JSON.stringify({
        scheduled: results.length,
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

// Calculate next deadline based on day and time
function calculateNextDeadline(dayOfWeek: number, timeStr: string): Date | null {
  const now = new Date()
  const [hours, minutes] = (timeStr || '18:00').split(':').map(Number)
  
  // Find next occurrence of this day
  const result = new Date(now)
  result.setHours(hours, minutes, 0, 0)
  
  const currentDay = result.getDay()
  let daysUntil = dayOfWeek - currentDay
  
  if (daysUntil < 0) {
    daysUntil += 7
  } else if (daysUntil === 0 && result <= now) {
    daysUntil = 7
  }
  
  result.setDate(result.getDate() + daysUntil)
  return result
}
