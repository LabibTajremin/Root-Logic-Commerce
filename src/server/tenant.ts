export type TenantStore = { id: string; slug: string; active: boolean }

export type StoreDirectory = {
  findByHost(host: string): Promise<TenantStore | null>
  findBySlug(slug: string): Promise<TenantStore | null>
}

type Options = { mode: 'single' | 'multi'; defaultSlug: string }

export const normalizeHost = (host: string | null) =>
  (host ?? '').trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '')

// Host is the only trusted tenant signal; a known-but-inactive store must 404, not fall back.
export const resolveStore = async (host: string | null, opts: Options, dir: StoreDirectory) => {
  const byHost = opts.mode === 'multi' ? await dir.findByHost(normalizeHost(host)) : null
  const store = byHost ?? (await dir.findBySlug(opts.defaultSlug))
  return store?.active ? store : null
}
