import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { LogoutButton } from '@/components/LogoutButton'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const onboardingDone = !!profile.onboarding_completed_at

  // Get user's groups
  const { data: memberGroups } = await supabase
    .from('group_members')
    .select('role, joined_at, groups(id, name, description, deadline_day, deadline_time, created_by)')
    .eq('user_id', user.id)

  type GroupData = { id: string; name: string; description: string; deadline_day: number; deadline_time: string; created_by: string }
  const groups = memberGroups?.map(m => ({
    ...(m.groups as unknown as GroupData),
    role: m.role,
  })) || []

  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

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
        <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff' }}>
          sup<span style={{ color: '#00d4ff' }}>.</span>date
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/settings" style={{ color: '#8888aa', fontSize: '0.875rem', textDecoration: 'none' }}>
            {profile.name || user.email}
          </Link>
          <LogoutButton />
        </div>
      </nav>

      {/* Main */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Streak & Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {/* Streak Card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,107,53,0.2) 0%, rgba(255,140,0,0.1) 100%)',
            border: '1px solid rgba(255,107,53,0.3)',
            borderRadius: '1rem',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <span style={{ fontSize: '2rem' }}>🔥</span>
            <div>
              <p style={{ color: '#ff8c42', fontSize: '1.75rem', fontWeight: '800' }}>
                {profile.streak_count || 0}
              </p>
              <p style={{ color: '#8888aa', fontSize: '0.75rem' }}>Wochen Streak</p>
            </div>
          </div>

          {/* Updates Delivered */}
          <div style={{
            background: '#13131f',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '1rem',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <span style={{ fontSize: '2rem' }}>✅</span>
            <div>
              <p style={{ color: '#00c864', fontSize: '1.5rem', fontWeight: '700' }}>
                {profile.total_delivered || 0}
              </p>
              <p style={{ color: '#8888aa', fontSize: '0.75rem' }}>Updates geliefert</p>
            </div>
          </div>

          {/* Pause Status */}
          {profile.pause_until && new Date(profile.pause_until) > new Date() && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(255,193,7,0.15) 0%, rgba(255,160,0,0.08) 100%)',
              border: '1px solid rgba(255,193,7,0.3)',
              borderRadius: '1rem',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}>
              <span style={{ fontSize: '2rem' }}>🌴</span>
              <div>
                <p style={{ color: '#ffc107', fontSize: '0.9rem', fontWeight: '600' }}>
                  In Pause
                </p>
                <p style={{ color: '#8888aa', fontSize: '0.7rem' }}>
                  bis {new Date(profile.pause_until).toLocaleDateString('de-DE')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Goal Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,212,255,0.1) 0%, rgba(0,212,255,0.03) 100%)',
          border: '1px solid rgba(0,212,255,0.2)',
          borderRadius: '1rem',
          padding: '1.25rem 1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem',
        }}>
          <span style={{ fontSize: '1.5rem' }}>🎯</span>
          <div>
            <p style={{ color: '#8888aa', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
              DEIN ZIEL
            </p>
            <p style={{ color: '#ffffff', fontWeight: '500', lineHeight: '1.5' }}>{profile.goal}</p>
          </div>
        </div>

        {/* Waiting for group banner */}
        {onboardingDone && groups.length === 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(0,200,100,0.12) 0%, rgba(0,200,100,0.04) 100%)',
            border: '1px solid rgba(0,200,100,0.25)',
            borderRadius: '1rem',
            padding: '1.25rem 1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
          }}>
            <span style={{ fontSize: '1.5rem' }}>✅</span>
            <div>
              <p style={{ color: '#00c864', fontWeight: '600', marginBottom: '0.25rem' }}>
                Onboarding abgeschlossen!
              </p>
              <p style={{ color: '#8888aa', fontSize: '0.9rem', lineHeight: '1.5' }}>
                Wir finden gerade deine Gruppe — melde dich kurz geduldig... 🙏
              </p>
            </div>
          </div>
        )}

        {/* Groups header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#ffffff' }}>
            Meine Gruppen
          </h2>
          <Link href="/groups/new" style={{
            background: '#00d4ff',
            color: '#000',
            fontWeight: '600',
            padding: '0.625rem 1.25rem',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            fontSize: '0.9rem',
            transition: 'all 0.2s',
          }}>
            + Neue Gruppe
          </Link>
        </div>

        {/* Groups list */}
        {groups.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: '#13131f',
            border: '1px dashed rgba(255,255,255,0.1)',
            borderRadius: '1rem',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.5rem' }}>
              Noch keine Gruppen
            </h3>
            <p style={{ color: '#8888aa', marginBottom: '1.5rem', maxWidth: '350px', margin: '0 auto 1.5rem' }}>
              Erstelle deine erste Accountability-Gruppe und lade andere ein, mitzumachen.
            </p>
            <Link href="/groups/new" style={{
              display: 'inline-block',
              background: '#00d4ff',
              color: '#000',
              fontWeight: '700',
              padding: '0.75rem 1.75rem',
              borderRadius: '0.5rem',
              textDecoration: 'none',
            }}>
              Erste Gruppe erstellen
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {groups.map(group => (
              <Link key={group.id} href={`/groups/${group.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: '#13131f',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '0.75rem',
                  padding: '1.5rem',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,212,255,0.3)'
                  ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)'
                  ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff' }}>
                      {group.name}
                    </h3>
                    {group.role === 'admin' && (
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        background: 'rgba(0,212,255,0.15)',
                        color: '#00d4ff',
                      }}>
                        Admin
                      </span>
                    )}
                  </div>
                  {group.description && (
                    <p style={{ color: '#8888aa', fontSize: '0.875rem', marginBottom: '1rem', lineHeight: '1.5' }}>
                      {group.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8888aa', fontSize: '0.8rem' }}>
                    <span>📅</span>
                    <span>
                      {group.deadline_day !== null ? dayNames[group.deadline_day] : '?'}
                      {group.deadline_time ? ` · ${group.deadline_time.slice(0, 5)} Uhr` : ''}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
