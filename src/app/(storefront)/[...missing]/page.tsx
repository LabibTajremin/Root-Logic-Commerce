import { notFound } from 'next/navigation'

// Unmatched URLs render the store's own 404 (inside the storefront layout).
export default function Missing() {
  notFound()
}
