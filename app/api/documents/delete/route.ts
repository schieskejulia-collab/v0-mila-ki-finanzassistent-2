import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

function storageBucketForPath(path: string) {
  const parts = path.split('/').filter(Boolean)
  return parts.length >= 3 ? 'client-uploads' : 'mila-dokumente'
}

function bearerToken(request: Request) {
  const value = request.headers.get('authorization') || ''
  return value.startsWith('Bearer ') ? value.slice(7).trim() : ''
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url)
    const documentId = url.searchParams.get('id')?.trim()
    const clientId = url.searchParams.get('clientId')?.trim()

    if (!documentId || !clientId) {
      return NextResponse.json(
        { error: 'Dokument oder Mandant fehlt.' },
        { status: 400 },
      )
    }

    const token = bearerToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()
    const { data: userData, error: userError } = await admin.auth.getUser(token)
    const user = userData?.user

    if (userError || !user) {
      return NextResponse.json({ error: 'Sitzung ungültig.' }, { status: 401 })
    }

    const { data: document, error: documentError } = await admin
      .from('documents')
      .select('id,user_id,client_id,file_url,related_booking_id')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .eq('client_id', clientId)
      .maybeSingle()

    if (documentError) throw documentError
    if (!document) {
      return NextResponse.json({ error: 'Dokument nicht gefunden.' }, { status: 404 })
    }

    const storagePath = String(document.file_url || '').trim()
    if (storagePath && !/^https?:\/\//i.test(storagePath)) {
      const bucket = storageBucketForPath(storagePath)
      const { error: storageError } = await admin.storage.from(bucket).remove([storagePath])
      if (storageError) {
        return NextResponse.json(
          { error: `Private Datei konnte nicht gelöscht werden: ${storageError.message}` },
          { status: 500 },
        )
      }
    }

    const { error: deleteError } = await admin
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', user.id)
      .eq('client_id', clientId)

    if (deleteError) throw deleteError

    await admin
      .from('client_questions')
      .delete()
      .eq('document_id', documentId)
      .eq('user_id', user.id)
      .eq('client_id', clientId)

    const relatedBookingId = document.related_booking_id
      ? String(document.related_booking_id)
      : ''

    if (relatedBookingId) {
      const { data: remainingLinks, error: linkError } = await admin
        .from('documents')
        .select('id')
        .eq('user_id', user.id)
        .eq('client_id', clientId)
        .eq('related_booking_id', relatedBookingId)
        .limit(1)

      if (!linkError && (!remainingLinks || remainingLinks.length === 0)) {
        const { data: expense } = await admin
          .from('expenses')
          .select('id,source')
          .eq('id', relatedBookingId)
          .eq('user_id', user.id)
          .eq('client_id', clientId)
          .maybeSingle()

        if (expense && ['scan', 'mila_stapel'].includes(String(expense.source || ''))) {
          await admin
            .from('expenses')
            .update({ hasReceipt: false })
            .eq('id', relatedBookingId)
            .eq('user_id', user.id)
            .eq('client_id', clientId)
        }
      }
    }

    return NextResponse.json(
      { ok: true },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Dokument konnte nicht gelöscht werden.' },
      { status: 500 },
    )
  }
}
