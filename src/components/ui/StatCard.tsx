interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: string
  accent?: boolean
}

export function StatCard({ label, value, sub, icon, accent }: StatCardProps) {
  return (
    <div
      className={`
        rounded-2xl p-5 border
        ${accent
          ? 'bg-brand-deep text-white border-brand-deep'
          : 'bg-white border-brand-lavender'}
      `}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={`font-body text-xs uppercase tracking-widest font-medium ${accent ? 'text-brand-lavender/70' : 'text-brand-deep/50'}`}>
            {label}
          </p>
          <p className={`font-heading text-3xl font-bold mt-1 ${accent ? 'text-white' : 'text-brand-deep'}`}>
            {value}
          </p>
          {sub && (
            <p className={`font-body text-xs mt-1 ${accent ? 'text-brand-lavender/60' : 'text-brand-deep/40'}`}>
              {sub}
            </p>
          )}
        </div>
        {icon && (
          <span className={`text-2xl ${accent ? 'opacity-80' : 'opacity-50'}`}>{icon}</span>
        )}
      </div>
    </div>
  )
}
