import type { MilaConfidence, MilaProvenanceRecord } from "./types"

export type LegacyFormat = "csv" | "json" | "text"

export interface LegacyColumnProfile {
  sourceColumn: string
  inferredType: "string" | "number" | "date" | "boolean" | "mixed" | "empty"
  targetField?: string
  confidence: MilaConfidence
  examples: unknown[]
}

export interface LegacyIngestionResult {
  format: LegacyFormat
  rowCount: number
  columns: string[]
  rows: Record<string, unknown>[]
  schema: LegacyColumnProfile[]
  provenance: MilaProvenanceRecord[]
  warnings: string[]
}

const FIELD_ALIASES: Record<string, string[]> = {
  client: ["kunde", "kundin", "mandant", "mandantin", "client", "customer", "debitor"],
  vendor: ["lieferant", "anbieter", "vendor", "supplier", "kreditor", "partner"],
  amount: ["betrag", "summe", "amount", "total", "brutto", "gesamtbetrag", "umsatz"],
  invoiceNumber: ["rechnungsnummer", "rechnungsnr", "invoice", "invoice number", "belegnummer", "belegnr"],
  documentDate: ["datum", "date", "belegdatum", "rechnungsdatum", "buchungsdatum"],
  dueDate: ["faellig", "fällig", "faelligkeitsdatum", "fälligkeitsdatum", "due", "due date", "zahlungsziel"],
  project: ["projekt", "project", "auftrag", "baustelle", "job"],
  vehicle: ["fahrzeug", "vehicle", "transporter", "pkw", "lkw"],
  businessPurpose: ["zweck", "verwendungszweck", "geschäftszweck", "geschaeftszweck", "purpose"],
  contact: ["kontakt", "contact", "ansprechpartner", "ansprechperson"],
  email: ["email", "e-mail", "mail"],
  phone: ["telefon", "phone", "mobil", "handy"],
  category: ["kategorie", "category", "kontoart", "typ"],
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_./-]+/g, " ")
    .replace(/\s+/g, " ")
}

function inferTargetField(column: string): { field?: string; confidence: MilaConfidence } {
  const normalized = normalizeHeader(column)
  const exactMatches = Object.entries(FIELD_ALIASES)
    .filter(([, aliases]) => aliases.some((alias) => normalizeHeader(alias) === normalized))
    .map(([field]) => field)

  if (exactMatches.length === 1) return { field: exactMatches[0], confidence: "high" }
  if (exactMatches.length > 1) return { confidence: "low" }

  const partialMatches = Object.entries(FIELD_ALIASES)
    .filter(([, aliases]) => aliases.some((alias) => {
      const normalizedAlias = normalizeHeader(alias)
      return normalized.length >= 3 && (normalized.includes(normalizedAlias) || normalizedAlias.includes(normalized))
    }))
    .map(([field]) => field)

  if (partialMatches.length === 1) return { field: partialMatches[0], confidence: "medium" }

  // Mehrdeutige oder unbekannte Spalten werden absichtlich nicht geraten.
  // Dadurch landen sie im Human-Confirmation-Schritt statt still falsch gemappt zu werden.
  return { confidence: "low" }
}

function isBlank(value: unknown) {
  return value === undefined || value === null || String(value).trim() === ""
}

function looksLikeDate(raw: string) {
  return (
    /^\d{4}-\d{1,2}-\d{1,2}$/.test(raw) ||
    /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(raw)
  )
}

function looksLikeNumber(raw: string) {
  if (!raw || looksLikeDate(raw) || /[A-Za-zÄÖÜäöü]/.test(raw)) return false

  const compact = raw
    .replace(/\s/g, "")
    .replace(/(?<=\d)[.](?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".")
    .replace(/[^\d.+-]/g, "")

  return compact !== "" && Number.isFinite(Number(compact)) && /\d/.test(compact)
}

function inferValueType(values: unknown[]): LegacyColumnProfile["inferredType"] {
  const useful = values.filter((value) => !isBlank(value)).slice(0, 50)
  if (!useful.length) return "empty"

  let numbers = 0
  let dates = 0
  let booleans = 0
  let strings = 0

  for (const value of useful) {
    if (typeof value === "boolean" || /^(true|false|ja|nein)$/i.test(String(value).trim())) {
      booleans += 1
      continue
    }

    const raw = String(value).trim()

    // Datum MUSS vor Zahl geprüft werden. Sonst würde z. B. 18.08.2026
    // nach Entfernen der Punkte fälschlich als Zahl erkannt.
    if (looksLikeDate(raw)) {
      dates += 1
      continue
    }

    if (looksLikeNumber(raw)) {
      numbers += 1
      continue
    }

    strings += 1
  }

  const counts = { number: numbers, date: dates, boolean: booleans, string: strings }
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1])
  if (!ranked[0][1]) return "empty"
  if (ranked[1][1] > 0 && ranked[0][1] / useful.length < 0.8) return "mixed"
  return ranked[0][0] as LegacyColumnProfile["inferredType"]
}

function detectDelimiter(line: string) {
  const candidates = [";", ",", "\t", "|"]
  return candidates
    .map((delimiter) => ({ delimiter, count: line.split(delimiter).length - 1 }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter || ","
}

function parseCsvLine(line: string, delimiter: string) {
  const cells: string[] = []
  let cell = ""
  let quoted = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        cell += '"'
        i += 1
      } else {
        quoted = !quoted
      }
    } else if (char === delimiter && !quoted) {
      cells.push(cell.trim())
      cell = ""
    } else {
      cell += char
    }
  }
  cells.push(cell.trim())
  return cells
}

function parseCsv(content: string): Record<string, unknown>[] {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim())
  if (!lines.length) return []
  const delimiter = detectDelimiter(lines[0])
  const headers = parseCsvLine(lines[0], delimiter).map((header, index) => header || `Spalte ${index + 1}`)
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line, delimiter)
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])) as Record<string, unknown>
  })
}

function parseJson(content: string): Record<string, unknown>[] {
  const parsed = JSON.parse(content)
  if (Array.isArray(parsed)) {
    return parsed.map((item, index) => typeof item === "object" && item !== null ? item as Record<string, unknown> : { value: item, row: index + 1 })
  }
  if (parsed && typeof parsed === "object") return [parsed as Record<string, unknown>]
  return [{ value: parsed }]
}

function parseText(content: string): Record<string, unknown>[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({ line: index + 1, text: line }))
}

export function ingestLegacyContent(input: { content: string; format: LegacyFormat; sourceLabel?: string }): LegacyIngestionResult {
  const content = input.content.trim()
  if (!content) throw new Error("Die Legacy-Datei ist leer.")

  const rows: Record<string, unknown>[] = input.format === "csv"
    ? parseCsv(content)
    : input.format === "json"
      ? parseJson(content)
      : parseText(content)
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  const warnings: string[] = []

  if (!rows.length) warnings.push("Keine Datenzeilen erkannt.")
  if (rows.length > 5000) warnings.push("Großer Datensatz: Für die erste Analyse sollten Vorschau und Mapping getrennt vom Vollimport behandelt werden.")

  const schema = columns.map((sourceColumn) => {
    const values = rows.map((row) => row[sourceColumn])
    const mapping = inferTargetField(sourceColumn)
    return {
      sourceColumn,
      inferredType: inferValueType(values),
      targetField: mapping.field,
      confidence: mapping.confidence,
      examples: values.filter((value) => !isBlank(value)).slice(0, 3),
    }
  })

  const unresolvedSchema = schema.filter((column) => !column.targetField || column.confidence === "low")
  if (unresolvedSchema.length) {
    warnings.push(`${unresolvedSchema.length} Spalte(n) sind unbekannt oder mehrdeutig und müssen vor dem Handoff bestätigt werden.`)
  }

  const sourceLabel = input.sourceLabel || `Legacy-${input.format.toUpperCase()}-Import`
  const provenance: MilaProvenanceRecord[] = schema
    .filter((column) => column.targetField)
    .map((column) => ({
      field: column.targetField!,
      originalValue: column.sourceColumn,
      value: column.sourceColumn,
      source: "input",
      sourceLabel,
      transformation: "interpreted",
      confidence: column.confidence,
      evidence: [{ type: "external", label: `Quellspalte: ${column.sourceColumn}` }],
      humanConfirmed: false,
    }))

  return { format: input.format, rowCount: rows.length, columns, rows, schema, provenance, warnings }
}
