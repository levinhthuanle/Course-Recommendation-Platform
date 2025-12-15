type Props = {
  value: string
  onChange: (v: string) => void
  onSearch: () => void
  disabled?: boolean
}

export function SearchBar({ value, onChange, onSearch, disabled }: Props) {
  return (
    <div className="search">
      <input
        placeholder="Search courses..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSearch()}
      />
      <button onClick={onSearch} disabled={disabled}>Search</button>
    </div>
  )
}
