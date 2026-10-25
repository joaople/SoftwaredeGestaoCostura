import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'

type ThemeMode = 'light' | 'dark' | 'auto'

const OPCOES: { valor: ThemeMode; rotulo: string; Icone: typeof Sun }[] = [
  { valor: 'light', rotulo: 'Claro', Icone: Sun },
  { valor: 'dark', rotulo: 'Escuro', Icone: Moon },
  { valor: 'auto', rotulo: 'Auto', Icone: Monitor },
]

function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const stored = window.localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark' || stored === 'auto') {
    return stored
  }

  return 'light'
}

function applyThemeMode(mode: ThemeMode) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const resolved = mode === 'auto' ? (prefersDark ? 'dark' : 'light') : mode

  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(resolved)

  if (mode === 'auto') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', mode)
  }

  document.documentElement.style.colorScheme = resolved
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('light')

  useEffect(() => {
    const initialMode = getInitialMode()
    setMode(initialMode)
    applyThemeMode(initialMode)
  }, [])

  useEffect(() => {
    if (mode !== 'auto') {
      return
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyThemeMode('auto')

    media.addEventListener('change', onChange)
    return () => {
      media.removeEventListener('change', onChange)
    }
  }, [mode])

  function escolher(proximo: ThemeMode) {
    setMode(proximo)
    applyThemeMode(proximo)
    window.localStorage.setItem('theme', proximo)
  }

  return (
    <div
      role="group"
      aria-label="Tema do sistema"
      className="flex gap-1 rounded-lg bg-white/5 p-1"
    >
      {OPCOES.map(({ valor, rotulo, Icone }) => {
        const ativo = mode === valor
        return (
          <button
            key={valor}
            type="button"
            onClick={() => escolher(valor)}
            aria-pressed={ativo}
            title={`Tema ${rotulo.toLowerCase()}`}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
              ativo
                ? 'bg-white/15 text-white'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icone className="h-3.5 w-3.5" />
            {rotulo}
          </button>
        )
      })}
    </div>
  )
}