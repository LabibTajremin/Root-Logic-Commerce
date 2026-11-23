type Item = {
  id: string
  categoryId: string | null
  status: string
  stock: number
  options: unknown[]
}

const live = <T extends Item>(all: T[], self: string) =>
  all.filter((x) => x.id !== self && x.status === 'active')

/** A8 "You may also like": the owner's picks first, then the same category. */
export const pickRelated = <T extends Item>(
  me: Item & { relatedIds: string[] },
  all: T[],
  n: number,
): T[] => {
  const pool = live(all, me.id)
  const manual = me.relatedIds.flatMap((id) => pool.filter((x) => x.id === id))
  const auto = pool.filter(
    (x) => me.categoryId !== null && x.categoryId === me.categoryId && !manual.includes(x),
  )
  return [...manual, ...auto].slice(0, n)
}

/**
 * A8 "Frequently bought together": the owner's picks, else what shared most orders.
 * Only plain, in-stock products — they go to the cart in one tap.
 */
export const pickBoughtTogether = <T extends Item>(
  me: Item & { fbtIds: string[] },
  all: T[],
  coPurchased: string[],
  n: number,
): T[] => {
  const plain = (x: Item) => x.stock > 0 && x.options.length === 0
  // Only offered on a page that itself adds to the cart in one tap.
  if (!plain(me)) return []
  const pool = live(all, me.id).filter(plain)
  const ids = me.fbtIds.length > 0 ? me.fbtIds : coPurchased
  return ids.flatMap((id) => pool.filter((x) => x.id === id)).slice(0, n)
}
