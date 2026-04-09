import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import GroupSettingsForm from './GroupSettingsForm'

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GroupSettingsPage({ params }: PageProps) {
  const { id: groupId } = await params;
  const supabase = await createServerSupabaseClient()
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  
  // Prüfe Gruppenmitgliedschaft und Admin-Rechte
  const { data: membership } = await supabase
    .from('group_members')
    .select('role, groups(id, name)')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()
  
  if (!membership) redirect('/dashboard')
  if (membership.role !== 'admin') redirect(`/groups/${groupId}`)
  
  const group = membership.groups as unknown as { id: string; name: string }
  
  // Lade bestehende Settings
  const { data: settings } = await supabase
    .from('group_settings')
    .select('*')
    .eq('group_id', groupId)
    .single()
  
  return (
    <GroupSettingsForm
      groupId={groupId}
      groupName={group.name}
      initialSettings={settings}
    />
  )
}
