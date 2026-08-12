import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const documentId = url.searchParams.get('id')?.trim()

    if (!documentId) {
      return NextResponse.json({ error: 'Dokument fehlt.' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const authHeader = request.headers.get('authorization') || ''
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    if (!accessToken) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 })
    }

    const { data: userData, error: userError } = await admin.auth.getUser(accessToken)
    const user = userData?.user

    if (userError || !user) {
      return NextResponse.json({ error: 'Sitzung ungültig.' }, { status: 401 })
    }

    const { data: document, error: documentError } = await admin
      .from('documents')
      .select('id,user_id,file_url,file_name')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (documentError || !document?.file_url) {
      return NextResponse.json({ error: 'Datei nicht gefunden.' }, { status: 404 })
    }

    const { data: signed, error: signedError } = await admin.storage
      .from('client-uploads')
      .createSignedUrl(String(document.file_url), 60 * 5, { download: false })

    if (signedError || !signed?.signedUrl) {
      return NextResponse.json({ error: 'Datei konnte nicht geöffnet werden.' }, { status: 500 })
    }

    return NextResponse.json({ url: signed.signedUrl, fileName: document.file_name || null })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Datei konnte nicht geöffnet werden.' }, { status: 500 })
  }
}
