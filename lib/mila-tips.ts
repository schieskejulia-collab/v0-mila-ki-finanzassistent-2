export const getMilaTip = (
  category: string,
  userStatus: string
): string => {
  const cat = category.toLowerCase()

  if (cat.includes('software')) {
    return '💻 Software erkannt. Beruflich genutzte Software und digitale Tools können steuerlich relevant sein. Prüfe, ob die Kosten ausschließlich oder überwiegend beruflich genutzt werden.'
  }

  if (cat.includes('bewirtung')) {
    return '🍽️ Bewirtung erkannt. Dokumentiere Anlass und Teilnehmer direkt in der Notiz. Das kann später wichtig sein.'
  }

  if (cat.includes('reisen')) {
    return '✈️ Reise erkannt. Fahrtkosten, Übernachtungen und Verpflegungspauschalen können je nach Situation relevant sein.'
  }

  if (cat.includes('homeoffice') || cat.includes('miete')) {
    return '🏠 Homeoffice erkannt. Je nach persönlicher Situation können bestimmte Kosten oder Pauschalen relevant sein. Mila hilft dir beim Sammeln der Informationen.'
  }

  if (cat.includes('weiterbildung')) {
    return '🎓 Weiterbildung erkannt. Beruflich veranlasste Kurse, Seminare und Fachliteratur können steuerlich relevant sein.'
  }

  return '✨ Ich habe die Buchung eingeordnet. Wenn du möchtest, prüfe ich gemeinsam mit dir mögliche Optimierungspotenziale.'
}