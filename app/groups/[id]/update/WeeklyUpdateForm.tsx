'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import type { WeeklyUpdate, WeeklyUpdateInput } from '@/lib/types/updates';
import { STATUS_BADGES } from '@/lib/types/updates';

const supabase = createClient();

interface WeeklyUpdateFormProps {
  groupId: string;
  groupName: string;
  weekNumber: number;
  year: number;
  existingUpdate?: WeeklyUpdate | null;
}

export default function WeeklyUpdateForm({
  groupId,
  groupName,
  weekNumber,
  year,
  existingUpdate,
}: WeeklyUpdateFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(
    existingUpdate?.updated_at ? new Date(existingUpdate.updated_at) : null
  );
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [formData, setFormData] = useState<WeeklyUpdateInput>({
    accomplished: existingUpdate?.accomplished || '',
    planned: existingUpdate?.planned || '',
    blockers: existingUpdate?.blockers || '',
  });

  // Auto-Save nach 3 Sekunden Inaktivität
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.accomplished || formData.planned || formData.blockers) {
        autoSave();
      }
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [formData]);

  const autoSave = useCallback(async () => {
    setIsAutoSaving(true);
    try {
      const { error } = await supabase
        .from('updates')
        .upsert({
          group_id: groupId,
          week_number: weekNumber,
          year: year,
          accomplished: formData.accomplished,
          planned: formData.planned,
          blockers: formData.blockers || null,
          status: 'draft',
        }, {
          onConflict: 'user_id,group_id,week_number,year'
        });

      if (!error) {
        setLastSaved(new Date());
      }
    } catch (err) {
      console.error('Auto-save failed:', err);
    } finally {
      setIsAutoSaving(false);
    }
  }, [formData, groupId, weekNumber, year]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.accomplished.trim() || !formData.planned.trim()) {
      alert('Bitte fülle mindestens "Geschafft" und "Geplant" aus.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('updates')
        .upsert({
          group_id: groupId,
          week_number: weekNumber,
          year: year,
          accomplished: formData.accomplished,
          planned: formData.planned,
          blockers: formData.blockers || null,
          status: 'submitted',
          delivered_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,group_id,week_number,year'
        });

      if (error) throw error;
      
      setShowSuccess(true);
      setTimeout(() => {
        router.push(`/groups/${groupId}`);
      }, 1500);
    } catch (err) {
      console.error('Submit failed:', err);
      alert('Fehler beim Absenden. Bitte versuche es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWeekLabel = () => {
    const now = new Date();
    const currentWeek = getWeekNumber(now);
    const currentYear = now.getFullYear();
    
    if (weekNumber === currentWeek && year === currentYear) {
      return 'Diese Woche';
    }
    return `KW ${weekNumber}/${year}`;
  };

  const isSubmitted = existingUpdate?.status === 'submitted';
  const statusBadge = isSubmitted ? STATUS_BADGES.delivered : STATUS_BADGES.draft;

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
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}>
            ← Zurück
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <span style={{ fontSize: '1rem', fontWeight: '700', color: '#ffffff' }}>
            {groupName}
          </span>
        </div>
        <div style={{
          fontSize: '0.875rem',
          padding: '0.35rem 0.75rem',
          borderRadius: '9999px',
          background: statusBadge.bgColor,
          color: statusBadge.color,
          fontWeight: '600',
        }}>
          {statusBadge.emoji} {statusBadge.label}
        </div>
      </nav>

      {/* Main */}
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: '800',
            color: '#ffffff',
            marginBottom: '0.5rem',
          }}>
            Weekly Update
          </h1>
          <p style={{ color: '#8888aa', fontSize: '0.95rem' }}>
            {getWeekLabel()} · <span style={{ color: '#00d4ff' }}>&lt; 2 Minuten</span>
          </p>
        </div>

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
            <span style={{ fontSize: '1.25rem' }}>🎉</span>
            <span style={{ color: '#00c864', fontWeight: '600' }}>
              Update erfolgreich abgegeben!
            </span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Feld 1: Was habe ich geschafft? */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              color: '#ffffff',
              fontWeight: '600',
              fontSize: '1rem',
              marginBottom: '0.5rem',
            }}>
              ✅ Was habe ich diese Woche geschafft?
            </label>
            <textarea
              value={formData.accomplished}
              onChange={(e) => setFormData({ ...formData, accomplished: e.target.value })}
              placeholder="Z.B.: Landing Page fertiggestellt, 3 Kundenanrufe gemacht, Workout 3x..."
              disabled={isSubmitted}
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '1rem',
                background: '#13131f',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '0.75rem',
                color: '#ffffff',
                fontSize: '0.95rem',
                lineHeight: '1.6',
                resize: 'vertical',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(0,212,255,0.4)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          {/* Feld 2: Was plane ich? */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              color: '#ffffff',
              fontWeight: '600',
              fontSize: '1rem',
              marginBottom: '0.5rem',
            }}>
              🎯 Was plane ich für nächste Woche?
            </label>
            <textarea
              value={formData.planned}
              onChange={(e) => setFormData({ ...formData, planned: e.target.value })}
              placeholder="Z.B.: Blogpost veröffentlichen, Pitch-Deck finalisieren..."
              disabled={isSubmitted}
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '1rem',
                background: '#13131f',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '0.75rem',
                color: '#ffffff',
                fontSize: '0.95rem',
                lineHeight: '1.6',
                resize: 'vertical',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(0,212,255,0.4)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          {/* Feld 3: Blocker (optional) */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{
              display: 'block',
              color: '#ffffff',
              fontWeight: '600',
              fontSize: '1rem',
              marginBottom: '0.5rem',
            }}>
              🚧 Blocker oder Hilfe benötigt? <span style={{ color: '#8888aa', fontWeight: '400' }}>(optional)</span>
            </label>
            <textarea
              value={formData.blockers}
              onChange={(e) => setFormData({ ...formData, blockers: e.target.value })}
              placeholder="Z.B.: Warte auf Feedback vom Designer, unsicher bei der Preisgestaltung..."
              disabled={isSubmitted}
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '1rem',
                background: '#13131f',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '0.75rem',
                color: '#ffffff',
                fontSize: '0.95rem',
                lineHeight: '1.6',
                resize: 'vertical',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(0,212,255,0.4)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          {/* Auto-Save Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
          }}>
            <span style={{ color: '#8888aa', fontSize: '0.85rem' }}>
              {isAutoSaving ? '💾 Speichern...' : lastSaved ? `💾 Gespeichert: ${lastSaved.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}` : ''}
            </span>
          </div>

          {/* Submit Button */}
          {!isSubmitted ? (
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '1rem 1.5rem',
                background: isSubmitting ? 'rgba(0,212,255,0.5)' : '#00d4ff',
                color: '#000',
                fontWeight: '700',
                fontSize: '1rem',
                border: 'none',
                borderRadius: '0.75rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {isSubmitting ? 'Wird abgegeben...' : '🚀 Update abgeben'}
            </button>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '1rem',
              background: 'rgba(0, 200, 100, 0.1)',
              borderRadius: '0.75rem',
              color: '#00c864',
              fontWeight: '600',
            }}>
              ✅ Du hast diese Woche bereits abgegeben!
            </div>
          )}
        </form>
      </main>
    </div>
  );
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
