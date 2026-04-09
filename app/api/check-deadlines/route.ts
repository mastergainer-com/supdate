import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// This endpoint is called by a cron job to check for missed updates
// and mark them accordingly. Can also be triggered manually.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

function getWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

export async function POST(request: Request) {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }
  
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const currentDay = now.getDay()
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  const weekStart = getWeekStart()

  // Get all groups where deadline has passed
  const { data: groups, error: groupsError } = await supabase
    .from('groups')
    .select('id, name, deadline_day, deadline_time')

  if (groupsError || !groups) {
    return NextResponse.json({ error: 'Failed to load groups', details: groupsError?.message }, { status: 500 })
  }

  const results: { group: string; missed: string[]; alerted: number }[] = []

  for (const group of groups) {
    // Check if deadline has passed for this group
    if (group.deadline_day === null) continue

    let deadlinePassed = false
    if (currentDay === group.deadline_day) {
      const deadlineTime = group.deadline_time?.slice(0, 5) || '18:00'
      deadlinePassed = currentTime > deadlineTime
    } else {
      let daysSince = currentDay - group.deadline_day
      if (daysSince < 0) daysSince += 7
      // Only mark missed within 24h after deadline (avoid re-marking)
      deadlinePassed = daysSince === 1 || (daysSince === 0 && currentDay !== group.deadline_day)
    }

    if (!deadlinePassed) continue

    // Get all active members
    const { data: members } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', group.id)
      .eq('status', 'active')

    if (!members || members.length === 0) continue

    // Get updates submitted for this week
    const { data: submittedUpdates } = await supabase
      .from('weekly_updates')
      .select('user_id')
      .eq('group_id', group.id)
      .eq('week_start', weekStart)

    const submittedIds = new Set(submittedUpdates?.map(u => u.user_id) || [])
    const missedMembers = members.filter(m => !submittedIds.has(m.user_id))

    // Create "missed" entries for members who didn't submit
    for (const member of missedMembers) {
      // Check if we already created a missed entry
      const { data: existing } = await supabase
        .from('weekly_updates')
        .select('id')
        .eq('group_id', group.id)
        .eq('user_id', member.user_id)
        .eq('week_start', weekStart)
        .single()

      if (!existing) {
        await supabase
          .from('weekly_updates')
          .insert({
            group_id: group.id,
            user_id: member.user_id,
            week_start: weekStart,
            last_week: '',
            next_week: '',
            status: 'missed',
            submitted_at: new Date().toISOString(),
          })
      }
    }

    if (missedMembers.length > 0) {
      // Load profiles for notification
      const { data: missedProfiles } = await supabase
        .from('user_profiles')
        .select('id, name, email')
        .in('id', missedMembers.map(m => m.user_id))

      results.push({
        group: group.name,
        missed: missedProfiles?.map(p => p.name || p.email || p.id) || [],
        alerted: missedMembers.length,
      })
    }
  }

  return NextResponse.json({
    checked_at: now.toISOString(),
    week_start: weekStart,
    results,
  })
}

// GET for health check
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'check-deadlines' })
}
