"use client"

import { useFinance } from "@/lib/store"

export function ReceiptUpload() {
  const { addExpense, triggerMilaFeedback } = useFinance()

  const handleFile = async (file: File) => {
    const base64 = await fileToBase64(file)

    const res = await fetch("/api/scan-receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: base64 }),
    })

    const json = await res.json()
    if (!json.ok) return

    const data = JSON.parse(json.data)

    addExpense({
      amount: data.amount,
      category: data.category,
      vendor: data.vendor,
      date: data.date,
      vat: data.vat || 19,
      hasReceipt: true,
    })

    triggerMilaFeedback(data.category)
  }

  return (
    <input
      type="file"
      accept="image/*"
      onChange={(e) => e.target.files && handleFile(e.target.files[0])}
      className="w-full text-sm"
    />
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(file)
  })
}
