import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { CopyInviteButton } from '@/components/CopyInviteButton'
import { WeeklyUpdateForm } from '@/components/WeeklyUpdateForm'
import { GroupFeed } from '@/components/GroupFeed'

const DAY_NAMES = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

function isDeadlinePassed(deadlineDay: number | null, deadlineTime: string | null): boolean {
  if (deadlineDay === null || !deadlineTime) return false
  const now = new Date()
  const currentDay = now.getDay()
  const [h, m] = deadlineTime.split(':').map(Number)

  // Same day — check time
  if (currentDay === deadlineDay) {
    const deadlineMinutes = h * 60 + m
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    return nowMinutes > deadlineMinutes
  }

  // Calculate days since deadline
  let daysSince = currentDay - deadlineDay
  if (daysSince < 0) daysSince += 7
  // If deadline was earlier this week (1-6 days ago), it has passed
  return daysSince > 0 && daysSince < 7
}

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Load group
  const { data: group } = await supabase
    .from('groups')
    .select('*')
    .eq('id', id)
    .single()

  if (!group) notFound()

  // Check membership
  const { data: myMembership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', id)
    .eq('user_id', user.id)
    .single()

  if (!myMembership) redirect('/dashboard')

  // Load members with profiles
  const { data: members } = await supabase
    .from('group_members')
    .select('role, status, joined_at, user_id')
    .eq('group_id', id)
    .order('joined_at', { ascending: true })

  const memberIds = members?.map(m => m.user_id) || []
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, name, email, goal')
    .in('id', memberIds)

  const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))

  // Load weekly updates (last 8 weeks)
  const { data: updates } = await supabase
    .from('weekly_updates')
    .select('*')
    .eq('group_id', id)
    .order('week_start', { ascending: false })
    .order('submitted_at', { ascending: false })
    .limit(100)

  // Check if current user already submitted this week
  const currentWeekStart = getWeekStart()
  const myUpdate = updates?.find(
    u => u.user_id === user.id && u.week_start === currentWeekStart
  ) || null

  const deadlinePassed = isDeadlinePassed(group.deadline_day, group.deadline_time)
  const inviteLink = `https://sup.date/join/${group.invite_token}`

  // Build member status for current week
  const currentWeekUpdates = updates?.filter(u => u.week_start === currentWeekStart) || []
  const submittedUserIds = new Set(currentWeekUpdates.map(u => u.user_id))

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

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Group header */}
        <div style={{
          background: '#13131f',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '1rem',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ffffff', marginBottom: '0.375rem' }}>
                {group.name}
              </h1>
              {group.description && (
                <p style={{ color: '#8888aa', lineHeight: '1.5', fontSize: '0.9rem' }}>
                  {group.description}
                </p>
              )}
            </div>
            {myMembership.role === 'admin' && (
              <span style={{
                fontSize: '0.7rem', fontWeight: '700', padding: '0.2rem 0.6rem',
                borderRadius: '9999px', background: 'rgba(0,212,255,0.15)', color: '#00d4ff',
              }}>Admin</span>
            )}
          </div>

          {/* Deadline + Members count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(255,255,255,0.05)', padding: '0.5rem 0.875rem',
              borderRadius: '0.5rem', color: '#8888aa', fontSize: '0.85rem',
            }}>
              <span>📅</span>
              <span>
                Deadline: {group.deadline_day !== null ? DAY_NAMES[group.deadline_day] : '?'}
                {group.deadline_time ? ` · ${group.deadline_time.slice(0, 5)} Uhr` : ''}
              </span>
            </div>
            <span style={{ color: '#8888aa', fontSize: '0.85rem' }}>
              👥 {members?.length || 0} Mitglieder
            </span>
          </div>
        </div>

        {/* Weekly Status Bar — who delivered this week */}
        <div style={{
          background: '#13131f',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '1rem',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ffffff' }}>
              Diese Woche
            </h2>
            <span style={{ fontSize: '0.8rem', color: '#8888aa' }}>
              {submittedUserIds.size}/{members?.length || 0} geliefert
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {members?.map(member => {
              const profile = profileMap[member.user_id]
              const hasSubmitted = submittedUserIds.has(member.user_id)
              const update = currentWeekUpdates.find(u => u.user_id === member.user_id)
              const statusColor = hasSubmitted
                ? (update?.status === 'late' ? '#ffaa00' : '#00c864')
                : (deadlinePassed ? '#ff3b3b' : '#666680')
              const statusLabel = hasSubmitted
                ? (update?.status === 'late' ? '⚠️' : '✅')
                : (deadlinePassed ? '❌' : '⏳')

              return (
                <div key={member.user_id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  background: '#0d0d14', padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem', border: `1px solid ${hasSubmitted ? 'rgba(0,200,100,0.2)' : 'rgba(255,255,255,0.05)'}`,
                }}>
                  <span style={{ fontSize: '0.8rem' }}>{statusLabel}</span>
                  <span style={{ fontSize: '0.8rem', color: statusColor, fontWeight: '500' }}>
                    {(profile?.name || profile?.email || '?').split(' ')[0]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Weekly Update Form */}
        <div style={{ marginBottom: '1.5rem' }}>
          <WeeklyUpdateForm
            groupId={id}
            userId={user.id}
            weekStart={currentWeekStart}
            existingUpdate={myUpdate}
            deadlinePassed={deadlinePassed}
          />
        </div>

        {/* Invite link (collapsed) */}
        <details style={{
          background: '#13131f',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '1rem',
          padding: '1rem 1.5rem',
          marginBottom: '1.5rem',
        }}>
          <summary style={{
            fontSize: '0.9rem', fontWeight: '600', color: '#8888aa', cursor: 'pointer',
            listStyle: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            🔗 Einladungslink
          </summary>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '0.5rem', padding: '0.75rem 1rem', marginTop: '0.75rem',
          }}>
            <span style={{ color: '#8888aa', fontSize: '0.8rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {inviteLink}
            </span>
            <CopyInviteButton text={inviteLink} />
          </div>
        </details>

        {/* Feed */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff', marginBottom: '1.25rem' }}>
            📋 Gruppen-Feed
          </h2>
          <GroupFeed
            updates={updates || []}
            profiles={profileMap}
            currentUserId={user.id}
          />
        </div>

        {/* Members list */}
        <details style={{
          background: '#13131f',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '1rem',
          padding: '1rem 1.5rem',
        }}>
          <summary style={{
            fontSize: '0.9rem', fontWeight: '600', color: '#8888aa', cursor: 'pointer',
            listStyle: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            👥 Mitglieder ({members?.length || 0})
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
            {members?.map(member => {
              const profile = profileMap[member.user_id]
              return (
                <div key={member.user_id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem', background: '#0d0d14', borderRadius: '0.5rem',
                }}>
                  <div style={{
                    width: '2rem', height: '2rem', borderRadius: '50%',
                    background: 'rgba(0,212,255,0.15)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.85rem', fontWeight: '700', color: '#00d4ff',
                  }}>
                    {(profile?.name || profile?.email || '?')[0].toUpperCase()}
                  </div>
                  <span style={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: '500' }}>
                    {profile?.name || profile?.email || 'Unbekannt'}
                  </span>
                  {member.role === 'admin' && (
                    <span style={{ fontSize: '0.65rem', color: '#00d4ff', fontWeight: '700' }}>ADMIN</span>
                  )}
                </div>
              )
            })}
          </div>
        </details>
      </main>
    </div>
  )
}
