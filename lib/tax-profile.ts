// lib/tax-profile.ts

export type UserStatus = 'angestellt' | 'freelancer' | 'selbststaendig' | 'kleinunternehmer';

export interface TaxRule {
  category: string;
  deductiblePercent: number;
  hint: string;
  legalTip?: string;
}

export interface TaxProfile {
  title: string;
  incomeTaxRate: number;
  vatLiable: boolean;
  globalTips: string[];
}

export const TAX_PROFILES: Record<UserStatus, TaxProfile> = {
  angestellt: {
    title: 'Angestellt (Montage/Handwerk)',
    incomeTaxRate: 0,
    vatLiable: false,
    globalTips: [
      'Steuerklassen-Check: Ein jährlicher Faktorverfahren-Wechsel bei Ehegatten optimiert das Netto.',
      'Homeoffice-Pauschale: Nutze die 6 €/Tag (bis 1.260 €/Jahr) ohne separates Arbeitszimmer.',
      'Fahrtkosten: 0,30 €/km für den Arbeitsweg als Werbungskosten geltend machen.'
    ]
  },
  freelancer: {
    title: 'Freelancer / Freiberufler',
    incomeTaxRate: 0.25,
    vatLiable: true,
    globalTips: [
      'Arbeitszimmer: Bei Mittelpunkt der Tätigkeit Miete/Strom anteilig absetzen.',
      'SaaS-Vollabschreibung: Software wie Adobe/ChatGPT sofort im Anschaffungsjahr absetzen.',
      'Bewirtung: 70% Absetzbarkeit bei korrektem Beleg und Anlass-Notiz.'
    ]
  },
  selbststaendig: {
    title: 'Selbstständig (Gewerbe)',
    incomeTaxRate: 0.30,
    vatLiable: true,
    globalTips: [
      'Umsatzsteuer: Bilde konsequent 19% Rücklage auf alle Brutto-Einnahmen.',
      'GWG-Regel: Hardware unter 952 € sofort zu 100% abschreiben.',
      'Dokumentation: Jedes Geschäftsessen braucht einen Anlass und Teilnehmer-Nachweis.'
    ]
  },
  kleinunternehmer: {
    title: 'Kleinunternehmer (§ 19 UStG)',
    incomeTaxRate: 0.15,
    vatLiable: false,
    globalTips: [
      'Umsatzsteuer-Wahrnung: Weise auf keinen Fall MwSt. auf deinen Rechnungen aus!',
      'Brutto-Buchung: Da kein Vorsteuerabzug, gilt immer der Bruttobetrag als Betriebsausgabe.',
      'Einfachheit: Nutze den Vorteil der Buchhaltung ohne Vorsteuer-Differenzierung.'
    ]
  }
};

export function evaluateTransactionTax(status: UserStatus, category: string, amount: number) {
  const normalizedCat = category.toLowerCase().trim();
  let deductiblePercent = 0;
  let hint = 'Wird als reguläre Ausgabe erfasst.';
  let legalTip = '';

  // Logik-Kern
  if (status === 'angestellt') {
    if (normalizedCat.includes('reise') || normalizedCat.includes('hotel') || normalizedCat.includes('fahrt')) {
      deductiblePercent = 100;
      hint = '100% absetzbar als Werbungskosten.';
      legalTip = 'Tipp: Prüfe Verpflegungsmehraufwand (14€ bzw. 28€ Pauschale).';
    } else if (normalizedCat.includes('hardware') || normalizedCat.includes('software')) {
      deductiblePercent = 100;
      hint = 'Arbeitsmittel: 100% absetzbar.';
    }
  } else if (status === 'freelancer' || status === 'selbststaendig') {
    if (normalizedCat.includes('software') || normalizedCat.includes('saas')) {
      deductiblePercent = 100;
      hint = 'Digitale Betriebsausgabe: 100% sofort absetzbar.';
    } else if (normalizedCat.includes('bewirtung')) {
      deductiblePercent = 70;
      hint = 'Geschäftliche Bewirtung: 70% absetzbar.';
    } else {
      deductiblePercent = 100;
      hint = 'Betriebsausgabe: 100% absetzbar.';
    }
  } else if (status === 'kleinunternehmer') {
    deductiblePercent = 100;
    hint = '100% Brutto-Betriebsausgabe (Kein Vorsteuerabzug).';
  }

  return { deductiblePercent, hint, legalTip };
}

export function generateDynamicInsights(status: UserStatus, totalExpenses: number, softwareExpenses: number) {
  const profile = TAX_PROFILES[status];
  const insights = [...profile.globalTips];

  if (status === 'angestellt' && totalExpenses > 500) {
    insights.unshift('🔥 Hohe Werbungskosten erkannt – das mindert deine Steuerlast erheblich!');
  }
  if ((status === 'freelancer' || status === 'selbststaendig') && softwareExpenses > 200) {
    insights.unshift('⚠️ Abo-Check: Deine Software-Kosten sind diesen Monat gestiegen. Zeit für einen Abo-Check?');
  }

  return insights.slice(0, 3);
}
