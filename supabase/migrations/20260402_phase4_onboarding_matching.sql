-- Phase 4: Onboarding + Matching
-- user_profiles erweitern
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS onboarding_step         INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commitment_level        TEXT CHECK (commitment_level IN ('low','medium','high')),
  ADD COLUMN IF NOT EXISTS commitment_confirmed    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS video_link              TEXT,
  ADD COLUMN IF NOT EXISTS availability_hours_week INT,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tourist_filtered        BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_admin               BOOLEAN DEFAULT false;

-- Admin setzen
UPDATE user_profiles SET is_admin = true
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jochen@jasch.cc');

-- onboarding_commitments
CREATE TABLE IF NOT EXISTS onboarding_commitments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_key     TEXT NOT NULL,
  confirmed    BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMPTZ,
  UNIQUE(user_id, item_key)
);
ALTER TABLE onboarding_commitments ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own commitments' AND tablename = 'onboarding_commitments') THEN
    CREATE POLICY "Users manage own commitments" ON onboarding_commitments
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- matching_assignments
CREATE TABLE IF NOT EXISTS matching_assignments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id     UUID REFERENCES groups(id) ON DELETE CASCADE,
  assigned_by  UUID REFERENCES auth.users(id),
  assigned_at  TIMESTAMPTZ DEFAULT now(),
  notified_at  TIMESTAMPTZ,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  UNIQUE(user_id, group_id)
);
ALTER TABLE matching_assignments ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users read own assignments' AND tablename = 'matching_assignments') THEN
    CREATE POLICY "Users read own assignments" ON matching_assignments
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role manages assignments' AND tablename = 'matching_assignments') THEN
    CREATE POLICY "Service role manages assignments" ON matching_assignments
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;
