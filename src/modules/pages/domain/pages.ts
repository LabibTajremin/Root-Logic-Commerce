import { z } from 'zod'

export const pageInput = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(60)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'slug.invalid'),
  title: z.string().trim().min(1).max(120),
  body: z.string().max(20000),
  published: z.boolean(),
  inFooter: z.boolean(),
})
export type PageInput = z.infer<typeof pageInput>

/** Rich text stored as plain text: `## `/`### ` headings, `- ` lists, `**bold**`, blank-line paragraphs. */
export type Block = { kind: 'h2' | 'h3' | 'p'; text: string } | { kind: 'ul'; items: string[] }

export const parseBody = (body: string): Block[] =>
  body
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk): Block => {
      const lines = chunk.split('\n')
      if (lines.every((l) => l.startsWith('- ')))
        return { kind: 'ul', items: lines.map((l) => l.slice(2).trim()) }
      if (chunk.startsWith('### ')) return { kind: 'h3', text: chunk.slice(4).trim() }
      if (chunk.startsWith('## ')) return { kind: 'h2', text: chunk.slice(3).trim() }
      return { kind: 'p', text: lines.join(' ') }
    })

/** `**bold**` runs; everything else is literal text (never HTML). */
export const parseInline = (text: string) =>
  text
    .split(/(\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((s) =>
      /^\*\*[^*]+\*\*$/.test(s) ? { bold: true, text: s.slice(2, -2) } : { bold: false, text: s },
    )

type Template = { slug: string; title: string; body: string }

/** Starter pages an owner can add in one tap and then edit (J8). */
export const pageTemplates: Record<'en' | 'bn', Template[]> = {
  en: [
    {
      slug: 'about',
      title: 'About us',
      body: '## Our story\n\nTell shoppers who you are, what you sell and why you started.\n\n- Cash on delivery all over Bangladesh\n- Easy returns within 7 days',
    },
    {
      slug: 'return-policy',
      title: 'Return policy',
      body: 'You can return an item within **7 days** of receiving it.\n\n- Send the order number and a photo on WhatsApp\n- A rider picks the item up\n- Money back within 3 days',
    },
    {
      slug: 'privacy',
      title: 'Privacy policy',
      body: 'We only use your name, phone and address to deliver your order. We never sell your data.',
    },
    {
      slug: 'terms',
      title: 'Terms & conditions',
      body: 'Prices and stock can change. An order is final once we confirm it by phone or message.',
    },
    {
      slug: 'contact',
      title: 'Contact us',
      body: 'Call or WhatsApp us any day from 10 AM to 10 PM. Add your phone number and address here.',
    },
  ],
  bn: [
    {
      slug: 'about',
      title: 'আমাদের সম্পর্কে',
      body: '## আমাদের গল্প\n\nআপনি কে, কী বিক্রি করেন আর কেন শুরু করেছেন — ক্রেতাদের জানান।\n\n- সারা দেশে ক্যাশ অন ডেলিভারি\n- ৭ দিনে সহজ রিটার্ন',
    },
    {
      slug: 'return-policy',
      title: 'রিটার্ন পলিসি',
      body: 'পণ্য হাতে পাওয়ার **৭ দিনের** মধ্যে ফেরত দিতে পারবেন।\n\n- WhatsApp-এ অর্ডার নম্বর ও ছবি পাঠান\n- রাইডার এসে পণ্য নিয়ে যাবেন\n- ৩ দিনের মধ্যে টাকা ফেরত',
    },
    {
      slug: 'privacy',
      title: 'প্রাইভেসি পলিসি',
      body: 'আপনার নাম, ফোন ও ঠিকানা শুধু অর্ডার পৌঁছাতে ব্যবহার করি। কখনো বিক্রি করি না।',
    },
    {
      slug: 'terms',
      title: 'শর্তাবলি',
      body: 'দাম ও স্টক বদলাতে পারে। ফোন বা মেসেজে কনফার্ম করার পর অর্ডার চূড়ান্ত।',
    },
    {
      slug: 'contact',
      title: 'যোগাযোগ',
      body: 'প্রতিদিন সকাল ১০টা থেকে রাত ১০টা কল বা WhatsApp করুন। এখানে ফোন নম্বর ও ঠিকানা লিখুন।',
    },
  ],
}
