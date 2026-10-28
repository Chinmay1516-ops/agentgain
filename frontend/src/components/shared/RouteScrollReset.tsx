import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** New pages start at the top; query-only filters/tabs keep their scroll position. */
export function RouteScrollReset() {
  const { pathname } = useLocation()
  useLayoutEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }) }, [pathname])
  return null
}
