import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export default async function OnboardingRouter() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('onboarding_step, onboarding_completed_at')
    .eq('id', user.id)
    .single()

  // Already completed onboarding
  if (profile?.onboarding_completed_at) {
    redirect('/dashboard')
  }

  const step = profile?.onboarding_step ?? 0

  if (step === 0) redirect('/onboarding/step-1')
  if (step === 1) redirect('/onboarding/step-2')
  if (step >= 2) redirect('/onboarding/step-3')

  // Fallback
  redirect('/onboarding/step-1')
}
