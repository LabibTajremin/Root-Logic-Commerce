// Use-cases throw DomainError with a stable code; the UI maps codes to EN/BN messages.
export class DomainError extends Error {
  override name = 'DomainError'
  constructor(
    readonly code: string,
    readonly params: Record<string, unknown> = {},
  ) {
    super(code)
  }
}

// Structural check: Next bundles modules per route, so `instanceof` fails when the
// error was thrown by the shared runtime created in another bundle.
export const isDomainError = (e: unknown): e is DomainError =>
  e instanceof Error &&
  e.name === 'DomainError' &&
  typeof (e as { code?: unknown }).code === 'string'
