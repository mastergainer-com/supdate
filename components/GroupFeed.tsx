'use client'

interface Update {
  id: string
  user_id: string
  last_week: string
  next_week: string
  blockers: string | null
  status: 'on_time' | 'late' | 'missed'
  submitted_at: string
  week_start: string
}

interface Profile {
  id: string
  name: string | null
  email: string | null
}

interface Props {
  updates: Update[]
  profiles: Record<string, Profile>
  currentUserId: string
}

const STATUS_CONFIG = {
  on_time: { label: '✅ Geliefert', bg: 'rgba(0, 200, 100, 0.12)', color: '#00c864', border: 'rgba(0, 200, 100, 0.25)' },
  late:    { label: '⚠️ Zu spät',  bg: 'rgba(255, 170, 0, 0.12)', color: '#ffaa00', border: 'rgba(255, 170, 0, 0.25)' },
  missed:  { label: '❌ Nicht geliefert', bg: 'rgba(255, 59, 59, 0.12)', color: '#ff3b3b', border: 'rgba(255, 59, 59, 0.25)' },
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatWeek(weekStart: string): string {
  const d = new Date(weekStart + 'T00:00:00')
  const end = new Date(d)
  end.setDate(end.getDate() + 6)
  return `${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} – ${end.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}`
}

export function GroupFeed({ updates, profiles, currentUserId }: Props) {
  if (updates.length === 0) {
    return (
      <div style={{
        background: '#13131f',
        border: '1px dashed rgba(255,255,255,0.1)',
        borderRadius: '1rem',
        padding: '3rem 2rem',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
        <h3 style={{ color: '#ffffff', fontWeight: '700', marginBottom: '0.5rem' }}>
          Noch keine Updates
        </h3>
        <p style={{ color: '#8888aa', fontSize: '0.9rem' }}>
          Sei der Erste — schick dein Weekly Update!
        </p>
      </div>
    )
  }

  // Group updates by week
  const byWeek: Record<string, Update[]> = {}
  for (const u of updates) {
    if (!byWeek[u.week_start]) byWeek[u.week_start] = []
    byWeek[u.week_start].push(u)
  }

  const sortedWeeks = Object.keys(byWeek).sort((a, b) => b.localeCompare(a))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {sortedWeeks.map(week => (
        <div key={week}>
          {/* Week header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#00d4ff' }}>
              📅 KW {formatWeek(week)}
            </span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: '0.75rem', color: '#8888aa' }}>
              {byWeek[week].length} Update{byWeek[week].length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Updates for this week */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {byWeek[week].map(update => {
              const profile = profiles[update.user_id]
              const statusCfg = STATUS_CONFIG[update.status]
              const isOwn = update.user_id === currentUserId

              return (
                <div key={update.id} style={{
                  background: '#13131f',
                  border: `1px solid ${isOwn ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: '0.75rem',
                  padding: '1.25rem',
                  transition: 'border-color 0.2s',
                }}>
                  {/* Header: Name + Status Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    {/* Avatar */}
                    <div style={{
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '50%',
                      background: isOwn ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      color: isOwn ? '#00d4ff' : '#8888aa',
                      flexShrink: 0,
                    }}>
                      {(profile?.name || profile?.email || '?')[0].toUpperCase()}
                    </div>

                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: '600', color: '#ffffff', fontSize: '0.9rem' }}>
                        {profile?.name || profile?.email || 'Unbekannt'}
                      </span>
                      {isOwn && (
                        <span style={{ color: '#666680', fontSize: '0.75rem', marginLeft: '0.5rem' }}>(Du)</span>
                      )}
                    </div>

                    {/* Status Badge */}
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '9999px',
                      background: statusCfg.bg,
                      color: statusCfg.color,
                      border: `1px solid ${statusCfg.border}`,
                      whiteSpace: 'nowrap',
                    }}>
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Content */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#8888aa', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        ✅ Letzte Woche
                      </p>
                      <p style={{ color: '#ccccdd', fontSize: '0.9rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                        {update.last_week}
                      </p>
                    </div>

                    <div>
                      <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#8888aa', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        🎯 Nächste Woche
                      </p>
                      <p style={{ color: '#ccccdd', fontSize: '0.9rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                        {update.next_week}
                      </p>
                    </div>

                    {update.blockers && (
                      <div style={{
                        background: 'rgba(255, 59, 59, 0.06)',
                        border: '1px solid rgba(255, 59, 59, 0.12)',
                        borderRadius: '0.5rem',
                        padding: '0.75rem',
                      }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#ff6b6b', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                          🚧 Blockade
                        </p>
                        <p style={{ color: '#ccccdd', fontSize: '0.9rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                          {update.blockers}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <p style={{ color: '#666680', fontSize: '0.7rem', marginTop: '0.75rem', textAlign: 'right' }}>
                    {formatDate(update.submitted_at)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
