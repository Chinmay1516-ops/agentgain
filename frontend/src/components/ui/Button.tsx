import type { ButtonHTMLAttributes } from 'react'

export function Button({ className = '', variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'quiet' }) {
  return <button type="button" className={`button button--${variant} ${className}`} {...props} />
}
