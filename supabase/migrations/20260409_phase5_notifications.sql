-- ============================================================
-- Phase 5: Notifications & Offboarding
-- Erstellt: 2026-04-09
-- Features: Telegram, Reminders, Offboarding, Streaks, Scores
-- ============================================================

-- ============================================================
-- 1. user_profiles erweitern
-- ============================================================
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS telegram_handle   TEXT,
  ADD COLUMN IF NOT EXISTS telegram_chat_id  TEXT,
  ADD COLUMN IF NOT EXISTS streak_count      INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_last_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pause_until       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_delivered   INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_missed      INT DEFAULT 0;

-- Index für Telegram-Lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_telegram_chat_id ON user_profiles(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_pause_until ON user_profiles(pause_until) WHERE pause_until IS NOT NULL;

-- ============================================================
-- 2. offboarding_log Tabelle
-- ============================================================
CREATE TABLE IF NOT EXISTS offboarding_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  group_id        UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  
  -- Offboarding-Details
  stage           INT NOT NULL CHECK (stage IN (1, 2, 3)),
  triggered_at    TIMESTAMPTZ DEFAULT now(),
  triggered_by    TEXT CHECK (triggered_by IN ('system', 'admin')),
  
  -- User-Reaktion
  responded_at    TIMESTAMPTZ,
  response_action TEXT CHECK (response_action IN ('resumed', 'paused', 'left', 'ignored')),
  
  -- Finaler Status
  final_status    TEXT CHECK (final_status IN ('active', 'paused', 'removed', 'reinstated')),
  
  -- Metadaten
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexe
CREATE INDEX IF NOT EXISTS idx_offboarding_user_id ON offboarding_log(user_id);
CREATE INDEX IF NOT EXISTS idx_offboarding_group_id ON offboarding_log(group_id);
CREATE INDEX IF NOT EXISTS idx_offboarding_stage ON offboarding_log(stage);
CREATE INDEX IF NOT EXISTS idx_offboarding_triggered_at ON offboarding_log(triggered_at);

-- RLS aktivieren
ALTER TABLE offboarding_log ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users read own offboarding log' AND tablename = 'offboarding_log') THEN
    CREATE POLICY "Users read own offboarding log" ON offboarding_log
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role manages offboarding' AND tablename = 'offboarding_log') THEN
    CREATE POLICY "Service role manages offboarding" ON offboarding_log
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================
-- 3. group_scores Tabelle
-- ============================================================
CREATE TABLE IF NOT EXISTS group_scores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id          UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  
  -- Zeitliche Zuordnung
  week_number       INT NOT NULL,
  year              INT NOT NULL,
  
  -- Score-Komponenten
  completion_rate   DECIMAL(5,2) DEFAULT 0,
  avg_streak        DECIMAL(5,2) DEFAULT 0,
  punctuality_score DECIMAL(5,2) DEFAULT 0,
  
  -- Gesamtscore (gewichtet)
  total_score       DECIMAL(5,2) DEFAULT 0,
  
  -- Metadaten
  calculated_at     TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(group_id, week_number, year)
);

-- Indexe
CREATE INDEX IF NOT EXISTS idx_group_scores_group_id ON group_scores(group_id);
CREATE INDEX IF NOT EXISTS idx_group_scores_week_year ON group_scores(week_number, year);

-- RLS aktivieren
ALTER TABLE group_scores ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Group members can read scores' AND tablename = 'group_scores') THEN
    CREATE POLICY "Group members can read scores" ON group_scores
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM group_members 
          WHERE group_members.group_id = group_scores.group_id 
          AND group_members.user_id = auth.uid()
        )
      );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role manages scores' AND tablename = 'group_scores') THEN
    CREATE POLICY "Service role manages scores" ON group_scores
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================
-- 4. reminders Tabelle (Tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS reminders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  group_id        UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  
  -- Reminder-Details
  reminder_type   TEXT NOT NULL CHECK (reminder_type IN ('24h', '2h', 'missed', 'offboarding_1', 'offboarding_2', 'offboarding_3')),
  channel         TEXT NOT NULL CHECK (channel IN ('telegram', 'email')),
  
  -- Status
  scheduled_at    TIMESTAMPTZ NOT NULL,
  sent_at         TIMESTAMPTZ,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error_message   TEXT,
  
  -- Metadaten
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexe
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_at ON reminders(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_pending ON reminders(scheduled_at, status) WHERE status = 'pending';

-- RLS aktivieren
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users read own reminders' AND tablename = 'reminders') THEN
    CREATE POLICY "Users read own reminders" ON reminders
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role manages reminders' AND tablename = 'reminders') THEN
    CREATE POLICY "Service role manages reminders" ON reminders
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================
-- 5. Hilfsfunktion: Streak aktualisieren
-- ============================================================
CREATE OR REPLACE FUNCTION update_streak_on_submit()
RETURNS TRIGGER AS $$
DECLARE
  v_deadline TIMESTAMPTZ;
  v_current_streak INT;
BEGIN
  -- Nur bei Status-Änderung zu 'submitted'
  IF NEW.status != 'submitted' OR OLD.status = 'submitted' THEN
    RETURN NEW;
  END IF;
  
  -- Deadline holen
  SELECT get_week_deadline(NEW.group_id, NEW.week_number, NEW.year) INTO v_deadline;
  
  -- Aktuellen Streak holen
  SELECT COALESCE(streak_count, 0) INTO v_current_streak
  FROM user_profiles 
  WHERE id = NEW.user_id;
  
  -- Update war pünktlich (vor oder genau zur Deadline)
  IF NEW.delivered_at IS NOT NULL AND NEW.delivered_at <= v_deadline THEN
    UPDATE user_profiles 
    SET streak_count = v_current_streak + 1,
        streak_last_at = NEW.delivered_at,
        total_delivered = COALESCE(total_delivered, 0) + 1
    WHERE id = NEW.user_id;
  ELSE
    -- Verspätet oder keine delivered_at: Streak bleibt, total_delivered +1
    UPDATE user_profiles 
    SET total_delivered = COALESCE(total_delivered, 0) + 1
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger erstellen
DROP TRIGGER IF EXISTS trigger_update_streak ON updates;
CREATE TRIGGER trigger_update_streak
  AFTER UPDATE ON updates
  FOR EACH ROW
  EXECUTE FUNCTION update_streak_on_submit();

-- Auch bei INSERT (wenn direkt als submitted eingefügt)
CREATE OR REPLACE FUNCTION update_streak_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_deadline TIMESTAMPTZ;
  v_current_streak INT;
BEGIN
  -- Nur wenn Status 'submitted'
  IF NEW.status != 'submitted' THEN
    RETURN NEW;
  END IF;
  
  -- Deadline holen
  SELECT get_week_deadline(NEW.group_id, NEW.week_number, NEW.year) INTO v_deadline;
  
  -- Aktuellen Streak holen
  SELECT COALESCE(streak_count, 0) INTO v_current_streak
  FROM user_profiles 
  WHERE id = NEW.user_id;
  
  -- Update war pünktlich
  IF NEW.delivered_at IS NOT NULL AND NEW.delivered_at <= v_deadline THEN
    UPDATE user_profiles 
    SET streak_count = v_current_streak + 1,
        streak_last_at = NEW.delivered_at,
        total_delivered = COALESCE(total_delivered, 0) + 1
    WHERE id = NEW.user_id;
  ELSE
    UPDATE user_profiles 
    SET total_delivered = COALESCE(total_delivered, 0) + 1
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_streak_insert ON updates;
CREATE TRIGGER trigger_update_streak_insert
  AFTER INSERT ON updates
  FOR EACH ROW
  EXECUTE FUNCTION update_streak_on_insert();

-- ============================================================
-- 6. Hilfsfunktion: Streak reset bei verpasstem Update
-- ============================================================
CREATE OR REPLACE FUNCTION reset_streak_on_missed()
RETURNS TRIGGER AS $$
BEGIN
  -- Wenn Status auf 'late' oder verpasst gesetzt wird
  IF NEW.status IN ('late') AND (OLD.status IS NULL OR OLD.status = 'draft') THEN
    -- Prüfen ob es wirklich verpasst wurde (nach Deadline)
    DECLARE
      v_deadline TIMESTAMPTZ;
    BEGIN
      SELECT get_week_deadline(NEW.group_id, NEW.week_number, NEW.year) INTO v_deadline;
      
      IF NEW.delivered_at > v_deadline OR NEW.delivered_at IS NULL THEN
        -- Streak reset
        UPDATE user_profiles 
        SET streak_count = 0,
            total_missed = COALESCE(total_missed, 0) + 1
        WHERE id = NEW.user_id;
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reset_streak ON updates;
CREATE TRIGGER trigger_reset_streak
  AFTER UPDATE ON updates
  FOR EACH ROW
  EXECUTE FUNCTION reset_streak_on_missed();

-- ============================================================
-- 7. Hilfsfunktion: Gruppen-Score berechnen
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_group_score(
  p_group_id UUID,
  p_week INT,
  p_year INT
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  v_completion_rate DECIMAL(5,2);
  v_avg_streak DECIMAL(5,2);
  v_punctuality_score DECIMAL(5,2);
  v_total_score DECIMAL(5,2);
  v_member_count INT;
  v_updates_count INT;
  v_on_time_count INT;
BEGIN
  -- Anzahl aktiver Mitglieder
  SELECT COUNT(*) INTO v_member_count
  FROM group_members
  WHERE group_id = p_group_id AND status = 'active';
  
  -- Anzahl gelieferter Updates
  SELECT COUNT(*) INTO v_updates_count
  FROM updates
  WHERE group_id = p_group_id 
    AND week_number = p_week 
    AND year = p_year
    AND status = 'submitted';
  
  -- Anzahl pünktlicher Updates
  SELECT COUNT(*) INTO v_on_time_count
  FROM updates
  WHERE group_id = p_group_id 
    AND week_number = p_week 
    AND year = p_year
    AND status = 'submitted'
    AND delivered_at <= get_week_deadline(group_id, week_number, year);
  
  -- Completion Rate
  IF v_member_count > 0 THEN
    v_completion_rate := (v_updates_count::DECIMAL / v_member_count::DECIMAL) * 100;
  ELSE
    v_completion_rate := 0;
  END IF;
  
  -- Durchschnittlicher Streak
  SELECT COALESCE(AVG(streak_count), 0) INTO v_avg_streak
  FROM user_profiles up
  JOIN group_members gm ON gm.user_id = up.id
  WHERE gm.group_id = p_group_id AND gm.status = 'active';
  
  -- Pünktlichkeit
  IF v_updates_count > 0 THEN
    v_punctuality_score := (v_on_time_count::DECIMAL / v_updates_count::DECIMAL) * 100;
  ELSE
    v_punctuality_score := 0;
  END IF;
  
  -- Gewichteter Gesamtscore
  v_total_score := (v_completion_rate * 0.5) + (v_avg_streak * 5) + (v_punctuality_score * 0.3);
  
  -- Speichern
  INSERT INTO group_scores (
    group_id, week_number, year,
    completion_rate, avg_streak, punctuality_score, total_score
  ) VALUES (
    p_group_id, p_week, p_year,
    v_completion_rate, v_avg_streak, v_punctuality_score, v_total_score
  )
  ON CONFLICT (group_id, week_number, year)
  DO UPDATE SET
    completion_rate = EXCLUDED.completion_rate,
    avg_streak = EXCLUDED.avg_streak,
    punctuality_score = EXCLUDED.punctuality_score,
    total_score = EXCLUDED.total_score,
    calculated_at = now();
  
  RETURN v_total_score;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 8. Hilfsfunktion: Ist User in Pause?
-- ============================================================
CREATE OR REPLACE FUNCTION is_user_paused(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_pause_until TIMESTAMPTZ;
BEGIN
  SELECT pause_until INTO v_pause_until
  FROM user_profiles
  WHERE id = p_user_id;
  
  RETURN v_pause_until IS NOT NULL AND v_pause_until > now();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 9. Hilfsfunktion: Offboarding-Stufe ermitteln
-- ============================================================
CREATE OR REPLACE FUNCTION get_offboarding_stage(p_user_id UUID, p_group_id UUID)
RETURNS INT AS $$
DECLARE
  v_consecutive_missed INT := 0;
  v_current_week INT;
  v_current_year INT;
  v_week INT;
  v_year INT;
  v_has_update BOOLEAN;
BEGIN
  -- Aktuelle Woche
  SELECT EXTRACT(WEEK FROM CURRENT_DATE)::INT, EXTRACT(ISOYEAR FROM CURRENT_DATE)::INT
  INTO v_current_week, v_current_year;
  
  -- Rückwärts prüfen (max 3 Wochen)
  FOR i IN 0..2 LOOP
    v_week := v_current_week - i;
    v_year := v_current_year;
    
    -- Wochen-Überlauf behandeln
    IF v_week < 1 THEN
      v_week := 52;
      v_year := v_year - 1;
    END IF;
    
    -- Prüfen ob Update existiert
    SELECT EXISTS(
      SELECT 1 FROM updates
      WHERE user_id = p_user_id 
        AND group_id = p_group_id
        AND week_number = v_week 
        AND year = v_year
        AND status = 'submitted'
    ) INTO v_has_update;
    
    IF v_has_update THEN
      EXIT;  -- Abbruch bei gefundenem Update
    ELSE
      v_consecutive_missed := v_consecutive_missed + 1;
    END IF;
  END LOOP;
  
  RETURN v_consecutive_missed;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 10. View: User-Status mit Streak & Pause
-- ============================================================
CREATE OR REPLACE VIEW user_status AS
SELECT 
  up.id AS user_id,
  up.name,
  up.email,
  up.telegram_handle,
  up.telegram_chat_id,
  up.streak_count,
  up.streak_last_at,
  up.pause_until,
  up.total_delivered,
  up.total_missed,
  is_user_paused(up.id) AS is_paused,
  gm.group_id,
  g.name AS group_name,
  gm.status AS membership_status
FROM user_profiles up
LEFT JOIN group_members gm ON gm.user_id = up.id AND gm.status = 'active'
LEFT JOIN groups g ON g.id = gm.group_id;

-- ============================================================
-- 11. View: Anstehende Reminder
-- ============================================================
CREATE OR REPLACE VIEW upcoming_reminders AS
SELECT 
  r.id,
  r.user_id,
  r.group_id,
  r.reminder_type,
  r.channel,
  r.scheduled_at,
  r.status,
  up.name AS user_name,
  up.email,
  up.telegram_chat_id,
  g.name AS group_name,
  gs.deadline_day,
  gs.deadline_time
FROM reminders r
JOIN user_profiles up ON up.id = r.user_id
JOIN groups g ON g.id = r.group_id
LEFT JOIN group_settings gs ON gs.group_id = g.id
WHERE r.status = 'pending'
  AND r.scheduled_at <= now() + INTERVAL '1 hour'
ORDER BY r.scheduled_at;
