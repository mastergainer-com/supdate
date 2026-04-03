'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [ready, setReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Supabase automatically picks up the recovery token from the URL hash
    const supabase = createClient()
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    // Also set ready after a short delay in case event already fired
    setTimeout(() => setReady(true), 1000)
  }, [])

  const handleUpdate = async (e: React.FormEvent) => {
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

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    })

    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/dashboard'), 2000)
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

        <div style={{
          background: '#13131f',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '1rem',
          padding: '2rem',
        }}>
          {success ? (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.5rem' }}>
                Passwort geändert
              </h1>
              <p style={{ color: '#8888aa', fontSize: '0.9rem' }}>
                Du wirst zum Dashboard weitergeleitet...
              </p>
            </>
          ) : (
            <>
              <h1 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                marginBottom: '0.5rem',
                color: '#ffffff',
              }}>
                Neues Passwort setzen
              </h1>
              <p style={{ color: '#8888aa', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Wähle ein neues Passwort für dein Konto.
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

              <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input
                  type="password"
                  placeholder="Neues Passwort (min. 6 Zeichen)"
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
                  disabled={loading || !ready}
                  style={{
                    width: '100%',
                    background: (loading || !ready) ? '#1a1a2e' : '#00d4ff',
                    color: '#000000',
                    fontWeight: '600',
                    padding: '0.875rem 1.5rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    cursor: (loading || !ready) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '1rem',
                  }}
                >
                  {loading ? 'Wird gespeichert...' : 'Passwort ändern'}
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
