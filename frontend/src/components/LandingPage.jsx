import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Paintbrush,
  TableProperties,
  Presentation,
  Video,
  Folder,
  Calendar,
  Sparkles,
  Shield,
  RefreshCw,
  Layers,
  ArrowRight,
  Play,
  X,
  Users,
  Zap,
  Building2,
  Clock,
  ChevronDown
} from 'lucide-react'

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState('docs')
  const [showDemoModal, setShowDemoModal] = useState(false)
  const [demoProgress, setDemoProgress] = useState(0)
  const [demoPlaying, setDemoPlaying] = useState(false)

  // Accordion states for FAQ
  const [openFaq, setOpenFaq] = useState(null)

  // Auto cycle tabs in the showcase section if the user isn't interacting
  useEffect(() => {
    const tabs = ['docs', 'sheets', 'slides', 'whiteboard', 'meetings']
    const interval = setInterval(() => {
      setActiveTab((prev) => {
        const nextIndex = (tabs.indexOf(prev) + 1) % tabs.length
        return tabs[nextIndex]
      })
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Simulating demo video playback
  useEffect(() => {
    let timer
    if (showDemoModal && demoPlaying) {
      timer = setInterval(() => {
        setDemoProgress((p) => {
          if (p >= 100) {
            setDemoPlaying(false)
            return 0
          }
          return p + 1
        })
      }, 100)
    }
    return () => clearInterval(timer)
  }, [showDemoModal, demoPlaying])

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  const features = [
    { id: 'docs', title: 'Documents', desc: 'Create and edit documents together.', icon: FileText },
    { id: 'whiteboard', title: 'Whiteboard', desc: 'Brainstorm with your team.', icon: Paintbrush },
    {
      id: 'sheets',
      title: 'Spreadsheet',
      desc: 'Analyze data collaboratively.',
      icon: TableProperties
    },
    {
      id: 'slides',
      title: 'Presentation',
      desc: 'Build presentations together.',
      icon: Presentation
    },
    { id: 'meetings', title: 'Meetings', desc: 'Video calls and screen sharing.', icon: Video },
    {
      id: 'files',
      title: 'Shared Files',
      desc: 'Store and share project resources.',
      icon: Folder
    },
    { id: 'calendar', title: 'Calendar', desc: 'Plan meetings and deadlines.', icon: Calendar },
    { id: 'workspaces', title: 'Workspaces', desc: 'Organize teams and projects.', icon: Layers }
  ]

  const whys = [
    {
      title: 'Realtime Collaboration',
      desc: 'All changes are broadcast instantly with sub-100ms synchronization across all clients.',
      icon: Zap
    },
    {
      title: 'Autosave Everywhere',
      desc: 'Every keystroke and cursor stroke is saved to the workspace history automatically.',
      icon: RefreshCw
    },
    {
      title: 'Secure Access Control',
      desc: 'Enterprise-grade user identity, role provisioning, and workspace privacy permissions.',
      icon: Shield
    },
    {
      title: 'Screen & Video Sync',
      desc: 'Present your workspace or share your screen directly into the active room in one click.',
      icon: Layers
    },
    {
      title: 'Unified Data Sync',
      desc: 'Manage files, folders, code templates, and notes together inside single folders.',
      icon: Folder
    },
    {
      title: 'Granular Version Control',
      desc: 'Roll back files, cells, and slides to any historical savepoint instantly.',
      icon: Clock
    }
  ]

  const mockScreenshots = [
    {
      title: 'Real-time Editors',
      type: 'Documents & Spreadsheets',
      layout: (
        <div className="bg-card-sunken border border-border rounded-xl p-4 h-full flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
            <span className="text-[10px] font-bold text-muted font-mono">WORKSPACE / DOCS</span>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-3/4 bg-border rounded" />
            <div className="h-3 w-5/6 bg-border rounded" />
            <div className="h-3 w-1/2 bg-border/50 rounded" />
          </div>
          <div className="mt-4 flex items-center justify-between bg-card border border-border p-2 rounded-lg">
            <span className="text-[9px] font-semibold text-muted">Live revisions: v1.4</span>
            <span className="text-[9px] text-indigo-650 font-bold">Autosaved</span>
          </div>
        </div>
      )
    },
    {
      title: 'Interactive Board',
      type: 'Brainstorm Canvas',
      layout: (
        <div className="bg-card-sunken border border-border rounded-xl p-4 h-full flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
            <span className="text-[10px] font-bold text-muted font-mono">BOARD CANVAS</span>
            <span className="text-[8px] font-bold px-2 py-0.5 bg-neutral-700 dark:bg-card-sunken dark:bg-card-elevated text-on-primary rounded-md">
              MULTIPLAYER
            </span>
          </div>
          <div className="flex flex-col items-center justify-center my-auto py-2">
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-border flex items-center justify-center mb-2">
              <Paintbrush className="w-5 h-5 text-muted" />
            </div>
            <span className="text-[10px] text-muted text-center font-medium">David added stroke</span>
          </div>
          {/* Mock cursor bubble */}
          <div className="absolute right-4 top-10 bg-amber-500 text-on-primary text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm">
            David
          </div>
        </div>
      )
    },
    {
      title: 'Workspace Room',
      type: 'Meetings & Sync',
      layout: (
        <div className="bg-card-sunken border border-border rounded-xl p-4 h-full flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
            <span className="text-[10px] font-bold text-muted font-mono">CONFERENCE ROOM</span>
            <span className="text-[9px] font-bold text-red-500">REC</span>
          </div>
          <div className="grid grid-cols-2 gap-2 my-auto">
            <div className="bg-border/50 rounded-lg p-2 flex flex-col items-center justify-center aspect-video border border-border">
              <span className="text-[9px] font-bold">Sarah (Host)</span>
            </div>
            <div className="bg-border/50 rounded-lg p-2 flex flex-col items-center justify-center aspect-video border border-border">
              <span className="text-[9px] font-bold">You</span>
            </div>
          </div>
          <div className="mt-3 flex gap-2 justify-center">
            <div className="w-5 h-5 rounded-full bg-neutral-700 dark:bg-card-sunken dark:bg-card-elevated flex items-center justify-center" />
            <div className="w-5 h-5 rounded-full bg-neutral-700 dark:bg-card-sunken dark:bg-card-elevated flex items-center justify-center" />
          </div>
        </div>
      )
    }
  ]

  const faqs = [
    {
      q: 'What is Teamora and how is it organized?',
      a: 'Teamora is a unified digital workspace designed for high-performance multiplayer collaboration. Inside a single space, teams can concurrently build text documents, draw on whiteboards, compile spreadsheet data, compile slide templates, and initiate audio/video calls without context switching.'
    },
    {
      q: 'Does Teamora support concurrent document edits?',
      a: 'Yes! Every single file in Teamora is completely synchronized in real time using socket streams. You will see cursors, highlights, cells, slides, and vectors update in real-time as other team members make modifications.'
    },
    {
      q: 'Is there built-in version history for assets?',
      a: 'Absolutely. Teamora records version snapshots of your active sheets, documents, and slides. You can review exact timestamps of edits, identify contributors, and roll back any file to an earlier state in one click.'
    },
    {
      q: 'How secure is my team workspace information?',
      a: 'Teamora uses industry-standard authentication systems. All workspace databases, file resources, and socket transmissions are securely hosted, and workspaces can only be joined via explicitly authorized invite structures or secure Room IDs.'
    }
  ]

  return (
    <div className="bg-card text-text font-sans selection:bg-indigo-100 selection:text-indigo-800 transition-colors duration-300 w-full relative">
      <div className="fixed top-0 inset-x-0 z-50 flex justify-center w-full pt-4 px-4 pointer-events-none">
        <header className="pointer-events-auto flex items-center justify-between px-5 h-14 bg-card/70 backdrop-blur-2xl border border-border/60 rounded-full shadow-lg shadow-black/5 w-full max-w-5xl transition-all">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-text group-hover:text-primary transition-colors">
              Teamora
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-muted">
            <a href="#features" className="hover:text-text transition-colors">
              Features
            </a>
            <a href="#collaboration" className="hover:text-text transition-colors">
              Showcase
            </a>
            <a href="#why" className="hover:text-text transition-colors">
              Why Teamora
            </a>
            <a href="#faq" className="hover:text-text transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/signin"
              className="text-xs font-bold uppercase tracking-wider px-4 py-2 hover:bg-card-sunken rounded-full transition-colors cursor-pointer text-muted hover:text-text hidden sm:block"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="text-xs font-bold uppercase tracking-wider text-white bg-primary hover:bg-primary-hover px-5 py-2 rounded-full transition-all shadow-sm shadow-primary/20 cursor-pointer"
            >
              Get Started
            </Link>
          </div>
        </header>
      </div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 md:px-12 flex flex-col items-center text-center mx-auto w-full min-h-[90vh] justify-center overflow-hidden">
        {/* Dynamic Background Glow */}
        <div aria-hidden className="pointer-events-none absolute inset-0 flex justify-center opacity-70">
          <div className="absolute -top-32 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--tw-primary)_25%,transparent),transparent_65%)] blur-3xl rounded-full" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm text-[10px] font-bold text-primary uppercase tracking-widest shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Real-time Workspace Suites</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold text-text tracking-tight leading-[1.1] mb-6"
          >
            One Workspace.
            <br />
            <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent drop-shadow-sm">
              Infinite Collaboration.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base md:text-lg text-muted max-w-2xl leading-relaxed mb-10"
          >
            Collaborate on documents, whiteboards, spreadsheets, presentations, meetings and shared files in real time.
            Without ever switching tabs.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <Link
              to="/signup"
              className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-white bg-primary hover:bg-primary-hover rounded-full transition-all shadow-[0_4px_20px_color-mix(in_srgb,var(--tw-primary)_40%,transparent)] hover:shadow-[0_6px_25px_color-mix(in_srgb,var(--tw-primary)_60%,transparent)] hover:-translate-y-0.5 cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/signin"
              className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-text bg-card/60 backdrop-blur-md hover:bg-card border border-border rounded-full transition-all shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              Join Workspace
            </Link>

            <button
              onClick={() => {
                setShowDemoModal(true)
                setDemoPlaying(true)
                setDemoProgress(0)
              }}
              className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-text bg-card-sunken/80 backdrop-blur-md hover:bg-card-elevated rounded-full transition-all shadow-sm cursor-pointer flex items-center gap-2 border border-border"
            >
              <Play className="w-4 h-4 fill-current text-primary" />
              <span>Watch Demo</span>
            </button>
          </motion.div>
        </div>
      </section>

      {/* Feature Section */}
      <section
        id="features"
        className="py-24 px-6 md:px-12 max-w-7xl mx-auto border-t border-border w-full scroll-mt-16"
      >
        <div className="text-center max-w-xl mx-auto mb-16">
          <h2 className="text-2.5xl md:text-3.5xl font-bold tracking-tight text-text">
            Built for modern product teams
          </h2>
          <p className="text-muted mt-2 text-sm">
            Everything you need in a single platform, styled with minimal elegance.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
          {features.map((feat) => {
            const Icon = feat.icon
            return (
              <div
                key={feat.id}
                className="p-6 bg-card/40 backdrop-blur-xl border border-border/60 rounded-2xl shadow-sm hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 hover:bg-card/80 transition-all duration-300 group flex flex-col items-start"
              >
                <div className="p-3 bg-primary/10 rounded-xl mb-4 transition-colors group-hover:bg-primary/20 border border-primary/10">
                  <Icon className="w-5 h-5 text-primary transition-colors" />
                </div>
                <h3 className="font-bold text-sm text-text mb-1.5">{feat.title}</h3>
                <p className="text-xs text-muted leading-relaxed">{feat.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Collaboration Section */}
      <section
        id="collaboration"
        className="py-24 bg-card-sunken border-y border-border px-6 md:px-12 w-full scroll-mt-16"
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-4 flex flex-col justify-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100/50 text-[10px] font-bold text-indigo-650 uppercase tracking-wider mb-4 w-fit">
              <Users className="w-3.5 h-3.5" />
              <span>Multiplayer Sync</span>
            </div>
            <h2 className="text-2.5xl md:text-3.5xl font-bold tracking-tight text-text mb-4 leading-tight">
              All editing. All at once.
            </h2>
            <p className="text-muted text-sm leading-relaxed mb-6">
              Watch teammates collaborate on different assets within the exact same workspace. No context switching,
              zero latency, total alignment.
            </p>

            <div className="flex flex-col gap-3.5">
              {[
                { name: 'Alice', task: 'Requirements.docx', color: 'bg-emerald-500' },
                { name: 'Bob', task: 'Budget.xlsx', color: 'bg-blue-500' },
                { name: 'Charlie', task: 'Pitch Deck.pptx', color: 'bg-purple-500' },
                { name: 'David', task: 'Whiteboard Canvas', color: 'bg-amber-500' }
              ].map((member, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-card border border-border p-2.5 rounded-xl shadow-xs"
                >
                  <div
                    className={`w-8 h-8 rounded-full ${member.color} flex items-center justify-center text-on-primary font-bold text-xs shadow-xs`}
                  >
                    {member.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-text">{member.name}</p>
                    <p className="text-[10px] text-muted">
                      editing <span className="font-semibold text-muted">{member.task}</span>
                    </p>
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-650 animate-ping mr-2" />
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8">
            {/* Visual Canvas Mockup with Interactive Tabs */}
            <div className="bg-card border border-border/60 rounded-2xl shadow-2xl shadow-primary/5 overflow-hidden ring-1 ring-black/5">
              {/* Fake Window Header */}
              <div className="h-12 bg-card-sunken flex items-center justify-between px-4 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 mr-4">
                    <div className="w-3 h-3 rounded-full bg-red-400 border border-red-500/20" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-500/20" />
                    <div className="w-3 h-3 rounded-full bg-green-400 border border-green-500/20" />
                  </div>
                  <span className="text-[10px] font-semibold text-muted bg-card px-3 py-1 rounded-md border border-border/50 shadow-sm">
                    teamora.com/workspace/marketing-q3
                  </span>
                </div>
                <div className="flex items-center -space-x-1.5">
                  {['Alice', 'Bob', 'Charlie', 'David'].map((n, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full bg-primary/10 border border-card flex items-center justify-center text-[9px] font-extrabold text-primary shadow-sm"
                    >
                      {n.charAt(0)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tab Selector */}
              <div className="flex border-b border-border bg-card-sunken px-2 pt-1 gap-1">
                {[
                  { id: 'docs', label: 'Documents', icon: FileText },
                  { id: 'sheets', label: 'Spreadsheets', icon: TableProperties },
                  { id: 'slides', label: 'Presentations', icon: Presentation },
                  { id: 'whiteboard', label: 'Whiteboard', icon: Paintbrush },
                  { id: 'meetings', label: 'Meetings', icon: Video }
                ].map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold rounded-t-lg transition-colors border-x border-t ${
                        isActive
                          ? 'bg-card text-primary border-border border-b-transparent shadow-[0_-2px_10px_rgba(var(--tw-primary),0.05)]'
                          : 'bg-transparent text-muted hover:text-text border-transparent'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  )
                })}
              </div>

              {/* Showcase Workspace viewport */}
              <div className="p-8 h-80 relative overflow-hidden bg-card select-none">
                <AnimatePresence mode="wait">
                  {activeTab === 'docs' && (
                    <motion.div
                      key="docs"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="h-full flex flex-col justify-between"
                    >
                      <div className="bg-card border border-border/50 rounded-xl shadow-sm h-full flex flex-col p-4 relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-4">
                          <FileText className="w-4 h-4 text-primary" />
                          <span className="text-[10px] font-bold tracking-wider uppercase text-muted">
                            Rich Text Editor
                          </span>
                        </div>
                        <h4 className="font-extrabold text-base text-text mb-2">Product Strategy Document</h4>
                        <div className="text-xs text-muted space-y-3 leading-relaxed">
                          <div className="flex gap-2 items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <p>Real-time collaborative editing with rich text support.</p>
                          </div>
                          <div className="flex gap-2 items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <p>
                              Write seamlessly alongside your teammates.
                              <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ repeat: Infinity, duration: 0.8, ease: 'steps(2)' }}
                                className="inline-block w-1 h-3.5 bg-blue-500 ml-1 align-middle"
                              />
                            </p>
                          </div>
                          <div className="h-2 w-3/4 bg-border/50 rounded-full mt-2" />
                          <div className="h-2 w-1/2 bg-border/50 rounded-full" />
                        </div>
                        <div className="absolute top-4 right-4 bg-blue-500 text-white text-[9px] font-bold px-2 py-1 rounded shadow-md flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>Bob is writing</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'sheets' && (
                    <motion.div
                      key="sheets"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="h-full flex flex-col"
                    >
                      <div className="bg-card border border-border/50 rounded-xl shadow-sm h-full flex flex-col p-4 relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-4">
                          <TableProperties className="w-4 h-4 text-emerald-500" />
                          <span className="text-[10px] font-bold tracking-wider uppercase text-muted">
                            Spreadsheet Canvas
                          </span>
                        </div>
                        <div className="border border-border/60 rounded-lg overflow-hidden text-[10px]">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-card-sunken border-b border-border/60 text-muted font-semibold">
                                <th className="p-2 border-r border-border/60 w-8 text-center"></th>
                                <th className="p-2 border-r border-border/60">A</th>
                                <th className="p-2 border-r border-border/60">B</th>
                                <th className="p-2">C</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-border/60">
                                <td className="p-2 bg-card-sunken text-muted border-r border-border/60 text-center font-mono">
                                  1
                                </td>
                                <td className="p-2 border-r border-border/60">Revenue Q3</td>
                                <td className="p-2 border-r border-border/60 font-mono">$45,000</td>
                                <td className="p-2 font-mono">12%</td>
                              </tr>
                              <tr>
                                <td className="p-2 bg-card-sunken text-muted border-r border-border/60 text-center font-mono">
                                  2
                                </td>
                                <td className="p-2 border-r border-border/60">Marketing</td>
                                <td className="p-2 border-r border-border/60 bg-emerald-500/10 relative border border-emerald-500 font-mono">
                                  <span>$12,500</span>
                                  <div className="absolute -top-3.5 -right-2 bg-emerald-500 text-white text-[8px] px-1 rounded font-bold shadow-sm">
                                    Alice
                                  </div>
                                </td>
                                <td className="p-2 font-mono text-emerald-500">8%</td>
                              </tr>
                              <tr className="border-t border-border/60">
                                <td className="p-2 bg-card-sunken text-muted border-r border-border/60 text-center font-mono">
                                  3
                                </td>
                                <td className="p-2 border-r border-border/60">Total</td>
                                <td className="p-2 border-r border-border/60 font-mono font-bold">$32,500</td>
                                <td className="p-2"></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'slides' && (
                    <motion.div
                      key="slides"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="h-full flex items-center justify-center"
                    >
                      <div className="w-4/5 aspect-video bg-card border border-border/50 rounded-xl p-6 flex flex-col justify-center items-center text-center relative shadow-md overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 to-primary" />
                        <div className="absolute top-3 right-3 bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-400 text-[8px] px-1.5 py-0.5 rounded font-bold shadow-sm">
                          Charlie viewing
                        </div>
                        <Presentation className="w-8 h-8 text-primary mb-3" />
                        <h5 className="font-extrabold text-sm tracking-tight text-text">Q3 Strategy Deck</h5>
                        <p className="text-[10px] text-muted mt-1 max-w-[80%]">
                          Native presentations with beautiful transitions and full real-time multiplayer support.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'whiteboard' && (
                    <motion.div
                      key="whiteboard"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="h-full relative flex items-center justify-center bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px] rounded-xl border border-border/50 shadow-inner"
                    >
                      <svg className="w-full h-full absolute inset-0 pointer-events-none">
                        <motion.path
                          d="M 120 180 Q 250 80 400 180 T 600 120"
                          fill="none"
                          stroke="var(--color-primary)"
                          strokeWidth="4"
                          strokeLinecap="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
                        />
                      </svg>

                      <div className="absolute left-1/4 top-1/4 bg-yellow-200/80 dark:bg-yellow-900/40 border border-yellow-400 dark:border-yellow-600 p-3 rounded shadow-sm transform -rotate-3 backdrop-blur-sm">
                        <span className="text-[10px] font-bold text-yellow-900 dark:text-yellow-100">Brainstorm!</span>
                      </div>

                      <motion.div
                        animate={{
                          x: [50, 150, -50, 50],
                          y: [30, -20, 40, 30]
                        }}
                        transition={{ duration: 5, repeat: Infinity }}
                        className="absolute bg-primary text-white text-[9px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-lg"
                      >
                        <Paintbrush className="w-2.5 h-2.5" />
                        <span>David drawing...</span>
                      </motion.div>
                    </motion.div>
                  )}

                  {activeTab === 'meetings' && (
                    <motion.div
                      key="meetings"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="h-full flex flex-col"
                    >
                      <div className="bg-card border border-border/50 rounded-xl shadow-sm h-full flex flex-col p-4 relative">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Video className="w-4 h-4 text-red-500" />
                            <span className="text-[10px] font-bold tracking-wider uppercase text-muted">
                              Workspace Meeting
                            </span>
                          </div>
                          <span className="flex items-center gap-1 text-[8px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded animate-pulse">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            LIVE
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 flex-1">
                          <div className="bg-neutral-800 rounded-lg overflow-hidden relative flex items-center justify-center border border-border shadow-inner">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                              S
                            </div>
                            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] text-white font-semibold">
                              Sarah (Host)
                            </div>
                          </div>
                          <div className="bg-neutral-800 rounded-lg overflow-hidden relative flex items-center justify-center border border-border shadow-inner">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">
                              Y
                            </div>
                            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] text-white font-semibold">
                              You
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-center gap-2 mt-3">
                          <div className="w-6 h-6 rounded-full bg-card-sunken border border-border flex items-center justify-center" />
                          <div className="w-6 h-6 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Teamora Section */}
      <section id="why" className="py-24 px-6 md:px-12 max-w-7xl mx-auto w-full scroll-mt-16">
        <div className="text-center max-w-xl mx-auto mb-16">
          <h2 className="text-2.5xl md:text-3.5xl font-bold tracking-tight text-text">
            Why product teams choose Teamora
          </h2>
          <p className="text-muted mt-2 text-sm">
            Experience smooth animations, cloud sync, and highly secure access control.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {whys.map((hl, i) => {
            const Icon = hl.icon
            return (
              <div
                key={i}
                className="p-6 bg-card border border-border hover:border-border rounded-2xl transition-all duration-300 group flex gap-4"
              >
                <div className="p-3 bg-card-sunken group-hover:bg-neutral-700 dark:bg-card-sunken dark:bg-card-elevated border border-border rounded-xl h-fit transition-colors shrink-0 shadow-2xs">
                  <Icon className="w-5 h-5 text-indigo-650 group-hover:text-on-primary transition-colors" />
                </div>
                <div className="flex flex-col">
                  <h3 className="font-bold text-sm text-text mb-1.5 group-hover:text-indigo-650 transition-colors">
                    {hl.title}
                  </h3>
                  <p className="text-xs text-muted leading-relaxed">{hl.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Screenshots Section */}
      <section
        id="screenshots"
        className="py-24 bg-card-sunken border-y border-border px-6 md:px-12 w-full scroll-mt-16"
      >
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-2.5xl md:text-3.5xl font-bold tracking-tight text-text">
              Stark design. Unrivaled experience.
            </h2>
            <p className="text-muted mt-2 text-sm">Take a closer look at the minimal, distraction-free workspaces.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {mockScreenshots.map((snap, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
              >
                <div className="mb-6">
                  <h3 className="font-bold text-sm text-text group-hover:text-indigo-650 transition-colors">
                    {snap.title}
                  </h3>
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{snap.type}</span>
                </div>
                <div className="aspect-[4/3] rounded-xl overflow-hidden relative">{snap.layout}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-card-sunken border-t border-border px-6 md:px-12 w-full scroll-mt-16">
        <div className="max-w-3xl mx-auto w-full">
          <div className="text-center mb-16">
            <h2 className="text-2.5xl md:text-3.5xl font-bold tracking-tight text-text">Frequently Asked Questions</h2>
            <p className="text-muted mt-2 text-sm">Have details to clarify? Explore typical responses here.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((item, idx) => {
              const isOpen = openFaq === idx
              return (
                <div
                  key={idx}
                  className="bg-card border border-border rounded-2xl overflow-hidden transition-all duration-normal"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between p-5 text-left font-bold text-text hover:text-indigo-650 transition-colors cursor-pointer"
                  >
                    <span className="text-xs md:text-sm tracking-tight">{item.q}</span>
                    <ChevronDown
                      className={`w-4.5 h-4.5 text-muted shrink-0 transition-transform duration-normal ${isOpen ? 'rotate-180 text-indigo-650' : ''}`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-5 pb-5 pt-1 text-xs text-muted leading-relaxed border-t border-border">
                          {item.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="bg-card-sunken border-t border-border text-muted py-16 px-6 md:px-12 w-full">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 border-b border-border pb-12 mb-8">
          <div className="md:col-span-4 flex flex-col gap-4">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="flex items-center gap-2 mb-6 cursor-pointer group w-fit"
            >
              <div className="w-8 h-8 bg-card border border-border rounded-lg flex items-center justify-center group-hover:border-primary/20 transition-all shadow-sm">
                <Building2 className="w-4.5 h-4.5 text-text group-hover:text-primary transition-colors" />
              </div>
              <span className="font-bold text-text group-hover:text-primary transition-colors">Teamora</span>
            </a>
            <p className="text-muted text-xs leading-relaxed max-w-sm">
              The premium, minimal collaboration platform designed to keep multiplayer product teams highly focused and
              aligned.
            </p>
          </div>

          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div className="flex flex-col gap-3">
              <span className="text-text text-[10px] font-extrabold uppercase tracking-widest">Product</span>
              <a href="#features" className="text-xs text-muted hover:text-primary transition-colors w-fit">
                Features
              </a>
              <a href="#collaboration" className="text-xs text-muted hover:text-primary transition-colors w-fit">
                Showcase
              </a>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-text text-[10px] font-extrabold uppercase tracking-widest">Resources</span>
              <a href="#faq" className="text-xs text-muted hover:text-primary transition-colors w-fit">
                FAQ
              </a>
              <a href="#" className="text-xs text-muted hover:text-primary transition-colors w-fit">
                Changelog
              </a>
              <a href="#" className="text-xs text-muted hover:text-primary transition-colors w-fit">
                Status Logs
              </a>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-text text-[10px] font-extrabold uppercase tracking-widest">Company</span>
              <a href="#" className="text-xs text-muted hover:text-primary transition-colors w-fit">
                Security
              </a>
              <a href="#" className="text-xs text-muted hover:text-primary transition-colors w-fit">
                Privacy Policy
              </a>
              <a href="#" className="text-xs text-muted hover:text-primary transition-colors w-fit">
                Terms of Use
              </a>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-muted font-bold uppercase tracking-wider">
          <span>&copy; {new Date().getFullYear()} Teamora Inc. All rights reserved.</span>
          <div className="flex items-center gap-1">
            <span>Stark B&W Design System</span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span>v1.0.4</span>
          </div>
        </div>
      </footer>

      {/* Interactive Watch Demo Modal */}
      <AnimatePresence>
        {showDemoModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-neutral-700 dark:bg-card-sunken dark:bg-card-elevated dark:bg-card-elevated/60 backdrop-blur-xs"
              onClick={() => setShowDemoModal(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-card border border-border w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10"
            >
              <div className="h-12 bg-card-sunken px-4 border-b border-border flex items-center justify-between">
                <span className="text-xs font-bold text-text flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-indigo-650" />
                  <span>Teamora Features Walkthrough</span>
                </span>
                <button
                  onClick={() => setShowDemoModal(false)}
                  className="p-1 rounded-lg hover:bg-border/50 text-muted hover:text-text transition-colors cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Demo Mock App Interface */}
              <div className="p-6 bg-card-sunken flex-1 relative min-h-[360px] flex flex-col justify-between">
                {/* Active Walkthrough visual step */}
                <div className="flex-1 flex items-center justify-center p-4 text-center">
                  <AnimatePresence mode="wait">
                    {demoProgress < 30 && (
                      <motion.div
                        key="step1"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="max-w-md"
                      >
                        <div className="text-center mb-6">
                          <Building2 className="w-12 h-12 text-primary mx-auto mb-4" />
                          <h4 className="font-extrabold text-lg text-text mb-2">1. Dedicated Workspaces</h4>
                        </div>
                        <p className="text-xs text-muted leading-relaxed">
                          Workspaces hold your documents, templates, tasks, meetings, and shared resources in one place.
                          Users can create a workspace or join via Room IDs easily.
                        </p>
                      </motion.div>
                    )}

                    {demoProgress >= 30 && demoProgress < 65 && (
                      <motion.div
                        key="step2"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="max-w-md"
                      >
                        <Zap className="w-12 h-12 text-indigo-650 mx-auto mb-4" />
                        <h4 className="font-extrabold text-lg text-text mb-2">2. Realtime Multiplayer Collaboration</h4>
                        <p className="text-xs text-muted leading-relaxed">
                          Watch edits update in real-time as users write, design, and code together. Integrated cursor
                          tracking shows you exactly what your colleagues are editing.
                        </p>
                      </motion.div>
                    )}

                    {demoProgress >= 65 && (
                      <motion.div
                        key="step3"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="max-w-md"
                      >
                        <Users className="w-12 h-12 text-indigo-650 mx-auto mb-4" />
                        <h4 className="font-extrabold text-lg text-text mb-2">3. Screen Sharing & Meetings</h4>
                        <p className="text-xs text-muted leading-relaxed">
                          Host meetings, share screens, plan timelines in calendars, and coordinate tasks within the
                          workspace without jumping between tabs or tools.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Simulated Player Controls */}
                <div className="flex items-center gap-4 mt-6">
                  <button
                    onClick={() => setDemoPlaying(!demoPlaying)}
                    className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 shadow-sm rounded-xl transition-all cursor-pointer"
                  >
                    {demoPlaying ? 'Pause Walkthrough' : 'Resume Walkthrough'}
                  </button>

                  <div className="flex-1 h-1.5 bg-border/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-650 transition-all duration-100"
                      style={{ width: `${demoProgress}%` }}
                    />
                  </div>

                  <span className="text-[10px] font-mono text-muted w-12 text-right">
                    {Math.min(Math.floor(demoProgress / 10), 9)}s / 10s
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
