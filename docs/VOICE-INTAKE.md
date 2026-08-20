# Mila Voice Intake

Mila ist provider-neutral auf Telefonie vorbereitet. Ein späterer Voice-/Telefonie-Anbieter sendet nach oder während eines Gesprächs strukturierte Daten an:

`POST /api/voice/intake`

## Server-Konfiguration

Erforderliche Umgebungsvariablen:

- `MILA_VOICE_WEBHOOK_SECRET` – gemeinsames geheimes Token für den Voice-Anbieter
- `MILA_VOICE_OWNER_USER_ID` – Supabase-User-ID des Mila-Arbeitsbereichs, in dem Telefonvorgänge landen
- `SUPABASE_SERVICE_ROLE_KEY` – bereits für sichere serverseitige Supabase-Zugriffe verwendet

Der Anbieter authentifiziert sich mit:

`Authorization: Bearer <MILA_VOICE_WEBHOOK_SECRET>`

## Minimaler Payload

```json
{
  "call_id": "provider-call-123",
  "provider": "example",
  "phone": "+491701234567",
  "caller_name": "Max Mustermann",
  "subject": "Angebot anfragen",
  "summary": "Kunde möchte ein Angebot und bittet um Rückruf.",
  "urgency": "normal",
  "category": "Neukunde / Angebot",
  "resolved_during_call": false,
  "needs_follow_up": true
}
```

Pflichtfelder sind `call_id` und `summary`.

## Verhalten

- Jeder Anruf wird als `source = phone` im zentralen Mila-Eingang angelegt.
- `source_reference = voice:<provider>:<call_id>` verhindert doppelte Verarbeitung desselben Calls.
- Nicht gelöste, dringende oder sensible Gespräche erzeugen automatisch eine offene Koordinationsaufgabe.
- Fachlich sensible Begriffe führen zur menschlichen Prüfung; Mila trifft dann keine fachliche Entscheidung.
- Ein Anruf, der vollständig im Gespräch gelöst wurde und nicht sensibel ist, kann ohne Rückrufaufgabe als erledigt gespeichert werden.

## Datenschutz-Prinzip

Der Webhook verlangt keine Audioaufnahme. Für den Kern reichen strukturierte Gesprächsdaten und eine Zusammenfassung. Falls ein späterer Anbieter Aufzeichnungen oder vollständige Transkripte anbietet, werden diese nicht automatisch in Mila übernommen. Dafür muss vor einer Aktivierung separat über Rechtsgrundlage, Einwilligung/Information, Aufbewahrung und Löschung entschieden werden.

## Anbieter-Anschluss später

Beim späteren Anbieter brauchen wir im Kern nur:

1. Telefonnummer oder Weiterleitung,
2. Voice-Agent/Conversation Flow,
3. Webhook-Ziel `/api/voice/intake`,
4. Bearer-Secret,
5. Mapping des Anbieter-Outputs auf den Payload oben.
