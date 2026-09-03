import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router'
import styles from './Button.module.css'

export type ButtonVariant = 'gold' | 'cream' | 'line' | 'ink' | 'inkLine'
export type ButtonSize = 'md' | 'sm'

type Common = {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  children: ReactNode
}

type AsLink = Common & { to: string; href?: undefined; onClick?: () => void }
/** For addresses the router should not handle, such as mailto and external sites. */
type AsExternal = Common & { href: string; to?: undefined; onClick?: () => void }
type AsButton = Common & { to?: undefined; href?: undefined } & Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'className' | 'children'
  >

export type ButtonProps = AsLink | AsExternal | AsButton

function classes(variant: ButtonVariant, size: ButtonSize, className?: string) {
  return [styles.button, styles[variant], styles[size], className].filter(Boolean).join(' ')
}

/** Pill button. Renders a router link when `to` is given, otherwise a real button. */
export function Button(props: ButtonProps) {
  const { variant = 'gold', size = 'md', className, children } = props
  const cls = classes(variant, size, className)
  if (typeof props.to === 'string') {
    return (
      <Link to={props.to} className={cls} onClick={props.onClick}>
        {children}
      </Link>
    )
  }
  if (typeof props.href === 'string') {
    const external = /^https?:\/\//.test(props.href)
    return (
      <a
        href={props.href}
        className={cls}
        onClick={props.onClick}
        {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
      >
        {children}
      </a>
    )
  }
  const { to: _to, href: _h, variant: _v, size: _s, className: _c, children: _ch, type = 'button', ...rest } = props
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  )
}
