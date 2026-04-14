import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { email, token } = await req.json()
    
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      console.error('RESEND_API_KEY not set')
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
    }

    const verificationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://app.sup.date'}/auth/callback?token=${token}&next=/onboarding`

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: 'SUPDATE <noreply@sup.date>',
        to: [email],
        subject: 'Bitte bestätige deine E-Mail-Adresse',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; max-width: 500px; margin: 0 auto; padding: 2rem; background: #0d0d14; color: #ffffff; border-radius: 1rem;">
            <h1 style="font-size: 1.5rem; margin-bottom: 1rem;">Willkommen bei SUPDATE! 🚀</h1>
            <p style="color: #ccccdd; line-height: 1.6; margin-bottom: 1.5rem;">
              Bitte bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren.
            </p>
            <a href="${verificationUrl}" style="display: inline-block; background: #00d4ff; color: #000; font-weight: 700; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none;">
              E-Mail bestätigen →
            </a>
            <p style="color: #666680; font-size: 0.8rem; margin-top: 2rem;">
              Falls der Button nicht funktioniert, kopiere diesen Link:<br>
              <a href="${verificationUrl}" style="color: #00d4ff;">${verificationUrl}</a>
            </p>
            <p style="color: #666680; font-size: 0.8rem; margin-top: 1rem;">
              sup.date — Accountability für Gründer
            </p>
          </div>
        `,
      }),
    })

    if (!emailRes.ok) {
      const errText = await emailRes.text()
      console.error('Resend error:', errText)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
