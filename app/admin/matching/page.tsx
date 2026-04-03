'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type UserCard = {
  id: string
  name: string | null
  email: string | null
  goal: string | null
  commitment_level: string | null
  availability_hours_week: number | null
  onboarding_completed_at: string | null
}

type Group = {
  id: string
  name: string
  member_count: number
}

export default function MatchingPage() {
  const [tab, setTab] = useState<'queue' | 'assigned'>('queue')
  const [queue, setQueue] = useState<UserCard[]>([])
  const [assigned, setAssigned] = useState<{ user: UserCard; group_name: string; assigned_at: string }[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)

  const loadData = async () => {
    const supabase = createClient()

    // Get all users with completed onboarding
    const { data: completedUsers } = await supabase
      .from('user_profiles')
      .select('id, name, email, goal, commitment_level, availability_hours_week, onboarding_completed_at')
      .not('onboarding_completed_at', 'is', null)

    // Get all group members
    const { data: members } = await supabase
      .from('group_members')
      .select('user_id, group_id, groups(id, name)')

    const memberUserIds = new Set((members || []).map(m => m.user_id))

    // Queue = completed onboarding but no group
    const queueUsers = (completedUsers || []).filter(u => !memberUserIds.has(u.id))
    setQueue(queueUsers)

    // Assigned = completed onboarding and has matching_assignment
    const { data: assignments } = await supabase
      .from('matching_assignments')
      .select('user_id, group_id, assigned_at, groups(name)')

    const assignedList = (assignments || []).map(a => {
      const user = (completedUsers || []).find(u => u.id === a.user_id)
      return user ? {
        user,
        group_name: (a.groups as unknown as { name: string })?.name || '?',
        assigned_at: a.assigned_at,
      } : null
    }).filter(Boolean) as { user: UserCard; group_name: string; assigned_at: string }[]
    setAssigned(assignedList)

    // Get all groups with member counts
    const { data: allGroups } = await supabase
      .from('groups')
      .select('id, name')

    const groupCounts: Record<string, number> = {}
    for (const m of members || []) {
      groupCounts[m.group_id] = (groupCounts[m.group_id] || 0) + 1
    }

    setGroups((allGroups || []).map(g => ({
      ...g,
      member_count: groupCounts[g.id] || 0,
    })))

    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const handleAssign = async (userId: string, groupId: string) => {
    setAssigning(userId)
    setDropdownOpen(null)

    const res = await fetch('/api/admin/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, groupId }),
    })

    if (!res.ok) {
      const data = await res.json()
      alert('Fehler: ' + (data.error || 'Unbekannter Fehler'))
    }

    setAssigning(null)
    loadData()
  }

  const commitmentColors: Record<string, string> = {
    low: '#ffaa00',
    medium: '#00d4ff',
    high: '#00c864',
  }

  const renderUserCard = (user: UserCard, showAssign: boolean) => (
    <div key={user.id} style={{
      background: '#13131f',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '0.75rem',
      padding: '1.25rem',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.25rem' }}>
            {user.name || user.email || '?'}
          </h3>
          {user.commitment_level && (
            <span style={{
              fontSize: '0.7rem', fontWeight: '600', padding: '0.15rem 0.5rem',
              borderRadius: '9999px',
              background: `${commitmentColors[user.commitment_level]}20`,
              color: commitmentColors[user.commitment_level],
            }}>
              {user.commitment_level.toUpperCase()}
            </span>
          )}
        </div>
        {user.availability_hours_week && (
          <span style={{ color: '#8888aa', fontSize: '0.8rem' }}>
            {user.availability_hours_week}h/Woche
          </span>
        )}
      </div>

      {user.goal && (
        <p style={{ color: '#8888aa', fontSize: '0.85rem', lineHeight: '1.4', marginBottom: '0.75rem' }}>
          {user.goal.slice(0, 100)}{user.goal.length > 100 ? '...' : ''}
        </p>
      )}

      {showAssign && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(dropdownOpen === user.id ? null : user.id)}
            disabled={assigning === user.id}
            className="btn-primary"
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', opacity: assigning === user.id ? 0.5 : 1 }}
          >
            {assigning === user.id ? 'Zuweisen...' : 'Gruppe zuweisen'}
          </button>

          {dropdownOpen === user.id && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '0.5rem',
              background: '#1a1a2e',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '0.5rem',
              minWidth: '240px',
              zIndex: 10,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}>
              {groups.length === 0 ? (
                <div style={{ padding: '0.75rem 1rem', color: '#8888aa', fontSize: '0.85rem' }}>
                  Keine Gruppen vorhanden
                </div>
              ) : groups.map(g => (
                <button
                  key={g.id}
                  onClick={() => handleAssign(user.id, g.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,212,255,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span>{g.name}</span>
                  <span style={{ color: g.member_count >= 8 ? '#ff4444' : '#8888aa', fontSize: '0.75rem' }}>
                    {g.member_count}/8
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: '#8888aa' }}>Laden...</div>
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ffffff', marginBottom: '1.5rem' }}>
        Matching-Dashboard
      </h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {(['queue', 'assigned'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: tab === t ? '#00d4ff' : '#1a1a2e',
              color: tab === t ? '#000' : '#8888aa',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.2s',
            }}
          >
            {t === 'queue' ? `Warteschlange (${queue.length})` : `Bereits zugewiesen (${assigned.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'queue' ? (
        queue.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: '#13131f', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '1rem' }}>
            <p style={{ color: '#8888aa' }}>Keine User in der Warteschlange.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {queue.map(user => renderUserCard(user, true))}
          </div>
        )
      ) : (
        assigned.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: '#13131f', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '1rem' }}>
            <p style={{ color: '#8888aa' }}>Noch keine Zuweisungen.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {assigned.map(({ user, group_name, assigned_at }) => (
              <div key={user.id}>
                {renderUserCard(user, false)}
                <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(0,200,100,0.08)', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: '#00c864' }}>→ {group_name}</span>
                  <span style={{ color: '#8888aa' }}>{new Date(assigned_at).toLocaleDateString('de-DE')}</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
