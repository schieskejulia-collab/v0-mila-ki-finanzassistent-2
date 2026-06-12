"use client"

import { useState } from "react"

export function ReceiptUpload({ onScanSuccess }: { onScanSuccess?: (data: any) => void }) {
  const [isScanning, setIsScanning] = useState(false)
  const [statusText, setStatusText] = useState("")

  const handleFile = async (file: File) => {
    if (!file) return
    
    setIsScanning(true)
    setStatusText("Komprimiere Bild...")

    try {
      // 1. Bild vor dem Upload herunterskalieren (schont Vercel-Limits & beschleunigt Groq)
      const optimizedBase64 = await resizeAndConvertToBase64(file, 1024)

      setStatusText("Mila liest Beleg...")

      // 2. Aufruf der Next.js Route
      const res = await fetch("/api/mila/scan-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: optimizedBase64 }),
      })

      const contentType = res.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server-Timeout oder Konfigurationsfehler (Kein JSON).")
      }

      const json = await res.json()
      
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Mila konnte den Beleg nicht richtig entziffern.")
      }

      setStatusText("Daten erfolgreich eingetragen! 🎉")
      
      if (onScanSuccess && json.data) {
        onScanSuccess(json.data)
      }

    } catch (err: any) {
      console.error("Scanner Error:", err)
      setStatusText("Fehler: " + err.message)
    } finally {
      setTimeout(() => {
        setIsScanning(false)
        setStatusText("")
      }, 3500)
    }
  }

  return (
    <div className="w-full space-y-2">
      <label className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed border-purple-300 rounded-2xl bg-purple-50/50 cursor-pointer hover:bg-purple-50 transition-all text-center">
        <div className="flex flex-col items-center justify-center pt-2 pb-2">
          <span className="text-3xl mb-1">{isScanning ? "⏳" : "📸"}</span>
          <p className="text-sm font-bold text-slate-700">
            {isScanning ? statusText : "Beleg fotografieren oder hochladen"}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Mila bestimmt Betrag & Kategorie automatisch</p>
        </div>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          disabled={isScanning}
          onChange={(e) => e.target.files && handleFile(e.target.files[0])}
          className="hidden"
        />
      </label>
    </div>
  )
}

// Hilfsfunktion: Komprimiert das Bild im Browser über ein HTML5 Canvas auf max-width/max-height
function resizeAndConvertToBase64(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement("canvas")
        let width = img.width
        let height = img.height

        // Proportionen beibehalten
        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height
            height = maxSize
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) return reject(new Error("Canvas Kontext nicht verfügbar"))
        
        ctx.drawImage(img, 0, 0, width, height)
        
        // Als JPEG mit 80% Qualität exportieren (spart enorm viel Platz!)
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8)
        resolve(dataUrl)
      }
      img.onerror = (err) => reject(err)
    }
    reader.onerror = (err) => reject(err)
  })
}
