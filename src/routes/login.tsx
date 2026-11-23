import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowRight, Eye, EyeOff, Lock, Mail, Scissors } from 'lucide-react'
import { supabase } from '#/lib/supabase'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    setLoading(false)

    if (error) {
      setError('E-mail ou senha incorretos.')
      return
    }
    navigate({ to: '/' })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[625px]">
        {/* Marca */}
        <div className="flex items-center gap-3 mb-10">
          <div className="flex size-11 items-center justify-center rounded-xl bg-teal-400/80 text-slate-900">
            <Scissors className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="font-semibold text-slate-900">Confec time</p>
            <p className="text-sm text-teal-700">Gestão de produção</p>
          </div>
        </div>

        {/* Título */}
        <p className="text-sm font-medium uppercase tracking-wide text-blue-900">
          Bem-vindo de volta
        </p>
        <h1 className="mt-3 text-5xl font-extrabold tracking-tight text-slate-900">
          Entre na sua conta.
        </h1>
        <p className="mt-6 text-lg text-slate-600">
          Digite seu e-mail e senha para acessar o sistema.
        </p>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="mt-10 space-y-6">
          <Field label="E-mail" icon={<Mail className="size-5" />}>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent outline-none placeholder:text-slate-400"
            />
          </Field>

          <Field
            label="Senha"
            icon={<Lock className="size-5" />}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="text-slate-500 hover:text-slate-800"
              >
                {showPassword ? (
                  <EyeOff className="size-5" />
                ) : (
                  <Eye className="size-5" />
                )}
              </button>
            }
          >
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent outline-none placeholder:text-slate-400"
            />
          </Field>

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-900 text-lg font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
          >
            {loading ? 'Aguarde...' : 'Entrar'}
            {!loading && <ArrowRight className="size-5" />}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500">
          Ainda não tem acesso? Solicite ao administrador do sistema.
        </p>
      </div>
    </div>
  )
}

function Field({
  label,
  icon,
  trailing,
  children,
}: {
  label: string
  icon: React.ReactNode
  trailing?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-3 block font-semibold text-slate-900">{label}</span>
      <div className="flex h-[74px] items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 text-lg text-slate-900 focus-within:border-blue-900 focus-within:ring-2 focus-within:ring-blue-900/20">
        <span className="text-slate-500">{icon}</span>
        {children}
        {trailing}
      </div>
    </label>
  )
}
