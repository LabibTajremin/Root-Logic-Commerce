import { z } from 'zod'
import type { ApiFactory, CourierApi, Credentials, Parcel } from '@/modules/courier'

type Fetch = typeof fetch

const id = z.union([z.string(), z.number()]).transform(String)
const taka = (paisa: number) => paisa / 100

/** One request with a JSON body/answer; anything but 2xx is the courier refusing. */
const call = async <T>(
  fetcher: Fetch,
  url: string,
  schema: z.ZodType<T>,
  init: { method?: string; headers: Record<string, string>; body?: unknown },
) => {
  const res = await fetcher(url, {
    method: init.method ?? 'GET',
    headers: { accept: 'application/json', 'content-type': 'application/json', ...init.headers },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  if (!res.ok) throw new Error(`${new URL(url).host} answered ${res.status}`)
  return schema.parse(await res.json())
}

// https://portal.packzy.com/api/v1 (Steadfast merchant API).
const steadfast = (c: Credentials['steadfast'], f: Fetch): CourierApi => {
  const base = 'https://portal.packzy.com/api/v1'
  const headers = { 'Api-Key': c.apiKey, 'Secret-Key': c.secretKey }
  return {
    async create(p: Parcel) {
      const r = await call(
        f,
        `${base}/create_order`,
        z.object({ consignment: z.object({ consignment_id: id, tracking_code: z.string() }) }),
        {
          method: 'POST',
          headers,
          body: {
            invoice: p.invoice,
            recipient_name: p.name,
            recipient_phone: p.phone,
            recipient_address: p.address,
            cod_amount: taka(p.cod),
            note: p.note,
          },
        },
      )
      return {
        ref: r.consignment.consignment_id,
        tracking: r.consignment.tracking_code,
        charge: null,
      }
    },
    status: async (ref) =>
      (
        await call(
          f,
          `${base}/status_by_cid/${encodeURIComponent(ref)}`,
          z.object({ delivery_status: z.string() }),
          {
            headers,
          },
        )
      ).delivery_status,
  }
}

// https://api-hermes.pathao.com (Pathao Courier merchant API, password grant).
const pathao = (c: Credentials['pathao'], f: Fetch): CourierApi => {
  const base = 'https://api-hermes.pathao.com/aladdin/api/v1'
  const auth = async () => {
    const t = await call(f, `${base}/issue-token`, z.object({ access_token: z.string() }), {
      method: 'POST',
      headers: {},
      body: {
        client_id: c.clientId,
        client_secret: c.clientSecret,
        username: c.username,
        password: c.password,
        grant_type: 'password',
      },
    })
    return { authorization: `Bearer ${t.access_token}` }
  }
  return {
    async create(p) {
      const r = await call(
        f,
        `${base}/orders`,
        z.object({
          data: z.object({ consignment_id: id, delivery_fee: z.coerce.number().optional() }),
        }),
        {
          method: 'POST',
          headers: await auth(),
          body: {
            store_id: Number(c.storeId),
            merchant_order_id: p.invoice,
            recipient_name: p.name,
            recipient_phone: p.phone,
            recipient_address: p.address,
            delivery_type: 48,
            item_type: 2,
            item_quantity: 1,
            item_weight: 0.5,
            special_instruction: p.note,
            amount_to_collect: taka(p.cod),
          },
        },
      )
      const fee = r.data.delivery_fee
      return {
        ref: r.data.consignment_id,
        tracking: r.data.consignment_id,
        charge: fee === undefined ? null : Math.round(fee * 100),
      }
    },
    status: async (ref) =>
      (
        await call(
          f,
          `${base}/orders/${encodeURIComponent(ref)}/info`,
          z.object({ data: z.object({ order_status: z.string() }) }),
          { headers: await auth() },
        )
      ).data.order_status,
  }
}

// https://openapi.redx.com.bd/v1.0.0-beta (RedX open API).
const redx = (c: Credentials['redx'], f: Fetch): CourierApi => {
  const base = 'https://openapi.redx.com.bd/v1.0.0-beta'
  const headers = { 'API-ACCESS-TOKEN': `Bearer ${c.token}` }
  return {
    async create(p) {
      // RedX needs its own delivery-area id; the district's first area is the closest we know.
      const areas = await call(
        f,
        `${base}/areas?district_name=${encodeURIComponent(p.district)}`,
        z.object({ areas: z.array(z.object({ id: z.number(), name: z.string() })) }),
        { headers },
      )
      const area = areas.areas[0]
      if (!area) throw new Error(`RedX has no delivery area for ${p.district}`)
      const r = await call(f, `${base}/parcel`, z.object({ tracking_id: id }), {
        method: 'POST',
        headers,
        body: {
          customer_name: p.name,
          customer_phone: p.phone,
          delivery_area: area.name,
          delivery_area_id: area.id,
          customer_address: p.address,
          merchant_invoice_id: p.invoice,
          cash_collection_amount: String(taka(p.cod)),
          parcel_weight: 500,
          value: taka(p.cod),
          instruction: p.note,
        },
      })
      return { ref: r.tracking_id, tracking: r.tracking_id, charge: null }
    },
    status: async (ref) =>
      (
        await call(
          f,
          `${base}/parcel/info/${encodeURIComponent(ref)}`,
          z.object({ parcel: z.object({ status: z.string() }) }),
          { headers },
        )
      ).parcel.status,
  }
}

/** Dev/e2e: parcels get a made-up reference and stay pending until a webhook says otherwise. */
const logged: CourierApi = {
  create: async (p) => ({ ref: `LOG-${p.invoice}`, tracking: `LOG-${p.invoice}`, charge: null }),
  status: async () => 'pending',
}

export const createCourierApis =
  ({ mode, fetcher = fetch }: { mode: 'live' | 'log'; fetcher?: Fetch }): ApiFactory =>
  (provider, creds) => {
    if (mode === 'log') return logged
    const make = { steadfast, pathao, redx }[provider] as (c: typeof creds, f: Fetch) => CourierApi
    return make(creds, fetcher)
  }
