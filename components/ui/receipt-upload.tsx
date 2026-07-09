'use client'

import { useRef, useState } from 'react'

export function ReceiptUpload({
  onScanSuccess,
}: {
  onScanSuccess?: (data: any) => void
}) {
  const [isScanning, setIsScanning] = useState(false)
  const [statusText, setStatusText] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  async function handleFile(file?: File) {
  if (!file || isScanning) return

  setIsScanning(true)

  try {
    const isPdf = file.type === 'application/pdf'

    setStatusText(isPdf ? 'PDF wird vorbereitet...' : 'Bild wird vorbereitet...')

    let res: Response

    if (isPdf) {
      const formData = new FormData()
      formData.append('file', file)

      setStatusText('PDF wird sicher abgelegt...')

      res = await fetch('/api/mila/scan-document', {
        method: 'POST',
        body: formData,
      })
    } else {
      const optimizedBase64 = await resizeAndConvertToBase64(file, 1024)

      setStatusText('Mila liest deinen Beleg...')

      res = await fetch('/api/mila/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: optimizedBase64 }),
      })
    }

    const contentType = res.headers.get('content-type') || ''

    if (!contentType.includes('application/json')) {
      throw new Error(
        'Der Scanner hat keine gültige Antwort erhalten. Bitte nochmal versuchen.'
      )
    }

    const json = await res.json()

    if (!res.ok || !json.success) {
      throw new Error(
        json.error || 'Mila konnte die Datei nicht sicher auslesen.'
      )
    }


const scanPayload = json.data?.data || json.data

if (scanPayload && onScanSuccess) {
  onScanSuccess(scanPayload)
}
  } catch (err: any) {
    console.error('Scanner Error:', err)
    setStatusText(
      err?.message ||
        'Die Datei konnte gerade nicht gelesen werden. Bitte erneut versuchen.'
    )
  } finally {
    if (inputRef.current) {
      inputRef.current.value = ''
    }

    setTimeout(() => {
      setIsScanning(false)
      setStatusText('')
    }, 3500)
  }
}

  return (
    <div className="w-full">
      <label className="flex w-full cursor-pointer flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-violet-200 bg-violet-50/70 p-5 text-center transition-all active:scale-[0.99]">
        <span className="text-3xl">{isScanning ? '⏳' : '📸'}</span>

        <p className="mt-2 text-sm font-black text-slate-800">
          {isScanning ? statusText : 'Beleg fotografieren oder hochladen'}
        </p>

        <p className="mt-1 text-xs font-semibold text-slate-400">
  Bilder liest Mila automatisch. PDFs werden erstmal sicher abgelegt.
</p>

        <input
  ref={inputRef}
  type="file"
  accept="image/*,application/pdf"
  disabled={isScanning}
  onChange={(e) => handleFile(e.target.files?.[0])}
  className="hidden"
/>
      </label>
    </div>
  )
}

function resizeAndConvertToBase64(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width
            width = maxSize
          }
        } else if (height > maxSize) {
          width *= maxSize / height
          height = maxSize
        }

        canvas.width = Math.round(width)
        canvas.height = Math.round(height)

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Bild konnte nicht vorbereitet werden.'))
          return
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
        resolve(dataUrl)
      }

      img.onerror = () => reject(new Error('Bild konnte nicht geladen werden.'))
      img.src = event.target?.result as string
    }

    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'))
    reader.readAsDataURL(file)
  })
}