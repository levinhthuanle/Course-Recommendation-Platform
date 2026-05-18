import { useState } from 'react'
import type { SearchSuggestion } from '../types'

type Props = {
  value: string
  onChange: (v: string) => void
  onSearch: () => void
  disabled?: boolean
  placeholder?: string
  buttonText?: string
  // Advanced search options
  limit?: number
  onLimitChange?: (v: number) => void
  semanticRatio?: number
  onSemanticRatioChange?: (v: number) => void
  showAdvanced?: boolean
  suggestions?: SearchSuggestion[]
  suggestionsLoading?: boolean
  onSuggestionSelect?: (value: string) => void
}

export function SearchBar({ 
  value, 
  onChange, 
  onSearch, 
  disabled, 
  placeholder = 'Search courses...',
  buttonText = 'Search',
  limit = 20,
  onLimitChange,
  semanticRatio = 0.5,
  onSemanticRatioChange,
  showAdvanced = false,
  suggestions = [],
  suggestionsLoading = false,
  onSuggestionSelect
}: Props) {
  const [showOptions, setShowOptions] = useState(false)
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const hasSuggestions = suggestionsOpen && (suggestions.length > 0 || suggestionsLoading)

  const selectSuggestion = (value: string) => {
    onSuggestionSelect?.(value)
    setSuggestionsOpen(false)
  }

  return (
    <div className="search-container">
      <div className="search">
        <div className="searchInputWrap">
          <input
            placeholder={placeholder}
            value={value}
            onChange={(e) => {
              onChange(e.target.value)
              setSuggestionsOpen(true)
            }}
            onFocus={() => setSuggestionsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setSuggestionsOpen(false)
                onSearch()
              }
              if (e.key === 'Escape') setSuggestionsOpen(false)
            }}
          />
          {hasSuggestions && (
            <div className="suggestionsMenu">
              {suggestionsLoading ? (
                <div className="suggestionItem muted">Loading suggestions...</div>
              ) : (
                suggestions.map((item) => (
                  <button
                    key={`${item.type}:${item.value}`}
                    className="suggestionItem"
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSuggestion(item.value)}
                  >
                    <span className={`suggestionType ${item.type}`}>{item.type === 'popular' ? 'Top' : item.type === 'course_code' ? 'Code' : 'Title'}</span>
                    <span className="suggestionText">
                      <strong>{item.label}</strong>
                      {item.meta && <small>{item.meta}</small>}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <button onClick={onSearch} disabled={disabled}>{buttonText}</button>
        {showAdvanced && (
          <button 
            className="advanced-toggle"
            onClick={() => setShowOptions(!showOptions)}
            style={{ marginLeft: '8px' }}
          >
            ⚙️ {showOptions ? 'Hide' : 'Options'}
          </button>
        )}
      </div>

      {showAdvanced && showOptions && (
        <div className="search-options" style={{
          marginTop: '12px',
          padding: '16px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          display: 'flex',
          gap: '24px',
          flexWrap: 'wrap'
        }}>
          {/* Results Limit */}
          {onLimitChange && (
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                Results: <strong>{limit}</strong>
              </label>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={limit}
                onChange={(e) => onLimitChange(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', opacity: 0.7 }}>
                <span>5</span>
                <span>50</span>
              </div>
            </div>
          )}

          {/* Semantic Ratio */}
          {onSemanticRatioChange && (
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                Search Mode: <strong>
                  {semanticRatio < 0.3 ? 'Keyword' : semanticRatio > 0.7 ? 'Semantic' : 'Balanced'}
                </strong>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={semanticRatio}
                onChange={(e) => onSemanticRatioChange(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', opacity: 0.7 }}>
                <span>📝 Keyword</span>
                <span>🧠 Semantic</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
