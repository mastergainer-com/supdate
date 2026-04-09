import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// Telegram Bot Webhook Handler
// Receives messages from Telegram and processes commands

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  
  try {
    const update = await request.json()
    
    // Handle message
    if (update.message) {
      const { chat, text, from } = update.message
      const chatId = chat.id.toString()
      const command = text?.toLowerCase().trim()
      
      // Find user by telegram_chat_id
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, name, pause_until')
        .eq('telegram_chat_id', chatId)
        .single()
      
      if (!profile) {
        // User not connected yet
        await sendTelegramMessage(chatId, 
          `👋 Willkommen bei SUPDATE!\n\n` +
          `Ich bin dein Reminder-Bot für wöchentliche Updates.\n\n` +
          `🔌 *Verbindung nötig*\n` +
          `Gehe in deine SUPDATE-Einstellungen und verbinde deinen Telegram-Account.`
        )
        return NextResponse.json({ ok: true })
      }
      
      // Process commands
      switch (command) {
        case '/start':
          await sendTelegramMessage(chatId,
            `👋 Hey ${profile.name || 'du'}!\n\n` +
            `Ich schicke dir Erinnerungen für deine wöchentlichen Updates.\n\n` +
            `*Verfügbare Befehle:*\n` +
            `/pause — 2 Wochen Pause starten\n` +
            `/resume — Pause beenden\n` +
            `/status — Deinen Status checken`
          )
          break
          
        case '/pause':
          const pauseResult = await handlePause(supabase, profile.id, chatId)
          await sendTelegramMessage(chatId, pauseResult.message)
          break
          
        case '/resume':
          const resumeResult = await handleResume(supabase, profile.id, chatId)
          await sendTelegramMessage(chatId, resumeResult.message)
          break
          
        case '/status':
          const statusResult = await handleStatus(supabase, profile.id, chatId)
          await sendTelegramMessage(chatId, statusResult.message)
          break
          
        default:
          await sendTelegramMessage(chatId,
            `❓ Unbekannter Befehl.\n\n` +
            `Verfügbar:\n` +
            `/pause, /resume, /status`
          )
      }
    }
    
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Telegram webhook error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// Handle /pause command
async function handlePause(supabase: any, userId: string, chatId: string) {
  // Check if already paused
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('pause_until')
    .eq('id', userId)
    .single()
  
  if (profile?.pause_until && new Date(profile.pause_until) > new Date()) {
    const until = new Date(profile.pause_until).toLocaleDateString('de-DE')
    return {
      message: `🌴 Du bist bereits in Pause bis *${until}*.\n\n` +
                `Nutze /resume um früher zurückzukommen.`
    }
  }
  
  // Set pause for 2 weeks
  const pauseUntil = new Date()
  pauseUntil.setDate(pauseUntil.getDate() + 14)
  
  const { error } = await supabase
    .from('user_profiles')
    .update({ pause_until: pauseUntil.toISOString() })
    .eq('id', userId)
  
  if (error) {
    return { message: '❌ Fehler beim Pausieren. Bitte versuche es später.' }
  }
  
  return {
    message: `🌴 *Pause aktiviert!*\n\n` +
              `Du bist bis *${pauseUntil.toLocaleDateString('de-DE')}* in Pause.\n\n` +
              `✅ Keine Strikes in dieser Zeit\n` +
              `✅ Keine Reminder\n` +
              `✅ Automatische Wiederaufnahme`
  }
}

// Handle /resume command
async function handleResume(supabase: any, userId: string, chatId: string) {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('pause_until')
    .eq('id', userId)
    .single()
  
  if (!profile?.pause_until || new Date(profile.pause_until) <= new Date()) {
    return { message: `✅ Du bist nicht in Pause. Alles läuft normal.` }
  }
  
  const { error } = await supabase
    .from('user_profiles')
    .update({ pause_until: null })
    .eq('id', userId)
  
  if (error) {
    return { message: '❌ Fehler. Bitte versuche es später.' }
  }
  
  return {
    message: `🚀 *Willkommen zurück!*\n\n` +
              `Deine Pause wurde beendet.\n` +
              `Die nächste Deadline gilt wieder für dich.`
  }
}

// Handle /status command
async function handleStatus(supabase: any, userId: string, chatId: string) {
  // Get profile with streak and groups
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('streak_count, pause_until, total_delivered, total_missed')
    .eq('id', userId)
    .single()
  
  const { data: groups } = await supabase
    .from('group_members')
    .select('groups(name)')
    .eq('user_id', userId)
    .eq('status', 'active')
  
  const isPaused = profile?.pause_until && new Date(profile.pause_until) > new Date()
  const groupNames = groups?.map((g: any) => g.groups?.name).filter(Boolean) || []
  
  let message = `📊 *Dein Status*\n\n`
  
  if (isPaused) {
    const until = new Date(profile.pause_until!).toLocaleDateString('de-DE')
    message += `🌴 *In Pause* bis ${until}\n\n`
  } else {
    message += `🔥 *Streak:* ${profile?.streak_count || 0} Wochen\n`
    message += `📈 *Updates:* ${profile?.total_delivered || 0} geliefert\n`
    message += `📉 *Verpasst:* ${profile?.total_missed || 0}\n\n`
  }
  
  if (groupNames.length > 0) {
    message += `👥 *Gruppen:*\n${groupNames.map((g: string) => `• ${g}`).join('\n')}`
  }
  
  return { message }
}

// Helper: Send Telegram message
async function sendTelegramMessage(chatId: string, message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) {
    console.log(`[TELEGRAM] Would send to ${chatId}: ${message}`)
    return
  }
  
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    })
  } catch (err) {
    console.error('Failed to send Telegram message:', err)
  }
}
