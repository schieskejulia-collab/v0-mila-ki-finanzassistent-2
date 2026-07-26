# Mila 4.0 – nutzbarer Stand

Stand: 26. Juli 2026

## Geprüft

- Produktions-Build erfolgreich
- TypeScript-Prüfung ohne Fehler
- Startseite, Login, Buchungen, neue Buchung, Verpflichtungen, Ziele,
  Dokumente, Rechnungen, Chat, Profil und Wissen per Laufzeittest erreichbar
- Beleg- und Dokumentenscan sowie Mila-Chat besitzen verständliche
  Rückmeldungen, falls der KI-Schlüssel noch nicht verbunden ist

## Für den Betrieb in Vercel

Diese Umgebungsvariablen müssen im Vercel-Projekt hinterlegt sein:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GROQ_API_KEY`

Ohne Supabase-Verbindung kann die Oberfläche gebaut und geöffnet werden,
aber persönliche Finanzdaten werden nicht dauerhaft synchronisiert. Ohne
Groq-Schlüssel bleibt die KI-Verbindung im sicheren Hinweis-Modus.

## Bewusst noch gesperrt

Der PDF-Download auf der Rechnungsseite ist als spätere Funktion sichtbar,
aber noch deaktiviert. Alle Kernwege des jetzigen Mila-4.0-Stands sind
erreichbar.
