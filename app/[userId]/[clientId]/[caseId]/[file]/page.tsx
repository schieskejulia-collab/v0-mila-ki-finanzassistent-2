'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FileText, Loader2 } from 'lucide-react'
import { getActiveClientId, supabase } from '@/lib/supabase'

export default function StoredOriginalPage() {
  const params = useParams<{ userId: string; clientId: string; caseId: string; file: string }>()
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    void openOriginal()
  }, [])

  async function openOriginal() {
    const userId = decodeURIComponent(String(params.userId || ''))
    const clientId = decodeURIComponent(String(params.clientId || ''))
    const caseId = decodeURIComponent(String(params.caseId || ''))
    const file = decodeURIComponent(String(params.file || ''))

    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      setError('Bitte zuerst anmelden.')
      return
    }

    if (auth.user.id !== userId) {
      setError('Diese Unterlage gehört nicht zu deinem Benutzerkonto.')
      return
    }

    const activeClientId = getActiveClientId()
    if (activeClientId && activeClientId !== clientId) {
      setError('Diese Unterlage gehört nicht zur aktiven Akte.')
      return
    }

    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('id,client_id,case_id,file_url')
      .eq('client_id', clientId)
      .eq('case_id', caseId)
      .eq('file_url', `${userId}/${clientId}/${caseId}/${file}`)
      .maybeSingle()

    if (documentError || !document) {
      setError('Mila konnte diese Unterlage nicht eindeutig dem Vorgang zuordnen.')
      return
    }

    const storagePath = `${userId}/${clientId}/${caseId}/${file}`
    const { data, error: signedError } = await supabase.storage
      .from('mila-dokumente')
      .createSignedUrl(storagePath, 300)

    if (signedError || !data?.signedUrl) {
      setError('Das Original konnte nicht geöffnet werden.')
      return
    }

    window.location.replace(data.signedUrl)
  }

  return (
    <main className="min-h-screen bg-[#faf9fc] px-5 py-10 text-slate-950">
      <div className="mx-auto max-w-lg rounded-2xl border bg-white p-6 shadow-sm">
        {error ? (
          <>
            <FileText className="h-7 w-7 text-rose-500" />
            <h1 className="mt-3 text-xl font-black">Original konnte nicht geöffnet werden</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{error}</p>
            <button type="button" onClick={() => router.back()} className="mt-5 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Zurück zum Vorgang</button>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
            <div>
              <h1 className="text-lg font-black">Original wird geöffnet …</h1>
              <p className="mt-1 text-xs font-semibold text-slate-500">Mila erstellt dafür einen kurz gültigen, geschützten Link.</p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
