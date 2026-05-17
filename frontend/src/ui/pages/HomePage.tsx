import type { Translation } from '../i18n/translations'

type Props = {
  t: Translation
  onOpenChat: () => void
  onOpenSearch: () => void
}

export function HomePage({ t, onOpenChat, onOpenSearch }: Props) {
  return (
    <>
      <header className="header">
        <img className="heroIcon" src="/logo.png" alt="" />
        <h1>{t.homeTitle}</h1>
        <p>{t.homeSubtitle}</p>
      </header>

      <div className="homeButtons">
        <button className="homeButton primary" onClick={onOpenSearch}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          {t.browseCourse}
        </button>
        <button className="homeButton secondary" onClick={onOpenChat}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {t.tryAIAssistant}
        </button>
      </div>
    </>
  )
}
