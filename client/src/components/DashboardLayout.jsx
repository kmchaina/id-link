import { useState } from 'react';
import { IconLogout, IconMenu } from './icons';
import { useLang } from '../contexts/LangContext';
import LangToggle from './LangToggle';

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '·';
}

function SidebarContent({ brandSub, nav, activeKey, onNavigate, user, onSignOut, t }) {
  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
          <span className="text-2xl">🪪</span>
        </div>
        <div className="leading-tight">
          <p className="text-lg font-bold tracking-tight text-white">ID-Link</p>
          <p className="text-xs font-medium uppercase tracking-wider text-brand-300">{brandSub}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1.5 px-3 py-3">
        <p className="px-3 pb-2 pt-2 text-[11px] font-semibold uppercase tracking-widest text-white/40">
          {t('sidebar_menu')}
        </p>
        {nav.map(({ key, label, icon: Icon }) => {
          const active = key === activeKey;
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              className={`group flex w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-[15px] font-medium transition-all ${
                active
                  ? 'bg-white/20 text-white shadow-sm ring-1 ring-white/25'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon
                size={20}
                className={active ? 'text-white' : 'text-white/50 group-hover:text-white'}
              />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* User + sign out */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white ring-2 ring-white/10">
            {initials(user?.full_name)}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold text-white">{user?.full_name || 'Staff'}</p>
            <p className="truncate text-xs capitalize text-white/55">
              {user?.role} · {user?.branch_name}
            </p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <IconLogout size={17} />
          {t('sidebar_sign_out')}
        </button>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  brandSub = 'Admin Console',
  nav,
  activeKey,
  onNavigate,
  user,
  onSignOut,
  title,
  subtitle,
  headerRight,
  children,
}) {
  const [open, setOpen] = useState(false);
  const { t } = useLang();

  const go = (key) => { onNavigate(key); setOpen(false); };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 bg-brand-900 lg:block">
        <SidebarContent
          brandSub={brandSub} nav={nav} activeKey={activeKey}
          onNavigate={go} user={user} onSignOut={onSignOut} t={t}
        />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-brand-900 shadow-2xl">
            <SidebarContent
              brandSub={brandSub} nav={nav} activeKey={activeKey}
              onNavigate={go} user={user} onSignOut={onSignOut} t={t}
            />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-200 bg-white/90 px-5 py-4 backdrop-blur sm:px-8">
          <button
            onClick={() => setOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-lg text-gray-600 hover:bg-gray-100 lg:hidden"
            aria-label={t('sidebar_open_menu')}
          >
            <IconMenu size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="truncate text-sm text-gray-500">{subtitle}</p>}
          </div>
          <LangToggle className="text-gray-400 border-gray-200 hover:text-gray-600 hover:border-gray-300" />
          {headerRight}
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto px-5 py-7 sm:px-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
