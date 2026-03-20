'use client'

import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        background: 'transparent',
        color: '#8888aa',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '0.375rem',
        padding: '0.375rem 0.875rem',
        cursor: 'pointer',
        fontSize: '0.8rem',
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.color = '#ffffff'
        ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.3)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.color = '#8888aa'
        ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)'
      }}
    >
      Abmelden
    </button>
  )
}
