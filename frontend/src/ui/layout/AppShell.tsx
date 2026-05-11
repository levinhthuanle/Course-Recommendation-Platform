import type { ReactNode } from 'react'
import type { Mode, Theme, User } from '../types'
import type { Translation } from '../i18n/translations'
import { FloatingDots } from './FloatingDots'

type Props = {
  children: ReactNode
  currentUser: User | null
  mode: Mode
  theme: Theme
  t: Translation
  onChangeMode: (mode: Mode) => void
  onLogout: () => void
  onToggleTheme: () => void
}

export function AppShell({
  children,
  currentUser,
  mode,
  theme,
  t,
  onChangeMode,
  onLogout,
  onToggleTheme
}: Props) {
  return (
    <div className="app">
      <FloatingDots />

      <nav className="appBar">
        <div className="appBarContent">
          <div className="appBarLeft">
            <div className="logo">
              <div className="logoIcon">CF</div>
              <div className="logoText">
                <div className="logoTitle">{t.logoTitle}</div>
                <div className="logoSubtitle">{t.logoSubtitle}</div>
              </div>
            </div>
          </div>

          <div className="appBarCenter">
            <button className={`modeButton ${mode === 'home' ? 'active' : ''}`} onClick={() => onChangeMode('home')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              {t.home}
            </button>
            <button className={`modeButton ${mode === 'search' ? 'active' : ''}`} onClick={() => onChangeMode('search')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              {t.search}
            </button>
            <button className={`modeButton ${mode === 'chat' ? 'active' : ''}`} onClick={() => onChangeMode('chat')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {t.chatBot}
            </button>
            {currentUser?.role === 'admin' && (
              <button className={`modeButton ${mode === 'admin' ? 'active' : ''}`} onClick={() => onChangeMode('admin')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1v4" />
                  <path d="M12 19v4" />
                  <path d="M4.22 4.22l2.83 2.83" />
                  <path d="M16.95 16.95l2.83 2.83" />
                  <path d="M1 12h4" />
                  <path d="M19 12h4" />
                  <path d="M4.22 19.78l2.83-2.83" />
                  <path d="M16.95 7.05l2.83-2.83" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {t.adminPanel}
              </button>
            )}
          </div>

          <div className="appBarRight">
            <button className="iconButton" onClick={onToggleTheme}>
              {theme === 'light' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </button>
            {currentUser && (
              <div className="userMenu">
                <span className="userEmail">{currentUser.email}</span>
                <button className="logoutButton" onClick={onLogout}>
                  {t.logout}
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {children}
    </div>
  )
}
