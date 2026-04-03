// Deno edge function: sends match notification email
// Payload: { userId, groupId, groupName }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, groupId, groupName } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('name, email')
      .eq('id', userId)
      .single()

    if (!profile?.email) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update notified_at
    await supabase
      .from('matching_assignments')
      .update({ notified_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('group_id', groupId)

    const userName = profile.name || 'Gründer:in'
    const groupLink = `${Deno.env.get('SITE_URL') || 'https://sup.date'}/groups/${groupId}`

    const resendKey = Deno.env.get('RESEND_API_KEY')

    if (resendKey) {
      // Send via Resend
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: Deno.env.get('EMAIL_FROM') || 'SUPDATE <noreply@sup.date>',
          to: [profile.email],
          subject: 'Deine Gruppe ist ready — los geht\'s! 🚀',
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; max-width: 500px; margin: 0 auto; padding: 2rem; background: #0d0d14; color: #ffffff; border-radius: 1rem;">
              <h1 style="font-size: 1.5rem; margin-bottom: 1rem;">Hey ${userName}! 👋</h1>
              <p style="color: #ccccdd; line-height: 1.6; margin-bottom: 1rem;">
                Deine Accountability-Gruppe <strong style="color: #00d4ff;">${groupName}</strong> ist ready.
              </p>
              <p style="color: #ccccdd; line-height: 1.6; margin-bottom: 1.5rem;">
                Ab jetzt zählt's — liefere dein erstes wöchentliches Update und zeig deiner Gruppe, woran du arbeitest.
              </p>
              <a href="${groupLink}" style="display: inline-block; background: #00d4ff; color: #000; font-weight: 700; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none;">
                Zur Gruppe →
              </a>
              <p style="color: #666680; font-size: 0.8rem; margin-top: 2rem;">
                sup.date — Accountability für Gründer
              </p>
            </div>
          `,
        }),
      })

      if (!emailRes.ok) {
        const errText = await emailRes.text()
        console.error('Resend error:', errText)
      }
    } else {
      // Fallback: log (Supabase built-in SMTP not available in edge functions)
      console.log(`[NOTIFICATION] Would send email to ${profile.email}: Gruppe "${groupName}" zugewiesen. Link: ${groupLink}`)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
