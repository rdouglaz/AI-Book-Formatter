import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Loader2, CheckCircle, AlertCircle, Info, AlertTriangle, ArrowLeft, ArrowRight, BookOpen, TypeIcon, List, Quote, Table2, ImageIcon, StickyNote } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Progress, Badge, Separator } from '@/components/ui'
import { useAppStore } from '@/store'
import { analyzeDocument, getDocumentStats, estimatePageCount } from '@/utils/analysis'
import { findNodesByType, traverseDocument } from '@/utils/helpers'

export default function AnalyzePage() {
  const { currentProject, currentDocument, currentVersion, setCurrentAnalysis, setProcessingProgress } = useAppStore()
  const navigate = useNavigate()
  const [analysis, setAnalysis] = useState<ReturnType<typeof analyzeDocument> | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set())
  
  useEffect(() => {
    if (currentDocument && !analysis) {
      runAnalysis()
    } else if (currentVersion?.analysis) {
      setAnalysis(currentVersion.analysis)
    }
  }, [currentDocument, currentVersion, analysis])
  
  const runAnalysis = async () => {
    if (!currentDocument) return
    
    setAnalyzing(true)
    setProcessingProgress({ stage: 'analyzing', progress: 10, message: 'Analyzing document structure...' })
    
    try {
      // Simulate analysis steps
      await new Promise(r => setTimeout(r, 500))
      setProcessingProgress({ stage: 'analyzing', progress: 30, message: 'Detecting chapters and headings...' })
      
      await new Promise(r => setTimeout(r, 500))
      setProcessingProgress({ stage: 'analyzing', progress: 60, message: 'Finding formatting inconsistencies...' })
      
      await new Promise(r => setTimeout(r, 500))
      setProcessingProgress({ stage: 'analyzing', progress: 90, message: 'Generating analysis report...' })
      
      const result = analyzeDocument(currentDocument)
      setAnalysis(result)
      setCurrentAnalysis(result)
      
      if (currentVersion) {
        // Update version with analysis
        // In real app, this would update the store
      }
      
      setProcessingProgress({ stage: 'analyzing', progress: 100, message: 'Analysis complete' })
    } catch (error) {
      console.error('Analysis failed:', error)
    } finally {
      setAnalyzing(false)
    }
  }
  
  const handleToggleIssue = (issueId: string) => {
    setExpandedIssues(prev => {
      const next = new Set(prev)
      if (next.has(issueId)) {
        next.delete(issueId)
      } else {
        next.add(issueId)
      }
      return next
    })
  }
  
  if (!currentProject || !currentDocument) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="text-center">
          <CardContent className="pt-6">
            <BookOpen className="h-12 w-12 text-text-muted mx-auto mb-4" />
            <CardTitle>No Project Loaded</CardTitle>
            <CardDescription>Please upload a manuscript first.</CardDescription>
            <Button onClick={() => navigate('/upload')} className="mt-4">
              Upload Manuscript
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  const stats = getDocumentStats(currentDocument)
  const pageCount = estimatePageCount(currentDocument)
  const chapters = findNodesByType(currentDocument, 'chapter')
  const sections = findNodesByType(currentDocument, 'section')
  const subsections = findNodesByType(currentDocument, 'subsection')
  const paragraphs = findNodesByType(currentDocument, 'paragraph')
  const blockquotes = findNodesByType(currentDocument, 'blockquote')
  const images = findNodesByType(currentDocument, 'image')
  const tables = findNodesByType(currentDocument, 'table')
  const lists = findNodesByType(currentDocument, 'list')
  const footnotes = findNodesByType(currentDocument, 'footnote')
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-40 bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="text-xl font-semibold text-text">AI Book Formatter</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Button>
              <span className="text-sm text-text-muted">{currentProject.title}</span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Progress Indicator */}
      <div className="border-b border-border bg-background/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-12">
            {[
              { label: 'Upload', href: '/upload', current: false, done: true },
              { label: 'Analyze', href: '/analyze', current: true, done: false },
              { label: 'Design', href: '/design', current: false, done: false },
              { label: 'Format', href: '/format', current: false, done: false },
              { label: 'Preview', href: '/preview', current: false, done: false },
              { label: 'Export', href: '/export', current: false, done: false },
            ].map((step, i) => (
              <div key={step.label} className="flex items-center">
                <div className={`flex items-center gap-2 px-4 ${step.current ? 'text-primary font-medium' : step.done ? 'text-green-600' : 'text-text-muted'}`}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium border-2">
                    {step.done ? (
                      <CheckCircle className="h-4 w-4 text-green-600 border-green-600 bg-green-600" />
                    ) : step.current ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary border-primary bg-primary" />
                    ) : (
                      <span className="border-border bg-background text-text-muted">{i + 1}</span>
                    )}
                  </span>
                  <span className="hidden sm:block">{step.label}</span>
                </div>
                {i < 5 && <div className="w-16 h-0.5 bg-border mx-2" />}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-text-muted mb-2">
            <span>Document Analysis</span>
            <span>•</span>
            <span>{currentProject.title}</span>
            <span>•</span>
            <span>by {currentProject.author}</span>
          </div>
          <h1 className="text-3xl font-bold text-text">Analysis Report</h1>
          <p className="text-text-muted mt-1">
            {analyzing ? 'Analyzing your manuscript...' : 'Review the detected structure and formatting issues.'}
          </p>
        </div>
        
        {analyzing && (
          <Card className="mb-6">
            <CardContent className="pt-6 pb-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-text-muted">Analyzing document structure...</p>
              <Progress value={50} max={100} showLabel className="max-w-md mx-auto mt-4" />
            </CardContent>
          </Card>
        )}
        
        {!analyzing && analysis && (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
              <StatCard icon={BookOpen} label="Chapters" value={analysis.chaptersDetected} color="primary" />
              <StatCard icon={TypeIcon} label="Sections" value={analysis.sectionsDetected} color="blue" />
              <StatCard icon={FileText} label="Paragraphs" value={analysis.paragraphsDetected.toLocaleString()} color="green" />
              <StatCard icon={Quote} label="Quotations" value={analysis.blockQuotesDetected} color="purple" />
              <StatCard icon={ImageIcon} label="Images" value={analysis.imagesDetected} color="orange" />
              <StatCard icon={Table2} label="Tables" value={analysis.tablesDetected} color="cyan" />
              <StatCard icon={StickyNote} label="Footnotes" value={analysis.footnotesDetected} color="pink" />
              <StatCard icon={AlertTriangle} label="Issues" value={analysis.formattingIssues.length} color={analysis.formattingIssues.length > 0 ? 'red' : 'green'} />
            </div>
            
            {/* Document Structure */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Chapter List */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Document Structure
                  </CardTitle>
                  <CardDescription>Detected chapters, sections, and subsections</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {chapters.length === 0 ? (
                      <p className="text-text-muted text-center py-8">No chapters detected. The document may need manual structure definition.</p>
                    ) : (
                      chapters.map((chapter, i) => (
                        <ChapterTreeNode key={chapter.id} chapter={chapter} index={i} />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Stats Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <StatRow label="Estimated Pages" value={pageCount} />
                  <StatRow label="Word Count" value={stats.wordCount?.toLocaleString() || '0'} />
                  <StatRow label="Lists" value={lists.length} />
                  <StatRow label="Front Matter Items" value={analysis.frontMatterStructure.length} />
                  <StatRow label="Back Matter Items" value={analysis.backMatterStructure.length} />
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium text-text mb-2">Front Matter</h4>
                    <div className="flex flex-wrap gap-1">
                      {analysis.frontMatterStructure.length === 0 ? (
                        <span className="text-sm text-text-muted">None detected</span>
                      ) : (
                        analysis.frontMatterStructure.map(item => (
                          <Badge key={item} variant="info" className="text-xs">{item.replace('_', ' ')}</Badge>
                        ))
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-text mb-2">Back Matter</h4>
                    <div className="flex flex-wrap gap-1">
                      {analysis.backMatterStructure.length === 0 ? (
                        <span className="text-sm text-text-muted">None detected</span>
                      ) : (
                        analysis.backMatterStructure.map(item => (
                          <Badge key={item} variant="info" className="text-xs">{item.replace('_', ' ')}</Badge>
                        ))
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-text mb-2">Heading Hierarchy</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-muted">Chapter</span>
                        <span className="font-mono">{analysis.headingHierarchy.chapter}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Section</span>
                        <span className="font-mono">{analysis.headingHierarchy.section}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Subsection</span>
                        <span className="font-mono">{analysis.headingHierarchy.subsection}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Formatting Issues */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Formatting Issues ({analysis.formattingIssues.length})
                </CardTitle>
                <CardDescription>
                  {analysis.formattingIssues.length === 0 
                    ? 'No formatting issues detected. Your manuscript is well-structured!'
                    : 'Review and resolve these issues before formatting.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analysis.formattingIssues.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-text-muted">No formatting issues found!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analysis.formattingIssues.map(issue => (
                      <IssueCard 
                        key={issue.id} 
                        issue={issue} 
                        expanded={expandedIssues.has(issue.id)}
                        onToggle={() => handleToggleIssue(issue.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-end">
              <Button variant="outline" onClick={() => navigate('/upload')}>
                <ArrowLeft className="h-4 w-4" />
                Back to Upload
              </Button>
              <Button onClick={() => navigate('/design')}>
                Continue to Design
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string; color: string }) {
  const colors: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
    pink: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  }
  
  return (
    <Card>
      <CardContent className="pt-6 text-center">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3 ${colors[color] || colors.primary}`}>
          <Icon className="h-6 w-6" />
        </div>
        <p className="text-2xl font-bold text-text">{value}</p>
        <p className="text-sm text-text-muted">{label}</p>
      </CardContent>
    </Card>
  )
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="font-medium text-text">{value}</span>
    </div>
  )
}

function ChapterTreeNode({ chapter, index }: { chapter: any; index: number }) {
  const [expanded, setExpanded] = useState(true)
  const sections = chapter.children.filter((n: any) => n.type === 'section')
  const subsections = chapter.children.filter((n: any) => n.type === 'subsection')
  
  return (
    <div className="border-l-2 border-border/50 pl-4">
      <div className="flex items-center gap-2 py-1.5" onClick={() => setExpanded(!expanded)}>
        <span className="text-primary font-medium">Chapter {index + 1}</span>
        <span className="text-text">{chapter.content}</span>
        <span className="text-xs text-text-muted ml-auto">
          {sections.length} sections, {subsections.length} subsections
        </span>
      </div>
      
      {expanded && sections.length > 0 && (
        <div className="mt-1 space-y-1 border-l-2 border-border/30 pl-4">
          {sections.map((section: any, si: number) => (
            <div key={section.id} className="flex items-center gap-2 py-1 text-sm">
              <span className="text-text-muted">{index + 1}.{si + 1}</span>
              <span className="text-text">{section.content}</span>
              <span className="text-xs text-text-muted ml-auto">
                {section.children.filter((n: any) => n.type === 'subsection').length} subsections
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function IssueCard({ issue, expanded, onToggle }: { issue: any; expanded: boolean; onToggle: () => void }) {
  const severityColors = {
    error: 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
    warning: 'border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300',
    info: 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
  }
  
  const severityIcons = {
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  }
  
  const SeverityIcon = severityIcons[issue.severity]
  const colorClass = severityColors[issue.severity]
  
  return (
    <div className={`border-l-4 rounded-r-lg p-4 ${colorClass}`}>
      <div className="flex items-start gap-3" onClick={onToggle}>
        <SeverityIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{issue.message}</span>
            <Badge variant={issue.severity === 'error' ? 'error' : issue.severity === 'warning' ? 'warning' : 'info'} className="text-xs">
              {issue.severity}
            </Badge>
            {issue.autoFixable && (
              <Badge variant="default" className="text-xs bg-green-100 text-green-700">Auto-fixable</Badge>
            )}
          </div>
          <p className="text-sm mt-1 opacity-80">{issue.suggestion || 'No suggestion available'}</p>
          
          {expanded && (
            <div className="mt-3 pt-3 border-t border-current/20 space-y-2">
              <div className="text-xs font-mono text-current/70">
                Affected nodes: {issue.nodeIds.length}
              </div>
              <div className="flex gap-2">
                {issue.autoFixable && (
                  <Button variant="outline" size="sm">Apply Fix</Button>
                )}
                <Button variant="ghost" size="sm">View in Document</Button>
              </div>
            </div>
          )}
        </div>
        <span className="text-current/50" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          ▼
        </span>
      </div>
    </div>
  )
}