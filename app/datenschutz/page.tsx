export default function DatenschutzPage() {
  return (
    <main className="min-h-screen bg-[#fbf9ff] px-5 py-8 text-slate-950">
      <section className="mx-auto max-w-md space-y-6">
        <div className="rounded-[2rem] border border-violet-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">Datenschutz</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Datenschutzerklärung für Mila</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Mila soll kleine Betriebe und Selbstständige bei der Vorbereitung von Unterlagen, Belegen,
            Rückfragen und Monatsmappen unterstützen. Datenschutz ist dabei kein Zusatz, sondern Grundbedingung.
          </p>
        </div>

        <PrivacyBlock title="1. Verantwortliche Stelle">
          <p>[DEIN NAME / UNTERNEHMENSNAME]</p>
          <p>[ANSCHRIFT]</p>
          <p>[E-MAIL-ADRESSE]</p>
        </PrivacyBlock>

        <PrivacyBlock title="2. Welche Daten Mila verarbeitet">
          <p>Mila kann je nach Nutzung folgende Daten verarbeiten:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Registrierungsdaten wie E-Mail-Adresse und Login-Informationen.</li>
            <li>Profilangaben, die Nutzer freiwillig hinterlegen.</li>
            <li>Buchungs-, Einnahmen-, Ausgaben-, Beleg- und Dokumentinformationen.</li>
            <li>Pflichten, Erinnerungen, Rückfragen, Notizen und Kategorien.</li>
            <li>Technische Daten, die zum sicheren Betrieb nötig sind.</li>
          </ul>
        </PrivacyBlock>

        <PrivacyBlock title="3. Zweck der Verarbeitung">
          <p>Die Verarbeitung erfolgt, damit Mila folgende Funktionen bereitstellen kann:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Belege und Buchungen erfassen, sortieren und vorbereiten.</li>
            <li>fehlende Angaben und mögliche Rückfragen sichtbar machen.</li>
            <li>Monatsmappen und Übersichten vorbereiten.</li>
            <li>Nutzerkonten schützen und Missbrauch verhindern.</li>
            <li>gesetzliche Auskunfts-, Lösch- und Nachweispflichten ermöglichen.</li>
          </ul>
        </PrivacyBlock>

        <PrivacyBlock title="4. Rechtsgrundlagen">
          <p>
            Die Verarbeitung erfolgt je nach Funktion auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO
            zur Vertragserfüllung, Art. 6 Abs. 1 lit. f DSGVO für berechtigte Sicherheits- und
            Betriebsinteressen sowie Art. 6 Abs. 1 lit. c DSGVO, soweit gesetzliche Pflichten bestehen.
            Freiwillige Angaben können auf Grundlage einer Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO verarbeitet werden.
          </p>
        </PrivacyBlock>

        <PrivacyBlock title="5. Hosting und technische Dienstleister">
          <p>
            Mila wird technisch über externe Dienstleister betrieben. Dazu können insbesondere Hosting,
            Datenbank, Authentifizierung, Deployment und Zahlungsabwicklung gehören. Mit eingesetzten
            Dienstleistern werden, soweit erforderlich, Auftragsverarbeitungsverträge abgeschlossen.
          </p>
          <p className="mt-3">
            Eingesetzte Dienste können insbesondere Vercel, Supabase und Stripe sein. Zahlungsdaten werden
            nicht vollständig in Mila gespeichert, sondern durch den Zahlungsdienstleister verarbeitet.
          </p>
        </PrivacyBlock>

        <PrivacyBlock title="6. Belege, Dokumente und sensible Inhalte">
          <p>
            Nutzer können Belege und Dokumente hochladen. Diese können personenbezogene, finanzielle oder
            geschäftliche Informationen enthalten. Mila verarbeitet solche Inhalte nur für die vom Nutzer
            gestarteten Funktionen. Nutzer sollten keine fremden sensiblen Daten hochladen, wenn sie dafür
            keine Berechtigung haben.
          </p>
        </PrivacyBlock>

        <PrivacyBlock title="7. Keine Steuerberatung">
          <p>
            Mila trifft keine verbindlichen steuerlichen Entscheidungen, ersetzt keine Steuerberatung und
            ersetzt keine Prüfung durch Steuerberater, Buchhaltung oder Behörden. Mila hilft bei Ordnung,
            Vorbereitung, Plausibilität, Vollständigkeit und verständlicher Struktur.
          </p>
        </PrivacyBlock>

        <PrivacyBlock title="8. Speicherdauer und Löschung">
          <p>
            Daten werden nur so lange gespeichert, wie sie für die Nutzung von Mila, gesetzliche Pflichten,
            Nachweise oder berechtigte Sicherheitsinteressen erforderlich sind. Nutzer können Auskunft,
            Export oder Löschung ihrer Daten verlangen. Eine technische Export- und Löschfunktion soll direkt
            im Konto bereitgestellt werden.
          </p>
        </PrivacyBlock>

        <PrivacyBlock title="9. Rechte der Nutzer">
          <p>Nutzer haben nach Maßgabe der DSGVO insbesondere folgende Rechte:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Auskunft über gespeicherte Daten.</li>
            <li>Berichtigung falscher Daten.</li>
            <li>Löschung oder Einschränkung der Verarbeitung.</li>
            <li>Datenübertragbarkeit.</li>
            <li>Widerspruch gegen bestimmte Verarbeitungen.</li>
            <li>Widerruf erteilter Einwilligungen.</li>
            <li>Beschwerde bei einer Datenschutzaufsichtsbehörde.</li>
          </ul>
        </PrivacyBlock>

        <PrivacyBlock title="10. Tracking und Analyse">
          <p>
            Mila soll ohne unnötiges Tracking funktionieren. Analyse- oder Marketingtools werden nur eingesetzt,
            wenn sie technisch erforderlich sind oder eine wirksame Einwilligung vorliegt. Für die erste sichere
            Version sollte Vercel Analytics entfernt oder erst nach Zustimmung geladen werden.
          </p>
        </PrivacyBlock>

        <PrivacyBlock title="11. Sicherheit">
          <p>
            Mila setzt auf getrennte Nutzerkonten, Zugriffsbeschränkungen, technische Schutzmaßnahmen,
            sichere Authentifizierung und möglichst sparsame Datennutzung. Zugriff auf personenbezogene Daten
            darf nur erfolgen, wenn er technisch, organisatorisch oder rechtlich erforderlich ist.
          </p>
        </PrivacyBlock>

        <PrivacyBlock title="12. Kontakt">
          <p>
            Datenschutzanfragen können an [E-MAIL-ADRESSE] gestellt werden. Bitte schreibe in den Betreff
            „Datenschutzanfrage Mila“, damit die Anfrage eindeutig zugeordnet werden kann.
          </p>
        </PrivacyBlock>
      </section>
    </main>
  )
}

function PrivacyBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.5rem] border border-violet-100 bg-white p-5 text-sm leading-6 text-slate-700 shadow-sm">
      <h2 className="mb-3 text-lg font-black text-slate-950">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}