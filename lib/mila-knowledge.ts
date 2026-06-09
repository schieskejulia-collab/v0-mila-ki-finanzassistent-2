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
    titel: "Die Homeoffice-Pauschale",
    beschreibung: "Auch ohne eigenes Arbeitszimmer kannst du 6 € pro Tag absetzen.",
    nische: "Gilt auch für die Arbeit am Küchentisch oder auf der Couch! Maximal 1.260 € im Jahr.",
    status: "Voll absetzbar",
    keywords: ["homeoffice", "miete", "wohnen", "arbeitszimmer"]
  },
  {
    kategorie: "🍽️ Bewirtung",
    titel: "Geschäftsessen",
    beschreibung: "Essen mit Kunden oder Partnern zur Akquise oder Projektabsprache.",
    nische: "Vergiss das Trinkgeld nicht! Wenn es auf dem Beleg steht, zählen die 70% auch darauf.",
    status: "70% absetzbar",
    keywords: ["bewirtung", "essen", "restaurant", "kunden"]
  },
  {
    kategorie: "💻 Arbeitsmittel",
    titel: "Technik & Software",
    beschreibung: "Laptops, Monitore, Apps und Abos (wie Notion, Adobe).",
    nische: "Gegenstände bis 800 € (netto) sind 'GWG' und können sofort im selben Jahr voll abgesetzt werden.",
    status: "Voll absetzbar",
    keywords: ["software", "tools", "hardware", "laptop", "technik", "abo", "arbeitsmittel"]
  },
  {
    kategorie: "✈️ Reisekosten",
    titel: "Fahrtkosten-Pauschale",
    beschreibung: "Jeder Kilometer zum Kunden oder zu Fortbildungen zählt.",
    nische: "Auch das Fahrrad zählt mit 0,30 € pro KM! Mila kann dein Fahrtenbuch führen.",
    status: "Pauschale",
    keywords: ["reisekosten", "fahrtkosten", "pendeln", "zug", "auto", "reisen"]
  },
  {
    kategorie: "🧼 Reinigung",
    titel: "Berufskleidung",
    beschreibung: "Reinigung von Kleidung, die du fast nur beruflich nutzt.",
    nische: "Sogar die Reinigung deines Anzugs für ein wichtiges Event kann durchgehen, wenn es rein beruflich war.",
    status: "Voll absetzbar",
    keywords: ["reinigung", "kleidung", "wäsche"]
  },
  {
    kategorie: "📦 Kleinkram",
    titel: "Kontoführung & Co.",
    beschreibung: "Gebühren für dein Geschäftskonto.",
    nische: "Pauschal 16 € im Jahr kannst du ohne jeden Beleg angeben. Mila merkt sich das!",
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
