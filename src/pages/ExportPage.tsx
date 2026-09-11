import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, FileText, CheckCircle, Loader2, AlertCircle, ArrowLeft, ExternalLink, BookOpen } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Progress, Badge, Checkbox, Input } from '@/components/ui'
import { useAppStore } from '@/store'
import { exportDocument } from '@/utils/exportSimple'
import type { ExportFormat } from '@/types'

const EXPORT_FORMATS: { format: ExportFormat; label: string; description: string; icon: React.ComponentType<{ className?: string }>; recommended?: boolean }[] = [
  { 
    format: 'pdf', 
    label: 'PDF (Print)', 
    description: 'Production-quality PDF for print-on-demand and professional printing',
    icon: FileText,
    recommended: true
  },
  { 
    format: 'docx', 
    label: 'DOCX (Word)', 
    description: 'Fully editable Microsoft Word document with styles preserved',
    icon: FileText
  },
  { 
    format: 'epub', 
    label: 'EPUB (Ebook)', 
    description: 'Reflowable ebook format for Kindle, Apple Books, Kobo, etc.',
    icon: BookOpen
  },
  { 
    format: 'markdown', 
    label: 'Markdown', 
    description: 'Structured markdown with front matter for version control and web publishing',
    icon: FileText
  },
]

export default function ExportPage() {
  const { currentProject, currentDocument, currentFormattingProfile, addExportJob, updateExportJob, exportJobs } = useAppStore()
  const navigate = useNavigate()
  
  const [exportStates, setExportStates] = useState<Record<ExportFormat, { 
    status: 'idle' | 'exporting' | 'complete' | 'error'
    progress: number
    blob?: Blob
    error?: string
    filename?: string
  }>>({
    pdf: { status: 'idle', progress: 0 },
    docx: { status: 'idle', progress: 0 },
    epub: { status: 'idle', progress: 0 },
    markdown: { status: 'idle', progress: 0 },
  })
  
  const [selectedFormats, setSelectedFormats] = useState<ExportFormat[]>(['pdf', 'docx', 'epub'])
  const [includeTOC, setIncludeTOC] = useState(true)
  const [embedFonts, setEmbedFonts] = useState(true)
  const [addBleed, setAddBleed] = useState(false)
  
  const handleFormatToggle = (format: ExportFormat) => {
    setSelectedFormats(prev => 
      prev.includes(format) 
        ? prev.filter(f => f !== format)
        : [...prev, format]
    )
  }
  
  const handleExport = async (format: ExportFormat) => {
    if (!currentDocument || !currentFormattingProfile || !currentProject) return
    
    setExportStates(prev => ({
      ...prev,
      [format]: { status: 'exporting', progress: 0 }
    }))
    
    // Create export job
    const jobId = crypto.randomUUID()
    addExportJob({
      id: jobId,
      projectId: currentProject.id,
      versionId: currentProject.currentVersionId || '',
      format,
      status: 'processing',
      createdAt: new Date().toISOString(),
    })
    
    try {
      const blob = await exportDocument({
        format,
        document: currentDocument,
        profile: currentFormattingProfile,
        projectTitle: currentProject.title,
        projectAuthor: currentProject.author,
        includeTOC,
        bleed: addBleed,
        onProgress: (progress, message) => {
          setExportStates(prev => ({
            ...prev,
            [format]: { ...prev[format], progress, status: 'exporting' }
          }))
          updateExportJob(jobId, { status: 'processing' })
        }
      })
      
      const filename = `${currentProject.title.replace(/[^a-z0-9]/gi, '_')}.${format}`
      
      setExportStates(prev => ({
        ...prev,
        [format]: { status: 'complete', progress: 100, blob, filename }
      }))
      
      updateExportJob(jobId, { 
        status: 'completed', 
        completedAt: new Date().toISOString(),
        fileUrl: URL.createObjectURL(blob),
      })
      
      // Trigger download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
    } catch (error) {
      setExportStates(prev => ({
        ...prev,
        [format]: { status: 'error', progress: 0, error: error instanceof Error ? error.message : 'Export failed' }
      }))
      updateExportJob(jobId, { 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Export failed' 
      })
    }
  }
  
  const handleExportAll = async () => {
    for (const format of selectedFormats) {
      await handleExport(format)
      // Small delay between exports
      await new Promise(r => setTimeout(r, 500))
    }
  }
  
  const canExport = currentDocument && currentFormattingProfile && selectedFormats.length > 0
  
  if (!currentProject || !currentDocument) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="text-center">
          <CardContent className="pt-6">
            <BookOpen className="h-12 w-12 text-text-muted mx-auto mb-4" />
            <CardTitle>No Project Loaded</CardTitle>
            <CardDescription>Please complete the previous steps first.</CardDescription>
            <Button onClick={() => navigate('/preview')} className="mt-4">
              Go to Preview
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-40 bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Download className="h-6 w-6 text-primary" />
              <span className="text-xl font-semibold text-text">AI Book Formatter</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/preview')}>
                <ArrowLeft className="h-4 w-4" />
                Back
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
              { label: 'Upload', done: true },
              { label: 'Analyze', done: true },
              { label: 'Design', done: true },
              { label: 'Format', done: true },
              { label: 'Preview', done: true },
              { label: 'Export', current: true },
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text">Export Your Book</h1>
          <p className="text-text-muted mt-1">
            Choose your export formats and settings, then generate production-ready files.
          </p>
        </div>
        
        {/* Export Options */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Export Settings</CardTitle>
            <CardDescription>Configure options for all export formats</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-start gap-3">
                <input type="checkbox" checked={includeTOC} onChange={(e) => setIncludeTOC(e.target.checked)} className="h-4 w-4 rounded border-border text-primary mt-1" />
                <span><span className="text-sm font-medium text-text block">Include Table of Contents</span><span className="text-sm text-text-muted">Generate and include a table of contents</span></span>
              </label>
              <label className="flex items-start gap-3">
                <input type="checkbox" checked={embedFonts} onChange={(e) => setEmbedFonts(e.target.checked)} className="h-4 w-4 rounded border-border text-primary mt-1" />
                <span><span className="text-sm font-medium text-text block">Embed Fonts (PDF)</span><span className="text-sm text-text-muted">Embed fonts in PDF for consistent rendering</span></span>
              </label>
              <label className="flex items-start gap-3">
                <input type="checkbox" checked={addBleed} onChange={(e) => setAddBleed(e.target.checked)} className="h-4 w-4 rounded border-border text-primary mt-1" />
                <span><span className="text-sm font-medium text-text block">Add Bleed (PDF)</span><span className="text-sm text-text-muted">Add 0.125" bleed for full-bleed images</span></span>
              </label>
            </div>
          </CardContent>
        </Card>
        
        {/* Format Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Export Formats</CardTitle>
            <CardDescription>Select one or more formats to export</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {EXPORT_FORMATS.map(({ format, label, description, icon: Icon, recommended }) => {
                const state = exportStates[format]
                const isExporting = state.status === 'exporting'
                const isComplete = state.status === 'complete'
                const hasError = state.status === 'error'
                
                return (
                  <button
                    key={format}
                    onClick={() => handleFormatToggle(format)}
                    className={`relative p-4 rounded-lg border-2 transition-all flex items-start gap-4 ${
                      selectedFormats.includes(format)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    disabled={isExporting}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      selectedFormats.includes(format) ? 'bg-primary text-white' : 'bg-border'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text">{label}</span>
                        {recommended && <Badge variant="success" className="text-xs">Recommended</Badge>}
                        {isExporting && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                        {isComplete && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {hasError && <AlertCircle className="h-4 w-4 text-accent" />}
                      </div>
                      <p className="text-sm text-text-muted mt-1">{description}</p>
                      {isExporting && (
                        <Progress value={state.progress} max={100} className="mt-2" />
                      )}
                      {hasError && (
                        <p className="text-sm text-accent mt-2">{state.error}</p>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedFormats.includes(format)}
                      onChange={() => handleFormatToggle(format)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
        
        {/* Export Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Generate Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={handleExportAll} 
                disabled={!canExport || selectedFormats.some(f => exportStates[f].status === 'exporting')}
                className="flex-1"
                size="lg"
              >
                {selectedFormats.some(f => exportStates[f].status === 'exporting') ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Exporting {selectedFormats.length} format(s)...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Export Selected ({selectedFormats.length})
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => navigate('/preview')}
                disabled={selectedFormats.some(f => exportStates[f].status === 'exporting')}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Preview
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Export History */}
        {exportJobs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Export History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {exportJobs
                  .filter(job => job.projectId === currentProject.id)
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 10)
                  .map(job => (
                    <ExportJobRow key={job.id} job={job} />
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Print Warning */}
        <Card className="mt-6 border-amber-500 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 p-4">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-300">Print-Ready PDF Notice</p>
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                  The exported PDF follows professional publishing standards. However, printer-specific requirements 
                  (bleed, color profile, ink limits, paper stock) may vary. Always request a proof copy from your 
                  printer before full production run.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function ExportJobRow({ job }: { job: any }) {
  const formatLabels: Record<string, string> = {
    pdf: 'PDF',
    docx: 'DOCX',
    epub: 'EPUB',
    markdown: 'Markdown',
  }
  
  const statusColors: Record<string, string> = {
    completed: 'success',
    failed: 'error',
    processing: 'warning',
    pending: 'default',
  }
  
  const statusLabels: Record<string, string> = {
    completed: 'Completed',
    failed: 'Failed',
    processing: 'Processing',
    pending: 'Pending',
  }
  
  return (
    <div className="flex items-center justify-between p-3 bg-background rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <FileText className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-medium text-text">{formatLabels[job.format] || job.format.toUpperCase()}</p>
          <p className="text-sm text-text-muted">{new Date(job.createdAt).toLocaleString()}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant={statusColors[job.status] || 'default'}>
          {statusLabels[job.status] || job.status}
        </Badge>
        {job.status === 'completed' && job.fileUrl && (
          <Button variant="ghost" size="sm" onClick={() => window.open(job.fileUrl, '_blank')}>
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
        {job.status === 'failed' && job.error && (
          <span className="text-sm text-accent" title={job.error}>Error</span>
        )}
      </div>
    </div>
  )
}