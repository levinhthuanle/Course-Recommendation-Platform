const dots = [
  { width: '8px', height: '8px', background: '#FFD042', top: '15%', left: '10%', animationDelay: '0s', animationDuration: '25s' },
  { width: '6px', height: '6px', background: '#3B82F6', top: '60%', left: '85%', animationDelay: '2s', animationDuration: '20s' },
  { width: '10px', height: '10px', background: '#8B5CF6', top: '80%', left: '15%', animationDelay: '4s', animationDuration: '30s' },
  { width: '7px', height: '7px', background: '#10B981', top: '30%', left: '90%', animationDelay: '1s', animationDuration: '22s' },
  { width: '9px', height: '9px', background: '#F59E0B', top: '50%', left: '5%', animationDelay: '3s', animationDuration: '28s' },
  { width: '5px', height: '5px', background: '#EC4899', top: '20%', left: '75%', animationDelay: '5s', animationDuration: '18s' }
]

export function FloatingDots() {
  return (
    <>
      {dots.map((style, index) => (
        <div key={index} className="floatingDot" style={style} />
      ))}
    </>
  )
}
