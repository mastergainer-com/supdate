'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { StepIndicator } from '@/components/onboarding/StepIndicator'

export default function OnboardingStep1() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    availability_hours_week: '',
    commitment_level: '' as '' | 'low' | 'medium' | 'high',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.commitment_level) {
      setError('Bitte wähle dein Commitment-Level.')
      return
    }
    if (!form.availability_hours_week || Number(form.availability_hours_week) < 1) {
      setError('Bitte gib deine Verfügbarkeit an (mind. 1h/Woche).')
      return
    }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const updates: Record<string, unknown> = {
      id: user.id,
      email: user.email,
      commitment_level: form.commitment_level,
      availability_hours_week: Number(form.availability_hours_week),
      onboarding_step: 1,
    }
    if (form.name.trim()) {
      updates.name = form.name.trim()
    }

    const { error: dbError } = await supabase.from('user_profiles').upsert(updates)
    if (dbError) {
      setError('Fehler beim Speichern: ' + dbError.message)
      setLoading(false)
      return
    }

    router.push('/onboarding/step-2')
  }

  const levels = [
    { value: 'low', label: 'Low', desc: '1–5h / Woche' },
    { value: 'medium', label: 'Medium', desc: '5–15h / Woche' },
    { value: 'high', label: 'High', desc: '15h+ / Woche' },
  ] as const

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: '560px' }}>
        <StepIndicator current={1} />

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '3rem', height: '3rem', borderRadius: '50%', background: 'rgba(0, 212, 255, 0.15)', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>👤</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ffffff', marginBottom: '0.5rem' }}>Quick Profile</h1>
          <p style={{ color: '#8888aa', fontSize: '1rem' }}>Sag uns kurz wer du bist und wie viel Zeit du hast.</p>
        </div>

        <div style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem', padding: '2rem' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#8888aa', marginBottom: '0.375rem' }}>
                  Name <span style={{ fontWeight: '400', color: '#666680' }}>(optional, falls noch nicht gesetzt)</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Dein Name"
                  className="input"
                />
              </div>

              {/* Verfügbarkeit */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#8888aa', marginBottom: '0.375rem' }}>
                  Verfügbarkeit <span style={{ color: '#00d4ff' }}>*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={form.availability_hours_week}
                    onChange={e => setForm(f => ({ ...f, availability_hours_week: e.target.value }))}
                    placeholder="z.B. 10"
                    className="input"
                    style={{ maxWidth: '120px' }}
                  />
                  <span style={{ color: '#8888aa', fontSize: '0.9rem' }}>Stunden / Woche</span>
                </div>
              </div>

              {/* Commitment Level */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#8888aa', marginBottom: '0.75rem' }}>
                  Commitment-Level <span style={{ color: '#00d4ff' }}>*</span>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {levels.map(level => (
                    <label
                      key={level.value}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.875rem 1rem',
                        background: form.commitment_level === level.value ? 'rgba(0,212,255,0.1)' : '#1a1a2e',
                        border: `1px solid ${form.commitment_level === level.value ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <input
                        type="radio"
                        name="commitment_level"
                        value={level.value}
                        checked={form.commitment_level === level.value}
                        onChange={e => setForm(f => ({ ...f, commitment_level: e.target.value as 'low' | 'medium' | 'high' }))}
                        style={{ accentColor: '#00d4ff' }}
                      />
                      <div>
                        <span style={{ color: '#ffffff', fontWeight: '600' }}>{level.label}</span>
                        <span style={{ color: '#8888aa', fontSize: '0.85rem', marginLeft: '0.5rem' }}>{level.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {error && <p style={{ color: '#ff4444', fontSize: '0.875rem' }}>{error}</p>}

              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Speichern...' : 'Weiter →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
