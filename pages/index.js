import Head from 'next/head'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import dynamic from 'next/dynamic'
import FlightScene from '../components/FlightScene'
import { projects } from '../portfolio'
import styles from '../styles/Home.module.css'

const CadViewer = dynamic(() => import('../components/CadViewer'), {
  ssr: false,
  loading: () => <p role="status">Loading CAD viewer…</p>,
})

const themeKey = 'portfolio-theme'
const themeEvent = 'portfolio-theme-change'
let fallbackTheme = null

function getTheme() {
  try {
    const saved = window.localStorage.getItem(themeKey)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    if (fallbackTheme) return fallbackTheme
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function subscribeTheme(callback) {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', callback)
  window.addEventListener('storage', callback)
  window.addEventListener(themeEvent, callback)
  return () => {
    media.removeEventListener('change', callback)
    window.removeEventListener('storage', callback)
    window.removeEventListener(themeEvent, callback)
  }
}

export default function Home() {
  const [selected, setSelected] = useState(null)
  const [projectTabs, setProjectTabs] = useState({})
  const sheetRef = useRef(null)
  const activeTab = selected ? (projectTabs[selected.id] || 'notes') : 'notes'
  const selectTab = (tab) => setProjectTabs((previous) => ({ ...previous, [selected.id]: tab }))
  const theme = useSyncExternalStore(subscribeTheme, getTheme, () => 'light')
  const trigger = useRef(null)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    fallbackTheme = nextTheme
    try { window.localStorage.setItem(themeKey, nextTheme) } catch { /* Keep the choice for this session. */ }
    window.dispatchEvent(new Event(themeEvent))
  }
  const openProject = (project) => {
    trigger.current = document.activeElement
    setSelected(project)
  }
  useEffect(() => {
    if (!selected) return
    const dialog = sheetRef.current
    const opener = trigger.current
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event) => {
      if (event.key === 'Tab') {
        const focusable = [...dialog.querySelectorAll('button, a[href], [tabindex]')].filter((element) => element.tabIndex >= 0 && !element.disabled && element.getClientRects().length && !element.closest('[hidden]'))
        if (!focusable.length) return
        const first = focusable[0], last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    dialog.addEventListener('keydown', closeOnEscape)
    return () => {
      dialog.removeEventListener('keydown', closeOnEscape)
      dialog.close()
      document.body.style.overflow = previousOverflow
      opener?.focus({ preventScroll: true })
    }
  }, [selected])
  return <>
    <Head><title>Engineering Portfolio | Work in Flight</title><meta name="description" content="An engineering portfolio inspired by the journey of a paper plane." /></Head>
    <div className={styles.page}>
      <a className={styles.skipLink} href="#top">Skip to main content</a>
      <header className={styles.header}><a className={styles.brand} href="#top"><span className={styles.brandMark}>✳</span> WORK IN FLIGHT <span className={styles.brandSub}>/ ENGINEERING PORTFOLIO</span></a><nav aria-label="Main navigation"><a href="#projects">Projects</a><a href="#about">About</a><button type="button" className={styles.themeToggle} onClick={toggleTheme} aria-label="Dark mode" aria-pressed={theme === 'dark'} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}><span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span></button><a className={styles.navButton} href="#contact">Get in touch <span>↗</span></a></nav></header>
      <main id="top" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="hero-title"><div className={styles.heroCopy}><p className={styles.eyebrow}><span /> A PORTFOLIO IN MOTION <span className={styles.issue}>EST. 2026</span></p><h1 id="hero-title">Ideas are<br /><em>made to fly.</em></h1><p className={styles.intro}>A collection of engineering projects, experiments, and the thinking that takes them from a first sketch into the world.</p><div className={styles.heroActions}><a className={styles.primary} href="#projects">Explore the work <span>↘</span></a><a className={styles.textLink} href="#about">The person behind it <span>↗</span></a></div></div><FlightScene projects={projects} onSelect={openProject} /><div className={styles.heroFooter}><span>✳ &nbsp; DESIGNED TO EXPLORE</span><span>SCROLL TO DISCOVER &nbsp; ↓</span><span>01 — 03</span></div></section>
        <section id="projects" className={styles.projects}><div className={styles.sectionHead}><div><p className={styles.eyebrow}>THE FLIGHT LOG &nbsp; / &nbsp; 01</p><h2>Selected <em>work.</em></h2></div><p>Every project starts somewhere.<br />Pick one up and take a closer look.</p></div><p className={styles.sampleNotice}>These are sample project templates. Replace them with your own work in <code>portfolio.js</code>.</p><div className={styles.projectList}>{projects.map((project, index) => <button className={styles.projectRow} key={project.id} onClick={() => openProject(project)}><span className={styles.number}>0{index + 1}</span><span className={styles.projectTitle}>{project.title}<small>{project.summary}</small></span><span className={styles.tag}>{project.category}</span><span className={styles.arrow}>↗</span></button>)}</div></section>
        <section id="about" className={styles.about}><p className={styles.eyebrow}>BEHIND THE WORK &nbsp; / &nbsp; 02</p><div><h2>Curiosity, meet <em>craft.</em></h2><p>This space is ready for your story: what you study, what you like to build, and the engineering questions you want to answer.</p><p className={styles.smallNote}>ADD YOUR INTRODUCTION IN THE PAGE COPY.</p></div></section>
        <section id="contact" className={styles.contact}><div><p className={styles.eyebrow}>NEXT DESTINATION &nbsp; / &nbsp; 03</p><h2>Let’s make<br /><em>something.</em></h2></div><p>Add your email, résumé, and professional links here when you’re ready to share your portfolio.</p></section>
      </main><footer className={styles.footer}><span>✳ &nbsp; WORK IN FLIGHT</span><span>MADE FOR IDEAS THAT GO PLACES</span><a href="#top">BACK TO TOP ↑</a></footer>
    </div>
    {selected && <dialog ref={sheetRef} className={styles.overlay} aria-labelledby="sheet-title" onCancel={(event) => { event.preventDefault(); setSelected(null) }} onClick={(event) => { if (event.target === event.currentTarget) setSelected(null) }}><section className={styles.sheet}>
      <button className={styles.close} onClick={() => setSelected(null)} autoFocus aria-label="Close project">{'\u00D7'}</button>
      <p className={styles.eyebrow}>PROJECT FIELD NOTES &nbsp; / &nbsp; {selected.category}</p>
      <h2 id="sheet-title">{selected.title}</h2>
      <p className={styles.sheetLead}>{selected.summary}</p>
      <div className={styles.tabs} role="tablist" aria-label="Project details" onKeyDown={(event) => {
        if (!selected.cadModel || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
        event.preventDefault()
        const next = event.key === 'Home' ? 'notes' : event.key === 'End' ? 'cad' : activeTab === 'notes' ? 'cad' : 'notes'
        selectTab(next)
        document.getElementById(`project-tab-${next}`).focus()
      }}>
        <button id="project-tab-notes" role="tab" aria-selected={activeTab === 'notes'} aria-controls="project-panel-notes" tabIndex={activeTab === 'notes' ? 0 : -1} onClick={() => selectTab('notes')}>Field Notes</button>
        {selected.cadModel && <button id="project-tab-cad" role="tab" aria-selected={activeTab === 'cad'} aria-controls="project-panel-cad" tabIndex={activeTab === 'cad' ? 0 : -1} onClick={() => selectTab('cad')}>CAD Model</button>}
      </div>
      <div id="project-panel-notes" role="tabpanel" aria-labelledby="project-tab-notes" hidden={activeTab !== 'notes'} tabIndex={0}><p className={styles.sheetLabel}>THE STORY</p><p>{selected.description}</p><p className={styles.sheetLabel}>TOOLS &amp; DISCIPLINES</p><div className={styles.tags}>{selected.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><p className={styles.sheetHint}>SAMPLE CONTENT &mdash; REPLACE WITH YOUR OWN PROJECT DETAILS.</p></div>
      {selected.cadModel && <div id="project-panel-cad" role="tabpanel" aria-labelledby="project-tab-cad" hidden={activeTab !== 'cad'} tabIndex={0}>{activeTab === 'cad' && <><div className={styles.cadHeading}><div><p className={styles.sheetLabel}>SAMPLE CAD MODEL</p><h3>{selected.cadModel.name}</h3></div></div><dl className={styles.cadMetadata}>{[['Material', selected.cadModel.material], ['Mass', selected.cadModel.mass], ['Status', selected.cadModel.status]].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><CadViewer {...selected.cadModel} /></>}</div>}
    </section></dialog>}
  </>
}
