'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type TemplateGroup = {
  title: string
  intro: string
  tone: string
  templates: Array<{
    title: string
    channel: string
    text: string
  }>
}

const templateGroups: TemplateGroup[] = [
  {
    title: 'Kanzlei anschreiben',
    intro:
      'Für Steuerberater und Kanzleiinhaber, bei denen du Mila als Vorbereitung und Entlastung anbietest.',
    tone: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    templates: [
      {
        title: 'Erste Nachricht',
        channel: 'LinkedIn / Mail',
        text:
          'Hallo [Name], ich baue mit Mila ein kleines Vorbereitungssystem für Mandantenunterlagen: Belege, fehlende Nachweise und Rückfragen werden vor der Kanzlei sauberer gesammelt. Ich ersetze keine steuerliche Prüfung, sondern bereite die Unterlagen organisatorisch vor. Wäre ein kurzer Austausch interessant, ob so etwas bei Ihren Mandanten Rückfragen reduzieren könnte?',
      },
      {
        title: 'Kooperationsangebot',
        channel: 'Mail',
        text:
          'Hallo [Name], ich würde gern mit 1-2 echten Fällen testen, ob Mila Kanzleien entlasten kann: Ich unterstütze kleine Betriebe als VA bei Belegen, Rückfragen und Monatsmappe, damit Ihre Kanzlei vorbereiteteres Material bekommt. Keine Steuerberatung, keine Buchungsentscheidung, nur Vorarbeit und Struktur. Hätten Sie grundsätzlich Interesse an einem kleinen Pilotlauf?',
      },
    ],
  },
  {
    title: 'Betrieb direkt ansprechen',
    intro:
      'Für Handwerker, kleine Betriebe und Selbstständige, die ihre Unterlagen nicht sauber sortiert bekommen.',
    tone: 'border-violet-100 bg-violet-50 text-violet-700',
    templates: [
      {
        title: 'Kurzer Einstieg',
        channel: 'WhatsApp / DM',
        text:
          'Hallo [Name], ich unterstütze kleine Betriebe dabei, Belege, Rechnungen und offene Rückfragen für die Steuerkanzlei besser vorzubereiten. Nicht als Steuerberaterin, sondern als praktische VA-Unterstützung mit meinem Mila-System. Wenn du öfter suchst, nachreichen musst oder Unterlagen liegen bleiben, kann ich dir das einmal kurz zeigen.',
      },
      {
        title: 'Nach Demo anbieten',
        channel: 'Follow-up',
        text:
          'Danke dir fürs Reinschauen. Mein Vorschlag wäre ein kleiner Start: Wir nehmen einen Monat, sammeln Belege und offene Punkte, markieren fehlende Infos und machen daraus eine saubere Übergabe für deine Kanzlei. Danach siehst du sehr klar, ob dir das im Alltag wirklich Arbeit abnimmt.',
      },
    ],
  },
  {
    title: 'Gruppenpost',
    intro:
      'Für Facebook-, Unternehmer- oder lokale Gruppen, ohne nach kalter Werbung zu klingen.',
    tone: 'border-fuchsia-100 bg-fuchsia-50 text-fuchsia-700',
    templates: [
      {
        title: 'Problem sichtbar machen',
        channel: 'Facebook / Gruppe',
        text:
          'Viele kleine Betriebe haben nicht das Problem, dass sie keine Buchhaltungssoftware haben. Das Problem ist oft der Monat davor: Belege fehlen, Rückfragen bleiben liegen, der Zweck ist nicht mehr klar und am Ende fragt die Kanzlei alles nochmal ab. Genau dafür baue ich Mila: ein Vorbereitungssystem, mit dem Unterlagen vollständiger und verständlicher an die Kanzlei gehen. Ich suche gerade 1-2 kleine Betriebe oder Kanzleien, die mir ehrliches Feedback geben möchten.',
      },
      {
        title: 'VA-Service posten',
        channel: 'Facebook / LinkedIn',
        text:
          'Ich biete aktuell Unterstützung für kleine Betriebe an, die ihre Belege, Rechnungen, Fahrten oder Nachweise besser für die Kanzlei vorbereiten wollen. Ich nutze dafür mein eigenes Mila-System: keine Steuerberatung, keine Buchungsentscheidung, sondern Struktur, Vollständigkeit und klare Rückfragen. Wer jeden Monat zu spät sortiert oder ständig etwas nachreichen muss, darf mir gern schreiben.',
      },
    ],
  },
  {
    title: 'Follow-ups',
    intro:
      'Für Kontakte, die schon reagiert haben oder bei denen du freundlich nachfassen möchtest.',
    tone: 'border-amber-100 bg-amber-50 text-amber-700',
    templates: [
      {
        title: 'Sanft nachfassen',
        channel: 'DM / Mail',
        text:
          'Hallo [Name], ich wollte nur kurz nachfassen, ob mein Mila-Ansatz für Sie grundsätzlich spannend sein könnte. Mir geht es nicht darum, ein fertiges Tool aufzudrängen, sondern herauszufinden, welche Vorarbeit Kanzlei oder Betrieb wirklich entlastet.',
      },
      {
        title: 'Termin sichern',
        channel: 'DM / Mail',
        text:
          'Wenn es passt, würde ich Ihnen Mila gern in 15 Minuten zeigen: einmal Demo-Mappe, einmal Rückfragenlogik, einmal die Grenze zur Kanzlei. Danach können Sie sehr schnell sagen, ob das in der Praxis hilfreich wäre oder was fehlen müsste.',
      },
    ],
  },
]

export default function AkquisePage() {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)
  const [copiedKey, setCopiedKey] = useState('')

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login')
        return
      }

      setIsReady(true)
    }

    checkSession()
  }, [router])

  async function copyTemplate(key: string, text: string) {
    await navigator.clipboard.writeText(text)
    setCopiedKey(key)
    window.setTimeout(() => setCopiedKey(''), 1800)
  }

  if (!isReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbf9ff] p-6 text-center text-slate-950">
        <div>
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
          <p className="mt-4 text-sm font-semibold text-slate-500">
            Mila öffnet deinen internen Arbeitsbereich...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#fbf9ff] p-5 pb-12 text-slate-950">
      <div className="mx-auto max-w-md space-y-5">
        <header className="rounded-[2rem] bg-slate-950 p-5 text-white shadow-sm">
          <Link href="/" className="text-sm font-black text-white/70">
            ← Zurück zum Pilot
          </Link>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-fuchsia-200">
            Interner Mila-Arbeitsbereich
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight">
            Akquise-Vorlagen
          </h1>

          <p className="mt-3 text-sm font-semibold leading-relaxed text-white/75">
            Kanzlei, Betrieb, Gruppenpost oder Follow-up: Du kannst jeden Text
            direkt kopieren, anpassen und verschicken.
          </p>
        </header>

        <section className="rounded-3xl border border-violet-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-500">
            Fokus
          </p>

          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
            Mila bleibt nach außen klar: Vorbereitung, Vollständigkeit,
            Rückfragen und Übergabe. Keine Steuerberatung und keine finale
            Buchungsentscheidung.
          </p>
        </section>

        {templateGroups.map((group) => (
          <section
            key={group.title}
            className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"
          >
            <div className={`rounded-2xl border p-4 ${group.tone}`}>
              <p className="text-xs font-black uppercase tracking-[0.18em] opacity-80">
                Vorlage
              </p>

              <h2 className="mt-2 text-xl font-black text-slate-950">
                {group.title}
              </h2>

              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
                {group.intro}
              </p>
            </div>

            <div className="mt-3 space-y-3">
              {group.templates.map((template) => {
                const key = `${group.title}-${template.title}`
                const copied = copiedKey === key

                return (
                  <article
                    key={key}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-950">
                          {template.title}
                        </p>

                        <p className="mt-1 text-[11px] font-black uppercase tracking-wider text-slate-400">
                          {template.channel}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyTemplate(key, template.text)}
                        className={
                          copied
                            ? 'rounded-full bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-700'
                            : 'rounded-full bg-violet-600 px-3 py-2 text-xs font-black text-white'
                        }
                      >
                        {copied ? 'Kopiert' : 'Kopieren'}
                      </button>
                    </div>

                    <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-relaxed text-slate-600">
                      {template.text}
                    </p>
                  </article>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}
