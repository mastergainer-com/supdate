// Types für SUPDATE Phase 3: Weekly Updates

export type UpdateStatus = 'draft' | 'submitted' | 'late' | 'pending' | 'missed';
export type DisplayStatus = 'draft' | 'submitted' | 'late' | 'pending' | 'missed' | 'delivered';

export interface WeeklyUpdate {
  id: string;
  user_id: string;
  group_id: string;
  accomplished: string;
  planned: string;
  blockers?: string;
  status: UpdateStatus;
  delivered_at?: string;
  week_number: number;
  year: number;
  created_at: string;
  updated_at: string;
}

export interface WeeklyUpdateInput {
  accomplished: string;
  planned: string;
  blockers?: string;
}

export interface GroupFeedItem {
  id: string;
  user_id: string;
  group_id: string;
  user_name: string;
  group_name: string;
  accomplished: string;
  planned: string;
  blockers?: string;
  status: UpdateStatus;
  display_status: DisplayStatus;
  delivered_at?: string;
  week_number: number;
  year: number;
  created_at: string;
  updated_at: string;
}

export interface GroupSettings {
  id: string;
  group_id: string;
  deadline_day?: number;
  deadline_time?: string;
  deadline_timezone: string;
  reminder_enabled: boolean;
  reminder_hours_before: number;
  reminder_final_hours: number;
  alert_enabled: boolean;
  alert_grace_hours: number;
  created_at: string;
  updated_at: string;
}

export interface GroupSettingsInput {
  deadline_day?: number;
  deadline_time?: string;
  deadline_timezone?: string;
  reminder_enabled?: boolean;
  reminder_hours_before?: number;
  reminder_final_hours?: number;
  alert_enabled?: boolean;
  alert_grace_hours?: number;
}

export interface UpdateAlert {
  id: string;
  user_id: string;
  group_id: string;
  week_number: number;
  year: number;
  status: 'pending' | 'sent' | 'acknowledged' | 'escalated';
  alert_type: 'missed' | 'late' | 'reminder';
  sent_at?: string;
  created_at: string;
}

// Status-Badge Konfiguration
export const STATUS_BADGES = {
  delivered: {
    label: 'Geliefert',
    emoji: '✅',
    color: '#00c864',
    bgColor: 'rgba(0, 200, 100, 0.15)',
  },
  late: {
    label: 'Spät',
    emoji: '⚠️',
    color: '#ffaa00',
    bgColor: 'rgba(255, 170, 0, 0.15)',
  },
  missed: {
    label: 'Nicht geliefert',
    emoji: '❌',
    color: '#ff4444',
    bgColor: 'rgba(255, 68, 68, 0.15)',
  },
  pending: {
    label: 'Ausstehend',
    emoji: '⏳',
    color: '#8888aa',
    bgColor: 'rgba(136, 136, 170, 0.15)',
  },
  draft: {
    label: 'Entwurf',
    emoji: '📝',
    color: '#00d4ff',
    bgColor: 'rgba(0, 212, 255, 0.15)',
  },
  submitted: {
    label: 'Abgegeben',
    emoji: '📤',
    color: '#00d4ff',
    bgColor: 'rgba(0, 212, 255, 0.15)',
  },
} as const;

// Wochentage für Deadline-Auswahl
export const WEEKDAYS = [
  { value: 0, label: 'Sonntag', short: 'So' },
  { value: 1, label: 'Montag', short: 'Mo' },
  { value: 2, label: 'Dienstag', short: 'Di' },
  { value: 3, label: 'Mittwoch', short: 'Mi' },
  { value: 4, label: 'Donnerstag', short: 'Do' },
  { value: 5, label: 'Freitag', short: 'Fr' },
  { value: 6, label: 'Samstag', short: 'Sa' },
];
