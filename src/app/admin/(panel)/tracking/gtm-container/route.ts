import { gtmContainer } from '@/modules/tracking'
import { currentSettings } from '@/server/request'
import { adminContext } from '../../context'

/** H3: the GTM container JSON with our dataLayer events, for Admin › Import container. */
export const GET = async () => {
  const { allowed } = await adminContext('settings.manage')
  if (!allowed) return new Response(null, { status: 403 })
  const { business } = await currentSettings()
  return Response.json(gtmContainer(business.tracking.gtm, new Date()), {
    headers: { 'content-disposition': 'attachment; filename="rlc-gtm-container.json"' },
  })
}
