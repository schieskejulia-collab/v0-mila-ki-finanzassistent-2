export interface SteuerTipp {
  kategorie: string;
  titel: string;
  beschreibung: string;
  nische: string;
  status: string;
  keywords: string[];
}

export const STEUER_TIPPS: SteuerTipp[] = [
  {
    kategorie: "🏠 Home-Office",
    titel: "Deine Wohlfühl-Zone",
    beschreibung: "Auch ohne echtes Arbeitszimmer kannst du 6 € pro Tag absetzen.",
    nische: "Egal ob Küchentisch oder Couch – Hauptsache du warst produktiv! Schnapp dir die 6 €, bis zu 1.260 € im Jahr gehören dir.",
    status: "Voll absetzbar",
    keywords: ["homeoffice", "miete", "wohnen", "arbeitszimmer"]
  },
  {
    kategorie: "🍽️ Bewirtung",
    titel: "Networking & Genuss",
    beschreibung: "Essen mit Kunden oder Partnern zur Akquise oder Projektabsprache.",
    nische: "Kleiner Insider: Vergiss das Trinkgeld nicht! Wenn es auf dem Beleg steht, holen wir uns die 70% auch darauf zurück. Lass es dir schmecken!",
    status: "70% absetzbar",
    keywords: ["bewirtung", "essen", "restaurant", "kunden"]
  },
  {
    kategorie: "💻 Arbeitsmittel",
    titel: "Dein Tech-Upgrade",
    beschreibung: "Laptops, Monitore, Apps und Abos (wie Notion, Adobe).",
    nische: "Alles unter 800 € (netto) ist ein 'GWG' – das setzen wir sofort im Ganzen ab. Dein Setup muss schließlich glänzen!",
    status: "Voll absetzbar",
    keywords: ["software", "tools", "hardware", "laptop", "technik", "abo", "arbeitsmittel"]
  },
  {
    kategorie: "✈️ Reisekosten",
    titel: "Mila on Tour",
    beschreibung: "Jeder Kilometer zum Kunden oder zu Fortbildungen zählt.",
    nische: "Sogar dein Drahtesel zählt mit 0,30 € pro KM! Ich halte dein Fahrtenbuch sauber, während du die Welt eroberst.",
    status: "Pauschale",
    keywords: ["reisekosten", "fahrtkosten", "pendeln", "zug", "auto", "reisen"]
  },
  {
    kategorie: "🧼 Reinigung",
    titel: "Frisch & Professionell",
    beschreibung: "Reinigung von Kleidung, die du fast nur beruflich nutzt.",
    nische: "Dein Anzug für das wichtige Event? Wenn's rein beruflich war, geht die Reinigung auf's Haus (bzw. die Steuer). Bleib glänzend!",
    status: "Voll absetzbar",
    keywords: ["reinigung", "kleidung", "wäsche"]
  },
  {
    kategorie: "📦 Kleinkram",
    titel: "Der Kleinkram-Held",
    beschreibung: "Gebühren für dein Geschäftskonto.",
    nische: "Pauschal 16 € im Jahr gehen immer – ganz ohne Beleg-Stress. Ich merke mir das für dich, Julia!",
    status: "Pauschale",
    keywords: ["kontoführung", "bank", "gebühren", "bürobedarf", "marketing"]
  }
];

export function findMilaTip(categoryName: string): SteuerTipp | undefined {
  const search = categoryName.toLowerCase();
  return STEUER_TIPPS.find(t => 
    t.kategorie.toLowerCase().includes(search) || 
    t.keywords.some(k => search.includes(k))
  );
}
