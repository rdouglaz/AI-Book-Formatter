import { useNavigate } from 'react-router-dom'
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui'
import { ArrowRight, BookOpen, CheckCircle, Sparkles, FileText, Download } from 'lucide-react'

export default function LandingPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="text-xl font-semibold text-text">AI Book Formatter</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="#features" className="text-sm text-text-muted hover:text-text transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm text-text-muted hover:text-text transition-colors">How It Works</a>
              <a href="#pricing" className="text-sm text-text-muted hover:text-text transition-colors">Pricing</a>
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>Sign In</Button>
              <Button size="sm" onClick={() => navigate('/dashboard')}>Get Started</Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 sm:py-32 lg:py-40 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4" />
              <span>New: AI-powered manuscript analysis</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text tracking-tight mb-6 text-balance">
              Turn Your Manuscript Into a{' '}
              <span className="text-primary">Professional Book</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-text-muted max-w-2xl mx-auto mb-10 text-balance">
              Upload your manuscript. AI analyzes its structure, detects formatting problems, applies professional book-layout rules, and prepares it for print and digital publishing.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Button size="lg" className="w-full sm:w-auto group" onClick={() => navigate('/dashboard')}>
                Format My Book
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
                See How It Works
              </Button>
            </div>
            
            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-text-muted">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Production-quality PDF
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-green-500" />
                DOCX & EPUB export
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Print-ready layouts
              </span>
            </div>
          </div>
        </div>
        
        {/* Visual demo */}
        <div className="mt-16 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Before */}
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-red-500/10 to-transparent rounded-2xl blur-2xl" />
                <div className="relative bg-surface border border-border rounded-xl p-6 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-text mb-4">Your Manuscript</h3>
                  <div className="space-y-3 text-sm text-text-muted font-mono">
                    <div className="p-3 bg-background rounded-lg border-l-4 border-red-500">✗ Inconsistent headings</div>
                    <div className="p-3 bg-background rounded-lg border-l-4 border-yellow-500">✗ Random spacing</div>
                    <div className="p-3 bg-background rounded-lg border-l-4 border-orange-500">✗ Broken page breaks</div>
                    <div className="p-3 bg-background rounded-lg border-l-4 border-red-500">✗ Unformatted chapters</div>
                    <div className="p-3 bg-background rounded-lg border-l-4 border-yellow-500">✗ Mixed fonts & sizes</div>
                    <div className="p-3 bg-background rounded-lg border-l-4 border-orange-500">✗ No table of contents</div>
                  </div>
                </div>
              </div>
              
              {/* After */}
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-green-500/10 to-transparent rounded-2xl blur-2xl" />
                <div className="relative bg-surface border border-border rounded-xl p-6 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-text mb-4">Professionally Formatted</h3>
                  <div className="space-y-3 text-sm text-text-muted font-mono">
                    <div className="p-3 bg-background rounded-lg border-l-4 border-green-500">✓ Clean typography</div>
                    <div className="p-3 bg-background rounded-lg border-l-4 border-green-500">✓ Consistent hierarchy</div>
                    <div className="p-3 bg-background rounded-lg border-l-4 border-green-500">✓ Professional pagination</div>
                    <div className="p-3 bg-background rounded-lg border-l-4 border-green-500">✓ Print-ready structure</div>
                    <div className="p-3 bg-background rounded-lg border-l-4 border-green-500">✓ Auto-generated TOC</div>
                    <div className="p-3 bg-background rounded-lg border-l-4 border-green-500">✓ Orphans/widows fixed</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-28 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-text tracking-tight mb-4">
              Everything you need for professional book formatting
            </h2>
            <p className="text-lg text-text-muted">
              Built for authors, publishers, and editors who demand publication-quality results.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: FileText,
                title: 'Smart Document Parsing',
                description: 'Import DOCX, PDF, TXT, or Markdown. Our parser extracts structure while preserving every word of your content.',
              },
              {
                icon: Sparkles,
                title: 'AI Structure Analysis',
                description: 'AI identifies chapters, sections, front/back matter, quotations, and formatting inconsistencies automatically.',
              },
              {
                icon: BookOpen,
                title: 'Professional Design Presets',
                description: 'Choose from 7 curated designs: Classic, Modern, Literary, Academic, Devotional, Business, Minimal.',
              },
              {
                icon: CheckCircle,
                title: 'Deterministic Formatting Engine',
                description: 'Applies consistent typography, margins, pagination, headers/footers, and TOC generation with precision.',
              },
              {
                icon: Download,
                title: 'Multi-Format Export',
                description: 'Export production-ready PDF, editable DOCX, reflowable EPUB, and structured Markdown.',
              },
              {
                icon: Sparkles,
                title: 'Quality Assurance',
                description: 'Real-time formatting quality report with orphan/widow detection, layout validation, and issue resolution.',
              },
            ].map((feature, i) => (
              <Card key={i} className="h-full transition-shadow hover:shadow-lg">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription className="mt-2">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-background/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-text tracking-tight mb-4">
              From manuscript to book in five steps
            </h2>
            <p className="text-lg text-text-muted">
              No manual formatting required. Upload, review, and export.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { step: '01', title: 'Upload', description: 'Drag and drop your manuscript (DOCX, PDF, TXT, Markdown)' },
              { step: '02', title: 'Analyze', description: 'AI detects structure, chapters, and formatting issues' },
              { step: '03', title: 'Design', description: 'Choose book size, design preset, and typography' },
              { step: '04', title: 'Format', description: 'AI creates formatting plan, engine applies it consistently' },
              { step: '05', title: 'Export', description: 'Preview pages, then export PDF, DOCX, EPUB, or Markdown' },
            ].map((step, i) => (
              <div key={i} className="relative">
                <div className="text-4xl font-bold text-primary/20 mb-4">{step.step}</div>
                <Card className="h-full">
                  <CardContent className="pt-6">
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                    <CardDescription className="mt-2">{step.description}</CardDescription>
                  </CardContent>
                </Card>
                {i < 4 && (
                  <div className="hidden lg:block absolute top-10 right-[-120%] w-[240%] h-0.5 bg-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-2xl bg-primary p-12 sm:p-20 text-center">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-5" />
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
                Ready to format your book?
              </h2>
              <p className="text-lg text-primary-100 mb-8">
                Join authors and publishers who trust AI Book Formatter for professional results.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="w-full sm:w-auto bg-white text-primary hover:bg-white" onClick={() => navigate('/dashboard')}>
                  Start Formatting Free
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="lg" className="w-full sm:w-auto border-white text-white hover:bg-white/10" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-6 w-6 text-primary" />
                <span className="text-xl font-semibold text-text">AI Book Formatter</span>
              </div>
              <p className="text-text-muted max-w-xs">
                Professional book formatting powered by AI. Turn manuscripts into publication-ready books.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-text mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-text-muted">
                <li><a href="#" className="hover:text-text transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-text transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-text transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-text transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-text mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-text-muted">
                <li><a href="#" className="hover:text-text transition-colors">About</a></li>
                <li><a href="#" className="hover:text-text transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-text transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-text transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-text-muted">© 2024 AI Book Formatter. All rights reserved.</p>
            <div className="flex items-center gap-6 text-sm text-text-muted">
              <a href="#" className="hover:text-text transition-colors">Privacy</a>
              <a href="#" className="hover:text-text transition-colors">Terms</a>
              <a href="#" className="hover:text-text transition-colors">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}