import { z } from 'zod'

/** H5: six looks, each a set of design tokens laid over the shop's theme. */
export const landingDesigns = ['bold', 'clean', 'warm', 'night', 'festive', 'fresh'] as const
export type LandingDesign = (typeof landingDesigns)[number]

export const blockKinds = [
  'hero',
  'video',
  'price',
  'packs',
  'problem',
  'whyUs',
  'comparison',
  'benefits',
  'gallery',
  'reviews',
  'delivery',
  'faq',
  'guarantee',
  'checkout',
  'stickyBar',
  'exitPopup',
] as const
export type BlockKind = (typeof blockKinds)[number]

// The shop's own top-level paths: a landing prefix may not hide one of them.
const reserved = [
  'admin',
  'api',
  'b',
  'c',
  'checkout',
  'feeds',
  'order',
  'p',
  'page',
  'review',
  'search',
  'track',
  'wishlist',
]
/** H5: landing pages live at /<prefix>/<slug> (e.g. /offer/eid-attar). */
export const landingSettings = z.object({
  prefix: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{1,20}$/)
    .refine((p) => !reserved.includes(p))
    .default('offer'),
})

const money = z.number().int().nonnegative()
/** One block: shared fields, each kind reads the ones it needs (items: list rows, "a | b" for tables and FAQ). */
export const landingBlock = z.object({
  kind: z.enum(blockKinds),
  on: z.boolean().default(true),
  title: z.string().trim().max(200).default(''),
  text: z.string().trim().max(2000).default(''),
  items: z.array(z.string().trim().min(1).max(300)).max(12).default([]),
  url: z.url().nullable().default(null),
  endsAt: z.coerce.date().nullable().default(null),
  packs: z
    .array(z.object({ qty: z.number().int().min(1).max(20), price: money.positive() }))
    .max(4)
    .default([]),
})
export type LandingBlock = z.output<typeof landingBlock>

export const landingInput = z.object({
  title: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/)
    .min(1)
    .max(80),
  productId: z.uuid(),
  design: z.enum(landingDesigns).default('bold'),
  /** Show the shop's own header and footer around the page. */
  siteChrome: z.boolean().default(false),
  hidden: z.boolean().default(false),
  blocks: z.array(landingBlock).max(24),
})
export type LandingInput = z.input<typeof landingInput>
export type LandingData = z.output<typeof landingInput>

type ProductFacts = {
  name: string
  description: string
  price: number
  compareAtPrice: number | null
}

const copy = {
  en: {
    why: 'Why people choose us',
    problem: 'Tired of products that are not what the photo showed?',
    solution: 'Here every parcel is checked before it leaves, and you pay only when it arrives.',
    whyUs: [
      'Cash on delivery all over Bangladesh',
      'Open and check before you pay',
      'Easy return if anything is wrong',
    ],
    comparison: [
      'Checked before dispatch | Unchecked',
      'Pay on delivery | Pay first',
      'Free return | No return',
    ],
    benefits: ['Original product', 'Fast delivery', 'Friendly support on WhatsApp'],
    faq: [
      'How long does delivery take? | 1–2 days in Dhaka, 2–4 days outside.',
      'Can I check before paying? | Yes, open the parcel in front of the rider.',
    ],
    guarantee: 'Not happy? Return it within 3 days and get your money back.',
    delivery: 'Delivery all over Bangladesh. Inside Dhaka 1–2 days.',
    order: 'Order now',
    packs: 'Choose your pack',
    reviews: 'What customers say',
    leave: 'Wait — your offer is still here. Order now and pay on delivery.',
  },
  bn: {
    why: 'কেন সবাই আমাদের বেছে নেন',
    problem: 'ছবির সাথে পণ্য মেলে না — এমন ঝামেলায় পড়েছেন?',
    solution: 'এখানে প্রতিটি পার্সেল পাঠানোর আগে দেখে নেওয়া হয়, আর টাকা দেবেন হাতে পেয়ে।',
    whyUs: ['সারা বাংলাদেশে ক্যাশ অন ডেলিভারি', 'দেখে নিয়ে টাকা দিন', 'সমস্যা হলে সহজ রিটার্ন'],
    comparison: [
      'পাঠানোর আগে চেক | চেক ছাড়া',
      'হাতে পেয়ে টাকা | আগে টাকা',
      'ফ্রি রিটার্ন | রিটার্ন নেই',
    ],
    benefits: ['আসল পণ্য', 'দ্রুত ডেলিভারি', 'হোয়াটসঅ্যাপে সাহায্য'],
    faq: [
      'ডেলিভারি কতদিনে? | ঢাকায় ১–২ দিন, বাইরে ২–৪ দিন।',
      'টাকা দেওয়ার আগে দেখতে পারব? | হ্যাঁ, রাইডারের সামনে খুলে দেখুন।',
    ],
    guarantee: 'পছন্দ না হলে ৩ দিনের মধ্যে ফেরত দিন, টাকা ফেরত পাবেন।',
    delivery: 'সারা বাংলাদেশে ডেলিভারি। ঢাকার ভেতরে ১–২ দিন।',
    order: 'এখনই অর্ডার করুন',
    packs: 'আপনার প্যাক বেছে নিন',
    reviews: 'ক্রেতারা যা বলছেন',
    leave: 'একটু দাঁড়ান — অফারটি এখনও আছে। অর্ডার করুন, টাকা দেবেন হাতে পেয়ে।',
  },
}

const block = (kind: BlockKind, b: Partial<LandingBlock> = {}): LandingBlock =>
  landingBlock.parse({ kind, ...b })

/** H5: a new page is filled from the product, so the owner only has to adjust it. */
export const defaultBlocks = (p: ProductFacts, locale: 'en' | 'bn'): LandingBlock[] => {
  const c = copy[locale]
  // Pack tiers: 1 at the price, 2 and 3 a little cheaper each.
  const tier = (qty: number, off: number) => ({
    qty,
    price: Math.round((p.price * qty * (100 - off)) / 100),
  })
  return [
    block('hero', { title: p.name, text: p.description.slice(0, 300) }),
    block('video', { on: false }),
    block('price', { title: c.order }),
    block('packs', { title: c.packs, packs: [tier(1, 0), tier(2, 5), tier(3, 10)] }),
    block('problem', { title: c.problem, text: c.solution }),
    block('whyUs', { title: c.why, items: c.whyUs }),
    block('comparison', { items: c.comparison }),
    block('benefits', { items: c.benefits }),
    block('gallery'),
    block('reviews', { title: c.reviews }),
    block('delivery', { text: c.delivery }),
    block('faq', { items: c.faq }),
    block('guarantee', { text: c.guarantee }),
    block('checkout', { title: c.order }),
    block('stickyBar', { title: c.order }),
    block('exitPopup', { text: c.leave }),
  ]
}

/** Move a block one place up (-1) or down (+1); the ends stay put. */
export const moveBlock = <T>(blocks: T[], index: number, dir: -1 | 1): T[] => {
  const to = index + dir
  if (to < 0 || to >= blocks.length) return blocks
  const next = [...blocks]
  ;[next[index], next[to]] = [next[to]!, next[index]!]
  return next
}

/** What `qty` pieces cost on this page: the pack price when a shown pack has that size. */
export const packPrice = (blocks: LandingBlock[], qty: number, unit: number) => {
  const pack = blocks
    .filter((b) => b.kind === 'packs' && b.on)
    .flatMap((b) => b.packs)
    .find((x) => x.qty === qty)
  return pack ? Math.min(pack.price, unit * qty) : unit * qty
}

/** Orders per 100 visitors, one decimal; null before anyone visited. */
export const conversion = (visits: number, orders: number) =>
  visits === 0 ? null : Math.round((orders / visits) * 1000) / 10

/** A free slug for a copy: `x-copy`, then `x-copy-2`, … */
export const copySlug = (slug: string, taken: Set<string>) => {
  const base = `${slug}-copy`
  let s = base
  for (let n = 2; taken.has(s); n++) s = `${base}-${n}`
  return s
}

/** "a | b" rows of comparison tables and FAQs. */
export const splitRow = (row: string) => {
  const i = row.indexOf('|')
  return i < 0 ? [row.trim(), ''] : [row.slice(0, i).trim(), row.slice(i + 1).trim()]
}
