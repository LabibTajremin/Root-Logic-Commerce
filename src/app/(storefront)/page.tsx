import { resolveSections } from '@/sections/registry'
import { JsonLd, organizationLd } from './json-ld'
import { origin } from './origin'
import { Sections } from './sections'
import { storefront } from './storefront'

export default async function HomePage() {
  const ctx = await storefront()
  const { store, design, layout } = ctx
  const sections = resolveSections(layout.home)
  return (
    <>
      <JsonLd data={organizationLd(await origin(), store.name, design.footer.socials)} />
      {/* The hero carries the page's h1; layouts without it still need one. */}
      {!sections.some((s) => s.id === 'hero') && <h1 className="sr-only">{store.name}</h1>}
      <Sections sections={sections} ctx={ctx} />
    </>
  )
}
