export type ReceiptRule = {
  merchantIncludes: string[]
  titleIncludes: string[]
  category: string
  taxHint?: string
}

export const RECEIPT_RULES: ReceiptRule[] = [
  {
    merchantIncludes: ['nanu', 'nanu-nana', 'nanu nana'],
    titleIncludes: ['spielzeug', 'spielwaren', 'geschenk', 'accessoire', 'accessoires'],
    category: 'geschenke',
    taxHint: 'depends',
  },
  {
    merchantIncludes: ['nanu', 'nanu-nana', 'nanu nana'],
    titleIncludes: ['kerze', 'vase', 'deko', 'dekoration', 'bilderrahmen'],
    category: 'geschenke',
    taxHint: 'depends',
  },
  {
    merchantIncludes: ['deutsche bahn', 'db', 'd-tarif', 'bahn'],
    titleIncludes: ['fahrticket', 'fahrradkarte', 'fahrkarte', 'ticket', 'd-ticket', 'nahverkehr'],
    category: 'reisen',
    taxHint: 'depends',
  },
]