import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'Keine PDF erhalten.',
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        title: 'PDF-Rechnung',
        amount: '',
        vendor: '',
        category: 'sonstiges',
      },
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        error: 'PDF konnte nicht verarbeitet werden.',
      },
      { status: 500 }
    )
  }
}