type ButtonVariant = 'fill' | 'weak' | 'outline'
type ButtonSize = 'xlarge' | 'large' | 'medium' | 'small'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

export default function Button({
  variant = 'fill',
  size = 'xlarge',
  fullWidth = true,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base = [
    'inline-flex items-center justify-center font-semibold',
    'transition-all duration-100 active:scale-[0.98]',
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
    fullWidth ? 'w-full' : '',
  ].join(' ')

  const sizes: Record<ButtonSize, string> = {
    xlarge: 'h-[56px] text-[17px] px-6 rounded-[14px]',
    large:  'h-[52px] text-base px-5 rounded-[14px]',
    medium: 'h-[44px] text-[15px] px-4 rounded-[12px]',
    small:  'h-[36px] text-sm px-3 rounded-[10px]',
  }

  const variants: Record<ButtonVariant, string> = {
    fill:    'bg-rose-500 text-white hover:bg-rose-600 active:bg-rose-700',
    weak:    'bg-rose-50 text-rose-600 hover:bg-rose-100 active:bg-rose-200',
    outline: 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100',
  }

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
