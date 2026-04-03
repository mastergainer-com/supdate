# SUPDATE — Gruppen-Zuordnung & Auswahlverfahren
**Version:** 1.0
**Datum:** 21.03.2026
**PM:** Guidon | **Input:** Gibor, Benaja, Atlas, Mark

---

## Executive Summary

Das Matching ist das Herzstück von SUPDATE. Eine gute Gruppe = Retention + Referral. Eine schlechte Gruppe = Dead Group in 4 Wochen. Dieses Dokument definiert das Auswahlverfahren, die Matching-Kriterien und die Guidelines für die manuelle Phase.

---

## 1. Auswahlverfahren (Onboarding)

### Ziel
Commitment-Level messen, Touristen herausfiltern, genug Daten für sinnvolles Matching sammeln — ohne abzuschrecken.

### Framing: Kuratierung, nicht Bewerbung
- ❌ "Auswahlverfahren" → ✅ "Persönliches Matching"
- ❌ "Du wirst zugewiesen" → ✅ "Wir stellen deine Gruppe zusammen"
- ❌ "Bewerbung" → ✅ "Profil erstellen"
- Der User muss sich als **Kunde** fühlen, nicht als **Bewerber**

### 3-Step Onboarding (~3 Minuten)

**Step 1 — Quick Profile (30 Sek)**
- Name
- Was machst du? (Founder / Freelancer / Corporate / Student / Andere)
- Sprache (DE / EN)
- Zeitzone (auto-detect + manuell korrigierbar)

**Step 2 — Goal & Commitment (2 Min)**
| Frage | Typ | Zweck |
|---|---|---|
| Was willst du in 90 Tagen erreicht haben? (messbar!) | Freitext, max 150 Zeichen | Ziel-Qualität messen |
| Warum ist dir das wichtig? Was steht auf dem Spiel? | Freitext, max 300 Zeichen | Commitment-Tiefe |
| Wieviel Stunden/Woche investierst du aktiv? | Slider (1–40h) | Intensitätslevel |
| Hast du schon mal in einer Accountability-Gruppe gearbeitet? | Ja/Nein + optional Freitext | Erfahrungslevel |
| Bevorzugter Update-Rhythmus? | Wöchentlich / 2x Woche | Rhythm-Match |

**Step 3 — Commitment-Check (30 Sek)**
- ✅ "Ich bin bereit, jede Woche öffentlich zu reporten — auch wenn ich nicht geliefert habe"
- ✅ "Ich akzeptiere, dass ich nach 3x Nichterscheinen meinen Platz verliere"
- ✅ "Ich verstehe, dass meine Gruppe auf mich zählt"

→ Alle drei müssen bestätigt werden. Wer hier zögert, ist nicht bereit.

---

## 2. Touristen vs. echte Spieler erkennen

| Signal | Tourist 🚩 | Echter Spieler ✅ |
|---|---|---|
| Zieldefinition | Vage ("mehr Geld", "fitter werden") | Spezifisch ("10k MRR bis Juni") |
| Zeitinvestment | "Ich schaue mal" | Konkrete Stunden/Woche |
| Bisherige Versuche | Keine oder nur Bücher/Kurse | Hat gehandelt, auch wenn gescheitert |
| Reaktion auf Regeln | Zögert, fragt nach Ausnahmen | Akzeptiert sofort |
| Sprache | "Ich würde gerne...", "Vielleicht..." | "Ich werde...", "Mein Plan ist..." |
| Antwortzeit im Onboarding | Tage | Stunden |

**Goldene Regel (Benaja):** Wer beim Onboarding schon unzuverlässig ist, wird in der Gruppe nicht besser.

---

## 3. Matching-Kriterien (Priorität)

| Faktor | Gewicht | Begründung |
|---|---|---|
| **Commitment-Level / Intensität** | 🔴 Höchste | Commitment-Symmetrie ist der #1 Erfolgsfaktor (Benaja) |
| **Update-Rhythmus** | 🔴 Hoch | Unterschiedlicher Rhythmus = sofort Friction (Gibor) |
| **Ziel-Kompatibilität** | 🟡 Mittel | Nicht identisch, aber verständlich füreinander |
| **Lebensphase** | 🟡 Mittel | 22-jähriger Student + 45-jähriger Familienvater = schwierig |
| **Zeitzone** | 🟡 Mittel | ±2h okay, mehr wird schwierig |
| **Erfahrungslevel** | 🟢 Niedrig | Mischung kann gut sein (Zugpferd-Effekt) |
| **Branche** | 🟢 Niedrig | Cross-Industry oft wertvoller als Silo |

### Optimale Gruppenzusammenstellung
- **5–7 Personen** (nicht 10 — zu groß für echte Verbindlichkeit)
- **Mindestens 1 Person die schon Ergebnisse hat** (Zugpferd-Effekt)
- **Keine mehr als 2 Intensitätsstufen Unterschied**
- **Keine Freundesgruppen** — Freunde konfrontieren sich nicht

### Anti-Patterns vermeiden
- ❌ Ein dominanter Redner + 4 Passive
- ❌ Alle gleich weit — niemand inspiriert
- ❌ Zu ähnlich — kein Perspektivenwechsel

---

## 4. Manuelles Matching — Workflow

### Phase 1 (0–100 User): Jochen matched manuell

**Schritt 1:** Neue Onboarding-Profile reviewen (täglich oder 2x/Woche)

**Schritt 2:** Sortieren nach Intensitätslevel:
- 🔥 **High** (20+ Stunden/Woche, spezifisches 90-Tage-Ziel, sofortige Antwortzeit)
- 🟡 **Medium** (5–20 Stunden, klares Ziel, responsive)
- 🟢 **Starter** (<5 Stunden, breites Ziel, langsame Antwortzeit)

**Schritt 3:** Innerhalb eines Levels gruppieren nach:
1. Rhythmus-Match
2. Zeitzone
3. Lebensphase / Kontext

**Schritt 4:** Gruppe erstellen, Einladungen versenden

**Schritt 5:** Feedback nach 2 Wochen → Muster erkennen → Guidelines anpassen

### Phase 2 (100+ User): Semi-automatisch
- System schlägt Gruppen vor (Scoring: `compatibility = intensity * 0.4 + rhythm * 0.3 + timezone * 0.2 + goal_sim * 0.1`)
- Jochen bestätigt / korrigiert
- Korrekturen fließen als Training-Signal zurück

### Phase 3 (500+ User): Voll-automatisch
- Erst wenn genug Daten über erfolgreiche Matches existieren

---

## 5. Dead Groups verhindern

### Activity Monitoring
- Gruppe gilt als **"at risk"** wenn <50% in den letzten 2 Zyklen gepostet haben
- Alert an Admin + Nudge an Gruppe

### Maßnahmen
1. **Streak-Counter** sichtbar machen (soziale Motivation)
2. **Wöchentlicher Gruppen-Score** ("4/5 haben diese Woche gepostet 🔥")
3. **Automatische Nudges** nach 2 verpassten Updates
4. **Gruppe mergen** — wenn 2 Gruppen je 2 aktive Mitglieder haben → zusammenlegen

---

## 6. Offboarding bei Non-Delivery

### 3-Stufen-Modell

| Stufe | Trigger | Aktion |
|---|---|---|
| **Nudge** | 2 verpasste Updates | Automatische DM: "Alles okay? Deine Gruppe vermisst dein Update" |
| **Warning** | 4 verpasste Updates | "Du wirst in 7 Tagen entfernt wenn kein Update kommt" + Admin-Alert |
| **Soft-Remove** | 7 Tage ohne Reaktion | User wird entfernt, Nachricht: "Du kannst jederzeit einer neuen Gruppe beitreten" |

### Wichtige Regeln
- ❌ Kein öffentliches Shaming in der Gruppe
- ✅ User kann sich selbst pausieren (2 Wochen, kein Strike)
- ✅ Offboarding-Grund tracken (für Produkt-Insights)
- ✅ Gruppe bekommt neutrale Nachricht: "[Name] hat die Gruppe verlassen"
- ✅ Bei Gruppengröße <3 → Merge oder Re-Matching

---

## 7. Wartezeit-Management (Anmeldung → Gruppenzuweisung)

### Zero-Silence-Policy (Mark)
- **Tag 0:** Welcome-Mail + "Was dich erwartet"
- **Tag 1:** "Dein Matching läuft — hier ein Vorgeschmack"
- **Tag 2:** Zuweisung + persönliche Nachricht
- **Maximal 48h** zwischen Profil-Completion und Gruppenzuweisung

### Commitment-Devices
- "Was erhoffst du dir von deiner Gruppe?" (1 Satz vor Zuweisung)
- Kalender-Integration anbieten: "Blocke dir schon mal [Tag] für dein erstes Treffen"
- "Wenn's nicht passt, matchen wir dich neu" — reduziert Angst

---

## Metriken

| Metrik | Ziel |
|---|---|
| Signup → Profil komplett | >80% |
| Profil komplett → Gruppe zugewiesen | >90% |
| Gruppe zugewiesen → Erstes Meeting | >70% |
| Gruppen-Retention nach 4 Wochen | >70% |
| Active Groups (>50% weekly Updates) | >80% |
