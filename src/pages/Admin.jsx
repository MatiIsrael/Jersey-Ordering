import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  isFirebaseConfigured,
  adminLogin,
  adminLogout,
  onAuth,
  subscribeRegistrations,
  updateRegistrationStatus,
  deleteRegistration,
} from '../lib/firebase.js'

const STATUSES = ['Pending', 'Verified', 'Rejected']

const STATUS_STYLES = {
  Pending: 'badge-gray',
  Verified: 'badge-green',
  Rejected: 'badge-red',
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/* ---------------- Login screen ---------------- */

function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }
    setBusy(true)
    try {
      await adminLogin(email, password)
      // The onAuth listener in <Admin> picks up the signed-in user and
      // swaps this screen for the dashboard — nothing else to do here.
    } catch {
      setError('Invalid email or password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card card-lg w-full max-w-sm px-7 py-8">
        <div className="mb-7 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#eef2ff]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          </span>
          <h1 className="h2">Admin Login</h1>
          <p className="mt-1.5 text-sm text-[#667085]">
            Only authorized administrators can access this page.
          </p>
        </div>

        {error && (
          <div role="alert" className="banner banner-error mb-5">
            <svg className="mt-0.5 shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" /></svg>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} noValidate className="grid gap-4">
          <div>
            <label htmlFor="admin-email" className="label">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              className="input"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="label">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" disabled={busy} className="btn btn-primary mt-1 w-full">
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#98a2b3]">
          <Link to="/" className="transition-colors hover:text-[#667085]">
            ← Back to registration page
          </Link>
        </p>
      </div>
    </main>
  )
}

/* ---------------- Screenshot viewer ---------------- */

function ScreenshotModal({ registration, onClose }) {
  if (!registration) return null
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="card card-lg flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#e4e7ec] px-5 py-4">
          <div className="min-w-0">
            <p className="truncate font-semibold text-[#101828]">{registration.full_name}</p>
            <p className="mono text-xs text-[#667085]">{registration.registration_id}</p>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost !px-3 !py-2" aria-label="Close viewer">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-[#f9fafb] p-4">
          <img
            src={registration.payment_screenshot}
            alt={`Payment screenshot of ${registration.full_name}`}
            className="mx-auto max-h-[60vh] w-auto max-w-full rounded-lg border border-[#e4e7ec]"
          />
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-[#e4e7ec] bg-white px-5 py-4">
          <a
            href={registration.payment_screenshot}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary !px-4 !py-2 !text-[0.8125rem]"
          >
            Open in new tab
          </a>
          <a
            href={registration.payment_screenshot}
            download={`payment-${registration.registration_id}.jpg`}
            className="btn btn-primary !px-4 !py-2 !text-[0.8125rem]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Download
          </a>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Dashboard ---------------- */

function StatCard({ label, value, tone }) {
  const tones = {
    total: 'text-[#101828]',
    pending: 'text-[#344054]',
    verified: 'text-[#067647]',
    rejected: 'text-[#b42318]',
  }
  return (
    <div className="card px-4 py-4 sm:px-5">
      <p className={`text-2xl font-extrabold tracking-tight ${tones[tone]}`}>{value}</p>
      <p className="mt-0.5 text-xs font-medium text-[#667085]">{label}</p>
    </div>
  )
}

function Dashboard({ onSignOut }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewer, setViewer] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)

  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2500)
  }, [])

  // Live subscription: the dashboard updates in real time as students submit
  useEffect(() => {
    setLoading(true)
    const unsub = subscribeRegistrations(
      (data) => {
        setRows(data)
        setLoadError('')
        setLoading(false)
      },
      () => {
        setLoadError('Could not load registrations. Check that Firestore and the security rules are set up (see README).')
        setLoading(false)
      },
    )
    return unsub
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (q && !`${r.full_name} ${r.registration_id}`.toLowerCase().includes(q)) return false
      if (methodFilter !== 'all' && r.payment_method !== methodFilter) return false
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      return true
    })
  }, [rows, search, methodFilter, statusFilter])

  const stats = useMemo(
    () => ({
      total: rows.length,
      pending: rows.filter((r) => r.status === 'Pending').length,
      verified: rows.filter((r) => r.status === 'Verified').length,
      rejected: rows.filter((r) => r.status === 'Rejected').length,
    }),
    [rows],
  )

  const updateStatus = async (row, status) => {
    setBusyId(row.id)
    try {
      await updateRegistrationStatus(row.id, status)
      showToast(`Status updated to ${status}.`)
    } catch {
      showToast('Failed to update status.')
    } finally {
      setBusyId(null)
    }
  }

  const confirmDelete = async () => {
    const row = deleteTarget
    if (!row) return
    setDeleteTarget(null)
    setBusyId(row.id)
    try {
      await deleteRegistration(row)
      showToast('Registration deleted.')
    } catch {
      showToast('Failed to delete registration.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Header */}
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="section-label">Half-Life Celebration</p>
          <h1 className="h1 mt-1 text-[1.75rem]">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-[#667085]">Manage all event registrations.</p>
        </div>
        <div className="flex gap-2">
          <span className="badge badge-green self-center" title="This dashboard updates in real time">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#12b76a] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#12b76a]" />
            </span>
            Live
          </span>
          <button type="button" onClick={onSignOut} className="btn btn-danger">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            Sign out
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total registrations" value={stats.total} tone="total" />
        <StatCard label="Pending" value={stats.pending} tone="pending" />
        <StatCard label="Verified" value={stats.verified} tone="verified" />
        <StatCard label="Rejected" value={stats.rejected} tone="rejected" />
      </div>

      {/* Filters */}
      <div className="card mb-5 grid gap-3 p-4 sm:grid-cols-3">
        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#98a2b3]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
          <input
            type="search"
            className="input !pl-9"
            placeholder="Search by name or registration ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search registrations"
          />
        </div>
        <select className="input" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} aria-label="Filter by payment method">
          <option value="all">All payment methods</option>
          <option value="Telebirr">Telebirr</option>
          <option value="CBE">CBE</option>
          <option value="Unspecified">Unspecified</option>
        </select>
        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-xl bg-[#101828] px-4 py-2.5 text-sm font-medium text-white shadow-lg"
        >
          {toast}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="card flex items-center justify-center py-20 text-sm text-[#667085]">
          <svg className="mr-3 animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.22-8.56" /></svg>
          Loading registrations…
        </div>
      ) : loadError ? (
        <div className="banner banner-error">{loadError}</div>
      ) : filtered.length === 0 ? (
        <div className="card py-20 text-center">
          <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#f2f4f7]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#98a2b3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
          </span>
          <p className="text-sm font-semibold text-[#344054]">
            {rows.length === 0 ? 'No registrations yet' : 'No matching registrations'}
          </p>
          <p className="mt-1 text-xs text-[#667085]">
            {rows.length === 0
              ? 'New registrations will appear here as students submit the form.'
              : 'Try adjusting your search or filters.'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table min-w-[980px]">
              <thead>
                <tr>
                  <th>Registration ID</th>
                  <th>Full Name</th>
                  <th>Jersey</th>
                  <th>Size</th>
                  <th>T-shirt Print</th>
                  <th>Payment</th>
                  <th>Screenshot</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td className="mono whitespace-nowrap text-xs font-semibold text-[#4f46e5]">{r.registration_id}</td>
                    <td className="whitespace-nowrap font-semibold text-[#101828]">{r.full_name}</td>
                    <td>
                      {r.no_tshirt_print || r.jersey_number == null ? (
                        <span className="text-[#98a2b3]">—</span>
                      ) : (
                        <span className="font-bold text-[#101828]">{r.jersey_number}</span>
                      )}
                    </td>
                    <td>
                      {r.tshirt_size ? (
                        <span className="badge badge-gray">{r.tshirt_size}</span>
                      ) : (
                        <span className="text-[#98a2b3]">—</span>
                      )}
                    </td>
                    <td>
                      {r.no_tshirt_print ? (
                        <span className="badge badge-violet">No print</span>
                      ) : (
                        <span className="badge badge-gray">Printed</span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-gray">{r.payment_method}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => setViewer(r)}
                        className="flex items-center gap-2 text-xs font-semibold text-[#4f46e5] transition-colors hover:text-[#4338ca]"
                      >
                        <img
                          src={r.payment_screenshot}
                          alt=""
                          loading="lazy"
                          className="h-10 w-10 rounded-lg border border-[#e4e7ec] object-cover"
                        />
                        View
                      </button>
                    </td>
                    <td className="whitespace-nowrap text-xs text-[#667085]">{formatDate(r.created_at)}</td>
                    <td>
                      <select
                        value={r.status}
                        disabled={busyId === r.id}
                        onChange={(e) => updateStatus(r, e.target.value)}
                        aria-label={`Status for ${r.full_name}`}
                        className={`badge cursor-pointer border-0 font-semibold outline-none ring-1 ${STATUS_STYLES[r.status] || 'badge-gray'}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s} className="bg-white font-medium text-[#344054]">
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setViewer(r)}
                          className="btn btn-ghost !px-2.5 !py-1.5 !text-xs"
                          title="View registration"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(r)}
                          disabled={busyId === r.id}
                          className="btn btn-ghost !px-2.5 !py-1.5 !text-xs !text-[#b42318] hover:!bg-[#fef3f2]"
                          title="Delete registration"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[#e4e7ec] bg-[#f9fafb] px-4 py-3 text-xs text-[#667085] sm:px-5">
            Showing {filtered.length} of {rows.length} registrations
          </div>
        </div>
      )}

      <ScreenshotModal registration={viewer} onClose={() => setViewer(null)} />

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setDeleteTarget(null)}>
          <div className="card card-lg w-full max-w-sm px-7 py-8 text-center" onClick={(e) => e.stopPropagation()}>
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#fef3f2]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b42318" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
            </span>
            <h3 className="h2">Delete this registration?</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#667085]">
              <span className="font-semibold text-[#344054]">{deleteTarget.full_name}</span> (
              {deleteTarget.registration_id}) will be permanently removed. This cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setDeleteTarget(null)} className="btn btn-secondary flex-1">
                Cancel
              </button>
              <button type="button" onClick={confirmDelete} className="btn btn-primary flex-1 !bg-[#d92d20] hover:!bg-[#b42318]" style={{ boxShadow: 'none' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

/* ---------------- Protected page ---------------- */

export default function Admin() {
  const [user, setUser] = useState(undefined) // undefined = still checking
  const navigate = useNavigate()

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setUser(null)
      return
    }
    // onAuth(cb) fires immediately with the current state, then on every change
    const unsub = onAuth((u) => {
      setUser(u)
      if (!u) navigate('/admin', { replace: true })
    })
    return unsub
  }, [navigate])

  const signOut = async () => {
    await adminLogout()
    navigate('/admin', { replace: true })
  }

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[#667085]">
        <svg className="mr-3 animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.22-8.56" /></svg>
        Checking access…
      </div>
    )
  }

  if (!user) {
    if (!isFirebaseConfigured) {
      return (
        <main className="flex min-h-screen items-center justify-center px-4">
          <div className="card card-lg max-w-md px-8 py-9 text-center">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#eef2ff]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
            </span>
            <h1 className="h2">Firebase is not configured</h1>
            <p className="mt-2 text-sm leading-relaxed text-[#667085]">
              Add the <code className="mono rounded bg-[#f2f4f7] px-1.5 py-0.5 text-xs">VITE_FIREBASE_*</code>{' '}
              values to your <code className="mono rounded bg-[#f2f4f7] px-1.5 py-0.5 text-xs">.env</code> file,
              then restart the dev server. See README.md, Step 1.
            </p>
            <Link to="/" className="btn btn-secondary mt-6">
              ← Back to registration page
            </Link>
          </div>
        </main>
      )
    }
    return <AdminLogin />
  }

  return <Dashboard onSignOut={signOut} />
}
