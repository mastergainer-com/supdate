import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { JoinButton } from '@/components/JoinButton'

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Load group by invite token
  const { data: group } = await supabase
    .from('groups')
    .select('id, name, description, deadline_day, deadline_time, created_by')
    .eq('invite_token', token)
    .single()

  if (!group) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0d14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.5rem' }}>Gruppe nicht gefunden</h1>
          <p style={{ color: '#8888aa', marginBottom: '1.5rem' }}>Dieser Einladungslink ist ungültig oder abgelaufen.</p>
          <Link href="/" style={{ color: '#00d4ff', textDecoration: 'none' }}>← Zurück zur Startseite</Link>
        </div>
      </div>
    )
  }

  // If not logged in, redirect to login with return URL
  if (!user) {
    redirect(`/login?returnUrl=/join/${token}`)
  }

  // Check if already member
  const { data: existingMember } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .single()

  if (existingMember) {
    redirect(`/groups/${group.id}`)
  }

  const DAY_NAMES = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

  // Get member count
  const { count } = await supabase
    .from('group_members')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', group.id)

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ffffff' }}>
            sup<span style={{ color: '#00d4ff' }}>.</span>date
          </span>
        </div>

        {/* Invite card */}
        <div style={{
          background: '#13131f',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '1.25rem',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <div style={{
            width: '4rem',
            height: '4rem',
            borderRadius: '50%',
            background: 'rgba(0,212,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            fontSize: '2rem',
          }}>
            👥
          </div>

          <p style={{ color: '#8888aa', fontSize: '0.875rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>
            Du wurdest eingeladen
          </p>

          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ffffff', marginBottom: '0.75rem' }}>
            {group.name}
          </h1>

          {group.description && (
            <p style={{ color: '#8888aa', lineHeight: '1.6', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
              {group.description}
            </p>
          )}

          {/* Meta info */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '1.5rem',
            marginBottom: '2rem',
            flexWrap: 'wrap',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#00d4ff', fontSize: '1.1rem', fontWeight: '700' }}>{count || 0}</div>
              <div style={{ color: '#8888aa', fontSize: '0.75rem' }}>Mitglieder</div>
            </div>
            <div style={{ width: '1px', background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: '600' }}>
                {group.deadline_day !== null ? DAY_NAMES[group.deadline_day] : '?'}
                {group.deadline_time ? ` · ${group.deadline_time.slice(0, 5)}` : ''}
              </div>
              <div style={{ color: '#8888aa', fontSize: '0.75rem' }}>Update-Deadline</div>
            </div>
          </div>

          <JoinButton groupId={group.id} />

          <p style={{ color: '#8888aa', fontSize: '0.8rem', marginTop: '1rem' }}>
            Du wirst nach dem Beitritt zu deinem Dashboard weitergeleitet.
          </p>
        </div>
      </div>
    </div>
  )
}
