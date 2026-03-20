'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const DAY_OPTIONS = [
  { value: 1, label: 'Montag' },
  { value: 2, label: 'Dienstag' },
  { value: 3, label: 'Mittwoch' },
  { value: 4, label: 'Donnerstag' },
  { value: 5, label: 'Freitag' },
  { value: 6, label: 'Samstag' },
  { value: 0, label: 'Sonntag' },
]

const TIME_OPTIONS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00',
]

const inputStyle = {
  width: '100%',
  background: '#1a1a2e',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '0.5rem',
  padding: '0.75rem 1rem',
  color: '#ffffff',
  fontSize: '1rem',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box' as const,
}

export default function NewGroupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    description: '',
    deadline_day: '5',
    deadline_time: '18:00',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Name ist Pflicht.')
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

    // Create group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: form.name.trim(),
        description: form.description.trim() || null,
        deadline_day: parseInt(form.deadline_day),
        deadline_time: form.deadline_time + ':00',
        created_by: user.id,
      })
      .select()
      .single()

    if (groupError || !group) {
      setError('Fehler beim Erstellen: ' + (groupError?.message || 'Unbekannt'))
      setLoading(false)
      return
    }

    // Add creator as admin member
    await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: user.id,
      role: 'admin',
      status: 'active',
    })

    router.push(`/groups/${group.id}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d14' }}>
      {/* Navbar */}
      <nav style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '1rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: '1100px',
        margin: '0 auto',
      }}>
        <Link href="/dashboard" style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff', textDecoration: 'none' }}>
          sup<span style={{ color: '#00d4ff' }}>.</span>date
        </Link>
        <Link href="/dashboard" style={{ color: '#8888aa', fontSize: '0.875rem', textDecoration: 'none' }}>
          ← Dashboard
        </Link>
      </nav>

      <main style={{ maxWidth: '560px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ffffff', marginBottom: '0.5rem' }}>
            Neue Gruppe
          </h1>
          <p style={{ color: '#8888aa' }}>
            Erstelle eine Accountability-Gruppe und lade andere ein.
          </p>
        </div>

        <div style={{
          background: '#13131f',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '1rem',
          padding: '2rem',
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#8888aa', marginBottom: '0.375rem' }}>
                  Name <span style={{ color: '#00d4ff' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="z.B. Startup-Gründer Q2 2026"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#00d4ff'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#8888aa', marginBottom: '0.375rem' }}>
                  Beschreibung
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Worum geht es in dieser Gruppe?"
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  onFocus={e => e.target.style.borderColor = '#00d4ff'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>

              {/* Deadline day */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#8888aa', marginBottom: '0.375rem' }}>
                  Update-Deadline — Wochentag
                </label>
                <select
                  value={form.deadline_day}
                  onChange={e => setForm(f => ({ ...f, deadline_day: e.target.value }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  onFocus={e => e.target.style.borderColor = '#00d4ff'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                >
                  {DAY_OPTIONS.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              {/* Deadline time */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#8888aa', marginBottom: '0.375rem' }}>
                  Update-Deadline — Uhrzeit
                </label>
                <select
                  value={form.deadline_time}
                  onChange={e => setForm(f => ({ ...f, deadline_time: e.target.value }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  onFocus={e => e.target.style.borderColor = '#00d4ff'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                >
                  {TIME_OPTIONS.map(t => (
                    <option key={t} value={t}>{t} Uhr</option>
                  ))}
                </select>
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
                }}
              >
                {loading ? 'Erstelle Gruppe...' : 'Gruppe erstellen →'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
