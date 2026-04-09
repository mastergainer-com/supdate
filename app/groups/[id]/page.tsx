import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import GroupFeed from './GroupFeed'

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
  const isAdmin = myMembership.role === 'admin'

  // Load members with profiles
  const { data: members } = await supabase
    .from('group_members')
    .select('role, user_id, user_profiles(name)')
    .eq('group_id', id)
    .order('joined_at', { ascending: true })

  const formattedMembers = members?.map(m => ({
    user_id: m.user_id,
    name: (m.user_profiles as any)?.name || 'Unbekannt',
    role: m.role,
  })) || []

  // Load feed via view
  const { data: feed } = await supabase
    .from('group_feed')
    .select('*')
    .eq('group_id', id)
    .order('year', { ascending: false })
    .order('week_number', { ascending: false })
    .order('delivered_at', { ascending: false })
    .limit(50)

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

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Group header */}
        <div style={{
          background: '#13131f',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '1rem',
          padding: '1.5rem',
          marginBottom: '2rem',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {isAdmin && (
                <Link
                  href={`/groups/${id}/settings`}
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    padding: '0.4rem 0.875rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#8888aa',
                    textDecoration: 'none',
                  }}
                >
                  ⚙️ Settings
                </Link>
              )}
              {isAdmin && (
                <span style={{
                  fontSize: '0.7rem', fontWeight: '700', padding: '0.2rem 0.6rem',
                  borderRadius: '9999px', background: 'rgba(0,212,255,0.15)', color: '#00d4ff',
                }}>Admin</span>
              )}
            </div>
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
                Deadline: {group.deadline_day !== null ? DAY_NAMES[group.deadline_day] : 'So'}
                {group.deadline_time ? ` · ${group.deadline_time.slice(0, 5)} Uhr` : ' · 23:59 Uhr'}
              </span>
            </div>
            <span style={{ color: '#8888aa', fontSize: '0.85rem' }}>
              👥 {members?.length || 0} Mitglieder
            </span>
          </div>
        </div>

        {/* Feed */}
        <GroupFeed
          groupId={id}
          groupName={group.name}
          isAdmin={isAdmin}
          initialFeed={feed || []}
          members={formattedMembers}
        />

        {/* Invite link */}
        <details style={{
          background: '#13131f',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '1rem',
          padding: '1rem 1.5rem',
          marginTop: '2rem',
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
            <button
              onClick={() => navigator.clipboard.writeText(inviteLink)}
              style={{
                background: '#00d4ff',
                color: '#000',
                border: 'none',
                padding: '0.4rem 0.875rem',
                borderRadius: '0.375rem',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Kopieren
            </button>
          </div>
        </details>
      </main>
    </div>
  )
}
