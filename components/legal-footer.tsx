import Link from 'next/link'

export function LegalFooter() {
  return (
    <footer className="px-5 pb-32 pt-6 text-center text-[11px] leading-5 text-slate-500">
      <div className="mx-auto flex max-w-md flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <Link href="/impressum" className="underline-offset-4 hover:underline">Impressum</Link>
        <span>·</span>
        <Link href="/datenschutz" className="underline-offset-4 hover:underline">Datenschutz</Link>
        <span>·</span>
        <Link href="/datenschutz-sicherheit" className="underline-offset-4 hover:underline">Sicherheit</Link>
        <span>·</span>
        <Link href="/agb" className="underline-offset-4 hover:underline">AGB</Link>
        <span>·</span>
        <Link href="/widerruf" className="underline-offset-4 hover:underline">Widerruf</Link>
      </div>
      <p className="mx-auto mt-2 max-w-sm">
        Mila unterstützt bei Ordnung und Vorbereitung. Keine Steuer- oder Rechtsberatung.
      </p>
    </footer>
  )
}