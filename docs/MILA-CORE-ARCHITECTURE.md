# Mila Core – Process & Legacy Bridge

## Ziel

Mila Core verbindet die heutige Mila-Anwendung mit den tragfähigen Ideen aus dem früheren `petraplan`-MVP. Mila soll keine bestehende Fachsoftware ersetzen. Sie soll Geschäftsvorgänge verstehen, fehlenden Kontext erkennen, Aktionen kontrolliert vorbereiten und Informationen in das jeweils passende Zielsystem übergeben.

## Leitprinzip

**Mensch / Dokument / E-Mail / Formular / API → Mila Core → vorhandenes Zielsystem**

Mila ersetzt DATEV, CRM, ERP, DMS oder Legacy-Software nicht. Mila sitzt davor bzw. dazwischen und übernimmt Interpretation, Kontext, Prozesssteuerung und sichere Übergabe.

## Architektur

### 1. Intake Layer

Quellen:
- Telefon
- E-Mail
- Upload
- Formular
- manuelle Eingabe
- später Sprache und externe APIs

Bestehende Basis in Mila:
- `mila_intake_cases`
- `mila_coordination_tasks`
- Client-Portal / Upload-Endpunkte

### 2. Interpretation Layer

Aufgabe:
- Quelle und Inhalt klassifizieren
- Dokument-/Datentyp erkennen
- Branche und Prozesskontext erkennen
- vorhandene Tools/Systeme erkennen
- Datenstruktur bzw. Schema ableiten
- Unsicherheiten explizit markieren

Quelle aus PetraPlan:
- CSV-/Excel-/Text-Ingestion
- Tool-Cluster-Erkennung
- Branchen-/Integrationslogik
- ursprüngliches Schema-/Kontext-Konzept

### 3. Context & Process Engine

Neuer Kern von Mila.

Die Engine beantwortet für jeden Vorgang:
1. Was ist passiert?
2. Zu welchem Geschäftsprozess gehört der Vorgang?
3. Welche Informationen sind bereits bekannt?
4. Welche Information fehlt noch?
5. Welche Rückfrage ist minimal notwendig?
6. Welche Aktion ist als Nächstes sinnvoll?
7. Welches Zielsystem benötigt das Ergebnis?
8. Muss ein Mensch entscheiden oder genehmigen?

### 4. Approval Layer

Grundsatz: **Interpretieren und vorbereiten darf Mila selbst; relevante externe Aktionen werden kontrolliert ausgeführt.**

Statusmodell:
- `proposed`
- `needs_context`
- `needs_human_review`
- `approved`
- `executing`
- `completed`
- `failed`

Für sensible, irreversible oder fachliche Aktionen ist Human Approval verpflichtend.

### 5. Connector Layer

Adapter statt Fachsoftware-Nachbau.

Zukünftige Connector-Kategorien:
- DATEV
- CRM
- ERP / Warenwirtschaft
- DMS
- E-Mail
- Kalender
- Projektsoftware
- Legacy-Import/Export (CSV, Excel, JSON)
- REST APIs / Webhooks

Jeder Connector bekommt eine klar definierte Capability-Liste. Mila darf nur Aktionen vorschlagen, die ein aktiver Connector tatsächlich unterstützt.

### 6. Case Loop & Handoff

Bestehende Mila-Struktur weiterverwenden:
- Frage
- Antwort
- Notiz
- Übergabe
- Status
- `handoff_summary`
- `handoff_ready`

Zusätzlich künftig:
- Interpretationsresultat
- erkannter Prozess
- fehlender Kontext
- vorgeschlagene Aktion
- Approval-Status
- Connector-Ausführung
- Audit-Ereignisse

## Was wir aus PetraPlan übernehmen

### BEHALTEN / ÜBERTRAGEN
- Ingestion-Konzept für CSV, Excel, Text
- Tool-/Systemerkennung
- Branchen- und Integrationslogik
- Schema-/Kontexterkennung als Architekturidee
- Approval-Lever als Sicherheitsprinzip

### UMBAUEN
- `analyze_business`: nicht primär Tool-Migration empfehlen, sondern Prozess- und Integrationslücken erkennen
- Legacy-Erkennung: nicht automatisch „ersetzen“, sondern zuerst „integrieren / kapseln / weiterverwenden“ prüfen
- System-Prompt: weg von Mini-App-Generator als Hauptziel, hin zu Process Interpreter

### NICHT DIREKT ÜBERNEHMEN
- doppelte Python-/TypeScript-Backend-Strukturen
- alte Jotform-/Mini-App-Abhängigkeit als Kernarchitektur
- temporäre Airtable-/Google-Sheets-Architektur
- Dateien mit problematischen Unicode-Dateinamen

## Was aus der heutigen Mila bestehen bleibt

- Next.js / TypeScript UI
- Supabase / Auth
- RLS- und Datenschutzbasis
- Dokument- und Upload-Prozesse
- Intake / Coordination
- Case Loop
- Human Review / Handoff
- Audit Trail
- bestehende Business- und Finanzmodule als mögliche Use Cases, nicht als Mila-Core-Definition

## Neue Kernmodule

Geplante Struktur:

```text
lib/mila-core/
  types.ts
  interpreter.ts
  context-engine.ts
  process-engine.ts
  approval.ts
  connector-registry.ts
  handoff.ts

lib/mila-core/connectors/
  csv.ts
  generic-rest.ts
  datev.ts          # später, nur nach verifizierter API-/Partnerstrategie

app/api/mila-core/
  interpret/route.ts
  plan/route.ts
  approve/route.ts
  execute/route.ts
```

## MVP für Mila Core

Der erste Test soll bewusst klein bleiben:

1. Vorgang kommt über Upload/Formular/manuelle Eingabe.
2. Mila klassifiziert den Vorgang.
3. Mila erkennt fehlenden Kontext.
4. Mila stellt genau eine notwendige Rückfrage.
5. Antwort wird dem Fall zugeordnet.
6. Mila erzeugt ein strukturiertes Handoff-Paket.
7. Mensch genehmigt.
8. Export zunächst als neutrales JSON/CSV-Paket; direkte Fachsystemintegration später.

Damit beweisen wir zuerst die Process-Interpreter-Idee, ohne DATEV oder andere Systeme nachzubauen.

## Nicht-Ziele

- DATEV nachbauen
- eigenständige Steuer-/Rechtsentscheidungen treffen
- jede Branche gleichzeitig unterstützen
- autonome irreversible Aktionen ohne Genehmigung
- neue Module hinzufügen, nur weil eine Fachsoftware eine Funktion besitzt

## Entscheidungsregel für neue Features

Ein neues Feature gehört nur in Mila Core, wenn mindestens eine dieser Aussagen zutrifft:

1. Es hilft Mila, einen Vorgang besser zu verstehen.
2. Es reduziert fehlenden Kontext oder unnötige Rückfragen.
3. Es verbindet zwei bestehende Systeme oder Übergaben sinnvoll.
4. Es macht einen Prozess kontrollierbarer, nachvollziehbarer oder sicherer.

Fachfunktionen, die bereits zuverlässig im Zielsystem existieren, bleiben im Zielsystem.
