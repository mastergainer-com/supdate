'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export function JoinButton({ groupId }: { groupId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleJoin = async () => {
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { error: insertError } = await supabase.from('group_members').insert({
      group_id: groupId,
      user_id: user.id,
      role: 'member',
      status: 'active',
    })

    if (insertError) {
      setError('Fehler beim Beitreten: ' + insertError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div>
      <button
        onClick={handleJoin}
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
          fontSize: '1.05rem',
          transition: 'all 0.2s',
        }}
      >
        {loading ? 'Trete bei...' : '🚀 Gruppe beitreten'}
      </button>
      {error && (
        <p style={{ color: '#ff4444', fontSize: '0.85rem', marginTop: '0.5rem' }}>{error}</p>
      )}
    </div>
  )
}
