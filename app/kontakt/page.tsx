'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

type Role = 'kanzlei' | 'betrieb'

const roleOptions: Array<{
  value: Role
  label: string
  hint: string
}> = [
  {
    value: 'kanzlei',
    label: 'Steuerkanzlei',
    hint: 'Ich möchte wissen, ob Mila meine Mandantenübergaben entlastet.',
  },
  {
    value: 'betrieb',
    label: 'Betrieb',
    hint: 'Ich möchte meine Unterlagen für die Kanzlei vorbereiten lassen.',
  },
]

export default function KontaktPage() {
  const [role, setRole] = useState<Role>('kanzlei')
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)

  const requestText = useMemo(() => {
    const roleLabel =
      role === 'kanzlei'
        ? 'Steuerkanzlei'
        : 'Betrieb / Mandant'

    return [
      'Hallo Julia,',
      '',
      'ich interessiere mich für den Mila-Pilot zur Kanzlei-Vorbereitung.',
      '',
      `Rolle: ${roleLabel}`,
      `Name: ${name || '-'}`,
      `Unternehmen/Kanzlei: ${company || '-'}`,
      `E-Mail: ${email || '-'}`,
      '',
      'Worum geht es?',
      message || '-',
      '',
      'Bitte melde dich mit den nächsten Schritten.',
    ].join('\n')
  }, [company, email, message, name, role])

  async function copyRequest() {
    await navigator.clipboard.writeText(requestText)
    setCopied(true)
  }

  return (
    <main className="min-h-screen bg-[#fbf9ff] px-4 py-6 text-slate-950">
      <section className="mx-auto flex w-full max-w-md flex-col gap-5">
        <div>
          <Link
            href="/angebot"
            className="text-sm font-bold text-slate-500"
          >
            ← Zurück zum Angebot
          </Link>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-violet-600">
            Pilot-Anfrage
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight">
            Lass uns klären, ob Mila passt
          </h1>

          <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
            Kurze Anfrage vorbereiten, damit Julia sofort erkennt, ob es um
            eine Kanzlei-Kooperation oder um VA-Unterstützung für einen Betrieb
            geht.
          </p>
        </div>

        <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
            Ich bin
          </p>

          <div className="mt-3 grid gap-2">
            {roleOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRole(option.value)}
                className={
                  role === option.value
                    ? 'rounded-2xl border border-violet-200 bg-violet-50 p-4 text-left'
                    : 'rounded-2xl border border-slate-100 bg-white p-4 text-left'
                }
              >
                <p className="font-black text-slate-950">
                  {option.label}
                </p>

                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                  {option.hint}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name"
            className="w-full rounded-2xl border border-violet-100 bg-white p-4 text-sm font-semibold outline-none focus:border-violet-500"
          />

          <input
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            placeholder="Kanzlei / Betrieb"
            className="w-full rounded-2xl border border-violet-100 bg-white p-4 text-sm font-semibold outline-none focus:border-violet-500"
          />

          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="E-Mail"
            className="w-full rounded-2xl border border-violet-100 bg-white p-4 text-sm font-semibold outline-none focus:border-violet-500"
          />

          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Was soll Mila für dich vorbereiten?"
            rows={5}
            className="w-full resize-none rounded-2xl border border-violet-100 bg-white p-4 text-sm font-semibold outline-none focus:border-violet-500"
          />
        </section>

        <section className="rounded-3xl bg-violet-50 p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
            Vorschau
          </p>

          <pre className="mt-3 whitespace-pre-wrap rounded-2xl bg-white p-4 text-xs font-semibold leading-relaxed text-slate-600">
            {requestText}
          </pre>

          <button
            type="button"
            onClick={copyRequest}
            className="mt-4 w-full rounded-2xl bg-violet-600 px-4 py-4 text-sm font-black text-white"
          >
            {copied ? 'Anfrage kopiert' : 'Anfrage kopieren'}
          </button>

          <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-500">
            Der nächste technische Schritt ist ein echter Versandweg, sobald
            deine finale Kontaktadresse oder dein bevorzugtes Formular feststeht.
          </p>
        </section>
      </section>
    </main>
  )
}
