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
