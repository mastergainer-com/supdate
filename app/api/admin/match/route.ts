import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  // Check admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
  }

  const { userId, groupId } = await request.json()

  if (!userId || !groupId) {
    return NextResponse.json({ error: 'userId und groupId sind Pflicht' }, { status: 400 })
  }

  // Insert matching assignment
  const { error: assignError } = await supabase
    .from('matching_assignments')
    .upsert({
      user_id: userId,
      group_id: groupId,
      assigned_by: user.id,
      assigned_at: new Date().toISOString(),
      status: 'pending',
    })

  if (assignError) {
    return NextResponse.json({ error: assignError.message }, { status: 500 })
  }

  // Add to group_members
  const { error: memberError } = await supabase
    .from('group_members')
    .upsert({
      user_id: userId,
      group_id: groupId,
      role: 'member',
    })

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 })
  }

  // Get group name for notification
  const { data: group } = await supabase
    .from('groups')
    .select('name')
    .eq('id', groupId)
    .single()

  // Trigger email notification (fire & forget)
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (supabaseUrl && serviceKey) {
      fetch(`${supabaseUrl}/functions/v1/send-match-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          userId,
          groupId,
          groupName: group?.name || 'Deine Gruppe',
        }),
      }).catch(() => {
        // Notification failure is non-blocking
      })
    }
  } catch {
    // Notification failure is non-blocking
  }

  return NextResponse.json({ success: true })
}
