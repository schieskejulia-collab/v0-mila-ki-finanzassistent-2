'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type ContactType = 'kanzlei' | 'betrieb' | 'gruppe' | 'partner'
type ContactStatus =
  | 'neu'
  | 'angeschrieben'
  | 'antwort'
  | 'termin'
  | 'followup'
  | 'absage'

type AkquiseContact = {
  id: string
  name: string
  type: ContactType
  channel: string
  status: ContactStatus
  lastMessage: string
  nextStep: string
  followUpDate: string
  note: string
  createdAt: string
  updatedAt: string
}

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

const STORAGE_KEY = 'mila-akquise-contacts-v1'

const typeLabels: Record<ContactType, string> = {
  kanzlei: 'Kanzlei',
  betrieb: 'Betrieb',
  gruppe: 'Gruppe',
  partner: 'Partner',
}

const statusLabels: Record<ContactStatus, string> = {
  neu: 'Neu',
  angeschrieben: 'Angeschrieben',
  antwort: 'Antwort',
  termin: 'Termin',
  followup: 'Follow-up',
  absage: 'Absage',
}

const statusStyles: Record<ContactStatus, string> = {
  neu: 'bg-slate-100 text-slate-600',
  angeschrieben: 'bg-violet-100 text-violet-700',
  antwort: 'bg-emerald-100 text-emerald-700',
  termin: 'bg-fuchsia-100 text-fuchsia-700',
  followup: 'bg-amber-100 text-amber-700',
  absage: 'bg-rose-100 text-rose-700',
}

const nextStepByStatus: Record<ContactStatus, string> = {
  neu: 'Erste Nachricht senden',
  angeschrieben: 'In 2-3 Tagen freundlich nachfassen',
  antwort: 'Antwort prüfen und Demo/Telefonat anbieten',
  termin: 'Demo vorbereiten und konkrete Pilotfrage notieren',
  followup: 'Kurz nachfassen, ohne Druck aufzubauen',
  absage: 'Archivieren oder später mit neuem Anlass wieder aufnehmen',
}

const smartReplies: Record<ContactStatus, string> = {
  neu:
    'Hallo [Name], ich baue mit Mila ein kleines Vorbereitungssystem für Mandantenunterlagen: Belege, fehlende Nachweise und Rückfragen werden vor der Kanzlei sauberer gesammelt. Ich ersetze keine steuerliche Prüfung, sondern bereite die Unterlagen organisatorisch vor. Wäre ein kurzer Austausch interessant?',
  angeschrieben:
    'Hallo [Name], ich wollte nur kurz nachfassen, ob mein Mila-Ansatz grundsätzlich spannend sein könnte. Mir geht es nicht darum, ein fertiges Tool aufzudrängen, sondern herauszufinden, welche Vorarbeit Kanzlei oder Betrieb wirklich entlastet.',
  antwort:
    'Danke für die Rückmeldung. Wenn es passt, würde ich Mila gern in 15 Minuten zeigen: einmal Demo-Mappe, einmal Rückfragenlogik, einmal die Grenze zur Kanzlei. Danach können Sie sehr schnell sagen, ob das in der Praxis hilfreich wäre.',
  termin:
    'Danke für den Termin. Ich zeige kurz, wie Mila Unterlagen vorbereitet: fehlende Belege, offene Rückfragen, Kontext zur Übergabe und klare Abgrenzung zur Steuerberatung. Danach würde ich gern wissen, was fehlen müsste, damit es für Sie wirklich nützlich wird.',
  followup:
    'Hallo [Name], ich wollte den Faden einmal freundlich aufnehmen. Wenn es gerade nicht passt, ist das völlig in Ordnung. Falls das Thema Mandantenunterlagen/Belege später wieder aktuell wird, kann ich Ihnen Mila gern kurz zeigen.',
  absage:
    'Danke für die ehrliche Rückmeldung. Ich nehme das als Feedback mit und melde mich nur wieder, wenn ich einen konkreteren Anlass habe, der wirklich zu Ihnen passt.',
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
        text: smartReplies.angeschrieben,
      },
      {
        title: 'Termin sichern',
        channel: 'DM / Mail',
        text: smartReplies.antwort,
      },
    ],
  },
]

const demoChecklist = [
  'Demo-Mappe öffnen und Beispielbetrieb kurz erklären',
  'Problem zeigen: fehlende Belege, Rückfragen, Übergabe-Stand',
  'Grenze sagen: keine Steuerberatung, nur Vorbereitung',
  'Frage stellen: Was müsste Mila können, damit es Ihnen Arbeit abnimmt?',
  'Nächsten Mini-Schritt sichern: Pilotfall, Feedbacktermin oder Absagegrund',
]

const pilotOfferText =
  'Mein Vorschlag: Wir starten nicht mit einem großen Toolwechsel, sondern mit einem kleinen Pilotfall. Ich bereite mit Mila einen Monat Unterlagen vor: Belege, fehlende Infos, Rückfragen und Übergabe-Kontext. Danach sieht man konkret, ob Kanzlei oder Betrieb weniger Sucherei und weniger Nachfragen haben.'

const emptyContact: Omit<AkquiseContact, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  type: 'kanzlei',
  channel: 'LinkedIn',
  status: 'neu',
  lastMessage: '',
  nextStep: nextStepByStatus.neu,
  followUpDate: '',
  note: '',
}

export default function AkquisePage() {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)
  const [copiedKey, setCopiedKey] = useState('')
  const [contacts, setContacts] = useState<AkquiseContact[]>([])
  const [draft, setDraft] = useState(emptyContact)

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login')
        return
      }

      setContacts(loadContacts())
      setIsReady(true)
    }

    checkSession()
  }, [router])

  useEffect(() => {
    if (!isReady) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts))
  }, [contacts, isReady])

  const stats = useMemo(() => {
    const active = contacts.filter((item) => item.status !== 'absage').length
    const replies = contacts.filter((item) =>
      ['antwort', 'termin'].includes(item.status)
    ).length
    const followUps = contacts.filter((item) => isFollowUpDue(item)).length

    return { active, replies, followUps }
  }, [contacts])

  const sortedContacts = useMemo(() => {
    return [...contacts].sort((a, b) => {
      if (isFollowUpDue(a) && !isFollowUpDue(b)) return -1
      if (!isFollowUpDue(a) && isFollowUpDue(b)) return 1
      return b.updatedAt.localeCompare(a.updatedAt)
    })
  }, [contacts])

  async function copyText(key: string, text: string) {
    await navigator.clipboard.writeText(text)
    setCopiedKey(key)
    window.setTimeout(() => setCopiedKey(''), 1800)
  }

  function updateDraft(field: keyof typeof draft, value: string) {
    const nextDraft = {
      ...draft,
      [field]: value,
    }

    if (field === 'status') {
      nextDraft.nextStep = nextStepByStatus[value as ContactStatus]
    }

    setDraft(nextDraft)
  }

  function addContact() {
    const name = draft.name.trim()
    if (!name) return

    const now = new Date().toISOString()
    const status = draft.status

    const contact: AkquiseContact = {
      ...draft,
      id: createId(),
      name,
      status,
      lastMessage: draft.lastMessage.trim(),
      nextStep: draft.nextStep.trim() || nextStepByStatus[status],
      note: draft.note.trim(),
      createdAt: now,
      updatedAt: now,
    }

    setContacts((items) => [contact, ...items])
    setDraft(emptyContact)
  }

  function updateContact(
    id: string,
    field: keyof AkquiseContact,
    value: string
  ) {
    setContacts((items) =>
      items.map((item) => {
        if (item.id !== id) return item

        const updated = {
          ...item,
          [field]: value,
          updatedAt: new Date().toISOString(),
        }

        if (field === 'status') {
          updated.nextStep = nextStepByStatus[value as ContactStatus]
        }

        return updated
      })
    )
  }

  function removeContact(id: string) {
    setContacts((items) => items.filter((item) => item.id !== id))
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
            Akquise-Cockpit
          </h1>

          <p className="mt-3 text-sm font-semibold leading-relaxed text-white/75">
            Kontakte eintragen, Status setzen, Follow-ups sehen und passende
            Texte direkt kopieren.
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <Metric label="aktiv" value={stats.active} />
            <Metric label="Antwort" value={stats.replies} />
            <Metric label="fällig" value={stats.followUps} />
          </div>
        </header>

        <section className="rounded-3xl border border-violet-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-500">
            Heute
          </p>

          <h2 className="mt-2 text-xl font-black text-slate-950">
            5 Kontakte reichen
          </h2>

          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
            Lieber sauber fünf passende Kontakte anschreiben und eintragen als
            wild zwanzig Nachrichten verlieren. Ziel: erster Anbeißer,
            ehrliches Feedback oder ein kleiner Pilotfall.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Kontakt erfassen
          </p>

          <div className="mt-4 space-y-3">
            <input
              value={draft.name}
              onChange={(event) => updateDraft('name', event.target.value)}
              placeholder="Name / Kanzlei / Betrieb"
              className="w-full rounded-2xl border border-violet-100 bg-white p-4 text-sm font-semibold outline-none focus:border-violet-500"
            />

            <div className="grid grid-cols-2 gap-2">
              <select
                value={draft.type}
                onChange={(event) => updateDraft('type', event.target.value)}
                className="rounded-2xl border border-violet-100 bg-white p-4 text-sm font-black outline-none"
              >
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                value={draft.status}
                onChange={(event) => updateDraft('status', event.target.value)}
                className="rounded-2xl border border-violet-100 bg-white p-4 text-sm font-black outline-none"
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <input
              value={draft.channel}
              onChange={(event) => updateDraft('channel', event.target.value)}
              placeholder="Kanal: LinkedIn, Mail, Facebook, XING..."
              className="w-full rounded-2xl border border-violet-100 bg-white p-4 text-sm font-semibold outline-none focus:border-violet-500"
            />

            <input
              type="date"
              value={draft.followUpDate}
              onChange={(event) =>
                updateDraft('followUpDate', event.target.value)
              }
              className="w-full rounded-2xl border border-violet-100 bg-white p-4 text-sm font-semibold outline-none focus:border-violet-500"
            />

            <textarea
              value={draft.note}
              onChange={(event) => updateDraft('note', event.target.value)}
              placeholder="Notiz: Warum passt der Kontakt? Was wurde gesagt?"
              rows={3}
              className="w-full rounded-2xl border border-violet-100 bg-white p-4 text-sm font-semibold outline-none focus:border-violet-500"
            />

            <button
              type="button"
              onClick={addContact}
              className="w-full rounded-2xl bg-violet-600 px-4 py-4 text-sm font-black text-white shadow-lg shadow-violet-100 active:scale-[0.99]"
            >
              Kontakt speichern
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Pipeline
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                Kontakte
              </h2>
            </div>

            <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-500 shadow-sm">
              {contacts.length} gesamt
            </span>
          </div>

          {sortedContacts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-violet-200 bg-white p-5 text-center">
              <p className="font-black text-slate-950">
                Noch keine Kontakte drin
              </p>

              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
                Trag den ersten Steuerberater, Betrieb oder Gruppenpost ein.
                Danach erinnert dich Mila an den nächsten sinnvollen Schritt.
              </p>
            </div>
          ) : (
            sortedContacts.map((contact) => {
              const suggestion = buildContactSuggestion(contact)
              const due = isFollowUpDue(contact)

              return (
                <article
                  key={contact.id}
                  className={
                    due
                      ? 'rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-sm'
                      : 'rounded-3xl border border-slate-100 bg-white p-4 shadow-sm'
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black text-slate-950">
                        {contact.name}
                      </p>

                      <p className="mt-1 text-xs font-black uppercase tracking-wider text-slate-400">
                        {typeLabels[contact.type]} · {contact.channel}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${statusStyles[contact.status]}`}
                    >
                      {statusLabels[contact.status]}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <select
                      value={contact.status}
                      onChange={(event) =>
                        updateContact(contact.id, 'status', event.target.value)
                      }
                      className="rounded-2xl border border-slate-100 bg-white p-3 text-xs font-black outline-none"
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>

                    <input
                      type="date"
                      value={contact.followUpDate}
                      onChange={(event) =>
                        updateContact(
                          contact.id,
                          'followUpDate',
                          event.target.value
                        )
                      }
                      className="rounded-2xl border border-slate-100 bg-white p-3 text-xs font-black outline-none"
                    />
                  </div>

                  <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Nächster Schritt
                    </p>

                    <textarea
                      value={contact.nextStep}
                      onChange={(event) =>
                        updateContact(contact.id, 'nextStep', event.target.value)
                      }
                      rows={2}
                      className="mt-2 w-full resize-none rounded-xl border border-transparent bg-white p-3 text-sm font-semibold leading-relaxed text-slate-600 outline-none focus:border-violet-200"
                    />
                  </div>

                  {contact.note && (
                    <p className="mt-3 rounded-2xl bg-white/70 p-3 text-sm font-semibold leading-relaxed text-slate-600">
                      {contact.note}
                    </p>
                  )}

                  <div className="mt-3 rounded-2xl border border-violet-100 bg-white p-3">
                    <p className="text-xs font-black uppercase tracking-wider text-violet-500">
                      Passende Nachricht
                    </p>

                    <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
                      {suggestion}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        copyText(`contact-${contact.id}`, suggestion)
                      }
                      className={
                        copiedKey === `contact-${contact.id}`
                          ? 'mt-3 w-full rounded-2xl bg-emerald-100 px-4 py-3 text-sm font-black text-emerald-700'
                          : 'mt-3 w-full rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white'
                      }
                    >
                      {copiedKey === `contact-${contact.id}`
                        ? 'Kopiert'
                        : 'Nachricht kopieren'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeContact(contact.id)}
                    className="mt-3 text-xs font-black text-slate-400"
                  >
                    Kontakt entfernen
                  </button>
                </article>
              )
            })
          )}
        </section>

        <section className="rounded-3xl border border-fuchsia-100 bg-fuchsia-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-fuchsia-600">
            Demo-Termin
          </p>

          <h2 className="mt-2 text-xl font-black text-slate-950">
            Gespräch sauber führen
          </h2>

          <div className="mt-4 space-y-2">
            {demoChecklist.map((item, index) => (
              <div key={item} className="rounded-2xl bg-white p-3">
                <p className="text-xs font-black uppercase tracking-wider text-fuchsia-500">
                  {index + 1}. Schritt
                </p>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">
            Pilot-Angebot
          </p>

          <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
            {pilotOfferText}
          </p>

          <button
            type="button"
            onClick={() => copyText('pilot-offer', pilotOfferText)}
            className={
              copiedKey === 'pilot-offer'
                ? 'mt-4 w-full rounded-2xl bg-emerald-100 px-4 py-4 text-sm font-black text-emerald-700'
                : 'mt-4 w-full rounded-2xl bg-emerald-600 px-4 py-4 text-sm font-black text-white shadow-lg shadow-emerald-100'
            }
          >
            {copiedKey === 'pilot-offer'
              ? 'Kopiert'
              : 'Pilot-Angebot kopieren'}
          </button>
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
                        onClick={() => copyText(key, template.text)}
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3 text-center">
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-white/55">
        {label}
      </p>
    </div>
  )
}

function loadContacts(): AkquiseContact[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter((item): item is AkquiseContact => {
      return Boolean(item?.id && item?.name && item?.status)
    })
  } catch {
    return []
  }
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `akquise-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function isFollowUpDue(contact: AkquiseContact) {
  if (!contact.followUpDate || contact.status === 'absage') return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const due = new Date(contact.followUpDate)
  due.setHours(0, 0, 0, 0)

  return due <= today
}

function buildContactSuggestion(contact: AkquiseContact) {
  const base = smartReplies[contact.status]
  return base.replaceAll('[Name]', contact.name)
}
