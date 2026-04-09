import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// POST /api/telegram/connect
// Connects user's Telegram account

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { telegramHandle } = await request.json()
    
    if (!telegramHandle) {
      return NextResponse.json({ error: 'Telegram handle required' }, { status: 400 })
    }
    
    // Clean handle (remove @ if present)
    const cleanHandle = telegramHandle.replace(/^@/, '')
    
    // Update profile
    const { error } = await supabase
      .from('user_profiles')
      .update({ telegram_handle: cleanHandle })
      .eq('id', user.id)
    
    if (error) {
      console.error('Error updating telegram handle:', error)
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Telegram handle saved. Starte den Bot mit /start um die Verbindung abzuschließen.'
    })
  } catch (err) {
    console.error('Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
