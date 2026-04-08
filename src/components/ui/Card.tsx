import { type ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
}

const paddings = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <div
      className={`
        bg-white rounded-2xl border border-brand-lavender
        shadow-sm shadow-brand-violet/5
        ${paddings[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  )
}
