export type DocumentType =
  | 'receipt'
  | 'invoice'
  | 'contract'
  | 'reminder'
  | 'insurance'
  | 'authority'
  | 'subscription'
  | 'private'

export function classifyDocument(input: {
  title?: string
  vendor?: string
  note?: string
}) {
  const text = `
    ${input.title || ''}
    ${input.vendor || ''}
    ${input.note || ''}
  `.toLowerCase()

  if (
    text.includes('mahnung') ||
    text.includes('zahlungserinnerung') ||
    text.includes('letzte aufforderung')
  ) {
    return {
      type: 'reminder',
      priority: 'high',
      message: 'Zahlungsfrist beachten 🚨',
    }
  }

  if (
    text.includes('kita') ||
    text.includes('kindergarten') ||
    text.includes('schule') ||
    text.includes('verpflegung') ||
    text.includes('besseressen')
  ) {
    return {
      type: 'private',
      priority: 'normal',
      category: 'privat',
      message: 'Private Familienausgabe erkannt 🏡',
    }
  }

  if (
    text.includes('vodafone') ||
    text.includes('telekom') ||
    text.includes('o2')
  ) {
    return {
      type: 'contract',
      priority: 'normal',
      category: 'telefon',
      message: 'Wiederkehrende Rechnung erkannt 📱',
    }
  }

  if (
    text.includes('adobe') ||
    text.includes('openai') ||
    text.includes('notion') ||
    text.includes('microsoft')
  ) {
    return {
      type: 'subscription',
      priority: 'normal',
      category: 'software',
      message: 'Software-Abo erkannt 💻',
    }
  }

  if (
    text.includes('versicherung') ||
    text.includes('allianz') ||
    text.includes('huk')
  ) {
    return {
      type: 'insurance',
      priority: 'normal',
      message: 'Versicherung erkannt 🛡️',
    }
  }

  if (
    text.includes('finanzamt') ||
    text.includes('bescheid') ||
    text.includes('jobcenter')
  ) {
    return {
      type: 'authority',
      priority: 'high',
      message: 'Behördendokument erkannt 📄',
    }
  }

  return {
    type: 'receipt',
    priority: 'normal',
    message: 'Normaler Beleg erkannt 🧾',
  }
}