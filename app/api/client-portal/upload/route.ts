import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_NOTE_LENGTH = 2000
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 120) || 'upload'
}

export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const token = String(form.get('token') || '').trim()
    const note = String(form.get('note') || '').trim().slice(0, MAX_NOTE_LENGTH)
    const questionId = String(form.get('questionId') || '').trim()
    const file = form.get('file')

    if (!token || !(file instanceof File)) {
      return NextResponse.json({ error: 'Datei oder Link fehlt.' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Erlaubt sind PDF, JPG, PNG oder WEBP.' }, { status: 400 })
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Die Datei darf maximal 10 MB groß sein.' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    let link: any = null
    const withExpiry = await admin
      .from('client_upload_links')
      .select('user_id,client_id,case_id,expires_at')
      .eq('token', token)
      .eq('active', true)
      .maybeSingle()

    if (!withExpiry.error) {
      link = withExpiry.data
    } else {
      const fallback = await admin
        .from('client_upload_links')
        .select('user_id,client_id,case_id')
        .eq('token', token)
        .eq('active', true)
        .maybeSingle()
      link = fallback.data
    }

    if (!link || !link.case_id || (link.expires_at && new Date(link.expires_at).getTime() <= Date.now())) {
      return NextResponse.json({ error: 'Link ungültig, abgelaufen oder deaktiviert.' }, { status: 404 })
    }

    if (questionId) {
      const { data: question } = await admin
        .from('mila_case_updates')
        .select('id')
        .eq('id', questionId)
        .eq('user_id', link.user_id)
        .eq('case_id', link.case_id)
        .eq('kind', 'question')
        .neq('status', 'done')
        .maybeSingle()

      if (!question) {
        return NextResponse.json({ error: 'Die zugehörige Rückfrage wurde nicht gefunden.' }, { status: 404 })
      }
    }

    const filename = safeName(file.name)
    const storagePath = `${link.user_id}/${link.client_id}/${crypto.randomUUID()}-${filename}`
    const bytes = new Uint8Array(await file.arrayBuffer())

    const { error: uploadError } = await admin.storage
      .from('client-uploads')
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: false,
        cacheControl: '0',
      })

    if (uploadError) {
      return NextResponse.json({ error: `Upload fehlgeschlagen: ${uploadError.message}` }, { status: 500 })
    }

    const now = new Date()
    const keepUntil = new Date(now)
    keepUntil.setFullYear(keepUntil.getFullYear() + 1)

    const { error: documentError } = await admin.from('documents').insert({
      user_id: link.user_id,
      client_id: link.client_id,
      case_id: link.case_id,
      title: filename.replace(/\.[^.]+$/, '') || 'Nachgereichter Beleg',
      partner: '',
      type: 'beleg',
      status: 'neu',
      file_name: filename,
      file_url: storagePath,
      note: note || (questionId ? 'Vom Mandanten zu einer Rückfrage nachgereicht.' : 'Vom Mandanten nachgereicht.'),
      keep_until: keepUntil.toISOString().slice(0, 10),
      created_at: now.toISOString(),
    })

    if (documentError) {
      await admin.storage.from('client-uploads').remove([storagePath])
      return NextResponse.json({ error: `Dokument konnte nicht zugeordnet werden: ${documentError.message}` }, { status: 500 })
    }

    if (questionId) {
      await admin
        .from('mila_case_updates')
        .update({ status: 'done' })
        .eq('id', questionId)
        .eq('user_id', link.user_id)
        .eq('case_id', link.case_id)

      await admin.from('mila_case_updates').insert({
        user_id: link.user_id,
        case_id: link.case_id,
        kind: 'answer',
        content: `Beleg nachgereicht: ${filename}${note ? ` – ${note}` : ''}`,
        status: 'done',
      })

      const { count: remainingQuestions } = await admin
        .from('mila_case_updates')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', link.user_id)
        .eq('case_id', link.case_id)
        .eq('kind', 'question')
        .neq('status', 'done')

      if ((remainingQuestions || 0) === 0) {
        await admin
          .from('mila_intake_cases')
          .update({ status: 'in_progress' })
          .eq('id', link.case_id)
          .eq('user_id', link.user_id)
          .eq('status', 'needs_info')
      }
    }

    if ('expires_at' in link) {
      await admin
        .from('client_upload_links')
        .update({ last_used_at: now.toISOString() })
        .eq('token', token)
        .eq('active', true)
    }

    return NextResponse.json(
      { ok: true, filename },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Upload konnte nicht verarbeitet werden.' }, { status: 500 })
  }
}
