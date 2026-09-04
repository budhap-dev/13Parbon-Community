import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorPanel } from './ErrorPanel'

type Props = { children: ReactNode }
type State = { failed: boolean }

/**
 * The last line before a blank page. A component that throws while rendering takes the whole
 * tree with it, and React's default is to unmount everything and show nothing at all — on a
 * phone that is indistinguishable from the site being down.
 *
 * This catches it and keeps the page a page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // No error service to send to yet, so the console is where this has to go.
    console.error('Something threw while rendering:', error, info.componentStack)
  }

  render() {
    return this.state.failed ? <ErrorPanel /> : this.props.children
  }
}
