import type { CategoryId } from './categories'
import { detectCategory } from './categories'
import { findMerchantInfo } from './merchants'

export const getMilaTip = (categoryOrText: string | CategoryId): string => {
  const raw = String(categoryOrText || '').toLowerCase()
  const merchant = findMerchantInfo(raw)
  const category = merchant?.category || detectCategory(raw)

  const tips: Partial<Record<CategoryId, string>> = {
    software:
      '💻 Software erkannt. Beruflich genutzte Software, KI-Tools, Hosting oder Domains können relevant sein. Prüfe, ob du sie wirklich aktiv nutzt.',
    bewirtung:
      '🍽️ Bewirtung erkannt. Notiere Anlass, Teilnehmer und geschäftlichen Bezug direkt dazu.',
    reisen:
      '✈️ Reise oder Fahrt erkannt. Halte fest, ob sie beruflich war und wofür die Fahrt stattgefunden hat.',
    fahrzeug:
      '⛽ Fahrzeugkosten erkannt. Prüfe später, ob Kilometer, Fahrten oder Tankkosten sauber dokumentiert werden sollten.',
    homeoffice:
      '🏠 Homeoffice erkannt. Mila sammelt diese Kosten getrennt, damit du später besser prüfen kannst, was relevant ist.',
    miete:
      '🏢 Raumkosten erkannt. Prüfe, ob es Büro, Lager, Studio oder private Miete ist.',
    weiterbildung:
      '🎓 Weiterbildung erkannt. Kurse, Seminare und Fachwissen können beruflich wichtig sein.',
    fachliteratur:
      '📚 Fachliteratur erkannt. Bücher, E-Books und Fachmaterial bitte möglichst mit beruflichem Bezug notieren.',
    versand:
      '📦 Versand erkannt. Porto, Pakete und Lieferkosten können bei Projekten oder Verkäufen wichtig sein.',
    marketing:
      '📣 Marketing erkannt. Werbung, Anzeigen und Sichtbarkeit solltest du als eigenen Kostenblock beobachten.',
    telefon:
      '📱 Telefon/Internet erkannt. Prüfe, ob die Kosten privat, beruflich oder gemischt genutzt werden.',
    bank:
      '🏦 Bank- oder Zahlungsgebühren erkannt. Diese Kosten gehen leicht unter, summieren sich aber.',
    privat:
      '🔒 Privat wirkende Ausgabe erkannt. Mila sollte sie getrennt halten, damit deine geschäftliche Auswertung sauber bleibt.',
    sonstiges:
      '✨ Ich habe die Buchung eingeordnet. Wenn du möchtest, prüft Mila später, ob daraus ein Muster entsteht.',
  }

  return tips[category] || tips.sonstiges!
}