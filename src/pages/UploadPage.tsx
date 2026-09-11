import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Upload, Loader2, CheckCircle, AlertCircle, X, BookOpen, ArrowLeft, ArrowRight } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Progress, Input, Badge } from '@/components/ui'
import { Textarea } from '@/components/ui/Textarea'
import { useAppStore } from '@/store'
import { parseFile } from '@/utils/parsers'
import type { ParseResult } from '@/utils/parsers'
import { generateId } from '@/utils/helpers'
import { formatFileSize } from '@/utils/helpers'

const ACCEPTED_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/pdf', // .pdf
  'text/plain', // .txt
  'text/markdown', // .md
  '.docx', '.pdf', '.txt', '.md', '.markdown'
]

export default function UploadPage() {
  const { currentProject, addProject, setCurrentProject, setCurrentVersion, setCurrentDocument, setProcessingProgress } = useAppStore()
  const navigate = useNavigate()
  
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [description, setDescription] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (isValidFile(droppedFile)) {
        setFile(droppedFile)
        setParseError(null)
        setParseResult(null)
        // Auto-extract title from filename
        setTitle(droppedFile.name.replace(/\.[^/.]+$/, ''))
      } else {
        setParseError('Invalid file type. Please upload DOCX, PDF, TXT, or Markdown files.')
      }
    }
  }, [])
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (isValidFile(selectedFile)) {
        setFile(selectedFile)
        setParseError(null)
        setParseResult(null)
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''))
      } else {
        setParseError('Invalid file type. Please upload DOCX, PDF, TXT, or Markdown files.')
      }
    }
  }
  
  const isValidFile = (file: File): boolean => {
    const extension = file.name.split('.').pop()?.toLowerCase()
    return ['docx', 'pdf', 'txt', 'md', 'markdown'].includes(extension || '')
  }
  
  const handleParse = async () => {
    if (!file) return
    
    setParsing(true)
    setParseError(null)
    setProcessingProgress({ stage: 'parsing', progress: 10, message: 'Reading file...' })
    
    try {
      const result = await parseFile(file)
      setParseResult(result)
      setProcessingProgress({ stage: 'parsing', progress: 100, message: 'Parse complete' })
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Failed to parse file')
      setProcessingProgress(null)
    } finally {
      setParsing(false)
    }
  }
  
  const handleCreateProject = async () => {
    if (!parseResult || !title.trim() || !author.trim()) return
    
    setProcessingProgress({ stage: 'analyzing', progress: 20, message: 'Creating project...' })
    
    // Create project
    const projectId = generateId()
    const versionId = generateId()
    
    const newProject = {
      id: projectId,
      userId: 'current-user', // Would come from auth
      title: title.trim(),
      author: author.trim(),
      description: description.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentVersionId: versionId,
    }
    
    // Create initial version with original document
    const version = {
      id: versionId,
      projectId,
      versionNumber: 1,
      document: parseResult.document,
      createdAt: new Date().toISOString(),
      isOriginal: true,
    }
    
    addProject(newProject)
    setCurrentProject(newProject)
    setCurrentVersion(version)
    setCurrentDocument(parseResult.document)
    
    setProcessingProgress({ stage: 'analyzing', progress: 100, message: 'Project created' })
    
    // Navigate to analyze page
    navigate('/analyze')
  }
  
  const handleRemoveFile = () => {
    setFile(null)
    setParseResult(null)
    setParseError(null)
    setTitle('')
    fileInputRef.current && (fileInputRef.current.value = '')
  }
  
  const canProceed = file && parseResult && title.trim() && author.trim()
  
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
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        </div>
      </header>
      
      {/* Progress Indicator */}
      <div className="border-b border-border bg-background/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-12">
            {[
              { label: 'Upload', href: '/upload', current: true },
              { label: 'Analyze', href: '/analyze', current: false },
              { label: 'Design', href: '/design', current: false },
              { label: 'Format', href: '/format', current: false },
              { label: 'Preview', href: '/preview', current: false },
              { label: 'Export', href: '/export', current: false },
            ].map((step, i) => (
              <div key={step.label} className="flex items-center">
                <div className={`flex items-center gap-2 px-4 ${step.current ? 'text-primary font-medium' : 'text-text-muted'}`}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium border-2">
                    {step.current ? (
                      <CheckCircle className="h-4 w-4 text-primary border-primary bg-primary" />
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
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text">Upload Manuscript</h1>
          <p className="text-text-muted mt-2">
            Drag and drop your manuscript file, or click to browse. We support DOCX, PDF, TXT, and Markdown.
          </p>
        </div>
        
        {/* Drop Zone */}
        <Card className={`border-2 border-dashed transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-border'}`}>
          <CardContent className="pt-8 pb-8">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(',')}
              onChange={handleFileSelect}
              className="hidden"
              disabled={parsing}
            />
            <div
              className="relative text-center"
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => { if (!file && !parsing) fileInputRef.current?.click() }}
            >
              <div className={!file ? 'cursor-pointer' : ''}>
                <Upload className="mx-auto h-12 w-12 text-text-muted mb-4" />
                
                {file ? (
                  <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-3 p-4 bg-surface rounded-lg border border-border">
                      <FileText className="h-8 w-8 text-primary" />
                      <div className="text-left">
                        <p className="font-medium text-text">{file.name}</p>
                        <p className="text-sm text-text-muted">{formatFileSize(file.size)} • {file.type || 'Unknown type'}</p>
                      </div>
                      <Button variant="ghost" size="sm" type="button" onClick={(e) => { e.stopPropagation(); handleRemoveFile() }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {!parsing && !parseResult && (
                      <Button type="button" onClick={(e) => { e.stopPropagation(); handleParse() }} className="w-full max-w-xs" disabled={parsing}>
                        Parse Document
                      </Button>
                    )}
                    
                    {parsing && (
                      <div className="space-y-2">
                        <Progress value={30} max={100} showLabel />
                        <p className="text-sm text-text-muted">Reading and parsing file...</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="cursor-pointer">
                    <p className="text-lg font-medium text-text mb-1">Drop your manuscript here</p>
                    <p className="text-text-muted mb-4">or click to browse</p>
                    <p className="text-xs text-text-muted">
                      Supports: .docx, .pdf, .txt, .md, .markdown (max 50MB)
                    </p>
                  </div>
                  )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Parse Results */}
        {parseResult && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Parse Successful
              </CardTitle>
              <CardDescription>Document structure detected. Review and adjust metadata before continuing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-muted">Detected Chapters</label>
                  <p className="text-2xl font-bold text-text">{parseResult.document.children.filter(n => n.type === 'chapter').length}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-muted">Paragraphs</label>
                  <p className="text-2xl font-bold text-text">{parseResult.document.children.flatMap(c => c.children).filter(n => n.type === 'paragraph').length}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Book Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter book title"
                />
                <Input
                  label="Author Name"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Enter author name"
                />
              </div>
              
              <Textarea
                label="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of your book"
                rows={3}
              />
            </CardContent>
          </Card>
        )}
        
        {/* Error Display */}
        {parseError && (
          <Card className="mt-6 border-accent">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 p-4 bg-accent/10 rounded-lg">
                <AlertCircle className="h-5 w-5 text-accent" />
                <p className="text-accent">{parseError}</p>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-end">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <Button 
            onClick={handleCreateProject} 
            disabled={!canProceed || parsing}
            className="w-full sm:w-auto"
          >
            {parsing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Project...
              </>
            ) : (
              <>
                Continue to Analysis
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  )
}