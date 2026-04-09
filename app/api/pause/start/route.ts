import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// POST /api/pause/start
// Start a 2-week pause

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if already paused
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('pause_until')
      .eq('id', user.id)
      .single()
    
    if (profile?.pause_until && new Date(profile.pause_until) > new Date()) {
      return NextResponse.json({
        error: 'Already paused',
        pauseUntil: profile.pause_until,
      }, { status: 400 })
    }
    
    // Set pause for 2 weeks
    const pauseUntil = new Date()
    pauseUntil.setDate(pauseUntil.getDate() + 14)
    
    const { error } = await supabase
      .from('user_profiles')
      .update({ pause_until: pauseUntil.toISOString() })
      .eq('id', user.id)
    
    if (error) {
      console.error('Error starting pause:', error)
      return NextResponse.json({ error: 'Failed to start pause' }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      pauseUntil: pauseUntil.toISOString(),
      message: `Pause started until ${pauseUntil.toLocaleDateString('de-DE')}`,
    })
  } catch (err) {
    console.error('Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
