type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'lg' | 'md'
}

export default function Button({
  variant = 'primary',
  size = 'lg',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base =
    'w-full rounded-xl font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed'
  const sizes = {
    lg: 'h-[52px] text-base px-5',
    md: 'h-[44px] text-sm px-4',
  }
  const variants = {
    primary: 'bg-rose-500 text-white hover:bg-rose-600 active:bg-rose-700',
    secondary: 'bg-rose-50 text-rose-500 hover:bg-rose-100',
    outline: 'border-[1.5px] border-rose-500 text-rose-500 hover:bg-rose-50 bg-white',
  }
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
