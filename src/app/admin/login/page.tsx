import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { helpText } from '@/help'
import { translate } from '@/i18n'
import { currentActor, currentLocale, currentStore } from '@/server/request'
import { LangToggle } from '../lang-toggle'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } }

export default async function LoginPage() {
  if (await currentActor()) redirect('/admin')
  const [locale] = await Promise.all([currentLocale(), currentStore()])
  const t = (k: string) => translate(locale, k)
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,640px)_1fr]">
      <section className="flex flex-col justify-between gap-6 bg-button p-8 text-button-text lg:p-14">
        <p className="font-heading text-xl">Root Logic Commerce</p>
        <div className="flex flex-col gap-3">
          <h2 className="font-heading text-3xl lg:text-5xl">{t('admin.signIn.tagline')}</h2>
          <p className="opacity-80">{t('admin.signIn.sub')}</p>
        </div>
        <p className="text-sm opacity-70">{t('common.poweredBy')}</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="flex w-full max-w-sm flex-col gap-5">
          <div className="flex items-center justify-between">
            <h1 className="font-heading text-3xl">{t('admin.signIn')}</h1>
            <LangToggle locale={locale} />
          </div>
          <p className="text-sm text-muted">{t('admin.signIn.intro')}</p>
          <LoginForm
            labels={{
              email: t('field.email'),
              password: t('field.password'),
              submit: t('admin.signIn'),
              error: t('admin.signIn.error'),
              limited: t('admin.signIn.limited'),
              helpEmail: helpText(locale, 'login.email'),
              helpPassword: helpText(locale, 'login.password'),
              help: t('common.help'),
            }}
          />
          <p className="text-xs text-muted">{t('admin.signIn.note')}</p>
        </div>
      </section>
    </main>
  )
}
