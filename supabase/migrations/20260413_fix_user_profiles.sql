-- Fix: Create user_profiles table if not exists
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT,
  name TEXT,
  goal TEXT,
  why TEXT,
  horizon TEXT,
  success_indicator TEXT,
  video_link TEXT,
  commitment_level TEXT CHECK (commitment_level IN ('low','medium','high')),
  commitment_confirmed BOOLEAN DEFAULT false,
  availability_hours_week INT,
  onboarding_step INT DEFAULT 0,
  onboarding_completed_at TIMESTAMPTZ,
  tourist_filtered BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users read own profile' AND tablename = 'user_profiles') THEN
    CREATE POLICY "Users read own profile" ON user_profiles
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users update own profile' AND tablename = 'user_profiles') THEN
    CREATE POLICY "Users update own profile" ON user_profiles
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users insert own profile' AND tablename = 'user_profiles') THEN
    CREATE POLICY "Users insert own profile" ON user_profiles
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Set admin
UPDATE user_profiles SET is_admin = true
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jochen@jasch.cc');
