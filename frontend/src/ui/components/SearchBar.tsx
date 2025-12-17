type Props = {
  value: string
  onChange: (v: string) => void
  onSearch: () => void
  disabled?: boolean
  placeholder?: string
  buttonText?: string
}

export function SearchBar({ 
  value, 
  onChange, 
  onSearch, 
  disabled, 
  placeholder = 'Search courses...',
  buttonText = 'Search'
}: Props) {
  return (
    <div className="search">
      <input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSearch()}
      />
      <button onClick={onSearch} disabled={disabled}>{buttonText}</button>
    </div>
  )
}
