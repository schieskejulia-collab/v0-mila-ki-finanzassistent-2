import Link from 'next/link'

export default function EingangLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-20 flex justify-center px-4">
        <Link
          href="/neue-buchungen"
          className="pointer-events-auto flex w-full max-w-md items-center justify-center rounded-2xl bg-violet-600 px-5 py-4 text-sm font-black text-white shadow-xl shadow-violet-200/60"
        >
          + Neuen Vorgang erfassen
        </Link>
      </div>
    </>
  )
}
