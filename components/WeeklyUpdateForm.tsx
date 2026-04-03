'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Props {
  groupId: string
  userId: string
  weekStart: string // YYYY-MM-DD
  existingUpdate?: {
    id: string
    last_week: string
    next_week: string
    blockers: string | null
  } | null
  deadlinePassed: boolean
}

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
  resize: 'vertical' as const,
}

export function WeeklyUpdateForm({ groupId, userId, weekStart, existingUpdate, deadlinePassed }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    last_week: existingUpdate?.last_week || '',
    next_week: existingUpdate?.next_week || '',
    blockers: existingUpdate?.blockers || '',
  })

  const isEdit = !!existingUpdate

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.last_week.trim() || !form.next_week.trim()) {
      setError('Die ersten beiden Felder sind Pflicht.')
      return
    }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const status = deadlinePassed ? 'late' : 'on_time'

    if (isEdit) {
      const { error: dbError } = await supabase
        .from('weekly_updates')
        .update({
          last_week: form.last_week.trim(),
          next_week: form.next_week.trim(),
          blockers: form.blockers.trim() || null,
          status: existingUpdate!.id ? undefined : status, // don't change status on edit
        })
        .eq('id', existingUpdate!.id)

      if (dbError) {
        setError('Fehler: ' + dbError.message)
        setLoading(false)
        return
      }
    } else {
      const { error: dbError } = await supabase
        .from('weekly_updates')
        .insert({
          group_id: groupId,
          user_id: userId,
          week_start: weekStart,
          last_week: form.last_week.trim(),
          next_week: form.next_week.trim(),
          blockers: form.blockers.trim() || null,
          status,
          submitted_at: new Date().toISOString(),
        })

      if (dbError) {
        if (dbError.message.includes('duplicate') || dbError.message.includes('unique')) {
          setError('Du hast diese Woche schon ein Update abgegeben.')
        } else {
          setError('Fehler: ' + dbError.message)
        }
        setLoading(false)
        return
      }
    }

    setSuccess(true)
    setTimeout(() => router.refresh(), 500)
  }

  if (success) {
    return (
      <div style={{
        background: 'rgba(0, 212, 255, 0.08)',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        textAlign: 'center',
      }}>
        <span style={{ fontSize: '2rem' }}>✅</span>
        <p style={{ color: '#00d4ff', fontWeight: '600', marginTop: '0.5rem' }}>
          {isEdit ? 'Update aktualisiert!' : 'Update abgeschickt!'}
        </p>
        {deadlinePassed && !isEdit && (
          <p style={{ color: '#ffaa00', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            ⚠️ Verspätet eingereicht
          </p>
        )}
      </div>
    )
  }

  return (
    <div style={{
      background: '#13131f',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '1rem',
      padding: '1.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <span style={{ fontSize: '1.25rem' }}>📝</span>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff' }}>
          {isEdit ? 'Update bearbeiten' : 'Dein Weekly Update'}
        </h2>
        {deadlinePassed && !isEdit && (
          <span style={{
            fontSize: '0.7rem',
            fontWeight: '700',
            padding: '0.2rem 0.6rem',
            borderRadius: '9999px',
            background: 'rgba(255, 170, 0, 0.15)',
            color: '#ffaa00',
            marginLeft: 'auto',
          }}>
            Verspätet
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Last week */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#8888aa', marginBottom: '0.375rem' }}>
              Was hast du letzte Woche geschafft? <span style={{ color: '#00d4ff' }}>*</span>
            </label>
            <textarea
              value={form.last_week}
              onChange={e => setForm(f => ({ ...f, last_week: e.target.value }))}
              placeholder="Meine Top-Ergebnisse der letzten Woche..."
              rows={3}
              required
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#00d4ff'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>

          {/* Next week */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#8888aa', marginBottom: '0.375rem' }}>
              Was nimmst du dir für nächste Woche vor? <span style={{ color: '#00d4ff' }}>*</span>
            </label>
            <textarea
              value={form.next_week}
              onChange={e => setForm(f => ({ ...f, next_week: e.target.value }))}
              placeholder="Mein Fokus für die kommende Woche..."
              rows={3}
              required
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#00d4ff'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>

          {/* Blockers */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#8888aa', marginBottom: '0.375rem' }}>
              Gibt es eine Blockade? <span style={{ color: '#666680', fontWeight: '400' }}>(optional)</span>
            </label>
            <textarea
              value={form.blockers}
              onChange={e => setForm(f => ({ ...f, blockers: e.target.value }))}
              placeholder="Wo hängst du? Wobei brauchst du Hilfe?"
              rows={2}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#00d4ff'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>

          {error && (
            <p style={{ color: '#ff4444', fontSize: '0.85rem' }}>{error}</p>
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
            {loading ? 'Wird gesendet...' : isEdit ? 'Update speichern' : 'Update abschicken →'}
          </button>
        </div>
      </form>
    </div>
  )
}
