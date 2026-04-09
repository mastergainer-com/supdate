// Edge Function: Process Offboarding
// Trigger: Cron (daily) or HTTP POST
// Checks for missed updates and triggers offboarding stages

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OffboardingResult {
  userId: string
  groupId: string
  stage: number
  action: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const results: OffboardingResult[] = []
  const errors: string[] = []

  try {
    // Get all active group memberships
    const { data: memberships, error: membershipError } = await supabase
      .from('group_members')
      .select('user_id, group_id')
      .eq('status', 'active')

    if (membershipError) throw membershipError
    if (!memberships || memberships.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, results: [], message: 'No active memberships' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get current week info
    const now = new Date()
    const currentWeek = getISOWeek(now)
    const currentYear = getISOYear(now)

    for (const membership of memberships) {
      try {
        // Check if user is paused
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('pause_until, telegram_chat_id, email, name')
          .eq('id', membership.user_id)
          .single()

        if (profile?.pause_until && new Date(profile.pause_until) > now) {
          continue // Skip paused users
        }

        // Get offboarding stage
        const stage = await getOffboardingStage(supabase, membership.user_id, membership.group_id)

        if (stage === 0) continue // User is up to date

        // Check if we already processed this stage
        const { data: existingLog } = await supabase
          .from('offboarding_log')
          .select('id')
          .eq('user_id', membership.user_id)
          .eq('group_id', membership.group_id)
          .eq('stage', stage)
          .gte('triggered_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .maybeSingle()

        if (existingLog) continue // Already processed this week

        // Process offboarding stage
        const result = await processStage(supabase, {
          userId: membership.user_id,
          groupId: membership.group_id,
          stage,
          profile,
        })

        results.push(result)
      } catch (err) {
        errors.push(`User ${membership.user_id}, Group ${membership.group_id}: ${err.message}`)
      }
    }

    return new Response(
      JSON.stringify({ 
        processed: results.length, 
        errors: errors.length > 0 ? errors : undefined,
        results 
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

// Get consecutive missed weeks
async function getOffboardingStage(supabase: any, userId: string, groupId: string): Promise<number> {
  const now = new Date()
  let consecutiveMissed = 0

  for (let i = 0; i < 3; i++) {
    const checkDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
    const week = getISOWeek(checkDate)
    const year = getISOYear(checkDate)

    const { data: update } = await supabase
      .from('updates')
      .select('id')
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .eq('week_number', week)
      .eq('year', year)
      .eq('status', 'submitted')
      .maybeSingle()

    if (update) break
    consecutiveMissed++
  }

  return consecutiveMissed
}

// Process offboarding stage
async function processStage(
  supabase: any,
  { userId, groupId, stage, profile }: { userId: string; groupId: string; stage: number; profile: any }
): Promise<OffboardingResult> {
  // Get group info
  const { data: group } = await supabase
    .from('groups')
    .select('name')
    .eq('id', groupId)
    .single()

  // Log the offboarding event
  await supabase.from('offboarding_log').insert({
    user_id: userId,
    group_id: groupId,
    stage,
    triggered_by: 'system',
  })

  // Send notification based on stage
  if (stage === 1) {
    await sendNudge(supabase, profile, group.name)
    return { userId, groupId, stage, action: 'nudge_sent' }
  } else if (stage === 2) {
    await sendWarning(supabase, profile, group.name)
    return { userId, groupId, stage, action: 'warning_sent' }
  } else if (stage === 3) {
    await performSoftRemove(supabase, userId, groupId, profile, group.name)
    return { userId, groupId, stage, action: 'soft_removed' }
  }

  return { userId, groupId, stage, action: 'unknown' }
}

// Send Stage 1: Nudge
async function sendNudge(supabase: any, profile: any, groupName: string) {
  const message = `Hey ${profile.name || 'du'} 👋

Du hast diese Woche kein Update in "${groupName}" abgegeben. Alles okay?

🌴 *Brauchst du eine Pause?*
Du kannst bis zu 2 Wochen pausieren — ohne Strike.

👉 Schreib mir /pause um eine Pause zu starten`

  if (profile.telegram_chat_id) {
    await sendTelegramMessage(supabase, profile.telegram_chat_id, message)
  }

  // Also send email
  await sendEmailReminder(supabase, profile, 'nudge', groupName)
}

// Send Stage 2: Warning
async function sendWarning(supabase: any, profile: any, groupName: string) {
  const message = `⚠️ *Wichtige Nachricht*

Das war dein 2. verpasstes Update in Folge in "${groupName}".

Beim nächsten Mal wirst du aus der Gruppe entfernt.

💡 *Optionen:*
• Schreib /pause für 2 Wochen Pause
• Update nachreichen (wenn noch möglich)
• Gruppe verlassen`;

  if (profile.telegram_chat_id) {
    await sendTelegramMessage(supabase, profile.telegram_chat_id, message)
  }

  // Always send email for stage 2
  await sendEmailReminder(supabase, profile, 'warning', groupName)
}

// Perform Stage 3: Soft Remove
async function performSoftRemove(supabase: any, userId: string, groupId: string, profile: any, groupName: string) {
  // Remove from group
  await supabase
    .from('group_members')
    .update({ status: 'removed', left_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('group_id', groupId)

  // Reset streak
  await supabase
    .from('user_profiles')
    .update({ streak_count: 0 })
    .eq('id', userId)

  // Send email notification
  const siteUrl = Deno.env.get('SITE_URL') || 'https://sup.date'
  const emailBody = `Hey ${profile.name || 'du'},

du wurdest aus der Gruppe "${groupName}" entfernt, da du 3 Wochen in Folge kein Update abgegeben hast.

**Was bedeutet das?**
• Dein Account bleibt aktiv
• Du kannst dich jederzeit einer neuen Gruppe anschließen
• Deine Streaks wurden zurückgesetzt

**Neu starten:**
${siteUrl}/onboarding

Bei Fragen antworte einfach auf diese E-Mail.`;

  await sendEmail(supabase, profile.email, 'Du wurdest aus deiner Gruppe entfernt', emailBody)
}

// Helper: Send Telegram message via Edge Function
async function sendTelegramMessage(supabase: any, chatId: string, message: string) {
  try {
    await supabase.functions.invoke('send-telegram-message', {
      body: { chatId, message, parseMode: 'Markdown' }
    })
  } catch (err) {
    console.error('Failed to send Telegram message:', err)
  }
}

// Helper: Send email reminder
async function sendEmailReminder(supabase: any, profile: any, type: string, groupName: string) {
  const siteUrl = Deno.env.get('SITE_URL') || 'https://sup.date'
  
  let subject = ''
  let body = ''

  if (type === 'nudge') {
    subject = '👋 Update verpasst — alles okay?'
    body = `Hey ${profile.name || 'du'},

du hast diese Woche kein Update in "${groupName}" abgegeben.

**Brauchst du eine Pause?**
Du kannst bis zu 2 Wochen pausieren — ohne Strike.

**Deine Optionen:**
• [Update nachreichen](${siteUrl})
• Eine Pause starten (über Telegram @SUPDATE_Reminder_Bot)
• [Gruppe verlassen](${siteUrl}/groups)

Bei Fragen einfach antworten.`
  } else if (type === 'warning') {
    subject = '⚠️ Letzte Chance: 2. verpasstes Update'
    body = `Hey ${profile.name || 'du'},

das war dein 2. verpasstes Update in Folge in "${groupName}".

**Beim nächsten Mal wirst du aus der Gruppe entfernt.**

**Deine Optionen:**
• [Sofort Update abgeben](${siteUrl})
• 2 Wochen Pause starten (über Telegram @SUPDATE_Reminder_Bot)
• [Gruppe verlassen](${siteUrl}/groups)

Nutze eine der Optionen, um in der Gruppe zu bleiben.`
  }

  await sendEmail(supabase, profile.email, subject, body)
}

// Helper: Send email via Resend
async function sendEmail(supabase: any, to: string, subject: string, body: string) {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    console.log(`[EMAIL] Would send to ${to}: ${subject}`)
    return
  }

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: Deno.env.get('EMAIL_FROM') || 'SUPDATE <noreply@sup.date>',
        to: [to],
        subject,
        text: body,
      }),
    })
  } catch (err) {
    console.error('Failed to send email:', err)
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
