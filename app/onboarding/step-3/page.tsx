'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { StepIndicator } from '@/components/onboarding/StepIndicator'

const COMMITMENTS = [
  { key: 'weekly_update', label: 'Ich liefere jede Woche ein Update, egal wie kurz' },
  { key: 'miss_policy', label: 'Ich akzeptiere Rauswurf nach 3 verpassten Updates' },
  { key: 'worker_not_tourist', label: 'Ich bin hier zum Arbeiten, nicht zum Zuschauen' },
] as const

export default function OnboardingStep3() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [videoLink, setVideoLink] = useState('')
  const [checks, setChecks] = useState<Record<string, boolean>>({
    weekly_update: false,
    miss_policy: false,
    worker_not_tourist: false,
  })

  const allChecked = Object.values(checks).every(Boolean)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!allChecked) {
      setError('Bitte bestätige alle drei Commitments.')
      return
    }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Save commitments
    const now = new Date().toISOString()
    for (const c of COMMITMENTS) {
      const { error: cErr } = await supabase.from('onboarding_commitments').upsert({
        user_id: user.id,
        item_key: c.key,
        confirmed: true,
        confirmed_at: now,
      })
      if (cErr) {
        setError('Fehler beim Speichern: ' + cErr.message)
        setLoading(false)
        return
      }
    }

    // Update profile
    const updates: Record<string, unknown> = {
      id: user.id,
      onboarding_step: 3,
      commitment_confirmed: true,
      onboarding_completed_at: now,
    }
    if (videoLink.trim()) {
      updates.video_link = videoLink.trim()
    }

    const { error: dbError } = await supabase.from('user_profiles').upsert(updates)
    if (dbError) {
      setError('Fehler beim Speichern: ' + dbError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: '560px' }}>
        <StepIndicator current={3} />

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '3rem', height: '3rem', borderRadius: '50%', background: 'rgba(0, 212, 255, 0.15)', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🤝</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ffffff', marginBottom: '0.5rem' }}>Commitment</h1>
          <p style={{ color: '#8888aa', fontSize: '1rem' }}>Letzer Schritt — zeig dass du es ernst meinst.</p>
        </div>

        <div style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem', padding: '2rem' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Video Link */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#8888aa', marginBottom: '0.375rem' }}>
                  Zeig uns kurz wer du bist{' '}
                  <span style={{ fontWeight: '400', color: '#666680' }}>(optional)</span>
                </label>
                <p style={{ fontSize: '0.8rem', color: '#666680', marginBottom: '0.5rem', lineHeight: '1.4' }}>
                  Loom, YouTube, was auch immer — ein kurzes Video oder Audio reicht.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '0 1rem' }}>
                  <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>🎬</span>
                  <input
                    type="url"
                    value={videoLink}
                    onChange={e => setVideoLink(e.target.value)}
                    placeholder="https://www.loom.com/share/..."
                    style={{ width: '100%', background: 'transparent', border: 'none', padding: '0.75rem 0', color: '#ffffff', fontSize: '1rem', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Commitments */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#8888aa', marginBottom: '0.75rem' }}>
                  Pflicht-Commitments <span style={{ color: '#00d4ff' }}>*</span>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {COMMITMENTS.map(c => (
                    <label
                      key={c.key}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        padding: '0.875rem 1rem',
                        background: checks[c.key] ? 'rgba(0,200,100,0.08)' : '#1a1a2e',
                        border: `1px solid ${checks[c.key] ? 'rgba(0,200,100,0.3)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checks[c.key]}
                        onChange={e => setChecks(prev => ({ ...prev, [c.key]: e.target.checked }))}
                        style={{ accentColor: '#00c864', marginTop: '0.15rem', flexShrink: 0 }}
                      />
                      <span style={{ color: checks[c.key] ? '#ffffff' : '#8888aa', fontSize: '0.95rem', lineHeight: '1.4' }}>
                        {c.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {error && <p style={{ color: '#ff4444', fontSize: '0.875rem' }}>{error}</p>}

              <button
                type="submit"
                disabled={loading || !allChecked}
                className="btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  opacity: loading || !allChecked ? 0.5 : 1,
                  cursor: loading || !allChecked ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Speichern...' : 'Onboarding abschließen ✓'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
