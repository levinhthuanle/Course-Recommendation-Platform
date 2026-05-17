import ReactMarkdown from 'react-markdown'
import type { Translation } from '../i18n/translations'
import type { ChatMessage, ChatThreadSummary } from '../types'

type Props = {
  chatLoading: boolean
  chatThreadsLoading: boolean
  messages: ChatMessage[]
  threads: ChatThreadSummary[]
  activeThreadId: string | null
  t: Translation
  onSubmit: (message: string) => void
  onNewChat: () => void
  onSelectThread: (threadId: string) => void
  onDeleteThread: (threadId: string) => void
}

export function ChatPage({
  chatLoading,
  chatThreadsLoading,
  messages,
  threads,
  activeThreadId,
  t,
  onSubmit,
  onNewChat,
  onSelectThread,
  onDeleteThread,
}: Props) {
  const hasMessages = messages.length > 0

  const submitInput = (input: HTMLInputElement) => {
    onSubmit(input.value)
    input.value = ''
  }

  return (
    <div className="chatWorkspace">
      <aside className="chatSidebar">
        <div className="chatSidebarHeader">
          <div>
            <p className="chatSidebarLabel">{t.chatHistory}</p>
            <h3>{t.chatTitle}</h3>
          </div>
          <button className="chatNewButton" onClick={onNewChat} type="button">
            {t.newChat}
          </button>
        </div>

        <div className="chatThreadList">
          {chatThreadsLoading ? (
            <div className="chatThreadEmpty">{t.loading}</div>
          ) : threads.length === 0 ? (
            <div className="chatThreadEmpty">{t.noChatHistory}</div>
          ) : (
            threads.map((thread) => (
              <div
                key={thread.id}
                className={`chatThreadItem ${activeThreadId === thread.id ? 'active' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => onSelectThread(thread.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSelectThread(thread.id)
                }}
              >
                <div className="chatThreadText">
                  <strong>{thread.title}</strong>
                  <span>{thread.message_count} messages</span>
                </div>
                <button
                  className="chatThreadDelete"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteThread(thread.id)
                  }}
                >
                  {t.deleteChat}
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      <section className="chatContainer">
        <div className={`chatMessages ${hasMessages ? 'hasMessages' : ''}`}>
          {!hasMessages ? (
            <div className="chatEmpty">
              <div className="chatWelcomeMessage">
                <div className="welcomeIcon">*</div>
                <h2 className="welcomeTitle">{t.chatWelcome}</h2>
                <p className="welcomeSubtitle">{t.chatWelcomeSubtitle}</p>
              </div>
              <div className="chatSuggestions">
                <div className="suggestionRow">
                  <button className="suggestionChip" onClick={() => onSubmit(t.suggestion1)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                    {t.suggestion1}
                  </button>
                  <button className="suggestionChip" onClick={() => onSubmit(t.suggestion2)}>
                    {t.suggestion2}
                  </button>
                  <button className="suggestionChip" onClick={() => onSubmit(t.suggestion3)}>
                    {t.suggestion3}
                  </button>
                  <button className="suggestionChip" onClick={() => onSubmit(t.suggestion4)}>
                    {t.suggestion4}
                  </button>
                </div>
                <div className="suggestionRow">
                  <button className="suggestionChip" onClick={() => onSubmit(t.suggestion5)}>
                    {t.suggestion5}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`chatMessage ${msg.role}`}>
                <div className="chatMessageContent">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            ))
          )}
          {chatLoading && (
            <div className="chatMessage assistant">
              <div className="chatMessageContent">
                <span className="typingIndicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              </div>
            </div>
          )}
        </div>
        <div className={`chatInput ${hasMessages ? 'hasMessages' : ''}`}>
          <input
            type="text"
            placeholder={t.chatPlaceholder}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                submitInput(e.target as HTMLInputElement)
              }
            }}
          />
          <button
            onClick={(e) => {
              const input = e.currentTarget.previousElementSibling as HTMLInputElement
              submitInput(input)
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </section>
    </div>
  )
}
