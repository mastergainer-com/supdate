import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// POST /api/pause/end
// End pause early

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { error } = await supabase
      .from('user_profiles')
      .update({ pause_until: null })
      .eq('id', user.id)
    
    if (error) {
      console.error('Error ending pause:', error)
      return NextResponse.json({ error: 'Failed to end pause' }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Pause ended. Welcome back!',
    })
  } catch (err) {
    console.error('Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
