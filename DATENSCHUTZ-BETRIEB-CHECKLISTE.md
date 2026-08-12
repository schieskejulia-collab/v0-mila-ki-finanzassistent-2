# Mila – Datenschutz-Betriebscheckliste

Stand: 12.08.2026

Diese Liste ist eine technische und organisatorische Arbeitsunterlage, keine Rechtsberatung. Vor Verarbeitung echter Mandantendaten muss sie mit dem tatsächlichen Geschäftsmodell, den Verträgen und den eingesetzten Dienstleistern abgeglichen werden.

## Technisch im Projekt umgesetzt

- [x] Nutzerbezogene Datentrennung über `user_id`; Mandantenzuordnung über `client_id`.
- [x] RLS-Grundlage und zusätzliche Hardening-Migration vorhanden (`sql/privacy-hardening-2026-08.sql`).
- [x] Mandanten-Upload-Bucket ist privat.
- [x] Uploads auf PDF/JPG/PNG/WEBP und 10 MB begrenzt.
- [x] Portal-Tokens sind widerrufbar; Hardening-Migration ergänzt 7-Tage-Ablauf und `last_used_at`.
- [x] Dokumentansicht erfolgt über kontrollierte Anwendungspfade statt öffentlichen Bucket.
- [x] Datenexport im Profil vorhanden.
- [x] Löschung gespeicherter Mila-Daten und zuordenbarer Uploads vorhanden.
- [x] Vollständige Kontolöschung mit zusätzlicher Bestätigung vorhanden.
- [x] API-Antworten werden mit No-Store geschützt; grundlegende Security-Header sind gesetzt.
- [x] Audit-Trail dokumentiert vorhandene Zeitpunkte ohne Originaldateien zu verändern.

## Vor echten Mandantendaten organisatorisch erledigen

- [ ] `sql/privacy-hardening-2026-08.sql` im produktiven Supabase-Projekt ausführen und Ergebnis prüfen.
- [ ] Datenschutzerklärung und Impressum mit vollständigen Betreiber-/Kontaktangaben füllen; keine Platzhalter veröffentlichen.
- [ ] Rollen klären: Wer ist je Workflow Verantwortlicher, wer Auftragsverarbeiter? Insbesondere bei VA-Arbeit im Auftrag eines Betriebs/einer Kanzlei.
- [ ] AV-Verträge/DPA und Unterauftragnehmerlisten der eingesetzten Dienstleister prüfen und dokumentieren (u. a. Hosting/Deployment, Supabase, KI-Dienst, Zahlungsanbieter soweit genutzt).
- [ ] Drittlandtransfers der tatsächlich eingesetzten Anbieter prüfen und erforderliche Garantien dokumentieren.
- [ ] Verzeichnis der Verarbeitungstätigkeiten (VVT) für Mila/VA-Arbeit erstellen.
- [ ] TOM-Dokument erstellen: Zugriff, Authentifizierung, Rollen, Backups/Wiederherstellung, Incident-Prozess, Geräte-/Passcode-Schutz, Löschung.
- [ ] Lösch- und Aufbewahrungskonzept je Datenkategorie festlegen. Gesetzliche Aufbewahrungspflichten nicht mit freiwilliger App-Aufbewahrung vermischen.
- [ ] Verfahren für Betroffenenanfragen dokumentieren: Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch.
- [ ] Datenschutzvorfall-Prozess dokumentieren, inklusive interner Bewertung und ggf. Meldung an die Aufsicht.
- [ ] Prüfen, ob eine Datenschutz-Folgenabschätzung erforderlich ist, bevor besonders risikoreiche Verarbeitung gestartet wird.
- [ ] Nur notwendige Mandantendaten an externe KI-Dienste übermitteln; sensible Inhalte möglichst minimieren/pseudonymisieren und vertragliche Nutzung klären.
- [ ] Keine echten Mandantendaten in Demo/Testmandanten verwenden.

## Regelmäßige Prüfung

- [ ] Zugriffsrechte und aktive Upload-Links regelmäßig prüfen und nicht mehr benötigte Links deaktivieren.
- [ ] Abhängigkeiten, Hosting-/Supabase-/KI-Konfiguration und Security-Header nach Änderungen erneut prüfen.
- [ ] Export- und Löschfunktionen nach Schemaänderungen testen, damit neue Tabellen nicht vergessen werden.
- [ ] RLS nach jeder neuen nutzerbezogenen Tabelle ergänzen und mit mindestens zwei Testkonten gegenprüfen.
- [ ] Datenschutztexte aktualisieren, wenn Anbieter, Zwecke oder Datenflüsse geändert werden.
