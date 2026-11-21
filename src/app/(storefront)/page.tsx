import { layoutOf, resolveSections } from '@/sections/registry'
import { JsonLd, organizationLd } from './json-ld'
import { origin } from './origin'
import { Sections } from './sections'
import { storefront } from './storefront'

export default async function HomePage() {
  const ctx = await storefront()
  const { store, design, layout } = ctx
  return (
    <>
      <JsonLd
        data={organizationLd(
          await origin(),
          store.name,
          design.footer.socials.map((s) => s.url),
        )}
      />
      <Sections sections={resolveSections(layoutOf(layout).home)} ctx={ctx} />
    </>
  )
}
