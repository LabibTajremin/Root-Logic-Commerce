import { subscription } from '../domain/newsletter'

export type Subscriber = { contact: string; kind: 'phone' | 'email'; createdAt: Date }

export type SubscribersRepo = {
  /** Signing up twice keeps the first sign-up. */
  add(storeId: string, s: { contact: string; kind: 'phone' | 'email' }): Promise<void>
  list(storeId: string): Promise<Subscriber[]>
}

export const createNewsletter = ({ repo }: { repo: SubscribersRepo }) => ({
  subscribe: async (storeId: string, contact: string, consent: boolean) =>
    repo.add(storeId, subscription(contact, consent)),
  list: (storeId: string) => repo.list(storeId),
  /** For the owner's own SMS/email tool: one contact per row. */
  async csv(storeId: string) {
    const rows = await repo.list(storeId)
    return [
      'contact,kind,joined',
      ...rows.map((r) => `${r.contact},${r.kind},${r.createdAt.toISOString()}`),
    ].join('\r\n')
  },
})

export type Newsletter = ReturnType<typeof createNewsletter>
