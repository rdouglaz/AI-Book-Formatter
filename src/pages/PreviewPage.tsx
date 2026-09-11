import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, RotateCcw, Eye, FileText, ArrowLeft, ArrowRight, ZoomIn, ZoomOut, CheckCircle, Loader2 } from 'lucide-react'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Slider, Progress, Input } from '@/components/ui'
import { useAppStore } from '@/store'
import { renderDocumentToHTML } from '@/utils/exportSimple'
import { findNodesByType } from '@/utils/helpers'
import { paginate, paginationQuality } from '@/utils/pagination'

export default function PreviewPage() {
  const { currentProject, currentDocument, currentFormattingProfile, setProcessingProgress } = useAppStore()
  const navigate = useNavigate()
  
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [zoom, setZoom] = useState(100)
  const [pagesHtml, setPagesHtml] = useState<string[]>([])
  const [rendering, setRendering] = useState(false)
  const [quality, setQuality] = useState<{total:number;widowsFixed:number;orphansFixed:number;emptyPages:number}|null>(null)
  const [showBleed, setShowBleed] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (currentDocument) {
      renderPages()
    }
  }, [currentDocument, currentFormattingProfile, showBleed])
  
  const renderPages = async () => {
    if (!currentDocument || !currentFormattingProfile) return
    
    setRendering(true)
    setProcessingProgress({ stage: 'preview', progress: 10, message: 'Rendering pages...' })
    
    try {
      // Compute pagination quality
      if(currentDocument && currentFormattingProfile){
        const pages = paginate(currentDocument, currentFormattingProfile, { bleedInches: showBleed?0.125:0 })
        setQuality(paginationQuality(pages))
      }
      // Render document to HTML pages
      const html = renderDocumentToHTML(
        currentDocument,
        currentFormattingProfile,
        currentProject?.title || 'Untitled',
        currentProject?.author || 'Unknown Author',
        true
      )
      
      // Parse HTML into pages (simplified - in reality would use a proper pagination engine)
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      const pageElements = doc.querySelectorAll('.book-page')
      
      const pages: string[] = []
      pageElements.forEach((page, i) => {
        pages.push(page.outerHTML)
      })
      
      if (pages.length === 0) {
        // Fallback: treat entire document as one page
        pages.push(doc.body.innerHTML)
      }
      
      setPagesHtml(pages)
      setTotalPages(pages.length)
      setCurrentPage(1)
      
      setProcessingProgress({ stage: 'preview', progress: 100, message: 'Preview ready' })
    } catch (error) {
      console.error('Preview rendering failed:', error)
    } finally {
      setRendering(false)
    }
  }
  
  const goToPage = (page: number) => {
    const clamped = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(clamped)
  }
  
  const nextPage = () => goToPage(currentPage + 1)
  const prevPage = () => goToPage(currentPage - 1)
  
  const handleZoomChange = (value: number[]) => {
    setZoom(value[0])
  }
  
  const handleZoomIn = () => setZoom(Math.min(200, zoom + 25))
  const handleZoomOut = () => setZoom(Math.max(50, zoom - 25))
  const handleResetZoom = () => setZoom(100)
  
  if (!currentProject || !currentDocument) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="text-center">
          <CardContent className="pt-6">
            <Eye className="h-12 w-12 text-text-muted mx-auto mb-4" />
            <CardTitle>No Project Loaded</CardTitle>
            <CardDescription>Please complete the previous steps first.</CardDescription>
            <Button onClick={() => navigate('/format')} className="mt-4">
              Go to Formatting
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  const chapters = findNodesByType(currentDocument, 'chapter')
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-40 bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Eye className="h-6 w-6 text-primary" />
              <span className="text-xl font-semibold text-text">AI Book Formatter</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/format')}>
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
              { label: 'Preview', current: true },
              { label: 'Export', done: false },
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
      
      {/* Toolbar */}
      <div className="border-b border-border bg-background/50 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold text-text">Page Preview</h1>
              <Badge variant="info">{chapters.length} chapters</Badge>
              {quality && <Badge variant="success">{quality.total} pages • {quality.widowsFixed} widows fixed</Badge>}
              <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={showBleed} onChange={e=>setShowBleed(e.target.checked)} className="h-4 w-4 rounded border-border"/> Show bleed/crop</label>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={prevPage} disabled={currentPage <= 1 || rendering}>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <div className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-lg">
                <Input
                  type="number"
                  value={String(currentPage)}
                  onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                  className="w-16 text-center py-1"
                />
                <span className="text-text-muted">/ {totalPages}</span>
              </div>
              
              <Button variant="outline" size="sm" onClick={nextPage} disabled={currentPage >= totalPages || rendering}>
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={zoom <= 50}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              
              <div className="w-32">
                <Slider
                  value={[zoom]}
                  onValueChange={handleZoomChange}
                  min={50}
                  max={200}
                  step={25}
                />
              </div>
              
              <span className="text-sm text-text-muted w-16 text-right">{zoom}%</span>
              
              <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={zoom >= 200}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              
              <Button variant="ghost" size="sm" onClick={handleResetZoom}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Preview Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-auto" style={{ backgroundColor: '#e0e0e0' }}>
        {rendering ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-text-muted">Rendering pages...</p>
            <Progress value={50} max={100} showLabel className="w-64" />
          </div>
        ) : pagesHtml.length === 0 ? (
          <Card className="text-center max-w-md w-full">
            <CardContent className="pt-6">
              <FileText className="h-12 w-12 text-text-muted mx-auto mb-4" />
              <CardTitle>No Pages to Preview</CardTitle>
              <CardDescription>The document could not be rendered. Try re-formatting.</CardDescription>
              <Button onClick={() => navigate('/format')} className="mt-4">
                Go to Formatting
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div 
            ref={previewRef}
            className="relative bg-white shadow-2xl"
            style={{ 
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              width: '100%',
              maxWidth: '600px',
            }}
          >
            <div 
              className="book-page"
              style={{
                minHeight: '800px',
                backgroundColor: 'white',
              }}
              dangerouslySetInnerHTML={{ __html: pagesHtml[currentPage - 1] || '' }}
            />
          </div>
        )}
      </main>
      
      {/* Page Thumbnails / Navigation */}
      {pagesHtml.length > 1 && (
        <div className="border-t border-border bg-background/50 p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-text">Page Thumbnails</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-muted">Page {currentPage} of {totalPages}</span>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {pagesHtml.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToPage(i + 1)}
                  className={`flex-shrink-0 w-20 h-28 bg-white border rounded shadow-sm transition-all ${
                    currentPage === i + 1 ? 'border-primary ring-2 ring-primary' : 'border-border hover:border-primary/50'
                  }`}
                  style={{ transform: 'scale(0.3)', transformOrigin: 'top left' }}
                  dangerouslySetInnerHTML={{ __html: pagesHtml[i] }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Footer Actions */}
      <div className="border-t border-border bg-background p-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-4 justify-end">
          <Button variant="outline" onClick={() => navigate('/format')}>
            <ArrowLeft className="h-4 w-4" />
            Back to Formatting
          </Button>
          <Button onClick={() => navigate('/export')}>
            Continue to Export
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}