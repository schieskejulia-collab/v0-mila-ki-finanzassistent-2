'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowLeft, HeartHandshake, Mail } from 'lucide-react'

const inputClass = 'w-full rounded-2xl border border-violet-100 bg-white p-4 text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-400 focus:border-violet-400'

export default function KontaktPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [topic, setTopic] = useState('Bescheid oder Schreiben')
  const [message, setMessage] = useState('')
  const contactEmail = 'schieskejulia@gmx.de'

  const requestText = useMemo(() => [
    'Hallo Julia,',
    '',
    'ich brauche Unterstützung und komme gerade allein nicht weiter.',
    '',
    `Name: ${name || '-'}`,
    `E-Mail: ${email || '-'}`,
    `Worum geht es: ${topic}`,
    '',
    message || '-',
    '',
    'Bitte melde dich bei mir.',
  ].join('\n'), [email, message, name, topic])

  const mailtoHref = `mailto:${contactEmail}?subject=${encodeURIComponent(`Mila · Ich brauche Hilfe bei ${topic}`)}&body=${encodeURIComponent(requestText)}`

  return (
    <main className="min-h-screen bg-gradient-to-b from-violet-50 via-[#fffafd] to-white px-4 py-7 text-slate-950">
      <section className="mx-auto w-full max-w-md">
        <Link href="/sicher" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500">
          <ArrowLeft className="h-4 w-4" /> Zurück zu Mila
        </Link>

        <span className="mt-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
          <HeartHandshake className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-3xl font-black tracking-tight">Ich helfe dir weiter.</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          Du musst nicht wissen, wie du es richtig formulierst. Schreib einfach, wo du festhängst.
        </p>

        <section className="mt-6 space-y-4 rounded-[1.8rem] border border-violet-100 bg-white p-5 shadow-sm">
          <Field label="Dein Name"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Wie darf ich dich ansprechen?" className={inputClass} /></Field>
          <Field label="Deine E-Mail"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Damit ich dir antworten kann" className={inputClass} /></Field>
          <Field label="Wobei brauchst du Hilfe?">
            <select value={topic} onChange={(event) => setTopic(event.target.value)} className={inputClass}>
              <option>Bescheid oder Schreiben</option>
              <option>Antrag oder fehlende Unterlagen</option>
              <option>Zahlung oder Frist</option>
              <option>Meine Finanzen sortieren</option>
              <option>Etwas anderes</option>
            </select>
          </Field>
          <Field label="Erzähl mir kurz, worum es geht"><textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={6} placeholder="Zum Beispiel: Ich verstehe diesen Bescheid nicht und weiß nicht, was ich jetzt tun soll." className={`${inputClass} resize-none`} /></Field>
        </section>

        <a href={mailtoHref} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-4 text-sm font-black text-white">
          <Mail className="h-4 w-4" /> Nachricht an Julia öffnen
        </a>
        <p className="mt-3 px-3 text-center text-[11px] font-semibold leading-5 text-slate-400">
          Dein E-Mail-Programm öffnet die fertige Nachricht. Verschickt wird sie erst, wenn du dort auf Senden drückst.
        </p>
      </section>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-black text-slate-600">{label}<span className="mt-2 block">{children}</span></label>
}
