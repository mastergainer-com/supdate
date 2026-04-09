# SUPDATE Phase 5 — Cron-Jobs Konfiguration

## Übersicht

| Job | Häufigkeit | Zeit | Funktion |
|-----|------------|------|----------|
| schedule-reminders | Täglich | 00:00 UTC | Erstellt Reminder-Einträge |
| send-reminders | Stündlich | :00 | Sendet fällige Reminder |
| process-offboarding | Täglich | 01:00 UTC | Prüft Offboarding-Stufen |
| calculate-scores | Wöchentlich | So 23:00 UTC | Berechnet Gruppen-Scores |

---

## Supabase Cron-Jobs einrichten

### 1. schedule-reminders (täglich)
```sql
SELECT cron.schedule(
  'schedule-reminders',
  '0 0 * * *',
  $$
    SELECT net.http_post(
      url:='https://mctbuvwcupeovtdqeoru.supabase.co/functions/v1/schedule-reminders',
      headers:='{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
    ) AS request_id;
  $$
);
```

### 2. send-reminders (stündlich)
```sql
SELECT cron.schedule(
  'send-reminders',
  '0 * * * *',
  $$
    SELECT net.http_post(
      url:='https://mctbuvwcupeovtdqeoru.supabase.co/functions/v1/send-reminders',
      headers:='{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
    ) AS request_id;
  $$
);
```

### 3. process-offboarding (täglich)
```sql
SELECT cron.schedule(
  'process-offboarding',
  '0 1 * * *',
  $$
    SELECT net.http_post(
      url:='https://mctbuvwcupeovtdqeoru.supabase.co/functions/v1/process-offboarding',
      headers:='{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
    ) AS request_id;
  $$
);
```

### 4. calculate-scores (wöchentlich)
```sql
SELECT cron.schedule(
  'calculate-scores',
  '0 23 * * 0',
  $$
    SELECT net.http_post(
      url:='https://mctbuvwcupeovtdqeoru.supabase.co/functions/v1/calculate-scores',
      headers:='{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
    ) AS request_id;
  $$
);
```

---

## Umgebungsvariablen (Supabase)

In der Supabase Console unter Project Settings → API:

```
TELEGRAM_BOT_TOKEN=your_bot_token_here
RESEND_API_KEY=your_resend_key_here
EMAIL_FROM=SUPDATE <noreply@sup.date>
SITE_URL=https://sup.date
```

---

## Telegram Bot einrichten

1. Bei @BotFather neuen Bot erstellen
2. Bot-Token kopieren
3. In Supabase Edge Function Secrets einfügen
4. Webhook setzen:
   ```bash
   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
     -d "url=https://sup.date/api/telegram/webhook"
   ```

---

## Manuelles Testen

```bash
# Reminder-Scheduler
curl -X POST https://mctbuvwcupeovtdqeoru.supabase.co/functions/v1/schedule-reminders \
  -H "Authorization: Bearer <service_role_key>"

# Reminder-Sender
curl -X POST https://mctbuvwcupeovtdqeoru.supabase.co/functions/v1/send-reminders \
  -H "Authorization: Bearer <service_role_key>"

# Offboarding
curl -X POST https://mctbuvwcupeovtdqeoru.supabase.co/functions/v1/process-offboarding \
  -H "Authorization: Bearer <service_role_key>"
```

---

## Monitoring

Logs in Supabase Dashboard:
- Edge Functions → Logs
- Database → Cron Jobs (Execution History)

Wichtige Metriken:
- Reminder-Send-Rate (>95%)
- Offboarding-Verarbeitung (täglich)
- Telegram API Errors
