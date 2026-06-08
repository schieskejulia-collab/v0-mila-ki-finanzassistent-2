export type UserStatus = 'angestellt' | 'selbstständig' | 'kleinunternehmer' | 'freelancer';

export interface SteuerTipp {
  kategorie: string;
  titel: string;
  beschreibung: string;
  nische: Record<UserStatus, string>; // Individueller Tipp pro Status
  status_info: string;
  keywords: string[];
}

export const STEUER_TIPPS: SteuerTipp[] = [
  {
    kategorie: "🏠 Home-Office",
    titel: "Deine Wohlfühl-Zone",
    beschreibung: "Pauschale für die Arbeit von Zuhause.",
    status_info: "Voll absetzbar",
    keywords: ["homeoffice", "miete", "wohnen", "arbeitszimmer"],
    nische: {
      angestellt: "Für dich sind das Werbungskosten! 6€ pro Tag, bis zu 1260€ im Jahr, auch ohne extra Zimmer.",
      selbstständig: "Betriebsausgabe! Wir setzen die Pauschale an oder anteilig Miete/Strom, wenn du ein echtes Büro hast.",
      kleinunternehmer: "Betriebsausgabe! Da du keine USt zahlst, setzen wir den Brutto-Betrag voll an.",
      freelancer: "Homeoffice-Pauschale rockt! 6€ pro Tag sind sicher, solange du nicht im Coworking warst."
    }
  },
  {
    kategorie: "🍽️ Bewirtung",
    titel: "Networking & Genuss",
    beschreibung: "Essen mit Kunden oder Partnern.",
    status_info: "70% absetzbar",
    keywords: ["bewirtung", "essen", "restaurant", "kunden"],
    nische: {
      angestellt: "Schwierig als Angestellter, außer du zahlst für Kollegen. Meistens eher was für Chefs!",
      selbstständig: "70% sind absetzbar. Wichtig: Namen der Gäste und Anlass auf den Beleg schreiben!",
      kleinunternehmer: "70% vom Brutto-Betrag! Denk an den Bewirtungsbeleg, sonst meckert das Finanzamt.",
      freelancer: "Dein Business-Lunch! 70% gehen durch. Trinkgeld zählt auch dazu!"
    }
  },
  {
    kategorie: "💻 Arbeitsmittel",
    titel: "Dein Tech-Upgrade",
    beschreibung: "Laptops, Software, Monitore.",
    status_info: "Sofortabzug bis 800€",
    keywords: ["software", "tools", "hardware", "laptop", "technik", "abo", "arbeitsmittel"],
    nische: {
      angestellt: "Werbungskosten! Über 800€ müssen wir über 3 Jahre verteilen (AfA), darunter sofort.",
      selbstständig: "Betriebsausgabe! Dank 'Digital-AfA' können wir Laptops oft sogar in einem Jahr voll absetzen.",
      kleinunternehmer: "Brutto-Sofortabzug bis 952€ (800€ netto + 19% MwSt), da du nicht vorsteuerabzugsberechtigt bist!",
      freelancer: "Dein Handwerkszeug! Software-Abos wie Adobe oder Notion setzen wir monatlich voll ab."
    }
  },
  {
    kategorie: "✈️ Reisekosten",
    titel: "Mila on Tour",
    beschreibung: "Fahrtkosten und Verpflegung.",
    status_info: "Pauschalen",
    keywords: ["reisekosten", "fahrtkosten", "pendeln", "zug", "auto", "reisen"],
    nische: {
      angestellt: "Pendlerpauschale! 0,30€ pro KM für den einfachen Weg zur Arbeit. Bei Dienstreisen mehr!",
      selbstständig: "Jeder KM zählt! 0,30€ (Auto) oder 0,20€ (Rad). Denk an die Verpflegungspauschale ab 8 Std.!",
      kleinunternehmer: "Reisekosten sind Brutto-Ausgaben. Mila rechnet dir die Pauschalen für die Verpflegung aus.",
      freelancer: "Ab zum Kunden! Bahntickets und Hotel setzen wir voll an. Verpflegungsmehraufwand nicht vergessen!"
    }
  }
];

export function getMilaTipForUser(categoryName: string, status: UserStatus): string {
  const search = categoryName.toLowerCase();
  const tipp = STEUER_TIPPS.find(t => 
    t.kategorie.toLowerCase().includes(search) || 
    t.keywords.some(k => search.includes(k))
  );

  if (tipp) {
    return tipp.nische[status];
  }
  
  return "Alles klar, ich hab das kategorisiert. Soll ich mal prüfen, ob wir hier noch was optimieren können?";
}
