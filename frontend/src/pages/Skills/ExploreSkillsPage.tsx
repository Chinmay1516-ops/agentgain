import { useCallback, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, ChevronRight, House, Info, Search, ShieldPlus, X } from 'lucide-react'
import { BuyerWorkspaceLayout } from '../../components/layout/BuyerWorkspaceLayout'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { useAsyncData } from '../../hooks/useAsyncData'
import { skillService } from '../../services'
import type { SkillService } from '../../services/contracts/skillService'
import type { SkillSummary } from '../../types/skill'
import './skills.css'

const categories = ['All skills', 'Documents', 'Operations', 'Commerce'] as const
export function ExploreSkillsPage({ service = skillService }: { service?: SkillService }) {
  const load = useCallback((signal: AbortSignal) => service.getCatalog(signal), [service])
  const { data, loading, error, retry } = useAsyncData(load)
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const category = categories.find(item => item === params.get('category')) ?? 'All skills'
  const [selected, setSelected] = useState<SkillSummary | null>(null)
  const updateFilter = (key: string, value: string) => {
    setParams(previous => { const next = new URLSearchParams(previous); if (!value || value === 'All skills') next.delete(key); else next.set(key, value); return next }, { replace: true, preventScrollReset: true })
  }
  const filtered = data?.skills.filter(skill => (category === 'All skills' || skill.category === category) && `${skill.name} ${skill.description} ${skill.seller} ${skill.category}`.toLowerCase().includes(query.trim().toLowerCase())) ?? []
  return <BuyerWorkspaceLayout breadcrumb={<><Link to="/buyer" aria-label="Buyer overview"><House size={20} /></Link><ChevronRight size={15} /><span aria-current="page">Explore skills</span></>}>
    <main id="buyer-main" className="skills-main">
      <header className="skills-hero">
        <div className="skills-hero-art" aria-hidden="true" />
        <div className="skills-hero-content"><h1>Find your agent’s next skill.</h1>
          <div className="skill-search"><Search size={24} aria-hidden="true" /><label className="sr-only" htmlFor="skill-search">Search skills</label><input id="skill-search" type="search" placeholder="What does your agent need to do?" value={query} onChange={event => updateFilter('q', event.target.value)} />{query && <button onClick={() => updateFilter('q', '')} aria-label="Clear search"><X size={19} /></button>}</div>
          <div className="skill-categories" role="group" aria-label="Skill categories">{categories.map(item => <button key={item} aria-pressed={category === item} onClick={() => updateFilter('category', item)}>{item}</button>)}</div>
        </div>
      </header>
      <section className="skill-results" aria-label="Available skills" aria-busy={loading}>
        <p className="sr-only" role="status">{loading ? 'Loading skills' : error ? 'Skills could not load' : `${filtered.length} skills found`}</p>
        {loading ? <div className="workspace-loading"><p>Loading illustrative skills…</p></div> : error ? <div className="workspace-error" role="alert"><h2>We couldn’t load the skills.</h2><p>Please try again.</p><Button onClick={retry}>Retry skills</Button></div> : filtered.length ? <div className="skills-grid">{filtered.map(skill => <article className={`skill-card ${skill.preparedExample ? 'skill-card--prepared' : ''}`} key={skill.id}>
          {skill.preparedExample && <span className="skill-prepared"><ShieldPlus size={14} />Ready to test<span className="sr-only"> — illustrative preparation only; no evaluation has run</span></span>}
          <img className="skill-card-art" src={skill.artwork} alt="" width="1024" height="1024" />
          <div className="skill-card-copy"><h2>{skill.name}</h2><p>{skill.description}</p><span className="skill-seller">{skill.seller}</span><div className="skill-card-bottom">
            {skill.illustrativePrice && <div className="skill-price"><strong>{skill.illustrativePrice.currency} {(skill.illustrativePrice.amountMinor / 100).toFixed(2)}</strong><span className="sr-only">Illustrative price</span>{skill.version && <span className="skill-version">{skill.version}</span>}</div>}
            {skill.id === 'invoice-field-extractor' ? <Link className="skill-view" to={`/buyer/skills/${skill.id}`} aria-label={`View ${skill.name}`}>View skill <ArrowRight size={20} /></Link> : <button className="skill-view" onClick={() => setSelected(skill)} aria-label={`View ${skill.name}`}>View skill <ArrowRight size={20} /></button>}
          </div></div>
        </article>)}</div> : <div className="skill-empty"><Search size={32} /><h2>No matching skills</h2><p>Try a different task or category.</p><Button variant="outline" onClick={() => setParams({})}>Clear filters</Button></div>}
      </section>
      <footer className="skills-note"><Info size={20} /><p>Test each skill against your agreed checks. Listings and prices are illustrative.</p></footer>
    </main>
    {selected && <Modal title={selected.name} onClose={() => setSelected(null)}><p className="modal-lead">{selected.description}</p><div className="notice"><Info size={20} /><p>This skill’s detail screen is not available in this preview yet. No test or payment has started.</p></div><Button onClick={() => setSelected(null)}>Back to skills</Button></Modal>}
  </BuyerWorkspaceLayout>
}
