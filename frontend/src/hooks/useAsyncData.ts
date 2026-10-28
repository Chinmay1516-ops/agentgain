import { useEffect, useState } from 'react'

export function useAsyncData<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(false); setData(null)
    load(controller.signal).then(value => { if (!controller.signal.aborted) setData(value) }).catch(() => { if (!controller.signal.aborted) setError(true) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [load, attempt])
  return { data, loading, error, retry: () => setAttempt(value => value + 1) }
}
