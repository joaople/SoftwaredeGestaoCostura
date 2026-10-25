import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowRight, Eye, EyeOff, Lock, Mail, Scissors } from 'lucide-react'
import { supabase } from '#/lib/supabase'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

type Mode = 'login' | 'signup'

function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const isSignup = mode === 'signup'

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setInfo(null)
    setPassword('')
    setConfirm('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)

    if (isSignup) {
      if (password.length < 8) {
        setError('A senha precisa ter pelo menos 8 caracteres.')
        return
      }
      if (password !== confirm) {
        setError('As senhas não conferem.')
        return
      }
    }

    setLoading(true)

    if (isSignup) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      setLoading(false)
      if (error) {
        setError(error.message)
        return
      }
      if (data.session) {
        navigate({ to: '/' })
      } else {
        setInfo('Conta criada! Confira seu e-mail para confirmar o cadastro.')
      }
    } else {
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
          {isSignup ? 'Seu novo começo' : 'Bem-vindo de volta'}
        </p>
        <h1 className="mt-3 text-5xl font-extrabold tracking-tight text-slate-900">
          {isSignup ? 'Crie sua conta.' : 'Entre na sua conta.'}
        </h1>
        <p className="mt-6 text-lg text-slate-600">
          {isSignup
            ? 'Cadastre seu e-mail e escolha uma senha segura.'
            : 'Digite seu e-mail e senha para acessar o sistema.'}
        </p>

        {/* Abas */}
        <div className="mt-10 grid grid-cols-2 border-b border-slate-200">
          <TabButton active={!isSignup} onClick={() => switchMode('login')}>
            Entrar
          </TabButton>
          <TabButton active={isSignup} onClick={() => switchMode('signup')}>
            Cadastrar
          </TabButton>
        </div>

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
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              placeholder={isSignup ? 'Pelo menos 8 caracteres' : 'Sua senha'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent outline-none placeholder:text-slate-400"
            />
          </Field>

          {isSignup && (
            <Field label="Confirmar senha" icon={<Lock className="size-5" />}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="Digite a senha novamente"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-transparent outline-none placeholder:text-slate-400"
              />
            </Field>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {info && (
            <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-900 text-lg font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
          >
            {loading
              ? 'Aguarde...'
              : isSignup
                ? 'Criar conta'
                : 'Entrar'}
            {!loading && <ArrowRight className="size-5" />}
          </button>
        </form>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'h-14 text-lg font-semibold transition border-b-2 -mb-px ' +
        (active
          ? 'border-blue-900 bg-white text-blue-900'
          : 'border-transparent text-slate-500 hover:text-slate-800')
      }
    >
      {children}
    </button>
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
}2
