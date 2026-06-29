type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export default function Card({ padding = 'md', className = '', children, ...props }: CardProps) {
  const paddings = {
    none: '',
    sm:   'p-4',
    md:   'p-5',
    lg:   'p-6',
  }

  return (
    <div
      className={`bg-white rounded-2xl ${paddings[padding]} ${className}`}
      style={{ boxShadow: 'var(--shadow-card)' }}
      {...props}
    >
      {children}
    </div>
  )
}
