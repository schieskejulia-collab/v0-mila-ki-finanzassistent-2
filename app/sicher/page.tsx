'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CircleHelp, FileText, HeartHandshake, Ruler, WalletCards } from 'lucide-react'
import { MorningBriefing } from '@/components/ui/morning-briefing'
import { supabase } from '@/lib/supabase'

export default function SafeWorkspaceStart() {
  const router = useRouter()

  useEffect(() => {
    async function protectPage() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) router.replace('/login')
    }

    void protectPage()
  }, [router])

  return (
    <main className="min-h-screen bg-gradient-to-b from-violet-50 via-[#fffafd] to-white px-4 py-7 text-slate-950">
      <div className="mx-auto max-w-md">
        <MorningBriefing />

        <section className="mt-6">
          <h2 className="px-1 text-lg font-black">Wobei brauchst du Mila?</h2>
          <div className="mt-3 grid gap-3">
            <ActionLink
              href="/aufmass"
              icon={<Ruler className="h-5 w-5" />}
              title="Aufmaß erfassen"
              text="Wand messen, Öffnungen abziehen und die Nettofläche nachvollziehbar berechnen."
              color="emerald"
            />
            <ActionLink
              href="/buchungen"
              icon={<WalletCards className="h-5 w-5" />}
              title="Meine Finanzen ansehen"
              text="Was kommt rein, was geht raus und was bleibt noch?"
              color="violet"
            />
            <ActionLink
              href="/neue-buchungen"
              icon={<FileText className="h-5 w-5" />}
              title="Bescheid oder Schreiben hochladen"
              text="Mila hilft dir, Beträge, Fristen und offene Punkte zu finden."
              color="amber"
            />
            <ActionLink
              href="/chat"
              icon={<CircleHelp className="h-5 w-5" />}
              title="Mila etwas fragen"
              text="Frag so, wie du es auch einem Menschen erklären würdest."
              color="pink"
            />
          </div>
        </section>

        <section className="mt-5 rounded-[1.8rem] border border-violet-100 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <HeartHandshake className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-black">Du kommst gerade nicht weiter?</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                Schreib mir kurz, wobei du Hilfe brauchst. Ich schaue mit dir gemeinsam drauf.
              </p>
            </div>
          </div>
          <Link href="/kontakt" className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-black text-white">
            Julia um Hilfe bitten <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <p className="mx-auto mt-5 max-w-sm px-3 text-center text-[11px] font-semibold leading-5 text-slate-400">
          Mila erklärt, sortiert und bereitet vor. Fachliche Entscheidungen und Freigaben bleiben beim Nutzer.
        </p>
      </div>
    </main>
  )
}

function ActionLink({ href, icon, title, text, color }: { href: string; icon: React.ReactNode; title: string; text: string; color: 'violet' | 'amber' | 'pink' | 'emerald' }) {
  const iconColor = color === 'amber'
    ? 'bg-amber-50 text-amber-700'
    : color === 'pink'
      ? 'bg-pink-50 text-pink-600'
      : color === 'emerald'
        ? 'bg-emerald-50 text-emerald-700'
        : 'bg-violet-50 text-violet-600'

  return (
    <Link href={href} className="flex items-center gap-4 rounded-[1.6rem] border border-slate-100 bg-white p-4 shadow-[0_8px_25px_rgba(15,23,42,.05)] transition active:scale-[.99]">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconColor}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black">{title}</span>
        <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{text}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-violet-400" />
    </Link>
  )
}
