'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import type { GroupSettings } from '@/lib/types/updates';
import { WEEKDAYS } from '@/lib/types/updates';

const supabase = createClient();

interface GroupSettingsFormProps {
  groupId: string;
  groupName: string;
  initialSettings?: GroupSettings | null;
}

export default function GroupSettingsForm({
  groupId,
  groupName,
  initialSettings,
}: GroupSettingsFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [settings, setSettings] = useState({
    deadline_day: initialSettings?.deadline_day ?? 0,
    deadline_time: initialSettings?.deadline_time ?? '23:59',
    deadline_timezone: initialSettings?.deadline_timezone ?? 'Europe/Berlin',
    reminder_enabled: initialSettings?.reminder_enabled ?? true,
    reminder_hours_before: initialSettings?.reminder_hours_before ?? 24,
    reminder_final_hours: initialSettings?.reminder_final_hours ?? 2,
    alert_enabled: initialSettings?.alert_enabled ?? true,
    alert_grace_hours: initialSettings?.alert_grace_hours ?? 0,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('group_settings')
        .upsert({
          group_id: groupId,
          ...settings,
        }, {
          onConflict: 'group_id'
        });

      if (error) throw error;
      
      // Auch die alten Felder in groups aktualisieren für Kompatibilität
      await supabase
        .from('groups')
        .update({
          deadline_day: settings.deadline_day,
          deadline_time: settings.deadline_time,
        })
        .eq('id', groupId);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error('Save failed:', err);
      alert('Fehler beim Speichern. Bitte versuche es erneut.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d14' }}>
      {/* Navbar */}
      <nav style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '1rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href={`/groups/${groupId}`} style={{
            color: '#8888aa',
            textDecoration: 'none',
            fontSize: '0.9rem',
          }}>
            ← Zurück
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <span style={{ fontSize: '1rem', fontWeight: '700', color: '#ffffff' }}>
            {groupName}
          </span>
        </div>
      </nav>

      {/* Main */}
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: '800',
          color: '#ffffff',
          marginBottom: '0.5rem',
        }}>
          Gruppen-Settings
        </h1>
        <p style={{ color: '#8888aa', marginBottom: '2rem' }}>
          Konfiguriere Deadline, Erinnerungen und Alerts für diese Gruppe.
        </p>

        {/* Success Message */}
        {showSuccess && (
          <div style={{
            background: 'rgba(0, 200, 100, 0.15)',
            border: '1px solid rgba(0, 200, 100, 0.3)',
            borderRadius: '0.75rem',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            <span style={{ fontSize: '1.25rem' }}>✅</span>
            <span style={{ color: '#00c864', fontWeight: '600' }}>
              Settings gespeichert!
            </span>
          </div>
        )}

        <form onSubmit={handleSave}>
          {/* Deadline Section */}
          <div style={{
            background: '#13131f',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '1rem',
            padding: '1.5rem',
            marginBottom: '1.5rem',
          }}>
            <h2 style={{
              fontSize: '1.1rem',
              fontWeight: '700',
              color: '#ffffff',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              📅 Deadline
            </h2>

            <div style={{ display: 'grid', gap: '1.25rem' }}>
              {/* Tag */}
              <div>
                <label style={{
                  display: 'block',
                  color: '#8888aa',
                  fontSize: '0.875rem',
                  marginBottom: '0.5rem',
                }}>
                  Wochentag
                </label>
                <select
                  value={settings.deadline_day}
                  onChange={(e) => setSettings({ ...settings, deadline_day: parseInt(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: '#0d0d14',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.5rem',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                  }}
                >
                  {WEEKDAYS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Zeit */}
              <div>
                <label style={{
                  display: 'block',
                  color: '#8888aa',
                  fontSize: '0.875rem',
                  marginBottom: '0.5rem',
                }}>
                  Uhrzeit
                </label>
                <input
                  type="time"
                  value={settings.deadline_time}
                  onChange={(e) => setSettings({ ...settings, deadline_time: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: '#0d0d14',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.5rem',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                  }}
                />
              </div>

              {/* Zeitzone */}
              <div>
                <label style={{
                  display: 'block',
                  color: '#8888aa',
                  fontSize: '0.875rem',
                  marginBottom: '0.5rem',
                }}>
                  Zeitzone
                </label>
                <select
                  value={settings.deadline_timezone}
                  onChange={(e) => setSettings({ ...settings, deadline_timezone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: '#0d0d14',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.5rem',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                  }}
                >
                  <option value="Europe/Berlin">Europe/Berlin (CET/CEST)</option>
                  <option value="Europe/Vienna">Europe/Vienna (CET/CEST)</option>
                  <option value="Europe/Zurich">Europe/Zurich (CET/CEST)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>
          </div>

          {/* Reminders Section */}
          <div style={{
            background: '#13131f',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '1rem',
            padding: '1.5rem',
            marginBottom: '1.5rem',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.25rem',
            }}>
              <h2 style={{
                fontSize: '1.1rem',
                fontWeight: '700',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                🔔 Erinnerungen
              </h2>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={settings.reminder_enabled}
                  onChange={(e) => setSettings({ ...settings, reminder_enabled: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ color: '#8888aa', fontSize: '0.875rem' }}>Aktiviert</span>
              </label>
            </div>

            {settings.reminder_enabled && (
              <div style={{ display: 'grid', gap: '1.25rem' }}>
                <div>
                  <label style={{
                    display: 'block',
                    color: '#8888aa',
                    fontSize: '0.875rem',
                    marginBottom: '0.5rem',
                  }}>
                    Erste Erinnerung (Stunden vor Deadline)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={168}
                    value={settings.reminder_hours_before}
                    onChange={(e) => setSettings({ ...settings, reminder_hours_before: parseInt(e.target.value) || 24 })}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: '#0d0d14',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '0.5rem',
                      color: '#ffffff',
                      fontSize: '0.95rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    color: '#8888aa',
                    fontSize: '0.875rem',
                    marginBottom: '0.5rem',
                  }}>
                    Letzte Erinnerung (Stunden vor Deadline)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={settings.reminder_final_hours}
                    onChange={(e) => setSettings({ ...settings, reminder_final_hours: parseInt(e.target.value) || 2 })}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: '#0d0d14',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '0.5rem',
                      color: '#ffffff',
                      fontSize: '0.95rem',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Alerts Section */}
          <div style={{
            background: '#13131f',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '1rem',
            padding: '1.5rem',
            marginBottom: '2rem',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.25rem',
            }}>
              <h2 style={{
                fontSize: '1.1rem',
                fontWeight: '700',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                ⚠️ Missed Update Alerts
              </h2>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={settings.alert_enabled}
                  onChange={(e) => setSettings({ ...settings, alert_enabled: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ color: '#8888aa', fontSize: '0.875rem' }}>Aktiviert</span>
              </label>
            </div>

            {settings.alert_enabled && (
              <div>
                <label style={{
                  display: 'block',
                  color: '#8888aa',
                  fontSize: '0.875rem',
                  marginBottom: '0.5rem',
                }}>
                  Grace Period (Stunden nach Deadline)
                </label>
                <input
                  type="number"
                  min={0}
                  max={72}
                  value={settings.alert_grace_hours}
                  onChange={(e) => setSettings({ ...settings, alert_grace_hours: parseInt(e.target.value) || 0 })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: '#0d0d14',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.5rem',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                  }}
                />
                <p style={{ color: '#666680', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  Zeit nach der Deadline, bevor ein Alert gesendet wird.
                </p>
              </div>
            )}
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={isSaving}
            style={{
              width: '100%',
              padding: '1rem 1.5rem',
              background: isSaving ? 'rgba(0,212,255,0.5)' : '#00d4ff',
              color: '#000',
              fontWeight: '700',
              fontSize: '1rem',
              border: 'none',
              borderRadius: '0.75rem',
              cursor: isSaving ? 'not-allowed' : 'pointer',
            }}
          >
            {isSaving ? 'Speichern...' : '💾 Settings speichern'}
          </button>
        </form>
      </main>
    </div>
  );
}
