'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleAuth = async () => {
    setLoading(true)
    setMessage('')

    const cleanEmail = email.trim()

    if (!cleanEmail || !password) {
      setMessage('Bitte E-Mail und Passwort eingeben.')
      setLoading(false)
      return
    }

    const result =
      mode === 'signup'
        ? await supabase.auth.signUp({
            email: cleanEmail,
            password,
          })
        : await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          })

    if (result.error) {
      setMessage(result.error.message)
      setLoading(false)
      return
    }

    setMessage(
      mode === 'signup'
        ? 'Konto erstellt. Prüfe ggf. deine E-Mail.'
        : 'Login erfolgreich.'
    )

    setLoading(false)
    router.push('/')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fbf9ff] p-4 text-slate-950">
      <section className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-500">
          Mila Finanz
        </p>

        <h1 className="mt-3 text-3xl font-black">
          {mode === 'login' ? 'Einloggen' : 'Konto erstellen'}
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Melde dich an, damit deine Finanzdaten geschützt bleiben.
        </p>

        <div className="mt-6 space-y-4">
          <input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-violet-100 bg-white p-4 text-base outline-none focus:border-violet-500"
          />

          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-violet-100 bg-white p-4 text-base outline-none focus:border-violet-500"
          />

          <button
            type="button"
            onClick={handleAuth}
            disabled={loading}
            className="w-full rounded-3xl bg-violet-600 p-4 text-base font-black text-white shadow-sm active:bg-violet-700 disabled:opacity-50"
          >
            {loading
              ? 'Bitte warten...'
              : mode === 'login'
              ? 'Einloggen'
              : 'Registrieren'}
          </button>
        </div>

        {message && (
          <p className="mt-4 rounded-2xl bg-violet-50 p-3 text-sm font-semibold text-slate-700">
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login')
            setMessage('')
          }}
          className="mt-5 w-full text-sm font-bold text-violet-700"
        >
          {mode === 'login'
            ? 'Noch kein Konto? Registrieren'
            : 'Schon ein Konto? Einloggen'}
        </button>
      </section>
    </main>
  )
}