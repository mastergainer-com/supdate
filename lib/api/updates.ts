// API Functions für Weekly Updates
import { createClient } from '@/lib/supabase';
import type { 
  WeeklyUpdate, 
  WeeklyUpdateInput, 
  GroupFeedItem, 
  GroupSettings,
  GroupSettingsInput 
} from '@/lib/types/updates';

const supabase = createClient();

// ============================================================
// Weekly Update CRUD
// ============================================================

/**
 * Holt das Update für eine bestimmte Woche
 */
export async function getWeeklyUpdate(
  groupId: string, 
  weekNumber: number, 
  year: number
): Promise<WeeklyUpdate | null> {
  const { data, error } = await supabase
    .from('updates')
    .select('*')
    .eq('group_id', groupId)
    .eq('week_number', weekNumber)
    .eq('year', year)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Holt das Update für die aktuelle Woche
 */
export async function getCurrentWeekUpdate(groupId: string): Promise<WeeklyUpdate | null> {
  const now = new Date();
  const { data: weekData } = await supabase.rpc('get_iso_week', { 
    date_input: now.toISOString().split('T')[0] 
  });
  
  if (!weekData || weekData.length === 0) return null;
  
  return getWeeklyUpdate(groupId, weekData[0].week_num, weekData[0].year_num);
}

/**
 * Erstellt oder aktualisiert ein Update (Auto-Save)
 */
export async function saveWeeklyUpdate(
  groupId: string,
  input: WeeklyUpdateInput,
  weekNumber?: number,
  year?: number
): Promise<WeeklyUpdate> {
  const now = new Date();
  const { data: weekData } = await supabase.rpc('get_iso_week', { 
    date_input: now.toISOString().split('T')[0] 
  });
  
  const targetWeek = weekNumber ?? weekData?.[0]?.week_num ?? getWeekNumber(now);
  const targetYear = year ?? weekData?.[0]?.year_num ?? now.getFullYear();
  
  const { data, error } = await supabase
    .from('updates')
    .upsert({
      group_id: groupId,
      week_number: targetWeek,
      year: targetYear,
      accomplished: input.accomplished,
      planned: input.planned,
      blockers: input.blockers || null,
      status: 'draft',
    }, {
      onConflict: 'user_id,group_id,week_number,year'
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Reicht ein Update ein (final submit)
 */
export async function submitWeeklyUpdate(
  groupId: string,
  weekNumber?: number,
  year?: number
): Promise<WeeklyUpdate> {
  const now = new Date();
  const { data: weekData } = await supabase.rpc('get_iso_week', { 
    date_input: now.toISOString().split('T')[0] 
  });
  
  const targetWeek = weekNumber ?? weekData?.[0]?.week_num ?? getWeekNumber(now);
  const targetYear = year ?? weekData?.[0]?.year_num ?? now.getFullYear();
  
  const { data, error } = await supabase
    .from('updates')
    .update({
      status: 'submitted',
      delivered_at: new Date().toISOString(),
    })
    .eq('group_id', groupId)
    .eq('week_number', targetWeek)
    .eq('year', targetYear)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================================
// Gruppen-Feed
// ============================================================

/**
 * Holt alle Updates einer Gruppe (Feed)
 */
export async function getGroupFeed(
  groupId: string,
  options?: {
    weekNumber?: number;
    year?: number;
    userId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }
): Promise<GroupFeedItem[]> {
  let query = supabase
    .from('group_feed')
    .select('*')
    .eq('group_id', groupId);
  
  if (options?.weekNumber) {
    query = query.eq('week_number', options.weekNumber);
  }
  if (options?.year) {
    query = query.eq('year', options.year);
  }
  if (options?.userId) {
    query = query.eq('user_id', options.userId);
  }
  if (options?.status) {
    query = query.eq('display_status', options.status);
  }
  
  query = query
    .order('year', { ascending: false })
    .order('week_number', { ascending: false })
    .order('delivered_at', { ascending: false });
  
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}

/**
 * Holt die aktuelle Wochen-Übersicht für eine Gruppe
 */
export async function getCurrentWeekFeed(groupId: string): Promise<GroupFeedItem[]> {
  const now = new Date();
  const { data: weekData } = await supabase.rpc('get_iso_week', { 
    date_input: now.toISOString().split('T')[0] 
  });
  
  if (!weekData || weekData.length === 0) return [];
  
  return getGroupFeed(groupId, {
    weekNumber: weekData[0].week_num,
    year: weekData[0].year_num,
  });
}

// ============================================================
// Gruppen-Settings
// ============================================================

/**
 * Holt die Settings einer Gruppe
 */
export async function getGroupSettings(groupId: string): Promise<GroupSettings | null> {
  const { data, error } = await supabase
    .from('group_settings')
    .select('*')
    .eq('group_id', groupId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Aktualisiert die Gruppen-Settings
 */
export async function updateGroupSettings(
  groupId: string,
  settings: GroupSettingsInput
): Promise<GroupSettings> {
  const { data, error } = await supabase
    .from('group_settings')
    .upsert({
      group_id: groupId,
      ...settings,
    }, {
      onConflict: 'group_id'
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================================
// Hilfsfunktionen
// ============================================================

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Holt den Status-Text für ein Update
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    delivered: 'Geliefert',
    late: 'Spät',
    missed: 'Nicht geliefert',
    pending: 'Ausstehend',
    draft: 'Entwurf',
    submitted: 'Abgegeben',
  };
  return labels[status] || status;
}

/**
 * Holt das Status-Emoji für ein Update
 */
export function getStatusEmoji(status: string): string {
  const emojis: Record<string, string> = {
    delivered: '✅',
    late: '⚠️',
    missed: '❌',
    pending: '⏳',
    draft: '📝',
    submitted: '📤',
  };
  return emojis[status] || '❓';
}
