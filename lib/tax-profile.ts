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
  insiderTips: string[] // Enthält die barwertigen Insider-Tipps
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
  if (n(profile.annualRevenueGross) > 0) return n(profile.annualRevenueGross) * 0.5 // Fallback: 50% Marge
  return 0
}

function getReserveRangeByProfit(profit: number) {
  if (profit <= 0) return [0, 0] as const
  if (profit < 20000) return [0.2, 0.25] as const
  if (profit < 50000) return [0.25, 0.3] as const
  if (profit < 80000) return [0.3, 0.35] as const
  return [0.35, 0.4] as const
}

function getMissingBase(profile: TaxProfile) {
  const missing: string[] = []

  if (!profile.userType) missing.push('Nutzertyp')
  if (!profile.federalState) missing.push('Bundesland')
  if (typeof profile.churchTax !== 'boolean') missing.push('Kirchensteuer')
  if (!profile.vatStatus) missing.push('Umsatzsteuer-Status')
  if (!profile.estimatedAnnualProfit && !profile.annualRevenueGross && !profile.annualGrossSalary) {
    missing.push('Jahreswert / Gewinnschätzung')
  }

  if (
    profile.userType === 'angestellt' ||
    profile.userType === 'montagearbeiter' ||
    profile.userType === 'minijob'
  ) {
    if (!profile.taxClass) missing.push('Steuerklasse')
    if (!profile.annualGrossSalary) missing.push('Jahresbrutto')
  }

  if (
    profile.userType === 'selbststaendig_gewerbe' ||
    profile.userType === 'freiberufler' ||
    profile.userType === 'kleinunternehmer' ||
    profile.userType === 'handwerker'
  ) {
    if (!profile.annualRevenueGross) missing.push('Jahresumsatz')
    if (!profile.estimatedAnnualProfit) missing.push('geschätzter Jahresgewinn')
  }

  if (profile.userType === 'montagearbeiter') {
    if (!profile.travelDaysPerMonth) missing.push('Reisetage pro Monat')
    if (!profile.commuteKm) missing.push('Entfernung / Kilometer')
  }

  return Array.from(new Set(missing))
}

// --- Shared Helfer für Angestellte (inkl. Montagearbeiter-Spezial) ---
function applyEmployeeBaseLogic(
  profile: TaxProfile,
  ctx: {
    title: string
    notes: string[]
    insiderTips: string[]
    niches: string[]
    taxTypes: string[]
    missingData: string[]
  },
  options?: { isMontage?: boolean }
) {
  const { notes, insiderTips, niches, taxTypes, missingData } = ctx
  const isMontage = options?.isMontage ?? false

  taxTypes.push('Lohnsteuer', 'Sozialabgaben')

  if (!profile.taxClass) missingData.push('Steuerklasse')
  if (!profile.annualGrossSalary) missingData.push('Jahresbrutto')

  const salary = n(profile.annualGrossSalary)
  let reserveRateMin = 0
  let reserveRateMax = 0

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
    'Deine Lohnsteuer wird monatlich direkt vom Arbeitgeber einbehalten. Über geschickte Werbungskosten holst du dir bares Geld vom Finanzamt zurück.'
  )

  insiderTips.push(
    'Legal 1.260 € ohne Nachweise: Nutze die Homeoffice-Pauschale (6 €/Tag) für alle Tage, an denen du Berichte schreibst oder von zu Hause arbeitest.',
    'Arbeitsmittel-Sofortabzug: Smartphones, Tablets & Laptops unter 952 € (brutto) kannst du sofort zu 100% im selben Jahr komplett geltend machen.',
    'Steuerklassen-Hebel: Wenn du verheiratet bist und dein Partner weniger verdient, prüft den Wechsel auf Klasse 3/5 oder das Faktorverfahren für sofort mehr Netto auf dem Konto.'
  )

  niches.push('Werbungskosten', 'Pendlerpauschale', 'Homeoffice')

  if (isMontage) {
    ctx.title = 'Montage-Spezialprofil'
    if (!profile.travelDaysPerMonth) missingData.push('Reisetage pro Monat')

    const tage = n(profile.travelDaysPerMonth) || 15
    const spesenSchaetzung = tage * 14

    notes.length = 0 // Clear standard note to put focus on assembly work
    notes.push('Auf Montage entscheiden deine Auslöse, Fahrtwege und die doppelte Haushaltsführung über massive Steuerrückzahlungen.')

    insiderTips.length = 0 // Tausche allgemeine Tipps gegen scharfe Montage-Tipps aus
    insiderTips.push(
      `Verpflegungsmehraufwand (Spesen): Bei ca. ${tage} Reisetagen stehen dir legal mindestens ${money(
        spesenSchaetzung
      )}/Monat als Werbungskosten zu, falls dein Chef sie nicht steuerfrei auszahlt! (14 € ab 8h, 28 € bei 24h Abwesenheit).`,
      'Doppelte Haushaltsführung: Kosten für ein Zimmer oder eine Zweitwohnung am Montageort sowie wöchentliche Familienheimfahrten sind komplett absetzbar.',
      'Fahrten zur Baustelle: Jeder gefahrene Kilometer zu wechselnden Einsatzorten mit dem Privat-PKW bringt dir 0,30 € (ab dem 21. Kilometer sogar 0,38 €) als Werbungskosten.',
      'Arbeitskleidung & Werkzeug: Spezialkleidung (Sicherheitsschuhe, Blaumann) und eigenes Werkzeug sind uneingeschränkt zu 100% absetzbar.'
    )

    niches.push('Spesen', 'Doppelte Haushaltsführung', 'Fahrtkosten')

    // Bei Montagearbeitern ist der Fokus die Erstattung, daher halten wir die simulierte Nachzahlungs-Rücklage klein
    reserveRateMin = 0.05
    reserveRateMax = 0.15
  }

  return {
    profit: salary,
    reserveRateMin,
    reserveRateMax,
  }
}

// --- Shared Helfer für Selbstständige / Gewerbe / Freiberufler / Kleinunternehmer ---
function applyBusinessBaseLogic(
  profile: TaxProfile,
  ctx: {
    taxTypes: string[]
    notes: string[]
    insiderTips: string[]
    niches: string[]
  },
  options: {
    isFreelancer?: boolean
    isKleinunternehmer?: boolean
    isHandwerker?: boolean
  }
) {
  const { taxTypes, notes, insiderTips, niches } = ctx
  const profit = getProfit(profile)
  let [reserveRateMin, reserveRateMax] = getReserveRangeByProfit(profit)

  const isFreelancer = options.isFreelancer ?? false
  const isKleinunternehmer = options.isKleinunternehmer ?? false
  const isHandwerker = options.isHandwerker ?? false

  taxTypes.push('Einkommensteuer')

  if (!isKleinunternehmer && profile.vatStatus !== 'kleinunternehmer') {
    taxTypes.push('Umsatzsteuer')
  }

  if (!isFreelancer && profit > 24500) {
    taxTypes.push('Gewerbesteuer')
    notes.push('Ab 24.500 € Gewinn kann Gewerbesteuer anfallen (Freibetrag greift).')
  }

  if (isKleinunternehmer) {
    notes.push('Du stellst deine Rechnungen ohne Umsatzsteuer nach §19 UStG aus.')
    insiderTips.push(
      'Kein Vorsteuerabzug: Mila berücksichtigt deine Ausgaben immer als Bruttobetrag, da du die MwSt. nicht vom Finanzamt zurückholst – das schützt deine echte Liquidität.',
      'Software-Hebel: Jedes digitale Tool (Hosting, KI-Abos, SaaS-Tools) mindert sofort deinen steuerlichen Gewinn und schützt dich vor der Einkommensteuer.'
    )
    niches.push('Software', 'Homeoffice')
  } else if (isFreelancer) {
    insiderTips.push(
      'Gewerbesteuer-Freiheit: Als Freiberufler/Freelancer bist du legal komplett von der Gewerbesteuer befreit, ganz egal wie hoch dein Gewinn ist.',
      'Kunden-Bewirtung: Geschäftsessen im Restaurant sind zu 70% als Betriebsausgabe absetzbar. Wichtig: Den geschäftlichen Anlass direkt auf dem Beleg eintragen!',
      'Digitale Wirtschaftsgüter: Computer, Software und Lizenzen unterliegen keiner mehrjährigen Abschreibungsdauer mehr und können sofort zu 100% reingehauen werden.'
    )
    niches.push('Software', 'Bewirtung', 'Reisekosten')
  } else {
    // Gewerbe / Handwerk
    insiderTips.push(
      'Fahrzeug-Hebel: Nutzt du dein Fahrzeug zu mehr als 50% betrieblich, gehören alle Kosten (Sprit, Reparaturen, Versicherung, Kfz-Steuer) voll in die Buchhaltung.',
      'Typische Handwerker-Kosten: Werkstattmiete, Lagerkosten, Arbeitskleidung, Maschinen und Materialeinkäufe sind sofort steuerlich wirksame Betriebsausgaben.',
      'Werkzeug-Pool: Kleinwerkzeuge unterhalb der GWG-Grenze kannst du sofort zu 100% im Jahr der Anschaffung absetzen.'
    )
    niches.push('Werkzeug', 'Fahrzeugkosten', 'Arbeitskleidung')
    if (isHandwerker) niches.push('Montagefahrten', 'Baustellenfahrten')
  }

  return {
    profit,
    reserveRateMin,
    reserveRateMax,
  }
}

export function estimateTaxProfile(profile: TaxProfile): TaxEstimate {
  const missingData = getMissingBase(profile)
  const notes: string[] = []
  const niches: string[] = []
  const insiderTips: string[] = []
  const taxTypes: string[] = []

  let title = 'Steuerliche Orientierung'
  let profit = getProfit(profile)
  let reserveRateMin = 0
  let reserveRateMax = 0

  // --- Routing nach Nutzertyp ---
  switch (profile.userType) {
    case 'angestellt': {
      title = 'Angestellten-Profil'
      const res = applyEmployeeBaseLogic(profile, {
        title,
        notes,
        insiderTips,
        niches,
        taxTypes,
        missingData,
      })
      profit = res.profit
      reserveRateMin = res.reserveRateMin
      reserveRateMax = res.reserveRateMax
      break
    }

    case 'montagearbeiter': {
      const res = applyEmployeeBaseLogic(
        profile,
        {
          title,
          notes,
          insiderTips,
          niches,
          taxTypes,
          missingData,
        },
        { isMontage: true }
      )
      profit = res.profit
      reserveRateMin = res.reserveRateMin
      reserveRateMax = res.reserveRateMax
      title = 'Montage-Spezialprofil'
      break
    }

    case 'kleinunternehmer': {
      title = 'Kleinunternehmer-Profil'
      const res = applyBusinessBaseLogic(
        profile,
        { taxTypes, notes, insiderTips, niches },
        { isKleinunternehmer: true }
      )
      profit = res.profit
      reserveRateMin = res.reserveRateMin
      reserveRateMax = res.reserveRateMax
      break
    }

    case 'freiberufler': {
      title = 'Freelancer-Profil'
      const res = applyBusinessBaseLogic(
        profile,
        { taxTypes, notes, insiderTips, niches },
        { isFreelancer: true }
      )
      profit = res.profit
      reserveRateMin = res.reserveRateMin
      reserveRateMax = res.reserveRateMax
      break
    }

    case 'selbststaendig_gewerbe': {
      title = 'Gewerbe-Profil'
      const res = applyBusinessBaseLogic(
        profile,
        { taxTypes, notes, insiderTips, niches },
        { isFreelancer: false, isKleinunternehmer: profile.vatStatus === 'kleinunternehmer', isHandwerker: false }
      )
      profit = res.profit
      reserveRateMin = res.reserveRateMin
      reserveRateMax = res.reserveRateMax
      break
    }

    case 'handwerker': {
      title = 'Handwerker-Betriebsprofil'
      const res = applyBusinessBaseLogic(
        profile,
        { taxTypes, notes, insiderTips, niches },
        { isFreelancer: false, isKleinunternehmer: profile.vatStatus === 'kleinunternehmer', isHandwerker: true }
      )
      profit = res.profit
      reserveRateMin = res.reserveRateMin
      reserveRateMax = res.reserveRateMax
      break
    }

    case 'minijob': {
      title = 'Minijob-Profil'
      taxTypes.push('Pauschalsteuer (Arbeitgeber)')
      reserveRateMin = 0
      reserveRateMax = 0
      notes.push(
        'In der Regel steuerfrei für dich, solange du die Minijob-Grenze einhältst. Die Pauschalsteuer trägt dein Arbeitgeber.'
      )
      insiderTips.push(
        'Achtung bei Mehrfachbeschäftigung: Mehrere Minijobs werden zusammengerechnet und können steuerpflichtig werden, wenn sie die Grenze überschreiten.',
        'Kombination mit Hauptjob: Ein Minijob neben einer Vollzeitstelle bleibt meist steuerfrei, solange er korrekt als Minijob geführt wird.'
      )
      profit = n(profile.annualGrossSalary) || 0
      break
    }

    default: {
      notes.push('Nutzertyp ist unklar. Mila zeigt nur eine grobe Orientierung.')
      const [min, max] = getReserveRangeByProfit(profit)
      reserveRateMin = min
      reserveRateMax = max
      break
    }
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
    insiderTips,
    disclaimer:
      reserveMin === 0 && reserveMax === 0
        ? 'Mila gibt dir hier eine qualitative Einschätzung. Für exakte Werte brauchst du konkrete Zahlen.'
        : `Mila orientiert sich an einer empfohlenen Rücklage zwischen ${money(reserveMin)} und ${money(
            reserveMax
          )}. Dies ist keine Steuerberatung, sondern eine praxisnahe Orientierung.`,
  }
}