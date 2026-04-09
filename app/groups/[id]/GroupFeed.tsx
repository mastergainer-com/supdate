'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import type { GroupFeedItem } from '@/lib/types/updates';
import { STATUS_BADGES } from '@/lib/types/updates';

const supabase = createClient();

interface GroupFeedProps {
  groupId: string;
  groupName: string;
  isAdmin: boolean;
  initialFeed: GroupFeedItem[];
  members: { user_id: string; name: string; role: string }[];
}

export default function GroupFeed({
  groupId,
  groupName,
  isAdmin,
  initialFeed,
  members,
}: GroupFeedProps) {
  const [feed, setFeed] = useState<GroupFeedItem[]>(initialFeed);
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentWeek, setCurrentWeek] = useState<number>(0);
  const [currentYear, setCurrentYear] = useState<number>(0);

  useEffect(() => {
    // Aktuelle Woche berechnen
    const now = new Date();
    setCurrentWeek(getWeekNumber(now));
    setCurrentYear(now.getFullYear());
  }, []);

  const filteredFeed = feed.filter((item) => {
    if (filterUser !== 'all' && item.user_id !== filterUser) return false;
    if (filterStatus !== 'all' && item.display_status !== filterStatus) return false;
    return true;
  });

  const currentWeekUpdates = feed.filter(
    (item) => item.week_number === currentWeek && item.year === currentYear
  );

  const getStatusBadge = (status: string) => {
    const badge = STATUS_BADGES[status as keyof typeof STATUS_BADGES] || STATUS_BADGES.pending;
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        fontSize: '0.75rem',
        fontWeight: '600',
        padding: '0.25rem 0.6rem',
        borderRadius: '9999px',
        background: badge.bgColor,
        color: badge.color,
      }}>
        {badge.emoji} {badge.label}
      </span>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      {/* Aktuelle Woche Übersicht */}
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
          marginBottom: '1rem',
        }}>
          <h3 style={{
            fontSize: '1.1rem',
            fontWeight: '700',
            color: '#ffffff',
          }}>
            KW {currentWeek} — Übersicht
          </h3>
          <Link
            href={`/groups/${groupId}/update`}
            style={{
              background: '#00d4ff',
              color: '#000',
              fontWeight: '600',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            Mein Update
          </Link>
        </div>

        {/* Member Status Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '0.75rem',
        }}>
          {members.map((member) => {
            const update = currentWeekUpdates.find((u) => u.user_id === member.user_id);
            const status = update?.display_status || 'pending';
            const badge = STATUS_BADGES[status as keyof typeof STATUS_BADGES] || STATUS_BADGES.pending;

            return (
              <div
                key={member.user_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '0.5rem',
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  color: '#000',
                }}>
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {member.name}
                  </p>
                  <span style={{
                    fontSize: '0.7rem',
                    color: badge.color,
                    fontWeight: '600',
                  }}>
                    {badge.emoji} {badge.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
      }}>
        <select
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          style={{
            padding: '0.5rem 1rem',
            background: '#13131f',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '0.5rem',
            color: '#ffffff',
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          <option value="all">Alle Mitglieder</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>{m.name}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '0.5rem 1rem',
            background: '#13131f',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '0.5rem',
            color: '#ffffff',
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          <option value="all">Alle Status</option>
          <option value="delivered">✅ Geliefert</option>
          <option value="late">⚠️ Spät</option>
          <option value="missed">❌ Nicht geliefert</option>
          <option value="pending">⏳ Ausstehend</option>
        </select>
      </div>

      {/* Feed List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredFeed.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 2rem',
            background: '#13131f',
            border: '1px dashed rgba(255,255,255,0.1)',
            borderRadius: '1rem',
          }}>
            <p style={{ color: '#8888aa' }}>Noch keine Updates vorhanden.</p>
          </div>
        ) : (
          filteredFeed.map((item) => (
            <div
              key={item.id}
              style={{
                background: '#13131f',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '1rem',
                padding: '1.5rem',
                transition: 'all 0.2s',
              }}
            >
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    fontWeight: '700',
                    color: '#000',
                  }}>
                    {item.user_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ color: '#ffffff', fontWeight: '600', fontSize: '0.95rem' }}>
                      {item.user_name}
                    </p>
                    <p style={{ color: '#8888aa', fontSize: '0.8rem' }}>
                      KW {item.week_number}/{item.year}
                    </p>
                  </div>
                </div>
                {getStatusBadge(item.display_status)}
              </div>

              {/* Content */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Geschafft */}
                <div>
                  <p style={{
                    color: '#8888aa',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.35rem',
                  }}>
                    ✅ Geschafft
                  </p>
                  <p style={{ color: '#ffffff', fontSize: '0.9rem', lineHeight: '1.5' }}>
                    {item.accomplished}
                  </p>
                </div>

                {/* Geplant */}
                <div>
                  <p style={{
                    color: '#8888aa',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.35rem',
                  }}>
                    🎯 Geplant
                  </p>
                  <p style={{ color: '#ffffff', fontSize: '0.9rem', lineHeight: '1.5' }}>
                    {item.planned}
                  </p>
                </div>

                {/* Blocker (optional) */}
                {item.blockers && (
                  <div style={{
                    background: 'rgba(255, 170, 0, 0.08)',
                    border: '1px solid rgba(255, 170, 0, 0.2)',
                    borderRadius: '0.5rem',
                    padding: '0.75rem',
                  }}>
                    <p style={{
                      color: '#ffaa00',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '0.35rem',
                    }}>
                      🚧 Blocker
                    </p>
                    <p style={{ color: '#ffffff', fontSize: '0.9rem', lineHeight: '1.5' }}>
                      {item.blockers}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{
                marginTop: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span style={{ color: '#8888aa', fontSize: '0.8rem' }}>
                  Abgegeben: {formatDate(item.delivered_at)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
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
