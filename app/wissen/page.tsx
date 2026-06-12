"use client"

import { useState } from "react"

// Die Steuertipps direkt hier in der Datei definiert, damit lib/store.tsx frei bleibt
const STEUER_TIPPS = [
  {
    titel: 'Software absetzen',
    kategorie: 'Software',
    status_info: 'Selbstständig',
    beschreibung: 'Software und digitale Tools (wie KI-Assistenten, Buchhaltungstools oder Abos) können oft sofort oder über die Nutzungsdauer komplett als Betriebsausgabe abgesetzt werden.'
  },
  {
    titel: 'Bewirtung korrekt buchen',
    kategorie: 'Bewirtung',
    status_info: 'Freelancer',
    beschreibung: 'Geschäftsessen sind nur teilweise (meist zu 70%) abziehbar. Achte penibel auf einen ordnungsgemäßen Bewirtungsbeleg mit Anlass und Teilnehmern.'
  },
  {
    titel: 'Reisen und Verpflegung',
    kategorie: 'Reisen',
    status_info: 'Alle',
    beschreibung: 'Bei geschäftlichen Reisen kannst du die Pauschalen für Verpflegungsmehraufwand und die tatsächlichen Fahrtkosten (z.B. 0,30 € pro km) geltend machen.'
  },
  {
    titel: 'Weiterbildung',
    kategorie: 'Weiterbildung',
    status_info: 'Alle',
    beschreibung: 'Fachliteratur, Kurse und Coachings, die dich in deinem Business direkt voranbringen, sind zu 100% steuerlich absetzbar.'
  }
]

export default function WissenPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredTipps = STEUER_TIPPS.filter(tipp =>
    tipp.titel.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tipp.beschreibung.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tipp.kategorie.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="container mx-auto p-4 max-w-2xl pb-24">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Mila Steuerwissen</h1>
      
      {/* Suchfeld */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Nach Steuertipps suchen..."
          className="w-full p-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-800"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Liste der Tipps */}
      <div className="space-y-4">
        {filteredTipps.length > 0 ? (
          filteredTipps.map((tipp, index) => (
            <div key={index} className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-semibold">
                  {tipp.kategorie}
                </span>
                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">
                  {tipp.status_info}
                </span>
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">{tipp.titel}</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{tipp.beschreibung}</p>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-400 py-8">Keine passenden Steuertipps gefunden.</p>
        )}
      </div>
    </div>
  )
}
