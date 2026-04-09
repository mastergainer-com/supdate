// Edge Function: Send Reminders
// Trigger: Cron (hourly) or HTTP POST
// Sends pending reminders (24h, 2h before deadline)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReminderResult {
  reminderId: string
  userId: string
  type: string
  channel: string
  status: 'sent' | 'failed' | 'skipped'
  error?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const results: ReminderResult[] = []
  const now = new Date()

  try {
    // Get pending reminders that are due
    const { data: pendingReminders, error: fetchError } = await supabase
      .from('reminders')
      .select(`
        id,
        user_id,
        group_id,
        reminder_type,
        channel,
        scheduled_at,
        user_profiles!inner(name, email, telegram_chat_id),
        groups!inner(name, deadline_day, deadline_time)
      `)
      .eq('status', 'pending')
      .lte('scheduled_at', now.toISOString())
      .limit(100)

    if (fetchError) throw fetchError
    if (!pendingReminders || pendingReminders.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No pending reminders' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    for (const reminder of pendingReminders) {
      try {
        // Check if user already submitted update
        const week = getISOWeek(now)
        const year = getISOYear(now)

        const { data: existingUpdate } = await supabase
          .from('updates')
          .select('id')
          .eq('user_id', reminder.user_id)
          .eq('group_id', reminder.group_id)
          .eq('week_number', week)
          .eq('year', year)
          .eq('status', 'submitted')
          .maybeSingle()

        if (existingUpdate) {
          // Skip - already submitted
          await supabase
            .from('reminders')
            .update({ status: 'skipped', error_message: 'Already submitted' })
            .eq('id', reminder.id)

          results.push({
            reminderId: reminder.id,
            userId: reminder.user_id,
            type: reminder.reminder_type,
            channel: reminder.channel,
            status: 'skipped',
          })
          continue
        }

        // Check if user is paused
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('pause_until')
          .eq('id', reminder.user_id)
          .single()

        if (profile?.pause_until && new Date(profile.pause_until) > now) {
          await supabase
            .from('reminders')
            .update({ status: 'skipped', error_message: 'User paused' })
            .eq('id', reminder.id)

          results.push({
            reminderId: reminder.id,
            userId: reminder.user_id,
            type: reminder.reminder_type,
            channel: reminder.channel,
            status: 'skipped',
          })
          continue
        }

        // Send reminder
        const userName = reminder.user_profiles?.name || 'du'
        const groupName = reminder.groups?.name || 'deiner Gruppe'
        const deadlineTime = reminder.groups?.deadline_time?.slice(0, 5) || '18:00'

        let sent = false

        if (reminder.channel === 'telegram' && reminder.user_profiles?.telegram_chat_id) {
          sent = await sendTelegramReminder(
            supabase,
            reminder.user_profiles.telegram_chat_id,
            reminder.reminder_type,
            userName,
            groupName,
            deadlineTime
          )
        } else if (reminder.channel === 'email') {
          sent = await sendEmailReminder(
            supabase,
            reminder.user_profiles?.email,
            reminder.reminder_type,
            userName,
            groupName,
            deadlineTime
          )
        }

        // Update reminder status
        await supabase
          .from('reminders')
          .update({
            status: sent ? 'sent' : 'failed',
            sent_at: sent ? now.toISOString() : null,
            error_message: sent ? null : 'Failed to send',
          })
          .eq('id', reminder.id)

        results.push({
          reminderId: reminder.id,
          userId: reminder.user_id,
          type: reminder.reminder_type,
          channel: reminder.channel,
          status: sent ? 'sent' : 'failed',
        })
      } catch (err) {
        // Update as failed
        await supabase
          .from('reminders')
          .update({ status: 'failed', error_message: err.message })
          .eq('id', reminder.id)

        results.push({
          reminderId: reminder.id,
          userId: reminder.user_id,
          type: reminder.reminder_type,
          channel: reminder.channel,
          status: 'failed',
          error: err.message,
        })
      }
    }

    return new Response(
      JSON.stringify({
        processed: results.length,
        sent: results.filter(r => r.status === 'sent').length,
        failed: results.filter(r => r.status === 'failed').length,
        skipped: results.filter(r => r.status === 'skipped').length,
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

// Send Telegram reminder
async function sendTelegramReminder(
  supabase: any,
  chatId: string,
  type: string,
  userName: string,
  groupName: string,
  deadlineTime: string
): Promise<boolean> {
  let message = ''

  if (type === '24h') {
    message = `⏰ <b>Noch 24 Stunden!</b>

Deine Deadline für <b>${groupName}</b> ist morgen um ${deadlineTime} Uhr.

✅ Liefere dein Update ein!`
  } else if (type === '2h') {
    message = `⚠️ <b>Letzte Chance!</b>

Nur noch 2 Stunden bis zur Deadline für <b>${groupName}</b>.

🚀 Schnell noch das Update abgeben!`
  } else if (type === 'missed') {
    message = `😬 <b>Deadline verpasst</b>

Du hast die Deadline für <b>${groupName}</b> verpasst.

💡 Tipp: Nächste Woche früher planen!`
  }

  try {
    const { error } = await supabase.functions.invoke('send-telegram-message', {
      body: { chatId, message, parseMode: 'HTML' }
    })
    return !error
  } catch {
    return false
  }
}

// Send Email reminder
async function sendEmailReminder(
  supabase: any,
  email: string,
  type: string,
  userName: string,
  groupName: string,
  deadlineTime: string
): Promise<boolean> {
  const siteUrl = Deno.env.get('SITE_URL') || 'https://sup.date'
  const resendKey = Deno.env.get('RESEND_API_KEY')

  if (!resendKey || !email) {
    console.log(`[EMAIL] Would send ${type} reminder to ${email}`)
    return true // Simulate success for testing
  }

  let subject = ''
  let html = ''

  if (type === '24h') {
    subject = `⏰ Noch 24h: Dein wöchentliches Update für ${groupName}`
    html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; max-width: 500px; margin: 0 auto; padding: 2rem; background: #0d0d14; color: #ffffff; border-radius: 1rem;">
      <h1 style="font-size: 1.5rem; margin-bottom: 1rem;">⏰ Noch 24 Stunden!</h1>
      <p style="color: #ccccdd; line-height: 1.6; margin-bottom: 1rem;">
        Hey ${userName},<br><br>
        deine Deadline für <strong style="color: #00d4ff;">${groupName}</strong> ist morgen um ${deadlineTime} Uhr.
      </p>
      <a href="${siteUrl}" style="display: inline-block; background: #00d4ff; color: #000; font-weight: 700; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none;">
        Update einreichen →
      </a>
    </div>`
  } else if (type === '2h') {
    subject = `⚠️ Letzte Chance: Nur noch 2 Stunden für ${groupName}!`
    html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; max-width: 500px; margin: 0 auto; padding: 2rem; background: #0d0d14; color: #ffffff; border-radius: 1rem;">
      <h1 style="font-size: 1.5rem; margin-bottom: 1rem;">⚠️ Letzte Chance!</h1>
      <p style="color: #ccccdd; line-height: 1.6; margin-bottom: 1rem;">
        Hey ${userName},<br><br>
        nur noch <strong style="color: #ff6b6b;">2 Stunden</strong> bis zur Deadline für <strong style="color: #00d4ff;">${groupName}</strong>.
      </p>
      <a href="${siteUrl}" style="display: inline-block; background: #ff6b6b; color: #fff; font-weight: 700; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none;">
        Sofort Update abgeben →
      </a>
    </div>`
  } else if (type === 'missed') {
    subject = `😬 Deadline verpasst — ${groupName}`
    html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; max-width: 500px; margin: 0 auto; padding: 2rem; background: #0d0d14; color: #ffffff; border-radius: 1rem;">
      <h1 style="font-size: 1.5rem; margin-bottom: 1rem;">😬 Deadline verpasst</h1>
      <p style="color: #ccccdd; line-height: 1.6; margin-bottom: 1rem;">
        Hey ${userName},<br><br>
        du hast die Deadline für <strong style="color: #00d4ff;">${groupName}</strong> verpasst.
      </p>
      <p style="color: #8888aa; line-height: 1.6; margin-bottom: 1.5rem;">
        💡 Tipp: Nächste Woche früher planen!
      </p>
      <a href="${siteUrl}" style="display: inline-block; background: #00d4ff; color: #000; font-weight: 700; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none;">
        Zum Dashboard →
      </a>
    </div>`
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: Deno.env.get('EMAIL_FROM') || 'SUPDATE <noreply@sup.date>',
        to: [email],
        subject,
        html,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

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
