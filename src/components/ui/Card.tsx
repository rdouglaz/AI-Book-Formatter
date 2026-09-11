import { classNames } from '../../utils/helpers'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export const Card = ({ className, variant = 'default', padding = 'md', children, ...props }: CardProps) => {
  const variants = {
    default: 'bg-surface border border-border',
    outlined: 'bg-transparent border-2 border-border',
    elevated: 'bg-surface shadow-lg border-none',
  }
  
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }
  
  return (
    <div
      className={classNames('rounded-xl', variants[variant], paddings[padding], className)}
      {...props}
    >
      {children}
    </div>
  )
}

export const CardHeader = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={classNames('mb-4', className)} {...props}>
    {children}
  </div>
)

export const CardTitle = ({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={classNames('text-lg font-semibold text-text', className)} {...props}>
    {children}
  </h3>
)

export const CardDescription = ({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={classNames('text-sm text-text-muted mt-1', className)} {...props}>
    {children}
  </p>
)

export const CardContent = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={classNames(className)} {...props}>
    {children}
  </div>
)

export const CardFooter = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={classNames('mt-4 pt-4 border-t border-border flex items-center gap-2', className)} {...props}>
    {children}
  </div>
)