-- Phase 3: Weekly Updates & Feed
-- Erstellt: 2026-04-09
-- Features: Updates-Tabelle, Gruppen-Settings, Status-Badges

-- ============================================================
-- Tabelle: updates (Weekly Updates)
-- ============================================================
CREATE TABLE IF NOT EXISTS updates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  group_id      UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  
  -- Die 3 Kern-Fragen
  accomplished  TEXT NOT NULL,           -- Was habe ich geschafft?
  planned       TEXT NOT NULL,           -- Was plane ich?
  blockers      TEXT,                    -- Blocker? (optional)
  
  -- Status & Tracking
  status        TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'late')),
  delivered_at  TIMESTAMPTZ,             -- Wann abgegeben
  
  -- Wochen-Zuordnung (für Filterung/Archivierung)
  week_number   INT NOT NULL,            -- ISO-Woche (1-53)
  year          INT NOT NULL,            -- Jahr
  
  -- Metadaten
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  
  -- Ein Update pro User/Gruppe/Woche
  UNIQUE(user_id, group_id, week_number, year)
);

-- Indexe für Performance
CREATE INDEX IF NOT EXISTS idx_updates_user_id ON updates(user_id);
CREATE INDEX IF NOT EXISTS idx_updates_group_id ON updates(group_id);
CREATE INDEX IF NOT EXISTS idx_updates_week_year ON updates(week_number, year);
CREATE INDEX IF NOT EXISTS idx_updates_status ON updates(status);
CREATE INDEX IF NOT EXISTS idx_updates_delivered_at ON updates(delivered_at);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_updates_updated_at ON updates;
CREATE TRIGGER update_updates_updated_at
  BEFORE UPDATE ON updates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS aktivieren
ALTER TABLE updates ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
  -- Users können eigene Updates lesen/schreiben
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own updates' AND tablename = 'updates') THEN
    CREATE POLICY "Users manage own updates" ON updates
      FOR ALL USING (auth.uid() = user_id);
  END IF;
  
  -- Gruppenmitglieder können Updates ihrer Gruppe sehen
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Group members can view group updates' AND tablename = 'updates') THEN
    CREATE POLICY "Group members can view group updates" ON updates
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM group_members 
          WHERE group_members.group_id = updates.group_id 
          AND group_members.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================
-- Tabelle: group_settings (Erweiterte Gruppen-Konfiguration)
-- ============================================================
-- Erweitert die bestehende 'groups' Tabelle um Settings
CREATE TABLE IF NOT EXISTS group_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id              UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Deadline (kann bestehende deadline_day/time überschreiben/ergänzen)
  deadline_day          INT CHECK (deadline_day BETWEEN 0 AND 6),  -- 0=So, 6=Sa
  deadline_time         TIME,
  deadline_timezone     TEXT DEFAULT 'Europe/Berlin',
  
  -- Reminder-Einstellungen
  reminder_enabled      BOOLEAN DEFAULT true,
  reminder_hours_before INT DEFAULT 24,  -- Erste Erinnerung X Stunden vor Deadline
  reminder_final_hours  INT DEFAULT 2,   -- Letzte Erinnerung X Stunden vor Deadline
  
  -- Alert-Einstellungen bei Missed Update
  alert_enabled         BOOLEAN DEFAULT true,
  alert_grace_hours     INT DEFAULT 0,   -- Grace Period nach Deadline (Stunden)
  
  -- Metadaten
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_group_settings_group_id ON group_settings(group_id);

-- Trigger für updated_at
DROP TRIGGER IF EXISTS update_group_settings_updated_at ON group_settings;
CREATE TRIGGER update_group_settings_updated_at
  BEFORE UPDATE ON group_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS aktivieren
ALTER TABLE group_settings ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
  -- Admins können Settings ihrer Gruppe verwalten
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Group admins manage settings' AND tablename = 'group_settings') THEN
    CREATE POLICY "Group admins manage settings" ON group_settings
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM group_members 
          WHERE group_members.group_id = group_settings.group_id 
          AND group_members.user_id = auth.uid()
          AND group_members.role = 'admin'
        )
      );
  END IF;
  
  -- Alle Mitglieder können Settings lesen
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Group members can read settings' AND tablename = 'group_settings') THEN
    CREATE POLICY "Group members can read settings" ON group_settings
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM group_members 
          WHERE group_members.group_id = group_settings.group_id 
          AND group_members.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================
-- Tabelle: update_alerts (Missed Update Tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS update_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  group_id        UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  week_number     INT NOT NULL,
  year            INT NOT NULL,
  
  -- Alert-Status
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'acknowledged', 'escalated')),
  alert_type      TEXT CHECK (alert_type IN ('missed', 'late', 'reminder')),
  sent_at         TIMESTAMPTZ,
  
  -- Metadaten
  created_at      TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, group_id, week_number, year, alert_type)
);

-- Indexe
CREATE INDEX IF NOT EXISTS idx_update_alerts_user_id ON update_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_update_alerts_group_id ON update_alerts(group_id);
CREATE INDEX IF NOT EXISTS idx_update_alerts_status ON update_alerts(status);

-- RLS
ALTER TABLE update_alerts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own alerts' AND tablename = 'update_alerts') THEN
    CREATE POLICY "Users can read own alerts" ON update_alerts
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role manages alerts' AND tablename = 'update_alerts') THEN
    CREATE POLICY "Service role manages alerts" ON update_alerts
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================
-- Hilfsfunktion: Aktuelle Kalenderwoche berechnen
-- ============================================================
CREATE OR REPLACE FUNCTION get_iso_week(date_input DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (week_num INT, year_num INT) AS $$
BEGIN
  RETURN QUERY SELECT 
    EXTRACT(WEEK FROM date_input)::INT,
    EXTRACT(ISOYEAR FROM date_input)::INT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Hilfsfunktion: Update-Status für User/Gruppe/Woche
-- ============================================================
CREATE OR REPLACE FUNCTION get_update_status(
  p_user_id UUID,
  p_group_id UUID,
  p_week INT DEFAULT EXTRACT(WEEK FROM CURRENT_DATE)::INT,
  p_year INT DEFAULT EXTRACT(ISOYEAR FROM CURRENT_DATE)::INT
)
RETURNS TEXT AS $$
DECLARE
  v_status TEXT;
  v_deadline TIMESTAMPTZ;
  v_delivered_at TIMESTAMPTZ;
BEGIN
  -- Status aus updates Tabelle holen
  SELECT status, delivered_at INTO v_status, v_delivered_at
  FROM updates
  WHERE user_id = p_user_id 
    AND group_id = p_group_id
    AND week_number = p_week 
    AND year = p_year;
  
  -- Wenn kein Update existiert
  IF v_status IS NULL THEN
    -- Prüfe ob Deadline verpasst
    SELECT get_week_deadline(p_group_id, p_week, p_year) INTO v_deadline;
    
    IF v_deadline < now() THEN
      RETURN 'missed';
    ELSE
      RETURN 'pending';
    END IF;
  END IF;
  
  -- Prüfe auf "late" (nach Deadline geliefert)
  IF v_status = 'submitted' AND v_delivered_at IS NOT NULL THEN
    SELECT get_week_deadline(p_group_id, p_week, p_year) INTO v_deadline;
    IF v_delivered_at > v_deadline THEN
      RETURN 'late';
    END IF;
  END IF;
  
  RETURN v_status;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Hilfsfunktion: Deadline für eine bestimmte Woche berechnen
-- ============================================================
CREATE OR REPLACE FUNCTION get_week_deadline(
  p_group_id UUID,
  p_week INT,
  p_year INT
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_deadline_day INT;
  v_deadline_time TIME;
  v_timezone TEXT;
  v_deadline_date DATE;
  v_result TIMESTAMPTZ;
BEGIN
  -- Settings holen (oder Defaults aus groups Tabelle)
  SELECT 
    COALESCE(gs.deadline_day, g.deadline_day, 0),  -- Default: Sonntag
    COALESCE(gs.deadline_time, g.deadline_time, '23:59:00')::TIME,
    COALESCE(gs.deadline_timezone, 'Europe/Berlin')
  INTO v_deadline_day, v_deadline_time, v_timezone
  FROM groups g
  LEFT JOIN group_settings gs ON gs.group_id = g.id
  WHERE g.id = p_group_id;
  
  -- Erster Tag der ISO-Woche (Montag) + Offset zum Deadline-Tag
  v_deadline_date := (make_date(p_year, 1, 4) + 
    ((p_week - 1) * 7 + (v_deadline_day - 1))::INT)::DATE;
  
  -- Konvertiere zu Timestamp mit Zeitzone
  v_result := (v_deadline_date + v_deadline_time)::TIMESTAMPTZ AT TIME ZONE v_timezone;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- View: Gruppen-Feed (alle Updates mit berechnetem Status)
-- ============================================================
CREATE OR REPLACE VIEW group_feed AS
SELECT 
  u.id,
  u.user_id,
  u.group_id,
  up.name AS user_name,
  g.name AS group_name,
  u.accomplished,
  u.planned,
  u.blockers,
  u.status,
  CASE 
    WHEN u.status = 'submitted' AND u.delivered_at <= get_week_deadline(u.group_id, u.week_number, u.year) THEN 'delivered'
    WHEN u.status = 'submitted' AND u.delivered_at > get_week_deadline(u.group_id, u.week_number, u.year) THEN 'late'
    WHEN u.status = 'draft' AND now() > get_week_deadline(u.group_id, u.week_number, u.year) THEN 'missed'
    ELSE u.status
  END AS display_status,
  u.delivered_at,
  u.week_number,
  u.year,
  u.created_at,
  u.updated_at
FROM updates u
JOIN user_profiles up ON up.user_id = u.user_id
JOIN groups g ON g.id = u.group_id;

-- ============================================================
-- Migration: Bestehende Gruppen in group_settings übertragen
-- ============================================================
INSERT INTO group_settings (group_id, deadline_day, deadline_time)
SELECT id, deadline_day, deadline_time
FROM groups
WHERE deadline_day IS NOT NULL OR deadline_time IS NOT NULL
ON CONFLICT (group_id) DO NOTHING;
