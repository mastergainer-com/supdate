# SUPDATE — Projektplan
**Version:** 2.0
**Datum:** 21.03.2026
**PM:** Guidon

---

## Phasen & Meilensteine

### Phase 1: Foundation ✅ DONE (20.03.2026)
- ✅ Domain sup.date gesichert + DNS konfiguriert
- ✅ Landing Page live (sup.date) mit Waitlist
- ✅ Double Opt-in Mailingliste (Resend + DKIM)
- ✅ Unsubscribe-Funktion
- ✅ Brainstorm (Gibor, Benaja, Atlas, Mark)
- ✅ Business Plan, Konzept, Risk Register

### Phase 2: Sprint 1 — Auth & Gruppen ✅ DONE (20–21.03.2026)
- ✅ App deployed (app.sup.date)
- ✅ Google OAuth + Email/Passwort Login
- ✅ Registrierung mit Email-Bestätigung
- ✅ Passwort vergessen / Reset
- ✅ Onboarding (Goal Statement)
- ✅ Gruppen erstellen + Einladungslink
- ✅ Gruppe beitreten (/join/[token])
- ✅ Member-Übersicht

### Phase 3: Sprint 2 — Weekly Updates & Feed ✅ DONE (09.04.2026)
**Ziel:** Kern-Feature — wöchentliche Updates + Transparenz

| Task | Owner | Status |
|---|---|---|
| Weekly Update Formular (3 Felder, <2 Min) | Gibor | ✅ |
| Gruppen-Feed (alle Updates sichtbar) | Gibor | ✅ |
| Status-Badges (✅ Geliefert / ⚠️ Spät / ❌ Nicht geliefert) | Gibor | ✅ |
| Update-Deadline pro Gruppe (konfigurierbar) | Gibor | ✅ |
| Missed Update Alert (automatisch) | Gibor | ✅ |

**Neue Features:**
- `/groups/[id]/update` — Weekly Update Formular mit Auto-Save
- `/groups/[id]/settings` — Deadline, Reminders, Alerts konfigurierbar
- `group_feed` View — Chronologischer Feed mit Status-Badges
- Filter nach User/Status im Feed
- Datenbank: `updates`, `group_settings`, `update_alerts` Tabellen

### Phase 4: Sprint 3 — Matching & Onboarding (KW 15–16)
**Ziel:** Bewerbungs-Flow + manuelles Matching-Dashboard

| Task | Owner | Status |
|---|---|---|
| 3-Step Onboarding (Quick Profile → Goal → Commitment) | Gibor | 🔲 |
| Video/Audio Link-Feld (Loom/YouTube) | Gibor | 🔲 |
| Touristen-Filter (Commitment-Check Pflichtbestätigungen) | Gibor | 🔲 |
| Admin-Dashboard für manuelles Matching | Gibor | 🔲 |
| Matching-Notifications (Gruppenzuweisung per Email) | Gibor | 🔲 |

### Phase 5: Sprint 4 — Notifications & Konsequenzen (KW 17–18)
**Ziel:** Reminder-System + automatisches Offboarding

| Task | Owner | Status |
|---|---|---|
| Telegram Bot Reminder (24h + 2h vor Deadline) | Gibor | 🔲 |
| Email Reminder (Fallback) | Gibor | 🔲 |
| 3-Stufen Offboarding (Nudge → Warning → Soft-Remove) | Gibor | 🔲 |
| Streak-Counter + Gruppen-Score | Gibor | 🔲 |
| Pause-Funktion (2 Wochen, kein Strike) | Gibor | 🔲 |

### Phase 6: Sprint 5 — Polish & Beta (KW 19–20)
**Ziel:** Beta-Launch mit 50 Usern

| Task | Owner | Status |
|---|---|---|
| Bug-Fixes + UX-Improvements | Gibor | 🔲 |
| Beta-Einladungen verschicken (Waitlist) | Jochen + Mark | 🔲 |
| Zero-Silence Onboarding Emails (Tag 0/1/2) | Guidon | 🔲 |
| Monitoring-Dashboard (Activity, Retention) | Gibor | 🔲 |
| Post-Launch Feedback sammeln | Jochen | 🔲 |

### Phase 7: Growth (ab KW 21)
| Task | Owner | Status |
|---|---|---|
| LinkedIn Content-Strategie | Mark | 🔲 |
| "30 Tage SUPDATE" Erfahrungsberichte | Jochen | 🔲 |
| Pro-Plan Launch (€9/Monat) | Guidon + Gibor | 🔲 |
| Podcast-Auftritte | Jochen + Mark | 🔲 |
| Semi-automatisches Matching (Phase 2) | Gibor | 🔲 |

---

## Ressourcen

| Ressource | Status |
|---|---|
| Domain sup.date | ✅ Live |
| App app.sup.date | ✅ Live |
| Landing Page sup.date | ✅ Live + Waitlist |
| Cloudflare DNS | ✅ Active |
| Supabase (mctbuvwcupeovtdqeoru) | ✅ Active |
| Vercel (supdate-app) | ✅ Deployed |
| Resend (Email) | ✅ DKIM verified |
| Google OAuth | ✅ Konfiguriert |
| GitHub Repo | ✅ mastergainer-com/supdate |

---

## Timeline

```
KW 12 ████████████████ Phase 1+2 ✅ Foundation + Auth
KW 13 ████████████████ Phase 3 ✅ Weekly Updates
KW 14 ████████████████ Phase 3 ✅ Feed + Badges
KW 15 ░░░░░░░░░░░░░░░░ Phase 4: Matching Onboarding
KW 16 ░░░░░░░░░░░░░░░░ Phase 4: Admin Dashboard
KW 17 ░░░░░░░░░░░░░░░░ Phase 5: Notifications
KW 18 ░░░░░░░░░░░░░░░░ Phase 5: Offboarding
KW 19 ░░░░░░░░░░░░░░░░ Phase 6: Polish
KW 20 ░░░░░░░░░░░░░░░░ Phase 6: Beta Launch 🚀
KW 21+ ░░░░░░░░░░░░░░░ Phase 7: Growth
```

**Beta-Launch Ziel: KW 20 (Mitte Mai 2026)**

---

## Kommunikation

- **Status-Updates:** Wöchentlich (Guidon → Jochen)
- **Eskalation:** Sofort bei Blockern (Guidon → Jochen via Telegram)
- **Victor PM:** https://getvictor.app/p/supdate (Public Dashboard)
