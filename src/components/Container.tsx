import type { ReactNode, Ref } from 'react'
import styles from './Container.module.css'

export function Container({ children, className, ref }: { children: ReactNode; className?: string; ref?: Ref<HTMLDivElement> }) {
  return (
    <div ref={ref} className={[styles.container, className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}
