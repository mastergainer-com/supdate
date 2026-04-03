'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })

    setLoading(false)

    if (resetError) {
      setError(resetError.message)
      return
    }

    setSuccess(true)
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
                E-Mail gesendet
              </h1>
              <p style={{ color: '#8888aa', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                Falls ein Konto mit <strong style={{ color: '#00d4ff' }}>{email}</strong> existiert,
                erhältst du einen Link zum Zurücksetzen deines Passworts.
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
                Passwort zurücksetzen
              </h1>
              <p style={{ color: '#8888aa', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Gib deine E-Mail ein und wir schicken dir einen Reset-Link.
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

              <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input
                  type="email"
                  placeholder="E-Mail-Adresse"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
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
                  {loading ? 'Wird gesendet...' : 'Reset-Link senden'}
                </button>
              </form>

              <p style={{
                marginTop: '1.5rem',
                fontSize: '0.85rem',
                color: '#8888aa',
              }}>
                <Link href="/login" style={{ color: '#00d4ff', textDecoration: 'none', fontWeight: '500' }}>
                  ← Zurück zum Login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
