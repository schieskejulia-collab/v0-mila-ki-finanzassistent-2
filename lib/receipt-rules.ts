export type ReceiptRule = {
  merchantIncludes: string[]
  titleIncludes: string[]
  category: string
  taxHint?: string
}

export const RECEIPT_RULES: ReceiptRule[] = [
  {
  merchantIncludes: ['nanu', 'nanu-nana', 'nanu nana'],
  titleIncludes: [
    'einkauf',
    'artikel',
    'spielzeug',
    'spielwaren',
    'geschenk',
    'accessoire',
    'accessoires',
  ],
  category: 'geschenke',
  taxHint: 'depends',
},
{
  merchantIncludes: ['deichmann'],
  titleIncludes: [
    'einkauf',
    'schuh',
    'schuhe',
    'schuhkauf',
    'shoe',
    'shoes',
    'shoe purchase',
    'purchase',
  ],
  category: 'privat',
  taxHint: 'private',
},

  {
    merchantIncludes: ['deutsche bahn', 'db', 'd-tarif', 'bahn'],
    titleIncludes: ['fahrticket', 'fahrradkarte', 'fahrkarte', 'ticket', 'd-ticket', 'nahverkehr'],
    category: 'reisen',
    taxHint: 'depends',
  },
]