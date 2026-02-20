import { useState, useEffect, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PageLayout } from '../components/layout/PageLayout'
import { useAuth } from '../context/AuthContext'
import { getWorkers, getWorker, getScreenshots } from '../lib/api'

function maskToken(token: string): string {
  return token.slice(0, 6) + '••••••••••••••••' + token.slice(-4)
}

export function ProfilePage() {
  const { user, logout, changePassword } = useAuth()

  const [activeWorkers,    setActiveWorkers]    = useState<number | null>(null)
  const [totalTasks,       setTotalTasks]       = useState<number | null>(null)
  const [totalScreenshots, setTotalScreenshots] = useState<number | null>(null)

  useEffect(() => {
    async function loadStats() {
      try {
        const summaries = await getWorkers()
        setActiveWorkers(summaries.filter(w => w.status !== 'OFFLINE').length)
        const [workers, screenshotArrays] = await Promise.all([
          Promise.all(summaries.map(s => getWorker(s.id))),
          Promise.all(summaries.map(s => getScreenshots(s.id).catch(() => []))),
        ])
        setTotalTasks(workers.reduce((sum, w) => sum + (w.tasks?.length ?? 0), 0))
        setTotalScreenshots(screenshotArrays.reduce((sum, arr) => sum + arr.length, 0))
      } catch { /* stats remain null */ }
    }
    void loadStats()
  }, [])

  const accessToken = localStorage.getItem('access_token') ?? ''

  return (
    <PageLayout>
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-border bg-surface/30 shrink-0">
        <Link
          to="/"
          className="font-mono text-[10px] text-slate-600 hover:text-slate-300 transition-colors uppercase tracking-widest"
        >
          ← Dashboard
        </Link>
        <span className="text-slate-700 font-mono text-[10px]">/</span>
        <span className="label-ops">Profile</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 max-w-xl space-y-px">

          {/* Identity block */}
          <div className="border border-border bg-surface/30 p-5 flex items-start gap-4">
            <div className="w-12 h-12 border border-border-bright bg-void flex items-center justify-center shrink-0">
              <span className="font-mono text-lg text-slate-600">◆</span>
            </div>
            <div>
              <p className="font-mono text-sm font-semibold text-slate-100">
                {user?.email.split('@')[0] ?? '—'}
              </p>
              <p className="font-mono text-[11px] text-slate-500">{user?.email ?? '—'}</p>
              <p className="font-mono text-[10px] text-slate-700 mt-0.5">id:{user?.id ?? '—'}</p>
            </div>
          </div>

          {/* Account details */}
          <Section title="Account">
            <Row label="Email"  value={user?.email ?? '—'} />
            <Row label="Active" value={user?.is_active ? 'Yes' : 'No'} />
          </Section>

          {/* Session / tokens */}
          {accessToken && (
            <Section title="Session">
              <Row
                label="Access token"
                value={maskToken(accessToken)}
                dim
              />
            </Section>
          )}

          {/* Activity stats */}
          <Section title="Activity">
            <Row label="Active workers"  value={activeWorkers    !== null ? `${activeWorkers} / 3` : '—'} />
            <Row label="Total tasks"     value={totalTasks       !== null ? String(totalTasks)       : '—'} />
            <Row label="Screenshots"     value={totalScreenshots !== null ? String(totalScreenshots) : '—'} />
          </Section>

          {/* Password change */}
          <PasswordChangeSection changePassword={changePassword} />

          {/* Danger zone */}
          <Section title="Danger Zone">
            <div className="flex items-center justify-between py-1">
              <span className="font-mono text-[11px] text-slate-400">Sign out of this session</span>
              <button
                onClick={logout}
                className="font-mono text-[10px] tracking-widest uppercase px-3 py-1.5 border border-danger/40 text-danger hover:bg-danger/8 hover:border-danger transition-colors duration-150"
              >
                Sign Out
              </button>
            </div>
          </Section>

        </div>
      </div>
    </PageLayout>
  )
}

// ── Password change ────────────────────────────────────────────────

function PasswordChangeSection({
  changePassword,
}: {
  changePassword: (current: string, next: string) => Promise<void>
}) {
  const [current,  setCurrent]  = useState('')
  const [next,     setNext]     = useState('')
  const [loading,  setLoading]  = useState(false)
  const [message,  setMessage]  = useState<{ text: string; ok: boolean } | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setMessage(null)
    setLoading(true)
    try {
      await changePassword(current, next)
      setMessage({ text: 'Password changed successfully', ok: true })
      setCurrent('')
      setNext('')
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : 'Failed to change password',
        ok: false,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-border bg-surface/20">
      <div className="px-4 py-2 border-b border-border bg-void/30">
        <span className="label-ops">Security</span>
      </div>
      <form onSubmit={handleSubmit} className="px-4 py-3 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] text-slate-600 uppercase tracking-wider">
              Current password
            </label>
            <input
              type="password"
              value={current}
              onChange={e => setCurrent(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-void border border-border px-3 py-2 font-mono text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-border-bright transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] text-slate-600 uppercase tracking-wider">
              New password
            </label>
            <input
              type="password"
              value={next}
              onChange={e => setNext(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-void border border-border px-3 py-2 font-mono text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-border-bright transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="
              font-mono text-[10px] tracking-widest uppercase px-3 py-1.5
              border border-border-bright text-slate-400
              hover:border-slate-500 hover:text-slate-200
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors duration-150
            "
          >
            {loading ? 'Saving…' : 'Change Password'}
          </button>
          {message && (
            <span className={`font-mono text-[10px] ${message.ok ? 'text-agent' : 'text-danger'}`}>
              {message.text}
            </span>
          )}
        </div>
      </form>
    </div>
  )
}

// ── Section + Row helpers ─────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border bg-surface/20">
      <div className="px-4 py-2 border-b border-border bg-void/30">
        <span className="label-ops">{title}</span>
      </div>
      <div className="px-4 py-1 divide-y divide-border/50">
        {children}
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  dim = false,
}: {
  label: string
  value: string
  dim?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="font-mono text-[10px] text-slate-600 uppercase tracking-wider shrink-0">
        {label}
      </span>
      <span className={`font-mono text-[11px] text-right break-all ${dim ? 'text-slate-700' : 'text-slate-300'}`}>
        {value}
      </span>
    </div>
  )
}
