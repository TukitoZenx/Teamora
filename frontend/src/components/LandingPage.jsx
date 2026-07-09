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
  CheckSquare,
  Calendar,
  Sparkles,
  Shield,
  RefreshCw,
  Layers,
  ArrowRight,
  Play,
  X,
  Users,
  Check,
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
    const tabs = ['docs', 'sheets', 'slides', 'whiteboard']
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
    { id: 'tasks', title: 'Tasks', desc: 'Manage work across your team.', icon: CheckSquare },
    { id: 'calendar', title: 'Calendar', desc: 'Plan meetings and deadlines.', icon: Calendar }
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
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 h-full flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-2 mb-3">
            <span className="text-[10px] font-bold text-neutral-400 font-mono">WORKSPACE / DOCS</span>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-3/4 bg-neutral-250 rounded" />
            <div className="h-3 w-5/6 bg-neutral-250 rounded" />
            <div className="h-3 w-1/2 bg-neutral-200 rounded" />
          </div>
          <div className="mt-4 flex items-center justify-between bg-card border border-neutral-150 p-2 rounded-lg">
            <span className="text-[9px] font-semibold text-neutral-500">Live revisions: v1.4</span>
            <span className="text-[9px] text-indigo-650 font-bold">Autosaved</span>
          </div>
        </div>
      )
    },
    {
      title: 'Interactive Board',
      type: 'Brainstorm Canvas',
      layout: (
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 h-full flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-2 mb-3">
            <span className="text-[10px] font-bold text-neutral-400 font-mono">BOARD CANVAS</span>
            <span className="text-[8px] font-bold px-2 py-0.5 bg-neutral-900 text-on-primary rounded-md">
              MULTIPLAYER
            </span>
          </div>
          <div className="flex flex-col items-center justify-center my-auto py-2">
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-neutral-300 flex items-center justify-center mb-2">
              <Paintbrush className="w-5 h-5 text-neutral-400" />
            </div>
            <span className="text-[10px] text-neutral-500 text-center font-medium">David added stroke</span>
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
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 h-full flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-2 mb-3">
            <span className="text-[10px] font-bold text-neutral-400 font-mono">CONFERENCE ROOM</span>
            <span className="text-[9px] font-bold text-red-500">REC</span>
          </div>
          <div className="grid grid-cols-2 gap-2 my-auto">
            <div className="bg-neutral-200 rounded-lg p-2 flex flex-col items-center justify-center aspect-video border border-neutral-250">
              <span className="text-[9px] font-bold">Sarah (Host)</span>
            </div>
            <div className="bg-neutral-200 rounded-lg p-2 flex flex-col items-center justify-center aspect-video border border-neutral-250">
              <span className="text-[9px] font-bold">You</span>
            </div>
          </div>
          <div className="mt-3 flex gap-2 justify-center">
            <div className="w-5 h-5 rounded-full bg-neutral-900 flex items-center justify-center" />
            <div className="w-5 h-5 rounded-full bg-neutral-900 flex items-center justify-center" />
          </div>
        </div>
      )
    }
  ]

  const pricing = [
    {
      tier: 'Free',
      price: '$0',
      period: 'forever',
      desc: 'Essential real-time features for individual creators.',
      features: [
        'Up to 3 workspaces',
        'Basic editor tools',
        'Realtime sync (100ms)',
        '7-day version history',
        'Up to 3 meeting members'
      ],
      btnText: 'Get Started',
      accent: false
    },
    {
      tier: 'Pro',
      price: '$12',
      period: 'per user / month',
      desc: 'Advanced tools and resources for growing collaboration teams.',
      features: [
        'Unlimited workspaces',
        'Full application suite',
        'Sub-50ms sync prioritization',
        'Infinite version history',
        'Up to 25 meeting members',
        'Custom role permissions',
        'Priority support'
      ],
      btnText: 'Start Pro Trial',
      accent: true
    },
    {
      tier: 'Enterprise',
      price: 'Custom',
      period: 'tailored pricing',
      desc: 'Deep security and administration tools for organizations.',
      features: [
        'Dedicated server hosting',
        'SAML & SSO authentication',
        'Custom API access integrations',
        '24/7 designated support team',
        '99.99% service SLA contract',
        'Custom compliance logs'
      ],
      btnText: 'Contact Sales',
      accent: false
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
    <div className="bg-card text-neutral-900 font-sans selection:bg-indigo-100 selection:text-indigo-800 transition-colors duration-300 w-full relative">
      {/* Top Header Navigation - Sticky and translucent */}
      <header className="sticky top-0 inset-x-0 h-16 bg-card/80 backdrop-blur-md border-b border-neutral-100 z-50 flex items-center justify-between px-6 md:px-12 w-full">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-neutral-900 rounded-lg flex items-center justify-center shadow-sm">
            <Building2 className="w-4.5 h-4.5 text-on-primary" />
          </div>
          <span className="font-extrabold text-lg tracking-tight">Teamora</span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-neutral-500">
          <a href="#features" className="hover:text-neutral-950 transition-colors">
            Features
          </a>
          <a href="#collaboration" className="hover:text-neutral-950 transition-colors">
            Showcase
          </a>
          <a href="#why" className="hover:text-neutral-950 transition-colors">
            Why Teamora
          </a>
          <a href="#screenshots" className="hover:text-neutral-950 transition-colors">
            Previews
          </a>
          <a href="#pricing" className="hover:text-neutral-950 transition-colors">
            Pricing
          </a>
          <a href="#faq" className="hover:text-neutral-950 transition-colors">
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            to="/signin"
            className="text-xs font-extrabold uppercase tracking-wider px-4 py-2.5 hover:bg-neutral-50 rounded-xl transition-colors cursor-pointer text-neutral-600 hover:text-neutral-900"
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="text-xs font-extrabold uppercase tracking-wider text-on-primary bg-neutral-900 hover:bg-neutral-800 px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-28 pb-20 px-6 md:px-12 flex flex-col items-center text-center max-w-5xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-150 bg-neutral-50 text-[10px] font-bold text-neutral-600 uppercase tracking-widest"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
          <span>Real-time Workspace Suites</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4.5xl md:text-7xl font-bold text-neutral-900 tracking-tight leading-[1.05] mb-6"
        >
          One Workspace.
          <br />
          <span className="bg-gradient-to-r from-neutral-950 via-indigo-600 to-indigo-700 bg-clip-text text-transparent">
            Infinite Collaboration.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-sm md:text-base text-neutral-500 max-w-2xl leading-relaxed mb-10"
        >
          Collaborate on documents, whiteboards, spreadsheets, presentations, meetings and shared files in real time.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-4"
        >
          <Link
            to="/signup"
            className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-on-primary bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md hover:shadow-indigo-600/10 cursor-pointer flex items-center gap-2"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/signin"
            className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-neutral-900 bg-card hover:bg-neutral-50 border border-neutral-200 rounded-xl transition-all cursor-pointer"
          >
            Join Workspace
          </Link>

          <button
            onClick={() => {
              setShowDemoModal(true)
              setDemoPlaying(true)
              setDemoProgress(0)
            }}
            className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-neutral-600 hover:text-neutral-950 bg-neutral-50 hover:bg-neutral-100 rounded-xl transition-all cursor-pointer flex items-center gap-2 border border-neutral-150"
          >
            <Play className="w-4.5 h-4.5 fill-current text-indigo-650" />
            <span>Watch Demo</span>
          </button>
        </motion.div>
      </section>

      {/* Feature Section */}
      <section
        id="features"
        className="py-24 px-6 md:px-12 max-w-7xl mx-auto border-t border-neutral-100 w-full scroll-mt-16"
      >
        <div className="text-center max-w-xl mx-auto mb-16">
          <h2 className="text-2.5xl md:text-3.5xl font-bold tracking-tight text-neutral-900">
            Built for modern product teams
          </h2>
          <p className="text-neutral-500 mt-2 text-sm">
            Everything you need in a single platform, styled with minimal elegance.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat) => {
            const Icon = feat.icon
            return (
              <div
                key={feat.id}
                className="p-6 bg-card border border-neutral-150 rounded-2xl shadow-xs hover:shadow-md hover:border-neutral-300 transition-all duration-300 group flex flex-col items-start"
              >
                <div className="p-3 bg-neutral-50 group-hover:bg-indigo-50 rounded-xl mb-4 transition-colors">
                  <Icon className="w-5 h-5 text-neutral-800 group-hover:text-indigo-650 transition-colors" />
                </div>
                <h3 className="font-bold text-sm text-neutral-900 mb-1.5">{feat.title}</h3>
                <p className="text-xs text-neutral-500 leading-relaxed">{feat.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Collaboration Section */}
      <section
        id="collaboration"
        className="py-24 bg-neutral-50 border-y border-neutral-100 px-6 md:px-12 w-full scroll-mt-16"
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-4 flex flex-col justify-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100/50 text-[10px] font-bold text-indigo-650 uppercase tracking-wider mb-4 w-fit">
              <Users className="w-3.5 h-3.5" />
              <span>Multiplayer Sync</span>
            </div>
            <h2 className="text-2.5xl md:text-3.5xl font-bold tracking-tight text-neutral-900 mb-4 leading-tight">
              All editing. All at once.
            </h2>
            <p className="text-neutral-500 text-sm leading-relaxed mb-6">
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
                  className="flex items-center gap-3 bg-card border border-neutral-150 p-2.5 rounded-xl shadow-xs"
                >
                  <div
                    className={`w-8 h-8 rounded-full ${member.color} flex items-center justify-center text-on-primary font-bold text-xs shadow-xs`}
                  >
                    {member.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-neutral-900">{member.name}</p>
                    <p className="text-[10px] text-neutral-400">
                      editing <span className="font-semibold text-neutral-600">{member.task}</span>
                    </p>
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-650 animate-ping mr-2" />
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8">
            {/* Visual Canvas Mockup with Interactive Tabs */}
            <div className="bg-card border border-neutral-200 rounded-2xl shadow-xl overflow-hidden">
              {/* Fake Window Header */}
              <div className="h-12 bg-neutral-900 text-on-primary flex items-center justify-between px-4 border-b border-neutral-850">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
                  <span className="text-[10px] font-semibold text-neutral-400 ml-4 bg-neutral-800 px-3 py-1 rounded-md">
                    teamora.com/workspace/marketing-q3
                  </span>
                </div>
                <div className="flex items-center -space-x-1.5">
                  {['Alice', 'Bob', 'Charlie', 'David'].map((n, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full bg-neutral-850 border border-neutral-900 flex items-center justify-center text-[9px] font-extrabold text-neutral-300"
                    >
                      {n.charAt(0)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tab Selector */}
              <div className="flex border-b border-neutral-100 bg-neutral-50 px-2 pt-1 gap-1">
                {[
                  { id: 'docs', label: 'Requirements.docx', icon: FileText },
                  { id: 'sheets', label: 'Budget.xlsx', icon: TableProperties },
                  { id: 'slides', label: 'Pitch Deck.pptx', icon: Presentation },
                  { id: 'whiteboard', label: 'Whiteboard Canvas', icon: Paintbrush }
                ].map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer ${
                        isActive
                          ? 'bg-card text-indigo-650 border-t-2 border-indigo-650 shadow-xs'
                          : 'text-neutral-500 hover:text-neutral-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
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
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-neutral-100 rounded text-neutral-500">
                            Document Editor
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        </div>
                        <h4 className="font-extrabold text-base text-neutral-900 mb-2">
                          Teamora Product Launch Strategy
                        </h4>
                        <div className="text-xs text-neutral-600 space-y-2 leading-relaxed">
                          <p>
                            We need a minimal B&W design to make our collaboration feel stark, distraction-free, and
                            premium.
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ repeat: Infinity, duration: 0.8, ease: 'steps(2)' }}
                              className="inline-block w-1.5 h-4 bg-emerald-500 ml-0.5 align-middle"
                            />
                          </p>
                          <p className="text-neutral-400">
                            The visual highlights include custom cursors, rounded elements, and fast animations.
                          </p>
                        </div>
                      </div>
                      <div className="absolute right-8 bottom-8 bg-emerald-500 text-on-primary text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-md">
                        <Users className="w-3.5 h-3.5" />
                        <span>Alice is writing...</span>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'sheets' && (
                    <motion.div
                      key="sheets"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="h-full"
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-neutral-100 rounded text-neutral-500">
                          Spreadsheet Canvas
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                      </div>

                      <div className="border border-neutral-150 rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-neutral-50 border-b border-neutral-150">
                              <th className="p-2 border-r border-neutral-150 w-12 text-center"></th>
                              <th className="p-2 border-r border-neutral-150 font-bold">Category</th>
                              <th className="p-2 border-r border-neutral-150 font-bold">Q3 Budget</th>
                              <th className="p-2 font-bold">Actual Cost</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-neutral-100">
                              <td className="p-2 font-mono text-[10px] bg-neutral-50 text-neutral-400 border-r border-neutral-150 text-center">
                                1
                              </td>
                              <td className="p-2 border-r border-neutral-100">Marketing Launch</td>
                              <td className="p-2 border-r border-neutral-100">$25,000</td>
                              <td className="p-2">$23,500</td>
                            </tr>
                            <tr>
                              <td className="p-2 font-mono text-[10px] bg-neutral-50 text-neutral-400 border-r border-neutral-150 text-center">
                                2
                              </td>
                              <td className="p-2 border-r border-neutral-100">Development Staging</td>
                              <td className="p-2 border-r border-neutral-100 bg-blue-50/50 relative border-2 border-blue-500">
                                <span>$45,000</span>
                                <div className="absolute -top-3.5 -right-2 bg-blue-500 text-on-primary text-[8px] px-1 rounded font-bold shadow-sm">
                                  Bob
                                </div>
                              </td>
                              <td className="p-2">$41,800</td>
                            </tr>
                          </tbody>
                        </table>
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
                      <div className="w-3/4 aspect-video bg-neutral-900 border border-neutral-850 rounded-xl p-4 flex flex-col justify-between text-on-primary relative shadow-lg">
                        <div className="absolute top-2 right-2 bg-purple-500 text-on-primary text-[8px] px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5 shadow-sm">
                          <span>Charlie</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-indigo-500" />
                          <span className="text-[8px] text-neutral-400 font-mono">Slide 1 of 8</span>
                        </div>

                        <div className="my-auto">
                          <h5 className="font-extrabold text-xs tracking-tight">Teamora Presentation Deck</h5>
                          <p className="text-[9px] text-neutral-400 mt-1">
                            Stark design for absolute clarity in alignment.
                          </p>
                        </div>

                        <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
                          <div className="h-full w-1/3 bg-indigo-500" />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'whiteboard' && (
                    <motion.div
                      key="whiteboard"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="h-full relative flex items-center justify-center bg-radial from-neutral-50 to-white"
                    >
                      <svg className="w-full h-full absolute inset-0 pointer-events-none">
                        <motion.path
                          d="M 150 160 Q 250 80 350 160 T 550 160"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse' }}
                        />
                      </svg>

                      <motion.div
                        animate={{
                          x: [50, 100, -50, 50],
                          y: [30, -40, 20, 30]
                        }}
                        transition={{ duration: 6, repeat: Infinity }}
                        className="absolute bg-amber-500 text-on-primary text-[9px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-0.5 shadow-md"
                      >
                        <Paintbrush className="w-2.5 h-2.5" />
                        <span>David drawing...</span>
                      </motion.div>

                      <div className="border border-dashed border-neutral-250 p-4 rounded-xl text-center bg-card/60 backdrop-blur-xs shadow-xs">
                        <span className="text-xs font-bold text-neutral-700">Project Canvas</span>
                        <p className="text-[10px] text-neutral-400 mt-1">Brainstorming layout components</p>
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
          <h2 className="text-2.5xl md:text-3.5xl font-bold tracking-tight text-neutral-900">
            Why product teams choose Teamora
          </h2>
          <p className="text-neutral-500 mt-2 text-sm">
            Experience smooth animations, cloud sync, and highly secure access control.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {whys.map((hl, i) => {
            const Icon = hl.icon
            return (
              <div
                key={i}
                className="p-6 bg-card border border-neutral-150 hover:border-neutral-300 rounded-2xl transition-all duration-300 group flex gap-4"
              >
                <div className="p-3 bg-neutral-50 group-hover:bg-neutral-900 border border-neutral-100 rounded-xl h-fit transition-colors shrink-0 shadow-2xs">
                  <Icon className="w-5 h-5 text-indigo-650 group-hover:text-on-primary transition-colors" />
                </div>
                <div className="flex flex-col">
                  <h3 className="font-bold text-sm text-neutral-900 mb-1.5 group-hover:text-indigo-650 transition-colors">
                    {hl.title}
                  </h3>
                  <p className="text-xs text-neutral-500 leading-relaxed">{hl.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Screenshots Section */}
      <section
        id="screenshots"
        className="py-24 bg-neutral-50 border-y border-neutral-100 px-6 md:px-12 w-full scroll-mt-16"
      >
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-2.5xl md:text-3.5xl font-bold tracking-tight text-neutral-900">
              Stark design. Unrivaled experience.
            </h2>
            <p className="text-neutral-500 mt-2 text-sm">
              Take a closer look at the minimal, distraction-free workspaces.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {mockScreenshots.map((snap, i) => (
              <div
                key={i}
                className="bg-card border border-neutral-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
              >
                <div className="mb-6">
                  <h3 className="font-bold text-sm text-neutral-950 group-hover:text-indigo-650 transition-colors">
                    {snap.title}
                  </h3>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{snap.type}</span>
                </div>
                <div className="aspect-[4/3] rounded-xl overflow-hidden relative">{snap.layout}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 md:px-12 max-w-7xl mx-auto w-full scroll-mt-16">
        <div className="text-center max-w-xl mx-auto mb-16">
          <h2 className="text-2.5xl md:text-3.5xl font-bold tracking-tight text-neutral-900">
            Simple, transparent pricing
          </h2>
          <p className="text-neutral-500 mt-2 text-sm">Choose the tier that matches your collaboration volume.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {pricing.map((card, i) => (
            <div
              key={i}
              className={`p-8 rounded-3xl flex flex-col justify-between border transition-all duration-300 relative ${
                card.accent
                  ? 'bg-neutral-950 text-on-primary border-neutral-900 shadow-xl scale-105 z-10'
                  : 'bg-card text-neutral-900 border-neutral-200 hover:border-neutral-350 shadow-xs'
              }`}
            >
              {card.accent && (
                <div className="absolute -top-3.5 right-6 bg-indigo-600 text-on-primary text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Popular
                </div>
              )}

              <div>
                <div className="mb-6">
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-widest ${card.accent ? 'text-indigo-400' : 'text-neutral-400'}`}
                  >
                    {card.tier}
                  </span>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-4xl font-bold tracking-tight">{card.price}</span>
                    <span
                      className={`text-[10px] font-semibold ${card.accent ? 'text-neutral-400' : 'text-neutral-500'}`}
                    >
                      /{card.period}
                    </span>
                  </div>
                  <p
                    className={`text-xs mt-3 leading-relaxed ${card.accent ? 'text-neutral-300' : 'text-neutral-500'}`}
                  >
                    {card.desc}
                  </p>
                </div>

                <div className={`h-px w-full my-6 ${card.accent ? 'bg-neutral-850' : 'bg-neutral-100'}`} />

                <ul className="space-y-3.5 text-xs mb-8">
                  {card.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-center gap-2.5">
                      <Check className={`w-4 h-4 shrink-0 ${card.accent ? 'text-indigo-400' : 'text-indigo-600'}`} />
                      <span className={card.accent ? 'text-neutral-200' : 'text-neutral-600'}>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                to={card.btnText === 'Contact Sales' ? '/signin' : '/signup'}
                className={`block w-full py-3.5 rounded-xl text-center text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  card.accent
                    ? 'bg-card hover:bg-neutral-100 text-neutral-950 shadow-sm'
                    : 'bg-neutral-950 hover:bg-neutral-850 text-on-primary'
                }`}
              >
                {card.btnText}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-neutral-50 border-t border-neutral-100 px-6 md:px-12 w-full scroll-mt-16">
        <div className="max-w-3xl mx-auto w-full">
          <div className="text-center mb-16">
            <h2 className="text-2.5xl md:text-3.5xl font-bold tracking-tight text-neutral-900">
              Frequently Asked Questions
            </h2>
            <p className="text-neutral-500 mt-2 text-sm">Have details to clarify? Explore typical responses here.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((item, idx) => {
              const isOpen = openFaq === idx
              return (
                <div
                  key={idx}
                  className="bg-card border border-neutral-150 rounded-2xl overflow-hidden transition-all duration-normal"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between p-5 text-left font-bold text-neutral-950 hover:text-indigo-650 transition-colors cursor-pointer"
                  >
                    <span className="text-xs md:text-sm tracking-tight">{item.q}</span>
                    <ChevronDown
                      className={`w-4.5 h-4.5 text-neutral-400 shrink-0 transition-transform duration-normal ${isOpen ? 'rotate-180 text-indigo-650' : ''}`}
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
                        <div className="px-5 pb-5 pt-1 text-xs text-neutral-500 leading-relaxed border-t border-neutral-50">
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
      <footer className="bg-neutral-950 border-t border-neutral-900 text-neutral-450 py-16 px-6 md:px-12 w-full">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 border-b border-neutral-900 pb-12 mb-8">
          <div className="md:col-span-4 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-card rounded-lg flex items-center justify-center shadow-sm shrink-0">
                <Building2 className="w-4.5 h-4.5 text-neutral-950" />
              </div>
              <span className="font-extrabold text-on-primary text-base tracking-tight">Teamora</span>
            </div>
            <p className="text-neutral-500 text-xs leading-relaxed max-w-sm">
              The premium, minimal collaboration platform designed to keep multiplayer product teams highly focused and
              aligned.
            </p>
          </div>

          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div className="flex flex-col gap-3">
              <span className="text-on-primary text-[10px] font-extrabold uppercase tracking-widest">Product</span>
              <a href="#features" className="text-xs text-neutral-500 hover:text-on-primary transition-colors">
                Features
              </a>
              <a href="#collaboration" className="text-xs text-neutral-500 hover:text-on-primary transition-colors">
                Showcase
              </a>
              <a href="#pricing" className="text-xs text-neutral-500 hover:text-on-primary transition-colors">
                Pricing
              </a>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-on-primary text-[10px] font-extrabold uppercase tracking-widest">Resources</span>
              <a href="#faq" className="text-xs text-neutral-500 hover:text-on-primary transition-colors">
                FAQ
              </a>
              <a href="#" className="text-xs text-neutral-500 hover:text-on-primary transition-colors">
                Changelog
              </a>
              <a href="#" className="text-xs text-neutral-500 hover:text-on-primary transition-colors">
                Status Logs
              </a>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-on-primary text-[10px] font-extrabold uppercase tracking-widest">Company</span>
              <a href="#" className="text-xs text-neutral-500 hover:text-on-primary transition-colors">
                Security
              </a>
              <a href="#" className="text-xs text-neutral-500 hover:text-on-primary transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-xs text-neutral-500 hover:text-on-primary transition-colors">
                Terms of Use
              </a>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-neutral-600 font-bold uppercase tracking-wider">
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
              className="absolute inset-0 bg-neutral-950/60 backdrop-blur-xs"
              onClick={() => setShowDemoModal(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-card border border-neutral-200 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10"
            >
              <div className="h-12 bg-neutral-50 px-4 border-b border-neutral-150 flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-700 flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-indigo-650" />
                  <span>Teamora Features Walkthrough</span>
                </span>
                <button
                  onClick={() => setShowDemoModal(false)}
                  className="p-1 rounded-lg hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Demo Mock App Interface */}
              <div className="p-6 bg-neutral-50 flex-1 relative min-h-[360px] flex flex-col justify-between">
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
                        <Building2 className="w-12 h-12 text-indigo-650 mx-auto mb-4" />
                        <h4 className="font-extrabold text-lg text-neutral-900 mb-2">1. Dedicated Workspaces</h4>
                        <p className="text-xs text-neutral-500 leading-relaxed">
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
                        <h4 className="font-extrabold text-lg text-neutral-900 mb-2">
                          2. Realtime Multiplayer Collaboration
                        </h4>
                        <p className="text-xs text-neutral-500 leading-relaxed">
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
                        <h4 className="font-extrabold text-lg text-neutral-900 mb-2">3. Screen Sharing & Meetings</h4>
                        <p className="text-xs text-neutral-500 leading-relaxed">
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
                    className="px-4 py-2 text-xs font-bold text-on-primary bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-all cursor-pointer"
                  >
                    {demoPlaying ? 'Pause Walkthrough' : 'Resume Walkthrough'}
                  </button>

                  <div className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-650 transition-all duration-100"
                      style={{ width: `${demoProgress}%` }}
                    />
                  </div>

                  <span className="text-[10px] font-mono text-neutral-400 w-12 text-right">
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
