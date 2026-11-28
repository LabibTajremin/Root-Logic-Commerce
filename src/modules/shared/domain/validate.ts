import type { z } from 'zod'
import { DomainError } from './errors'

export const validate = <S extends z.ZodType>(schema: S, input: unknown): z.output<S> => {
  const r = schema.safeParse(input)
  if (!r.success) {
    throw new DomainError('validation', {
      issues: r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    })
  }
  return r.data
}
