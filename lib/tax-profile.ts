export type UserTaxType =
  | 'angestellt'
  | 'minijob'
  | 'selbststaendig_gewerbe'
  | 'freiberufler'
  | 'kleinunternehmer'
  | 'handwerker'
  | 'montagearbeiter'

export type VatStatus =
  | 'kleinunternehmer'
  | 'regelbesteuerung_19'
  | 'ermaessigt_7'
  | 'nicht_bekannt'

export type TaxProfile = {
  userType: UserTaxType
  annualRevenueGross?: number
  estimatedAnnualProfit?: number
  vatStatus?: VatStatus
  churchTax?: boolean
  federalState?: string
  municipality?: string

  taxClass?: '1' | '2' | '3' | '4' | '5' | '6'
  annualGrossSalary?: number
  hasChildren?: boolean
  isMarried?: boolean

  assemblyWork?: boolean
  receivesPerDiem?: boolean
  employerPaysHotel?: boolean
  travelDaysPerMonth?: number
  commuteKm?: number
}

export type TaxEstimate = {
  title: string
  reserveRateMin: number
  reserveRateMax: number
  reserveMin: number
  reserveMax: number
  confidence: number
  taxTypes: string[]
  missingData: string[]
  notes: string[]
  niches: string[]
  disclaimer: string
}

function money(value: number) {
  return value.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

function n(value?: number) {
  return Number.isFinite(Number(value)) ? Number(value) : 0
}

function getProfit(profile: TaxProfile) {
  if (n(profile.estimatedAnnualProfit) > 0) return n(profile.estimatedAnnualProfit)
  if (n(profile.annualGrossSalary) > 0) return n(profile.annualGrossSalary)
  return 0
}

function getReserveRangeByProfit(profit: number) {
  if (profit <= 0) return [0, 0]
  if (profit < 20000) return [0.2, 0.25]
  if (profit < 50000) return [0.25, 0.3]
  if (profit < 80000) return [0.3, 0.35]
  return [0.35, 0.4]
}

function getMissingBase(profile: TaxProfile) {
  const missing: string[] = []

  if (!profile.userType) missing.push('Nutzertyp')
  if (!profile.federalState) missing.push('Bundesland')
  if (typeof profile.churchTax !== 'boolean') missing.push('Kirchensteuer')
  if (!profile.vatStatus && profile.userType !== 'angestellt' && profile.userType !== 'minijob') {
    missing.push('Umsatzsteuerstatus')
  }

  return missing
}

export function estimateTaxProfile(profile: TaxProfile): TaxEstimate {
  const missingData = getMissingBase(profile)
  const notes: string[] = []
  const niches: string[] = []
  const taxTypes: string[] = []

  let profit = getProfit(profile)
  let reserveRateMin = 0
  let reserveRateMax = 0
  let title = 'Steuerliche Orientierung'

  if (profile.userType === 'angestellt') {
    title = 'Angestellten-Profil'
    taxTypes.push('Lohnsteuer', 'Sozialabgaben')

    if (!profile.taxClass) missingData.push('Steuerklasse')
    if (!profile.annualGrossSalary) missingData.push('Jahresbrutto')

    const salary = n(profile.annualGrossSalary)
    profit = salary

    if (salary <= 0) {
      reserveRateMin = 0
      reserveRateMax = 0
    } else if (salary < 20000) {
      reserveRateMin = 0.05
      reserveRateMax = 0.15
    } else if (salary < 50000) {
      reserveRateMin = 0.2
      reserveRateMax = 0.3
    } else {
      reserveRateMin = 0.3
      reserveRateMax = 0.45
    }

    notes.push(
      'Bei Angestellten geht es eher um eine grobe Gesamtbelastung und mögliche Werbungskosten, nicht um klassische Umsatzsteuer-Rücklagen.'
    )

    niches.push(
      'Werbungskosten',
      'Pendlerpauschale',
      'Homeoffice',
      'Arbeitsmittel',
      'Weiterbildung'
    )
  }

  if (profile.userType === 'minijob') {
    title = 'Minijob-Profil'
    taxTypes.push('Pauschalversteuerung durch Arbeitgeber möglich')
    reserveRateMin = 0
    reserveRateMax = 0

    notes.push(
      'Bei Minijobs fällt in der Regel keine eigene Einkommensteuer auf den Minijob an. Wichtig ist die Kombination mit Hauptjob oder weiteren Einkünften.'
    )

    niches.push('Hauptjob prüfen', 'Sozialversicherung', 'Mehrere Minijobs')
  }

  if (profile.userType === 'kleinunternehmer') {
    title = 'Kleinunternehmer-Profil'
    taxTypes.push('Einkommensteuer')
    notes.push('Du stellst in der Regel Rechnungen ohne Umsatzsteuer nach §19 UStG.')
    notes.push('Einkommensteuer kann trotzdem auf deinen Gewinn anfallen.')

    ;[reserveRateMin, reserveRateMax] = getReserveRangeByProfit(profit)

    if (profit > 24500) {
      taxTypes.push('Gewerbesteuer möglich')
      notes.push('Ab etwa 24.500 € Gewinn kann bei Gewerbe Gewerbesteuer relevant werden.')
    }

    niches.push('Arbeitsmittel', 'Software', 'Telefon & Internet', 'Homeoffice', 'Fortbildung')
  }

  if (profile.userType === 'freiberufler') {
    title = 'Freiberufler/Freelancer-Profil'
    taxTypes.push('Einkommensteuer')
    if (profile.vatStatus !== 'kleinunternehmer') taxTypes.push('Umsatzsteuer')
    ;[reserveRateMin, reserveRateMax] = getReserveRangeByProfit(profit)

    notes.push('Freiberufler zahlen in der Regel keine Gewerbesteuer.')
    niches.push('Software', 'Arbeitsmittel', 'Homeoffice', 'Fortbildung', 'Reisekosten', 'Bewirtung')
  }

  if (
    profile.userType === 'selbststaendig_gewerbe' ||
    profile.userType === 'handwerker'
  ) {
    title =
      profile.userType === 'handwerker'
        ? 'Handwerker-Profil'
        : 'Gewerbe-Profil'

    taxTypes.push('Einkommensteuer')
    if (profile.vatStatus !== 'kleinunternehmer') taxTypes.push('Umsatzsteuer')

    ;[reserveRateMin, reserveRateMax] = getReserveRangeByProfit(profit)

    if (profit > 24500) {
      taxTypes.push('Gewerbesteuer möglich')
      notes.push('Ab etwa 24.500 € Gewinn kann Gewerbesteuer relevant werden.')
    } else {
      notes.push('Gewerbesteuer wird meist erst ab höheren Gewinnen relevant.')
    }

    niches.push(
      'Werkzeug',
      'Arbeitskleidung',
      'Fahrzeugkosten',
      'Material',
      'Versicherungen',
      'Lagerkosten'
    )
  }

  if (profile.userType === 'montagearbeiter') {
    title = 'Montage-Profil'
    taxTypes.push('Einkommensteuer')
    if (profile.vatStatus !== 'kleinunternehmer') taxTypes.push('Umsatzsteuer möglich')
    ;[reserveRateMin, reserveRateMax] = getReserveRangeByProfit(profit)

    if (profile.assemblyWork !== true) missingData.push('Montagetätigkeit bestätigt')
    if (typeof profile.receivesPerDiem !== 'boolean') missingData.push('Spesen/Auslöse')
    if (typeof profile.employerPaysHotel !== 'boolean') missingData.push('Übernachtungskosten')
    if (!profile.travelDaysPerMonth) missingData.push('Reisetage pro Monat')

    notes.push(
      'Bei Montage sind Reisekosten, Verpflegungspauschalen, Übernachtungen und Fahrten besonders wichtig.'
    )

    niches.push(
      'Verpflegungspauschalen',
      'Übernachtungskosten',
      'Fahrtkosten',
      'Doppelte Haushaltsführung',
      'Werkzeug',
      'Arbeitskleidung'
    )
  }

  const reserveMin = profit * reserveRateMin
  const reserveMax = profit * reserveRateMax

  const confidence = Math.max(25, Math.min(95, 95 - missingData.length * 10))

  return {
    title,
    reserveRateMin,
    reserveRateMax,
    reserveMin,
    reserveMax,
    confidence,
    taxTypes: Array.from(new Set(taxTypes)),
    missingData: Array.from(new Set(missingData)),
    notes,
    niches: Array.from(new Set(niches)),
    disclaimer:
      `Mila schätzt eine grobe Rücklage zwischen ${money(reserveMin)} und ${money(reserveMax)}. Das ist eine Orientierung und ersetzt keine Steuerberatung.`,
  }
}