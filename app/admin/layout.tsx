import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { LogoutButton } from '@/components/LogoutButton'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_admin, name')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/dashboard')

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d14' }}>
      <nav style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '1rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: '1100px',
        margin: '0 auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link href="/dashboard" style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff', textDecoration: 'none' }}>
            sup<span style={{ color: '#00d4ff' }}>.</span>date
          </Link>
          <span style={{ fontSize: '0.7rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '9999px', background: 'rgba(255,100,100,0.15)', color: '#ff6464' }}>
            ADMIN
          </span>
          <Link href="/admin/matching" style={{ color: '#8888aa', fontSize: '0.875rem', textDecoration: 'none' }}>
            Matching
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: '#8888aa', fontSize: '0.875rem' }}>{profile.name || user.email}</span>
          <LogoutButton />
        </div>
      </nav>
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {children}
      </main>
    </div>
  )
}
