'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    goal: '',
    why: '',
    horizon: '',
    success_indicator: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.goal.trim()) {
      setError('Dein Ziel ist Pflicht.')
      return
    }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { error: dbError } = await supabase.from('user_profiles').upsert({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.email,
      goal: form.goal.trim(),
      why: form.why.trim() || null,
      horizon: form.horizon || null,
      success_indicator: form.success_indicator.trim() || null,
    })

    if (dbError) {
      setError('Fehler beim Speichern: ' + dbError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d0d14',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div style={{ width: '100%', maxWidth: '560px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '3rem',
            height: '3rem',
            borderRadius: '50%',
            background: 'rgba(0, 212, 255, 0.15)',
            marginBottom: '1rem',
          }}>
            <span style={{ fontSize: '1.5rem' }}>🎯</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ffffff', marginBottom: '0.5rem' }}>
            Dein Ziel
          </h1>
          <p style={{ color: '#8888aa', fontSize: '1rem' }}>
            Was willst du erreichen? Sei konkret.
          </p>
        </div>

        {/* Form */}
        <div style={{
          background: '#13131f',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '1rem',
          padding: '2rem',
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Goal */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#8888aa', marginBottom: '0.375rem' }}>
                  Mein Ziel <span style={{ color: '#00d4ff' }}>*</span>
                </label>
                <textarea
                  value={form.goal}
                  onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
                  placeholder="z.B. Ich will bis 30. Juni 2026 meinen ersten Kunden für SUPDATE gewinnen."
                  rows={3}
                  style={{
                    width: '100%',
                    background: '#1a1a2e',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '0.5rem',
                    padding: '0.75rem 1rem',
                    color: '#ffffff',
                    fontSize: '1rem',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                  onFocus={e => e.target.style.borderColor = '#00d4ff'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>

              {/* Why */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#8888aa', marginBottom: '0.375rem' }}>
                  Warum ist das wichtig?
                </label>
                <textarea
                  value={form.why}
                  onChange={e => setForm(f => ({ ...f, why: e.target.value }))}
                  placeholder="Was treibt dich an? Was verändert sich, wenn du es erreichst?"
                  rows={2}
                  style={{
                    width: '100%',
                    background: '#1a1a2e',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '0.5rem',
                    padding: '0.75rem 1rem',
                    color: '#ffffff',
                    fontSize: '1rem',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                  onFocus={e => e.target.style.borderColor = '#00d4ff'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>

              {/* Horizon */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#8888aa', marginBottom: '0.375rem' }}>
                  Bis wann?
                </label>
                <input
                  type="date"
                  value={form.horizon}
                  onChange={e => setForm(f => ({ ...f, horizon: e.target.value }))}
                  style={{
                    width: '100%',
                    background: '#1a1a2e',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '0.5rem',
                    padding: '0.75rem 1rem',
                    color: '#ffffff',
                    fontSize: '1rem',
                    outline: 'none',
                    colorScheme: 'dark',
                  }}
                  onFocus={e => e.target.style.borderColor = '#00d4ff'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>

              {/* Success indicator */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#8888aa', marginBottom: '0.375rem' }}>
                  Woran erkennst du Erfolg?
                </label>
                <input
                  type="text"
                  value={form.success_indicator}
                  onChange={e => setForm(f => ({ ...f, success_indicator: e.target.value }))}
                  placeholder="z.B. Erster zahlender Kunde, 1.000€ MRR, ..."
                  style={{
                    width: '100%',
                    background: '#1a1a2e',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '0.5rem',
                    padding: '0.75rem 1rem',
                    color: '#ffffff',
                    fontSize: '1rem',
                    outline: 'none',
                  }}
                  onFocus={e => e.target.style.borderColor = '#00d4ff'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>

              {error && (
                <p style={{ color: '#ff4444', fontSize: '0.875rem' }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  background: loading ? '#1a1a2e' : '#00d4ff',
                  color: loading ? '#8888aa' : '#000000',
                  fontWeight: '700',
                  padding: '0.875rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  transition: 'all 0.2s',
                }}
              >
                {loading ? 'Speichern...' : 'Ziel festlegen →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
