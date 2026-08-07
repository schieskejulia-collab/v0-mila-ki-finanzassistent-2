'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type TemplateType = 'kanzlei' | 'betrieb' | 'gruppe' | 'nachfassen'

const templateTypes: Array<{
  value: TemplateType
  label: string
}> = [
  {
    value: 'kanzlei',
    label: 'Kanzlei',
  },
  {
    value: 'betrieb',
    label: 'Betrieb',
  },
  {
    value: 'gruppe',
    label: 'Gruppen',
  },
  {
    value: 'nachfassen',
    label: 'Follow-up',
  },
]

const templates: Record<
  TemplateType,
  Array<{
    title: string
    channel: string
    text: string
  }>
> = {
  kanzlei: [
    {
      title: 'LinkedIn/XING kurz',
      channel: 'Direktnachricht',
      text: [
        'Hallo [Name],',
        '',
        'ich teste gerade Mila als Vorbereitungssystem für kleine Betriebe vor der Kanzlei-Übergabe. Ziel ist: weniger Rückfragen, vollständigere Belege und klarere Monatsmappen.',
        '',
        'Wäre ein kurzer 15-Minuten-Austausch interessant, um zu prüfen, ob das für Ihre Kanzlei als Pilot hilfreich wäre?',
      ].join('\n'),
    },
    {
      title: 'Kanzlei-E-Mail',
      channel: 'E-Mail',
      text: [
        'Betreff: Pilot für sauberere Mandantenunterlagen',
        '',
        'Hallo [Name],',
        '',
        'ich baue mit Mila einen fokussierten Vorbereitungsprozess für kleine Betriebe auf: Belege, fehlende Angaben, Fahrten, Stunden und Sonderfälle werden organisatorisch gesammelt, bevor die Unterlagen in der Kanzlei landen.',
        '',
        'Mila ersetzt keine steuerliche Bewertung. Der Nutzen liegt davor: weniger Sucherei, weniger Rückfragen und eine besser vorbereitete Monatsmappe.',
        '',
        'Wenn das für Ihre Kanzlei relevant klingt, würde ich gern in 15 Minuten zeigen, wie der Pilot aktuell aussieht.',
        '',
        'Viele Grüße',
        'Julia',
      ].join('\n'),
    },
  ],
  betrieb: [
    {
      title: 'Mandant/Betrieb direkt',
      channel: 'DM oder WhatsApp',
      text: [
        'Hallo [Name],',
        '',
        'ich unterstütze kleine Betriebe dabei, Belege, Fahrten, Stunden und Nachweise für die Steuerkanzlei sauber vorzubereiten.',
        '',
        'Ich nutze dafür Mila als internes Arbeitssystem, damit fehlende Unterlagen und Rückfragen früher auffallen. Die Kanzlei bleibt für Bewertung und finale Buchung zuständig.',
        '',
        'Soll ich dir kurz zeigen, wie so eine vorbereitete Monatsmappe aussehen kann?',
      ].join('\n'),
    },
    {
      title: 'VA-Angebot klar',
      channel: 'Angebotsantwort',
      text: [
        'Ich kann dich als VA bei der Kanzlei-Vorbereitung unterstützen: Belege sammeln, fehlende Angaben markieren, Fahrten und Stunden bei Bedarf dokumentieren und eine strukturierte Monatsmappe vorbereiten.',
        '',
        'Wichtig: Ich mache keine Steuerberatung und treffe keine finale Buchungsentscheidung. Ich sorge dafür, dass die Unterlagen vollständiger und verständlicher bei der Kanzlei ankommen.',
      ].join('\n'),
    },
  ],
  gruppe: [
    {
      title: 'Facebook-Gruppenpost',
      channel: 'Post',
      text: [
        'Viele kleine Betriebe verlieren am Monatsende Zeit, weil Belege, Fahrten, Stunden oder Nachweise nicht vollständig bei der Kanzlei landen.',
        '',
        'Ich teste gerade Mila als internes System für genau diese Vorbereitung: Unterlagen sammeln, fehlende Punkte sichtbar machen und eine saubere Monatsmappe vorbereiten.',
        '',
        'Es geht nicht um Steuerberatung, sondern um Ordnung vor der Buchhaltung. Wenn jemand das für den eigenen Betrieb testen möchte, schreibt mir gern kurz.',
      ].join('\n'),
    },
    {
      title: 'LinkedIn-Post',
      channel: 'Post',
      text: [
        'Ich baue Mila gerade bewusst fokussiert auf: als Vorbereitungssystem vor der Kanzlei.',
        '',
        'Der praktische Nutzen liegt nicht in mehr Software, sondern in weniger Reibung: Belege vollständiger sammeln, Rückfragen früher klären, Fahrten/Stunden/Sonderfälle als Kontext markieren und die Übergabe sauberer machen.',
        '',
        'Für Kanzleien kann daraus ein Pilot zur Mandantenentlastung werden. Für kleine Betriebe ein VA-Service, bei dem ich Mila intern nutze.',
      ].join('\n'),
    },
  ],
  nachfassen: [
    {
      title: 'Sanft nachfassen',
      channel: 'DM',
      text: [
        'Hallo [Name],',
        '',
        'ich wollte nur kurz nachfassen, ob der Mila-Pilot zur Kanzlei-Vorbereitung grundsätzlich interessant für Sie ist.',
        '',
        'Ich kann entweder die kurze Demo zeigen oder erst einmal erklären, wo genau die Grenze liegt: Mila bereitet organisatorisch vor, die steuerliche Bewertung bleibt bei der Kanzlei.',
      ].join('\n'),
    },
    {
      title: 'Termin anbieten',
      channel: 'DM oder E-Mail',
      text: [
        'Falls es passt: Ich kann diese Woche zwei kurze Slots für eine 15-Minuten-Demo anbieten.',
        '',
        'Ziel wäre nur zu prüfen, ob der Ansatz für Ihre Kanzlei oder einen passenden Mandanten Sinn ergibt. Kein großes Setup, kein Systemwechsel.',
      ].join('\n'),
    },
  ],
}

const positioning = [
  'Kanzlei: Pilot zur besseren Mandantenübergabe.',
  'Betrieb: VA-Service, bei dem Julia Mila intern nutzt.',
  'Grenze: keine Steuerberatung, keine finale Buchung, keine verbindliche Rechts- oder Fristauskunft.',
]

export default function AkquisePage() {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)
  const [activeType, setActiveType] = useState<TemplateType>('kanzlei')
  const [copiedTitle, setCopiedTitle] = useState('')

  const activeTemplates = useMemo(
    () => templates[activeType],
    [activeType],
  )

  useEffect(() => {
    async function checkLogin() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      setIsReady(true)
    }

    checkLogin()
  }, [router])

  async function copyTemplate(title: string, text: string) {
    await navigator.clipboard.writeText(text)
    setCopiedTitle(title)
  }

  if (!isReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbf9ff] p-6 text-center text-slate-600">
        <p className="text-sm font-semibold">
          Mila bereitet die internen Vorlagen vor...
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#fbf9ff] px-4 py-6 text-slate-950">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-10">
        <div>
          <Link href="/" className="text-sm font-bold text-slate-500">
            ← Zurück zum Pilot
          </Link>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-violet-600">
            Internes Akquise-Kit
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight">
            Texte für Kanzlei, Betrieb und Gruppen
          </h1>

          <p className="mt-3 max-w-xl text-sm font-semibold leading-relaxed text-slate-600">
            Diese Seite ist dein Arbeitsbereich zum Kopieren. Außen bleibt Mila
            als klares Angebot sichtbar, innen nutzt du fertige Texte für
            direkte Ansprache und Follow-up.
          </p>
        </div>

        <section className="rounded-3xl border border-violet-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
            Positionierung
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {positioning.map((item) => (
              <p
                key={item}
                className="rounded-2xl bg-violet-50 p-3 text-xs font-bold leading-relaxed text-slate-700"
              >
                {item}
              </p>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2 rounded-3xl bg-violet-50 p-2 sm:grid-cols-4">
          {templateTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => {
                setActiveType(type.value)
                setCopiedTitle('')
              }}
              className={
                activeType === type.value
                  ? 'rounded-2xl bg-white px-3 py-3 text-sm font-black text-violet-700 shadow-sm'
                  : 'rounded-2xl px-3 py-3 text-sm font-black text-slate-500'
              }
            >
              {type.label}
            </button>
          ))}
        </div>

        <section className="grid gap-4">
          {activeTemplates.map((template) => (
            <article
              key={template.title}
              className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
                    {template.channel}
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    {template.title}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => copyTemplate(template.title, template.text)}
                  className="shrink-0 rounded-2xl bg-violet-600 px-4 py-3 text-xs font-black text-white"
                >
                  {copiedTitle === template.title ? 'Kopiert' : 'Kopieren'}
                </button>
              </div>

              <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-relaxed text-slate-600">
                {template.text}
              </pre>
            </article>
          ))}
        </section>
      </section>
    </main>
  )
}
