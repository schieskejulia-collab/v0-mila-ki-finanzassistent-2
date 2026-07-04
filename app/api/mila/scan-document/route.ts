import { NextResponse } from 'next/server'
import { classifyReceipt } from '@/lib/receipt-rules'
export async function POST(req: Request) {

  try {

    const formData = await req.formData()

    const file = formData.get('file')

    if (!(file instanceof File)) {

      return NextResponse.json(

        { success: false, error: 'Keine Datei erhalten.' },

        { status: 400 }

      )

    }

    if (file.type !== 'application/pdf') {

      return NextResponse.json(

        { success: false, error: 'Bitte eine PDF hochladen.' },

        { status: 400 }

      )

    }

    const arrayBuffer = await file.arrayBuffer()

    if (arrayBuffer.byteLength === 0) {

      return NextResponse.json(

        { success: false, error: 'Die PDF ist leer.' },

        { status: 400 }

      )

    }

    return NextResponse.json({

      success: true,

      data: {

        title: file.name.replace('.pdf', ''),

        vendor: '',

        amount: '',

        category: 'sonstiges',

        note: 'PDF erfolgreich empfangen 📄',

      },

    })

  } catch (error) {

    console.error('PDF Fehler:', error)

    return NextResponse.json(

      { success: false, error: 'PDF konnte nicht verarbeitet werden.' },

      { status: 500 }

    )

  }

}