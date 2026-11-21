import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { DomainError } from '@/modules/shared'

const PREFIX = 'enc:v1:'

/** AES-256-GCM for credentials owners save in admin; the key only ever lives in env. */
export const createSecretBox = (secret: string | undefined) => {
  const key = secret ? createHash('sha256').update(secret).digest() : null
  return {
    seal(plain: string) {
      if (!key) throw new DomainError('settings.key_missing')
      const iv = randomBytes(12)
      const c = createCipheriv('aes-256-gcm', key, iv)
      const data = Buffer.concat([c.update(plain, 'utf8'), c.final()])
      return PREFIX + [iv, c.getAuthTag(), data].map((b) => b.toString('base64url')).join('.')
    },
    open(sealed: string) {
      if (!sealed) return ''
      if (!key || !sealed.startsWith(PREFIX)) throw new DomainError('settings.key_missing')
      const [iv, tag, data] = sealed
        .slice(PREFIX.length)
        .split('.')
        .map((p) => Buffer.from(p, 'base64url'))
      const d = createDecipheriv('aes-256-gcm', key, iv!)
      d.setAuthTag(tag!)
      return Buffer.concat([d.update(data!), d.final()]).toString('utf8')
    },
  }
}
export type SecretBox = ReturnType<typeof createSecretBox>
