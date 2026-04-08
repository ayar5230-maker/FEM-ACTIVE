interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-3',
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div
      className={`
        ${sizes[size]}
        rounded-full
        border-brand-lavender
        border-t-brand-violet
        animate-spin
        ${className}
      `}
    />
  )
}

export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-lavender">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 font-body text-brand-deep/60 text-sm">Loading...</p>
      </div>
    </div>
  )
}
