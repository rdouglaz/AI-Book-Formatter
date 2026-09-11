import { classNames } from '../../utils/helpers'

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export const Progress = ({ className, value, max = 100, showLabel = false, size = 'md', ...props }: ProgressProps) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  
  const sizes = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  }
  
  return (
    <div className={classNames('w-full', className)} {...props}>
      <div className={classNames('relative overflow-hidden rounded-full bg-border', sizes[size])}>
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-xs text-text-muted mt-1">
          <span>{Math.round(percentage)}%</span>
          <span>{value} / {max}</span>
        </div>
      )}
    </div>
  )
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md'
}

export const Badge = ({ className, variant = 'default', size = 'md', children, ...props }: BadgeProps) => {
  const variants = {
    default: 'bg-border text-text',
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  }
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  }
  
  return (
    <span
      className={classNames('inline-flex items-center font-medium rounded-full', variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </span>
  )
}

interface SeparatorProps extends React.HTMLAttributes<HTMLHRElement> {
  orientation?: 'horizontal' | 'vertical'
  decorative?: boolean
}

export const Separator = ({ className, orientation = 'horizontal', decorative = true, ...props }: SeparatorProps) => (
  <hr
    className={classNames(
      'border-border',
      orientation === 'horizontal' ? 'w-full' : 'h-full',
      className
    )}
    aria-orientation={orientation}
    role={decorative ? 'none' : 'separator'}
    {...props}
  />
)