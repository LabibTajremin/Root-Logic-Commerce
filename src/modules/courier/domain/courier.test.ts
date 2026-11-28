import { describe, expect, it } from 'vitest'
import {
  accountInput,
  amountsInput,
  collectedOf,
  courierReport,
  credentialFields,
  credentialSchemas,
  orderStatusFor,
  parcelState,
  readWebhook,
  scanCode,
  sessionInput,
  showDays,
  showPct,
} from './courier'

describe('courier statuses (E2)', () => {
  it('maps each courier’s words onto one set of parcel states', () => {
    expect(parcelState('steadfast', 'delivered_approval_pending')).toBe('delivered')
    expect(parcelState('steadfast', 'cancelled')).toBe('returning')
    expect(parcelState('steadfast', 'hold')).toBe('hold')
    expect(parcelState('pathao', 'Partial_Delivery')).toBe('partial')
    expect(parcelState('pathao', 'Pickup Cancelled')).toBe('cancelled')
    expect(parcelState('pathao', 'Paid_Return')).toBe('returning')
    expect(parcelState('redx', 'agent-hold')).toBe('hold')
    expect(parcelState('redx', 'Delivery In Progress')).toBe('in_transit')
    expect(parcelState('redx', 'pickup-pending')).toBe('pending')
    // A word we don't know yet: the parcel is still moving.
    expect(parcelState('pathao', 'teleported')).toBe('in_transit')
  })

  it('moves the order only where the parcel state says something definite', () => {
    expect(orderStatusFor('delivered')).toBe('DELIVERED')
    expect(orderStatusFor('hold')).toBe('COURIER_HOLD')
    expect(orderStatusFor('returning')).toBe('RETURNING')
    expect(orderStatusFor('cancelled')).toBe('RETURNING')
    expect(orderStatusFor('in_transit')).toBe('SHIPPED')
    expect(orderStatusFor('partial')).toBeNull()
    expect(orderStatusFor('pending')).toBeNull()
  })

  it('reads the parcel and status out of each courier’s webhook', () => {
    expect(
      readWebhook('steadfast', { consignment_id: 77, status: 'delivered', delivery_charge: '60' }),
    ).toEqual({ ref: '77', raw: 'delivered', charge: 6000 })
    expect(
      readWebhook('pathao', { consignment_id: 'DL1', event: 'order.delivered', delivery_fee: 70 }),
    ).toEqual({ ref: 'DL1', raw: 'delivered', charge: 7000 })
    expect(readWebhook('pathao', { consignment_id: 'DL1', order_status: 'Hold' })).toEqual({
      ref: 'DL1',
      raw: 'Hold',
      charge: null,
    })
    expect(readWebhook('redx', { tracking_number: 'R9', status: 'delivered' })).toEqual({
      ref: 'R9',
      raw: 'delivered',
      charge: null,
    })
    expect(
      readWebhook('steadfast', { consignment_id: 1, status: 'x', delivery_charge: 'n/a' }),
    ).toEqual({ ref: '1', raw: 'x', charge: null })
    expect(readWebhook('steadfast', { notification_type: 'tracking_update' })).toBeNull()
    expect(readWebhook('redx', null)).toBeNull()
    expect(readWebhook('redx', 'text')).toBeNull()
  })

  it('validates each courier’s keys', () => {
    expect(
      credentialSchemas.pathao.safeParse({
        clientId: 'a',
        clientSecret: 'b',
        username: 'c',
        password: 'd',
        storeId: 'x',
      }).success,
    ).toBe(false)
    for (const p of ['steadfast', 'pathao', 'redx'] as const)
      expect(Object.keys(credentialSchemas[p].shape)).toEqual([...credentialFields[p]])
    expect(accountInput.safeParse({ provider: 'dhl', label: 'x', credentials: {} }).success).toBe(
      false,
    )
  })
})

describe('courier report and payouts (E3, E5)', () => {
  const at = (d: number) => new Date(Date.UTC(2026, 10, d))
  it('counts each courier’s parcels and how well they do', () => {
    expect(
      courierReport([
        { provider: 'pathao', state: 'delivered', createdAt: at(1), updatedAt: at(3) },
        { provider: 'pathao', state: 'delivered', createdAt: at(1), updatedAt: at(4) },
        { provider: 'pathao', state: 'partial', createdAt: at(1), updatedAt: at(2) },
        { provider: 'pathao', state: 'cancelled', createdAt: at(1), updatedAt: at(2) },
        { provider: 'pathao', state: 'hold', createdAt: at(1), updatedAt: at(2) },
        { provider: 'redx', state: 'pending', createdAt: at(1), updatedAt: at(1) },
      ]),
    ).toEqual([
      {
        provider: 'pathao',
        sent: 5,
        moving: 1,
        delivered: 2,
        partial: 1,
        returned: 1,
        successPct: 75,
        avgDays: 2.5,
      },
      {
        provider: 'redx',
        sent: 1,
        moving: 1,
        delivered: 0,
        partial: 0,
        returned: 0,
        successPct: null,
        avgDays: null,
      },
    ])
    expect(courierReport([])).toEqual([])
    expect([showPct(75), showPct(null), showDays(2.5), showDays(null)]).toEqual([
      '75%',
      '—',
      '2.5',
      '—',
    ])
  })

  it('a delivered parcel collected its COD unless the owner says otherwise', () => {
    expect(collectedOf({ state: 'delivered', cod: 5000, codCollected: null })).toBe(5000)
    expect(collectedOf({ state: 'partial', cod: 5000, codCollected: null })).toBe(0)
    expect(collectedOf({ state: 'partial', cod: 5000, codCollected: 3000 })).toBe(3000)
    expect(amountsInput.safeParse({ collected: -1, charge: 0 }).success).toBe(false)
  })
})

describe('parcel scan (E4)', () => {
  it('reads the invoice barcode, a bare order number or a tracking code', () => {
    expect(scanCode('#1042')).toEqual({ orderNo: 1042 })
    expect(scanCode(' 1042 ')).toEqual({ orderNo: 1042 })
    expect(scanCode('SF77AB')).toEqual({ tracking: 'SF77AB' })
    expect(scanCode('   ')).toBeNull()
    expect(sessionInput.parse({ kind: 'return', provider: 'redx' })).toEqual({
      kind: 'return',
      provider: 'redx',
      riderName: '',
      riderPhone: '',
    })
    expect(sessionInput.safeParse({ kind: 'lost', provider: 'redx' }).success).toBe(false)
  })
})
