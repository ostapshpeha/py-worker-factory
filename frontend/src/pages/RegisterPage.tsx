import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate      = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await register(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-abyss grid-bg scanlines flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-8">
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-agent opacity-50" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-agent agent-glow" />
          </span>
          <span className="font-mono text-xs font-semibold tracking-[0.18em] uppercase text-agent agent-text-glow">
            Worker Factory
          </span>
          <span className="font-mono text-[10px] text-slate-700 tracking-widest">/ register</span>
        </div>

        {/* Card */}
        <div className="border border-border bg-surface/20">

          <div className="px-4 py-2 border-b border-border bg-void/40">
            <span className="label-ops">Create Account</span>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">

            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-void border border-border px-3 py-2 font-mono text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-border-bright transition-colors"
              />
            </Field>

            <Field label="Password">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-void border border-border px-3 py-2 font-mono text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-border-bright transition-colors"
              />
            </Field>

            <Field label="Confirm Password">
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-void border border-border px-3 py-2 font-mono text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-border-bright transition-colors"
              />
            </Field>

            {error && (
              <p className="font-mono text-[10px] text-danger">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="
                w-full py-2.5 font-mono text-[11px] tracking-widest uppercase
                border border-agent/50 text-agent
                hover:bg-agent hover:text-void hover:border-agent
                hover:shadow-[0_0_20px_rgba(0,255,136,0.2)]
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-all duration-150
              "
            >
              {loading ? 'creating account…' : 'Register →'}
            </button>

          </form>
        </div>

        <p className="mt-4 font-mono text-[10px] text-slate-700 text-center">
          already have an account?{' '}
          <Link to="/login" className="text-slate-500 hover:text-slate-300 transition-colors">
            Login
          </Link>
        </p>

      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block font-mono text-[10px] text-slate-600 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  )
}
