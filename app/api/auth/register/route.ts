import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Create Supabase admin client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create user with email confirmation disabled (we'll send our own)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
      }
      console.error('Auth error:', authError)
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // Generate verification token
    const { data: tokenData, error: tokenError } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
    })

    if (tokenError) {
      console.error('Token error:', tokenError)
      return NextResponse.json({ error: 'Failed to generate verification link' }, { status: 500 })
    }

    // Extract token from URL
    const verificationUrl = tokenData.properties?.action_link
    if (!verificationUrl) {
      return NextResponse.json({ error: 'Failed to generate verification URL' }, { status: 500 })
    }

    // Send email via Resend
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      console.error('RESEND_API_KEY not set')
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
    }

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
      // Don't fail registration if email fails, just log it
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Registration successful. Please check your email.' 
    })

  } catch (err) {
    console.error('Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
