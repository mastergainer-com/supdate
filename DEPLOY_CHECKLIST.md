# SUPDATE Phase 5 — Deployment Checklist

## Pre-Deployment

- [ ] Alle Änderungen committed
- [ ] Build erfolgreich (`npm run build`)
- [ ] Migration getestet

## Deployment Schritte

### 1. Datenbank-Migration
```bash
cd /Users/gibor/.openclaw/workspace-main/projects/supdate
supabase db push
```

### 2. Edge Functions deployen
```bash
supabase functions deploy send-telegram-message
supabase functions deploy send-reminders
supabase functions deploy schedule-reminders
supabase functions deploy process-offboarding
supabase functions deploy calculate-scores
```

### 3. Umgebungsvariablen setzen (Supabase Dashboard)
```
TELEGRAM_BOT_TOKEN=<vom_botfather>
RESEND_API_KEY=<von_resend>
EMAIL_FROM=SUPDATE <noreply@sup.date>
SITE_URL=https://sup.date
```

### 4. Vercel Deploy
```bash
vercel --prod
```

### 5. Telegram Bot Webhook setzen
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://sup.date/api/telegram/webhook"
```

### 6. Cron-Jobs einrichten (Supabase SQL Editor)
```sql
-- Täglich: Reminder-Scheduler
SELECT cron.schedule('schedule-reminders', '0 0 * * *', 
  $$SELECT net.http_post(
    url:='https://mctbuvwcupeovtdqeoru.supabase.co/functions/v1/schedule-reminders',
    headers:='{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  )$$);

-- Stündlich: Reminder-Sender  
SELECT cron.schedule('send-reminders', '0 * * * *',
  $$SELECT net.http_post(
    url:='https://mctbuvwcupeovtdqeoru.supabase.co/functions/v1/send-reminders',
    headers:='{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  )$$);

-- Täglich: Offboarding
SELECT cron.schedule('process-offboarding', '0 1 * * *',
  $$SELECT net.http_post(
    url:='https://mctbuvwcupeovtdqeoru.supabase.co/functions/v1/process-offboarding',
    headers:='{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  )$$);

-- Wöchentlich: Scores
SELECT cron.schedule('calculate-scores', '0 23 * * 0',
  $$SELECT net.http_post(
    url:='https://mctbuvwcupeovtdqeoru.supabase.co/functions/v1/calculate-scores',
    headers:='{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  )$$);
```

## Post-Deployment Tests

- [ ] `/settings` lädt korrekt
- [ ] Telegram-Handle kann gespeichert werden
- [ ] Pause kann gestartet/beendet werden
- [ ] Dashboard zeigt Streak an
- [ ] Edge Functions respondieren (via Logs)

## Monitoring

- Supabase Dashboard → Edge Functions → Logs
- Supabase Dashboard → Database → Cron Jobs
- Vercel Dashboard → Logs

## Rollback-Plan

Falls Probleme auftreten:
1. Edge Functions deaktivieren (kein Cron mehr)
2. Letzter bekannter guter Commit deployen
3. Migration ggf. zurückrollen
