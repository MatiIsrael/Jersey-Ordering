import { Link } from 'react-router-dom'
import RegistrationForm from '../components/RegistrationForm.jsx'
import { EVENT } from '../config.js'

function LogoMark() {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#4f46e5] font-sans text-sm font-extrabold text-white shadow-sm">
      AU
    </span>
  )
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* ---------- Top bar ---------- */}
      <header className="sticky top-0 z-30 border-b border-[#e4e7ec] bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <div className="leading-tight">
              <p className="text-sm font-bold text-[#101828] inline-block">AUWC Order Jersey</p>
              <p className="text-[11px] font-medium text-[#667085]">Department of CoTM class Jersey Order</p>
            </div>
          </div>
          <div className="self-center">
            <a href="/#/admin" className="text-sm font-medium text-[#4f46e5] hover:underline">
              Admin
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-14 pt-8 sm:px-6 sm:pt-10">
        {/* ---------- Event header ---------- */}
        <div className="mb-8 text-center sm:mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#4f46e5]">{EVENT.subtitle}</p>
          <h2 className="text-2xl font-bold text-[#101828] mb-1">
            AUWC Order Jersey
          </h2>
          <h2 className="text-base text-[#667085] mb-4">
            Department of CoTM class Jersey Order
          </h2>
        </div>

        {/* ---------- Step-by-step registration wizard ---------- */}
        <RegistrationForm />

        {/* ---------- Trust footer ---------- */}
        <footer className="mt-10 text-center">
          <div className="mb-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-[#667085]">
            <span className="inline-flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#12b76a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></svg>
              Secure &amp; private
            </span>
            <span className="inline-flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#12b76a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              Verified payments only
            </span>
            <span className="inline-flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#12b76a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              Official university event
            </span>
          </div>
          <p className="text-xs text-[#98a2b3]">
            © {new Date().getFullYear()} {EVENT.title} · {EVENT.subtitle}
            {' · '}
            <Link to="/admin" className="transition-colors hover:text-[#667085]">
              Admin
            </Link>
          </p>
        </footer>
      </main>
    </div>
  )
}
