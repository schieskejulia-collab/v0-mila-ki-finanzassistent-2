export type ReportPeriod = 'month' | 'quarter' | 'year'

export type ReportTransaction = {
  title: string
  party: string
  amount: number
  date: string
  category: string
  note: string
  typ: 'einnahme' | 'ausgabe'
  status: string
}

export type ReportData = {
  title: string
  filenameBase: string
  transactions: ReportTransaction[]
}

function formatEuro(value: number) {
  return value.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

function formatDate(value?: string) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('de-DE')
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()

  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function csvValue(value: unknown) {
  const text = String(value ?? '').replace(/"/g, '""')
  return `"${text}"`
}

export function downloadReportCsv(report: ReportData) {
  const totalIncomes = report.transactions
    .filter((item) => item.typ === 'einnahme')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const totalExpenses = report.transactions
    .filter((item) => item.typ === 'ausgabe')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const rows = [
    ['Mila Bericht', report.title],
    ['Einnahmen', formatEuro(totalIncomes)],
    ['Ausgaben', formatEuro(totalExpenses)],
    ['Saldo', formatEuro(totalIncomes - totalExpenses)],
    [],
    [
      'Datum',
      'Typ',
      'Titel',
      'Partner',
      'Kategorie',
      'Status',
      'Betrag',
      'Notiz',
    ],
    ...report.transactions.map((item) => [
      formatDate(item.date),
      item.typ,
      item.title,
      item.party,
      item.category,
      item.status,
      String(Number(item.amount || 0)).replace('.', ','),
      item.note,
    ]),
  ]

  const csv = rows
    .map((row) => row.map(csvValue).join(';'))
    .join('\n')

  downloadBlob(
    new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8',
    }),
    `${report.filenameBase}.csv`
  )
}

function pdfSafe(value: unknown) {
  return String(value ?? '')
    .replace(/[€]/g, 'EUR')
    .replace(/[ä]/g, 'ae')
    .replace(/[ö]/g, 'oe')
    .replace(/[ü]/g, 'ue')
    .replace(/[Ä]/g, 'Ae')
    .replace(/[Ö]/g, 'Oe')
    .replace(/[Ü]/g, 'Ue')
    .replace(/[ß]/g, 'ss')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function buildPdf(report: ReportData) {
  const totalIncomes = report.transactions
    .filter((item) => item.typ === 'einnahme')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const totalExpenses = report.transactions
    .filter((item) => item.typ === 'ausgabe')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const lines = [
    'Mila Finanzbericht',
    report.title,
    '',
    `Einnahmen: ${formatEuro(totalIncomes)}`,
    `Ausgaben: ${formatEuro(totalExpenses)}`,
    `Saldo: ${formatEuro(totalIncomes - totalExpenses)}`,
    `Buchungen: ${report.transactions.length}`,
    '',
    'Buchungsliste',
    ...report.transactions.flatMap((item) => [
      `${formatDate(item.date)} | ${item.typ.toUpperCase()} | ${formatEuro(
        item.amount
      )}`,
      `${item.title || 'Ohne Titel'}${
        item.party ? ` - ${item.party}` : ''
      }`,
      `${item.category || 'Ohne Kategorie'} | Status: ${
        item.status || 'offen'
      }`,
      '',
    ]),
  ].slice(0, 56)

  const content = [
    'BT',
    '/F1 18 Tf',
    '50 790 Td',
    `(${pdfSafe(lines[0])}) Tj`,
    '/F1 11 Tf',
    ...lines.slice(1).flatMap((line) => [
      '0 -18 Td',
      `(${pdfSafe(line)}) Tj`,
    ]),
    'ET',
  ].join('\n')

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`,
  ]

  let pdf = '%PDF-1.4\n'
  const offsets = [0]

  for (const object of objects) {
    offsets.push(pdf.length)
    pdf += object
  }

  const xrefStart = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'

  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  }

  pdf += `trailer\n<< /Size ${
    objects.length + 1
  } /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`

  return pdf
}

export function downloadReportPdf(report: ReportData) {
  downloadBlob(
    new Blob([buildPdf(report)], {
      type: 'application/pdf',
    }),
    `${report.filenameBase}.pdf`
  )
}
