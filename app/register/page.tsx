'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleGoogleSignup = async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein.')
      return
    }
    if (password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error?.includes('already registered')) {
          setError('Diese E-Mail ist bereits registriert. Melde dich stattdessen an.')
        } else {
          setError(data.error || 'Registrierung fehlgeschlagen')
        }
        setLoading(false)
        return
      }

      setSuccess(true)
    } catch (err) {
      setError('Netzwerkfehler. Bitte versuche es erneut.')
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    background: '#1a1a2e',
    color: '#ffffff',
    padding: '0.875rem 1rem',
    borderRadius: '0.5rem',
    border: '1px solid rgba(255,255,255,0.1)',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d0d14',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        {/* Logo */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{
            fontSize: '2.5rem',
            fontWeight: '800',
            letterSpacing: '-0.05em',
            color: '#ffffff',
          }}>
            sup<span style={{ color: '#00d4ff' }}>.</span>date
          </div>
          <p style={{
            marginTop: '0.75rem',
            color: '#8888aa',
            fontSize: '1rem',
          }}>
            Zeig auf. Schick dein Update. Oder steh zur Gruppe.
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#13131f',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '1rem',
          padding: '2rem',
        }}>
          {success ? (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.5rem' }}>
                Bestätigungsmail gesendet
              </h1>
              <p style={{ color: '#8888aa', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                Wir haben dir eine E-Mail an <strong style={{ color: '#00d4ff' }}>{email}</strong> geschickt.
                Klick auf den Link um dein Konto zu aktivieren.
              </p>
              <Link href="/login" style={{
                display: 'inline-block',
                color: '#00d4ff',
                textDecoration: 'none',
                fontWeight: '500',
                fontSize: '0.9rem',
              }}>
                ← Zurück zum Login
              </Link>
            </>
          ) : (
            <>
              <h1 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                marginBottom: '0.5rem',
                color: '#ffffff',
              }}>
                Konto erstellen
              </h1>
              <p style={{ color: '#8888aa', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Starte mit deiner ersten Accountability-Gruppe
              </p>

              {error && (
                <div style={{
                  background: 'rgba(255, 59, 59, 0.1)',
                  border: '1px solid rgba(255, 59, 59, 0.3)',
                  borderRadius: '0.5rem',
                  padding: '0.75rem 1rem',
                  marginBottom: '1.5rem',
                  color: '#ff3b3b',
                  fontSize: '0.85rem',
                }}>
                  {error}
                </div>
              )}

              {/* Google Signup */}
              <button
                onClick={handleGoogleSignup}
                disabled={loading}
                style={{
                  width: '100%',
                  background: loading ? '#1a1a2e' : '#ffffff',
                  color: '#000000',
                  fontWeight: '600',
                  padding: '0.875rem 1.5rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  fontSize: '1rem',
                }}
              >
                {loading ? (
                  <span style={{ color: '#8888aa' }}>Weiterleitung...</span>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Mit Google registrieren
                  </>
                )}
              </button>

              {/* Divider */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                margin: '1.5rem 0',
                gap: '1rem',
              }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                <span style={{ color: '#8888aa', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>oder</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
              </div>

              {/* Email/Password Form */}
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input
                  type="email"
                  placeholder="E-Mail-Adresse"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={inputStyle}
                />
                <input
                  type="password"
                  placeholder="Passwort (min. 6 Zeichen)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  style={inputStyle}
                />
                <input
                  type="password"
                  placeholder="Passwort bestätigen"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  style={inputStyle}
                />

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    background: loading ? '#1a1a2e' : '#00d4ff',
                    color: '#000000',
                    fontWeight: '600',
                    padding: '0.875rem 1.5rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '1rem',
                  }}
                >
                  {loading ? 'Wird erstellt...' : 'Konto erstellen'}
                </button>
              </form>

              {/* Link to Login */}
              <p style={{
                marginTop: '1.5rem',
                fontSize: '0.85rem',
                color: '#8888aa',
              }}>
                Schon ein Konto?{' '}
                <Link href="/login" style={{ color: '#00d4ff', textDecoration: 'none', fontWeight: '500' }}>
                  Anmelden
                </Link>
              </p>

              <p style={{
                marginTop: '1rem',
                fontSize: '0.75rem',
                color: '#8888aa',
                lineHeight: '1.5',
              }}>
                Mit der Registrierung stimmst du unseren Nutzungsbedingungen zu.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
