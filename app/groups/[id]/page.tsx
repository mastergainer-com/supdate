import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { CopyInviteButton } from '@/components/CopyInviteButton'

const DAY_NAMES = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

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

  // Load user profiles for members
  const memberIds = members?.map(m => m.user_id) || []
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, name, email, goal')
    .in('id', memberIds)

  const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))

  const inviteLink = `https://sup.date/join/${group.invite_token}`

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

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        {/* Group header */}
        <div style={{
          background: '#13131f',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '1rem',
          padding: '2rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ffffff', marginBottom: '0.5rem' }}>
                {group.name}
              </h1>
              {group.description && (
                <p style={{ color: '#8888aa', lineHeight: '1.6', maxWidth: '500px' }}>
                  {group.description}
                </p>
              )}
            </div>
            {myMembership.role === 'admin' && (
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                background: 'rgba(0,212,255,0.15)',
                color: '#00d4ff',
                whiteSpace: 'nowrap',
              }}>
                Admin
              </span>
            )}
          </div>

          {/* Deadline info */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(255,255,255,0.05)',
            padding: '0.5rem 0.875rem',
            borderRadius: '0.5rem',
            color: '#8888aa',
            fontSize: '0.875rem',
          }}>
            <span>📅</span>
            <span>
              Deadline: {group.deadline_day !== null ? DAY_NAMES[group.deadline_day] : '?'}
              {group.deadline_time ? ` · ${group.deadline_time.slice(0, 5)} Uhr` : ''}
            </span>
          </div>
        </div>

        {/* Invite link */}
        <div style={{
          background: '#13131f',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '1rem',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.75rem' }}>
            🔗 Einladungslink
          </h2>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: '#1a1a2e',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem',
          }}>
            <span style={{ color: '#8888aa', fontSize: '0.875rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {inviteLink}
            </span>
            <CopyInviteButton text={inviteLink} />
          </div>
          <p style={{ color: '#8888aa', fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Teile diesen Link mit Menschen, die du einladen möchtest.
          </p>
        </div>

        {/* Members */}
        <div style={{
          background: '#13131f',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '1rem',
          padding: '1.5rem',
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#ffffff', marginBottom: '1rem' }}>
            👥 Mitglieder ({members?.length || 0})
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {members?.map(member => {
              const profile = profileMap[member.user_id]
              const isActive = member.status === 'active'
              return (
                <div key={member.user_id} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  padding: '1rem',
                  background: '#0d0d14',
                  borderRadius: '0.75rem',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '50%',
                    background: 'rgba(0,212,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    color: '#00d4ff',
                  }}>
                    {(profile?.name || profile?.email || '?')[0].toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: '600', color: '#ffffff', fontSize: '0.9rem' }}>
                        {profile?.name || profile?.email || 'Unbekannt'}
                      </span>
                      {member.role === 'admin' && (
                        <span style={{ fontSize: '0.65rem', color: '#00d4ff', fontWeight: '700' }}>ADMIN</span>
                      )}
                      {/* Status badge */}
                      <span style={{
                        marginLeft: 'auto',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        background: isActive ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.08)',
                        color: isActive ? '#00d4ff' : '#8888aa',
                      }}>
                        {isActive ? 'Aktiv' : 'Invited'}
                      </span>
                    </div>
                    {profile?.goal && (
                      <p style={{ color: '#8888aa', fontSize: '0.8rem', lineHeight: '1.4', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                        🎯 {profile.goal}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
