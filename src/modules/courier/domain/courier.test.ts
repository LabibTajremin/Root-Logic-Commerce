import { describe, expect, it } from 'vitest'
import {
  accountInput,
  credentialFields,
  credentialSchemas,
  orderStatusFor,
  parcelState,
  readWebhook,
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
