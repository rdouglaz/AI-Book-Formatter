import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle, AlertCircle, Sparkles, Brain, ArrowLeft, ArrowRight, Eye, Settings, RefreshCw } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Progress, Badge, Separator } from '@/components/ui'
import { useAppStore } from '@/store'
import { applyFormattingProfile, generateTableOfContents, resolveOrphansAndWidows } from '@/utils/formatting'
import type { FormattingPlan, FormattingDecision } from '@/types'
import { createAIProvider, NVIDIA_FREE_MODELS, GROQ_FREE_MODELS, getAIKeyStatus, type NvidiaModelId } from '@/utils/ai'
import { findNodesByType } from '@/utils/helpers'
import { analyzeDocument as analyzeDocumentLocal } from '@/utils/analysis'
import type { DocumentNode } from '@/types'

export default function FormatPage() {
  const { 
    currentProject, 
    currentDocument, 
    currentVersion, 
    currentFormattingProfile, 
    currentAnalysis,
    setCurrentFormattingPlan,
    setCurrentDocument,
    setCurrentVersion,
    setProcessingProgress 
  } = useAppStore()
  const navigate = useNavigate()
  
  const [formattingPlan, setFormattingPlan] = useState<FormattingPlan | null>(currentVersion?.formattingPlan || null)
  const [formatting, setFormatting] = useState(false)
  const [formattedDocument, setFormattedDocument] = useState<DocumentNode | null>(null)
  const [stage, setStage] = useState<'idle' | 'ai_analysis' | 'applying' | 'resolving' | 'complete'>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<NvidiaModelId>(NVIDIA_FREE_MODELS.nemotronUltra)
  
  useEffect(() => {
    if (currentVersion?.formattingPlan) {
      setFormattingPlan(currentVersion.formattingPlan)
    }
  }, [currentVersion])
  
  const runFormatting = async () => {
    if (!currentDocument || !currentFormattingProfile) return
    
    // Providers fall back to the server route (/api/ai) when the browser has
    // no baked key, so only block when neither baked keys NOR server exist
    // (local dev without keys and without the Vercel function).
    const keyStatus = getAIKeyStatus()
    console.log('[AI] key status:', { nvidia: keyStatus.nvidia, groq: keyStatus.groq })
    const isNvidiaValid = keyStatus.nvidia.ok
    const isGroqValid = keyStatus.groq.ok
    const isLocalhost =
      typeof window !== 'undefined' &&
      /localhost|127\.0\.0\.1/.test(window.location.hostname)
    if (!isNvidiaValid && !isGroqValid && isLocalhost) {
      console.warn('[AI] no usable keys:', keyStatus)
      setError('AI formatting is currently unavailable. Please try again later.')
      setProcessingProgress({ stage: 'ai_analysis', progress: 0, message: 'Service unavailable' })
      return
    }
    
    setFormatting(true)
    setError(null)
    setStage('ai_analysis')
    setProgress(10)
    setProcessingProgress({ stage: 'ai_analysis', progress: 10, message: 'AI analyzing document structure...' })
    
    try {
      // Step 1: AI Formatting Plan — no artificial delay, show real progress
      setProgress(25)
      setProcessingProgress({ stage: 'ai_analysis', progress: 25, message: 'Analyzing document structure...' })
      
      const analysisForAI = currentAnalysis ?? analyzeDocumentLocal(currentDocument)
      // Try NVIDIA Ultra → NVIDIA Lightning → Groq 120b → Groq 20b, first success wins.
      // Keys are passed explicitly so providers use the exact values the gate validated.
      const nvidiaKey = (import.meta as any).env?.VITE_NVIDIA_API_KEY as string | undefined
      const groqKey = (import.meta as any).env?.VITE_GROQ_API_KEY as string | undefined
      let plan: any = null
      let lastErr: any = null
      // Groq first (fast, reliable), NVIDIA as fallback — first success wins.
      // Providers without a baked key use the server route automatically.
      const attempts: Array<{ provider: 'nvidia' | 'groq'; model?: string; apiKey?: string }> = [
        { provider: 'groq', model: GROQ_FREE_MODELS.gptOss120b, apiKey: groqKey },
        { provider: 'groq', model: GROQ_FREE_MODELS.gptOss20b, apiKey: groqKey },
        { provider: 'nvidia', model: NVIDIA_FREE_MODELS.nemotronUltra, apiKey: nvidiaKey },
        { provider: 'nvidia', model: NVIDIA_FREE_MODELS.lightning, apiKey: nvidiaKey },
      ]
      
      for (const a of attempts) {
        try {
          const aiProvider = createAIProvider(a.provider, { model: a.model, apiKey: a.apiKey })
          plan = await aiProvider.analyzeDocument(currentDocument, analysisForAI)
          break
        } catch (e: any) {
          lastErr = e
          console.warn(`[AI] ${a.provider}/${a.model} failed [${e?.code || 'unknown'}], trying next:`, e?.message)
        }
      }
      if (!plan) throw lastErr || new Error('AI formatting is currently unavailable. Please try again.')
      
      setFormattingPlan(plan)
      setCurrentFormattingPlan(plan)
      setStage('applying')
      setProgress(60)
      setProcessingProgress({ stage: 'formatting', progress: 60, message: 'Applying professional formatting...' })
      
      // Step 2: Apply formatting (synchronous, instant)
      let formatted = applyFormattingProfile(currentDocument, currentFormattingProfile)
      
      // Add TOC if needed
      const frontMatter = findNodesByType(formatted, 'front_matter')
      if (frontMatter.length > 0 && plan.frontMatter.some(f => f.type === 'table_of_contents')) {
        const toc = generateTableOfContents(formatted)
        frontMatter[0].children.push(toc)
      }
      
      setProgress(85)
      setProcessingProgress({ stage: 'formatting', progress: 85, message: 'Resolving orphans and widows...' })
      
      // Step 3: Resolve layout issues (instant)
      formatted = resolveOrphansAndWidows(formatted, currentFormattingProfile)
      
      setFormattedDocument(formatted)
      setCurrentDocument(formatted)
      
      // Update version
      if (currentVersion) {
        const newVersion = {
          ...currentVersion,
          document: formatted,
          formattingPlan: plan,
        }
        setCurrentVersion(newVersion)
      }
      
      setStage('complete')
      setProgress(100)
      setProcessingProgress({ stage: 'formatting', progress: 100, message: 'Formatting complete' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Formatting failed')
      setProcessingProgress({ stage: 'formatting', progress: 0, message: 'Formatting failed' })
    } finally {
      setFormatting(false)
    }
  }
  
  const handleReformat = () => {
    setFormattingPlan(null)
    setFormattedDocument(null)
    runFormatting()
  }
  
  if (!currentProject || !currentDocument) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="text-center">
          <CardContent className="pt-6">
            <Brain className="h-12 w-12 text-text-muted mx-auto mb-4" />
            <CardTitle>No Project Loaded</CardTitle>
            <CardDescription>Please complete the previous steps first.</CardDescription>
            <Button onClick={() => navigate('/design')} className="mt-4">
              Go to Design
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  const plan = formattingPlan
  const chapters = findNodesByType(currentDocument, 'chapter')
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-40 bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              <span className="text-xl font-semibold text-text">AI Book Formatter</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/design')}>
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
              { label: 'Format', current: true },
              { label: 'Preview', done: false },
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
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-text-muted mb-2">
            <Sparkles className="h-4 w-4" />
            <span>AI Formatting</span>
          </div>
          <h1 className="text-3xl font-bold text-text">Format Your Book</h1>
          <p className="text-text-muted mt-1">
            {formatting ? 'AI is analyzing your manuscript and applying professional formatting...' : 'Review the AI-generated formatting plan and apply it to your document.'}
          </p>
        </div>

        {!formattingPlan && !formatting && !error && (
          <Card className="mb-6 border-primary/20">
            <CardContent className="pt-6 text-center">
              <Brain className="h-10 w-10 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-text">Ready to format</h3>
              <p className="text-sm text-text-muted mt-1 max-w-xl mx-auto">AI will analyze your manuscript structure and create a formatting plan. The formatting engine will then apply your chosen design.</p>
              <Button onClick={runFormatting} className="mt-4">
                <Sparkles className="h-4 w-4" />
                Start AI Formatting
              </Button>
            </CardContent>
          </Card>
        )}

        {formatting && (
          <Card className="mb-6">
            <CardContent className="pt-6 pb-8">
              <div className="flex items-center gap-4 mb-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div>
                  <p className="font-medium text-text">{stage === 'ai_analysis' ? 'AI Analysis' : stage === 'applying' ? 'Applying Formatting' : 'Resolving Layout Issues'}</p>
                  <p className="text-sm text-text-muted">{progress}% complete</p>
                </div>
              </div>
              <Progress value={progress} max={100} showLabel />
              <p className="text-sm text-text-muted mt-2 text-center">
                {stage === 'ai_analysis' && 'Analyzing document structure and creating formatting plan...'}
                {stage === 'applying' && 'Applying design preset, typography, and layout rules...'}
                {stage === 'resolving' && 'Fixing orphans, widows, and pagination issues...'}
              </p>
            </CardContent>
          </Card>
        )}
        
        {error && (
          <Card className="mb-6 border-accent">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 p-4 bg-accent/10 rounded-lg">
                <AlertCircle className="h-5 w-5 text-accent shrink-0" />
                <p className="text-accent text-sm">{error}</p>
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={() => { setError(null); runFormatting() }}>
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </Button>
                <Button variant="outline" onClick={() => navigate('/design')}>Back to Design</Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {plan && !formatting && (
          <>
            {/* Formatting Plan Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Plan Summary */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    AI Formatting Plan
                  </CardTitle>
                  <CardDescription>Confidence: {Math.round((plan.confidence || 0) * 100)}%</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatBox label="Document Type" value={plan.documentType} />
                    <StatBox label="Chapters" value={plan.chapters} />
                    <StatBox label="Front Matter" value={plan.frontMatter.length} />
                    <StatBox label="Back Matter" value={plan.backMatter.length} />
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium text-text mb-3">Front Matter</h4>
                    <div className="space-y-2">
                      {plan.frontMatter.length === 0 ? (
                        <p className="text-sm text-text-muted">No front matter components</p>
                      ) : (
                        plan.frontMatter.map((item, i) => (
                          <div key={i} className="flex items-center gap-3 p-2 bg-background rounded-lg">
                            <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                              {i + 1}
                            </span>
                            <span className="text-sm text-text">{item.title}</span>
                            <Badge variant="info" className="text-xs">{item.numberingStyle}</Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-text mb-3">Body Matter</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {plan.bodyMatter.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 bg-background rounded-lg">
                          <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs font-medium text-green-700">
                            {i + 1}
                          </span>
                          <span className="text-sm text-text">{item.title}</span>
                          <Badge variant="default" className="text-xs">{item.numberingStyle}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-text mb-3">Back Matter</h4>
                    <div className="space-y-2">
                      {plan.backMatter.length === 0 ? (
                        <p className="text-sm text-text-muted">No back matter components</p>
                      ) : (
                        plan.backMatter.map((item, i) => (
                          <div key={i} className="flex items-center gap-3 p-2 bg-background rounded-lg">
                            <span className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-xs font-medium text-purple-700">
                              {i + 1}
                            </span>
                            <span className="text-sm text-text">{item.title}</span>
                            <Badge variant="default" className="text-xs">{item.numberingStyle}</Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Formatting Decisions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Formatting Decisions
                  </CardTitle>
                  <CardDescription>{plan.formattingDecisions.length} decisions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {plan.formattingDecisions.length === 0 ? (
                      <p className="text-sm text-text-muted text-center py-4">No formatting decisions required</p>
                    ) : (
                      plan.formattingDecisions.map((decision, i) => (
                        <DecisionCard key={i} decision={decision} index={i} />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <Button variant="outline" onClick={handleReformat}>
                <RefreshCw className="h-4 w-4" />
                Re-format
              </Button>
              <Button onClick={() => navigate('/preview')}>
                Continue to Preview
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
        
        {formattedDocument && !formatting && stage === 'complete' && (
          <>
            <Card className="mb-6 border-green-500">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-300">Formatting Complete!</p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Your manuscript has been professionally formatted. Review the preview and export.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <Button variant="outline" onClick={handleReformat}>
                <RefreshCw className="h-4 w-4" />
                Re-format
              </Button>
              <Button onClick={() => navigate('/preview')}>
                Continue to Preview
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-4 bg-background rounded-lg text-center">
      <p className="text-2xl font-bold text-text">{value}</p>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  )
}

function DecisionCard({ decision, index }: { decision: FormattingDecision; index: number }) {
  const confidenceColor = decision.confidence >= 0.8 ? 'green' : decision.confidence >= 0.6 ? 'yellow' : 'red'
  
  return (
    <div className="p-3 bg-background rounded-lg border border-border/50">
      <div className="flex items-start gap-3">
        <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text">{decision.decision}</p>
          <p className="text-xs text-text-muted mt-0.5">{decision.reasoning}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={confidenceColor === 'green' ? 'success' : confidenceColor === 'yellow' ? 'warning' : 'error'} className="text-xs">
              {Math.round(decision.confidence * 100)}% confidence
            </Badge>
            {decision.alternatives && decision.alternatives.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {decision.alternatives.length} alternatives
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}