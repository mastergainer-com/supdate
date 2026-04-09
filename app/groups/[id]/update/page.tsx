import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import WeeklyUpdateForm from './WeeklyUpdateForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WeeklyUpdatePage({ params }: PageProps) {
  const { id: groupId } = await params;
  const supabase = await createServerSupabaseClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  
  // Prüfe Gruppenmitgliedschaft
  const { data: membership } = await supabase
    .from('group_members')
    .select('role, groups(id, name)')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();
  
  if (!membership) redirect('/dashboard');
  
  const group = membership.groups as { id: string; name: string };
  
  // Aktuelle Woche berechnen
  const now = new Date();
  const { data: weekData } = await supabase.rpc('get_iso_week', { 
    date_input: now.toISOString().split('T')[0] 
  });
  
  const weekNumber = weekData?.[0]?.week_num || getWeekNumber(now);
  const year = weekData?.[0]?.year_num || now.getFullYear();
  
  // Existierendes Update laden
  const { data: existingUpdate } = await supabase
    .from('updates')
    .select('*')
    .eq('group_id', groupId)
    .eq('week_number', weekNumber)
    .eq('year', year)
    .single();
  
  return (
    <WeeklyUpdateForm
      groupId={groupId}
      groupName={group.name}
      weekNumber={weekNumber}
      year={year}
      existingUpdate={existingUpdate}
    />
  );
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
