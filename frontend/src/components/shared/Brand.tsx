export function BrandMark({ className = '' }: { className?: string }) {
  return <svg className={className} aria-hidden="true" viewBox="0 0 36 30"><path fill="#0067ff" d="M1 27 14 3h10L12 27z" /><path fill="#16bcf8" d="m24 3 11 24H22l-5-8z" /><path fill="#0055d7" d="m17 19 7-16 5 11-8 13z" /></svg>
}

export function Brand({ footer = false }: { footer?: boolean }) {
  return <a className={`brand ${footer ? 'brand--footer' : ''}`} href="#top" aria-label="AgentGain home">
    <BrandMark />
    <span>AgentGain</span>
  </a>
}
