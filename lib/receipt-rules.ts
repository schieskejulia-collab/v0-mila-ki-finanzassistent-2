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
{
  merchantIncludes: ['rossmann'],
  titleIncludes: [],
  category: 'privat',
  taxHint: 'private',
},

{
  merchantIncludes: ['dm'],
  titleIncludes: [],
  category: 'privat',
  taxHint: 'private',
},

{
  merchantIncludes: ['aldi'],
  titleIncludes: [],
  category: 'privat',
  taxHint: 'private',
},

{
  merchantIncludes: ['lidl'],
  titleIncludes: [],
  category: 'privat',
  taxHint: 'private',
},

{
  merchantIncludes: ['rewe'],
  titleIncludes: [],
  category: 'privat',
  taxHint: 'private',
},

{
  merchantIncludes: ['edeka'],
  titleIncludes: [],
  category: 'privat',
  taxHint: 'private',
},

{
  merchantIncludes: ['netto'],
  titleIncludes: [],
  category: 'privat',
  taxHint: 'private',
},

{
  merchantIncludes: ['kaufland'],
  titleIncludes: [],
  category: 'privat',
  taxHint: 'private',
},

{
  merchantIncludes: ['ikea'],
  titleIncludes: [],
  category: 'homeoffice',
  taxHint: 'depends',
},

{
  merchantIncludes: ['obi', 'hornbach', 'toom', 'bauhaus'],
  titleIncludes: [],
  category: 'material',
  taxHint: 'likely',
},
{
  merchantIncludes: ['amazon'],
  titleIncludes: [],
  category: 'sonstiges',
  taxHint: 'depends',
},

{
  merchantIncludes: ['otto'],
  titleIncludes: [],
  category: 'sonstiges',
  taxHint: 'depends',
},

{
  merchantIncludes: ['media markt', 'mediamarkt'],
  titleIncludes: [],
  category: 'hardware',
  taxHint: 'likely',
},

{
  merchantIncludes: ['saturn'],
  titleIncludes: [],
  category: 'hardware',
  taxHint: 'likely',
},

{
  merchantIncludes: ['apple'],
  titleIncludes: [],
  category: 'hardware',
  taxHint: 'likely',
},

{
  merchantIncludes: ['notebooksbilliger'],
  titleIncludes: [],
  category: 'hardware',
  taxHint: 'likely',
},

{
  merchantIncludes: ['conrad'],
  titleIncludes: [],
  category: 'hardware',
  taxHint: 'likely',
},

{
  merchantIncludes: ['aral','shell','esso','total','star','hem'],
  titleIncludes: [],
  category: 'fahrzeug',
  taxHint: 'depends',
},

{
  merchantIncludes: ['dhl','hermes','dpd','ups','gls'],
  titleIncludes: [],
  category: 'versand',
  taxHint: 'likely',
},
{
  merchantIncludes: ['adobe'],
  titleIncludes: [],
  category: 'software',
  taxHint: 'likely',
},

{
  merchantIncludes: ['openai','chatgpt'],
  titleIncludes: [],
  category: 'software',
  taxHint: 'likely',
},

{
  merchantIncludes: ['google'],
  titleIncludes: [],
  category: 'software',
  taxHint: 'depends',
},

{
  merchantIncludes: ['microsoft'],
  titleIncludes: [],
  category: 'software',
  taxHint: 'likely',
},

{
  merchantIncludes: ['canva'],
  titleIncludes: [],
  category: 'software',
  taxHint: 'likely',
},

{
  merchantIncludes: ['figma'],
  titleIncludes: [],
  category: 'software',
  taxHint: 'likely',
},

{
  merchantIncludes: ['github'],
  titleIncludes: [],
  category: 'software',
  taxHint: 'likely',
},
]