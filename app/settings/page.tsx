import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import UserSettingsForm from './UserSettingsForm'

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient()
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  
  // Load user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('name, email, telegram_handle, telegram_chat_id, streak_count, pause_until')
    .eq('id', user.id)
    .single()
  
  return (
    <UserSettingsForm
      userId={user.id}
      initialProfile={profile}
    />
  )
}
