"use client"

import { useState } from "react"

export function ReceiptUpload({ onScanSuccess }: { onScanSuccess?: (data: any) => void }) {
  const [isScanning, setIsScanning] = useState(false)
  const [statusText, setStatusText] = useState("")

  const handleFile = async (file: File) => {
    if (!file) return
    
    setIsScanning(true)
    setStatusText("Mila liest Beleg...")

    try {
      // 1. Datei in Base64 konvertieren
      const base64 = await fileToBase64(file)

      // 2. Aufruf der Next.js Route mit Groq Vision
      const res = await fetch("/api/mila/scan-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64 }),
      })

      const json = await res.json()
      
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Scan fehlgeschlagen")
      }

      setStatusText("Daten erfolgreich ausgelesen! 🎉")
      
      // Übergibt die erkannten Daten (title, amount, vendor, category) an das Formular
      if (onScanSuccess) {
        onScanSuccess(json.data)
      }

    } catch (err: any) {
      console.error("Scanner Error:", err)
      setStatusText("Fehler: " + err.message)
    } finally {
      setTimeout(() => {
        setIsScanning(false)
        setStatusText("")
      }, 2500)
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
      } else {
        reject(new Error("Datei konnte nicht gelesen werden"))
      }
    }
    reader.onerror = (error) => reject(error)
    reader.readAsDataURL(file)
  })
}
