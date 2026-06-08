// lib/mila-tips.ts

export const getMilaTip = (category: string, userStatus: string): string => {
  const cat = category.toLowerCase();
  
  if (cat.includes("software")) {
    return "💻 Voll absetzbar! Da Software meist unter 800€ kostet, ziehen wir das sofort im selben Jahr ab. Praktisch, oder?";
  }
  if (cat.includes("bewirtung")) {
    return "🍽️ Geschäftsessen! Ich buche 70% für dich ab. Kleiner Tipp: Schreib mir kurz die Namen der Gäste in die Notizen, dann ist das Finanzamt glücklich.";
  }
  if (cat.includes("reisen")) {
    return "✈️ Auf Achse? Denk an die Verpflegungspauschale! Wenn du länger als 8 Std. weg bist, schenkt dir der Staat extra Geld.";
  }
  if (cat.includes("homeoffice") || cat.includes("miete")) {
    return "🏠 Home-Office-Hero! Auch ohne eigenes Zimmer holen wir uns 6€ pro Tag zurück. Ich tracke deine Tage für dich.";
  }
  if (cat.includes("weiterbildung")) {
    return "🎓 Investment in dich! Das setzen wir voll ab. Sogar die Fahrt zum Kurs zählt.";
  }
  
  return "📦 Alles klar, ich hab das kategorisiert. Soll ich mal prüfen, ob wir hier noch was optimieren können?";
};
