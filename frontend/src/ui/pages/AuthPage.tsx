import type { Translation } from '../i18n/translations'

type Props = {
  authEmail: string
  authError: string | null
  authLoading: boolean
  authMode: 'login' | 'register'
  authPassword: string
  t: Translation
  onAuthEmailChange: (value: string) => void
  onAuthModeChange: (mode: 'login' | 'register') => void
  onAuthPasswordChange: (value: string) => void
  onSubmit: () => void
}

export function AuthPage({
  authEmail,
  authError,
  authLoading,
  authMode,
  authPassword,
  t,
  onAuthEmailChange,
  onAuthModeChange,
  onAuthPasswordChange,
  onSubmit
}: Props) {
  return (
    <div className="authWrapper">
      <div className="authLayout">
        <div className="authHero">
          <div className="authBadge">HCMUS FIT</div>
          <h2>{t.logoTitle}</h2>
          <p>{t.homeSubtitle}</p>
          <div className="authHighlights">
            <span>{t.feature1}</span>
            <span>{t.feature2}</span>
            <span>{t.feature3}</span>
          </div>
        </div>
        <div className="authCard">
          <div className="authTabs">
            <button className={authMode === 'login' ? 'active' : ''} onClick={() => onAuthModeChange('login')}>
              {t.loginTitle}
            </button>
            <button className={authMode === 'register' ? 'active' : ''} onClick={() => onAuthModeChange('register')}>
              {t.registerTitle}
            </button>
          </div>
          <h3>{authMode === 'login' ? t.loginTitle : t.registerTitle}</h3>
          <label className="authField">
            <span>{t.emailLabel}</span>
            <input
              type="email"
              value={authEmail}
              onChange={(e) => onAuthEmailChange(e.target.value)}
              placeholder="you@hcmus.edu.vn"
            />
          </label>
          <label className="authField">
            <span>{t.passwordLabel}</span>
            <input
              type="password"
              value={authPassword}
              onChange={(e) => onAuthPasswordChange(e.target.value)}
              placeholder="********"
            />
          </label>
          {authError && <div className="authError">{authError}</div>}
          <button className="authSubmit" onClick={onSubmit} disabled={authLoading}>
            {authLoading ? t.authLoading : authMode === 'login' ? t.login : t.register}
          </button>
          <button
            className="authToggle"
            onClick={() => onAuthModeChange(authMode === 'login' ? 'register' : 'login')}
          >
            {authMode === 'login' ? t.switchToRegister : t.switchToLogin}
          </button>
        </div>
      </div>
    </div>
  )
}
