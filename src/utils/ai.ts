import type { DocumentNode, FormattingPlan, DocumentAnalysis, FormattingDecision, FormattingPlanSection } from '../types'
import { findNodesByType, traverseDocument } from './helpers'

export interface AIProvider {
  name: string
  analyzeDocument(document: DocumentNode, analysis: DocumentAnalysis): Promise<FormattingPlan>
  detectStructure(document: DocumentNode): Promise<Partial<DocumentAnalysis>>
}

export const NVIDIA_FREE_MODELS = {
  nemotronUltra: 'nvidia/nemotron-3-ultra-550b-a55b',
  deepseekV4Pro: 'deepseek-ai/deepseek-v4-pro-0813',
} as const

export type NvidiaModelId = typeof NVIDIA_FREE_MODELS[keyof typeof NVIDIA_FREE_MODELS]

function getNvidiaConfig(): { apiKey: string; model: string } {
  const envKey = (import.meta as any)?.env?.VITE_NVIDIA_API_KEY as string | undefined
  const envModel = (import.meta as any)?.env?.VITE_NVIDIA_MODEL as string | undefined
  return {
    apiKey: envKey || '',
    model: envModel || 'nvidia/nemotron-3-ultra-550b-a55b',
  }
}

export class NVIDIAProvider implements AIProvider {
  name = 'NVIDIA Nemotron'
  private apiKey: string
  private baseUrl: string
  private model: string

  constructor(apiKey?: string, model?: string) {
    const cfg = getNvidiaConfig()
    this.apiKey = apiKey || cfg.apiKey || ''
    // Use Vite/Vercel proxy to avoid CORS — same origin /api/nvidia
    this.baseUrl = '/api/nvidia/v1'
    this.model = model || cfg.model || 'nvidia/nemotron-3-ultra-550b-a55b'
  }

  private isPlaceholderKey(key: string): boolean {
    return !key || key.length < 20 || key.includes('xxxx') || key.includes('xxxxxxxxxxxxxxxx')
  }

  private async fetchWithTimeout(url: string, init: RequestInit, ms = 25000): Promise<Response> {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), ms)
    try {
      const res = await fetch(url, { ...init, signal: controller.signal })
      return res
    } catch (e: any) {
      if (e?.name === 'AbortError') throw new Error('AI request timed out. Please try again.')
      throw e
    } finally { clearTimeout(id) }
  }

  async analyzeDocument(document: DocumentNode, analysis: DocumentAnalysis): Promise<FormattingPlan> {
    console.log('[NVIDIA] analyzeDocument key:', this.apiKey ? `${this.apiKey.slice(0,8)}... len=${this.apiKey.length}` : 'EMPTY', 'model:', this.model)
    if (!this.apiKey || this.isPlaceholderKey(this.apiKey)) {
      console.warn('NVIDIA key missing/placeholder - env:', (import.meta as any).env?.VITE_NVIDIA_API_KEY ? `${String((import.meta as any).env.VITE_NVIDIA_API_KEY).slice(0,8)}...` : 'EMPTY')
      throw new Error('AI formatting is currently unavailable. Please try again later.')
    }
    const textContent = this.extractTextForAnalysis(document)
    const prompt = this.buildAnalysisPrompt(textContent, analysis)

    const response = await this.fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('NVIDIA API error:', response.status, err)
      throw new Error('AI formatting is currently unavailable. Please try again.')
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error('AI formatting is currently unavailable. Please try again.')
    }

    return JSON.parse(content)
  }

  async detectStructure(document: DocumentNode): Promise<Partial<DocumentAnalysis>> {
    if (!this.apiKey || this.isPlaceholderKey(this.apiKey)) throw new Error('AI formatting is currently unavailable. Please try again later.')
    const textContent = this.extractTextForAnalysis(document)
    const prompt = `Analyze document structure and return JSON with:
    - chaptersDetected: number
    - sectionsDetected: number
    - paragraphsDetected: number
    - blockQuotesDetected: number
    - imagesDetected: number
    - tablesDetected: number
    - footnotesDetected: number
    - frontMatterStructure: string[]
    - backMatterStructure: string[]
    - headingHierarchy: { chapter: string, section: string, subsection: string }

    Document text (first 10000 chars):
    ${textContent.slice(0, 10000)}`

    const response = await this.fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are a document structure analyzer. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('NVIDIA API error:', response.status, err)
      throw new Error('AI formatting is currently unavailable. Please try again.')
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error('AI formatting is currently unavailable. Please try again.')
    }

    return JSON.parse(content)
  }

  private getSystemPrompt(): string {
    return `You are an expert book formatter and publishing professional. Analyze manuscript structure and create detailed formatting plans.

    Return a JSON object with:
    - documentType: "fiction" | "nonfiction" | "academic" | "devotional" | "business" | "memoir" | "other"
    - chapters: number
    - headingHierarchy: { chapter: string, section: string, subsection: string }
    - frontMatter: Array<{ type: string, title: string, nodes: string[], pageBreakBefore: boolean, numberingStyle: "roman" | "arabic" | "none" }>
    - bodyMatter: Array<{ type: string, title: string, nodes: string[], pageBreakBefore: boolean, numberingStyle: "roman" | "arabic" | "none" }>
    - backMatter: Array<{ type: string, title: string, nodes: string[], pageBreakBefore: boolean, numberingStyle: "roman" | "arabic" | "none" }>
    - formattingDecisions: Array<{ nodeId: string, decision: string, reasoning: string, confidence: number, alternatives?: string[] }>
    - confidence: number (0-1)

    Focus on semantic structure, not visual formatting. Identify chapters, sections, front/back matter components.`
  }

  private buildAnalysisPrompt(textContent: string, analysis: DocumentAnalysis): string {
    return `Analyze this manuscript and create a formatting plan.

    Document Analysis:
    - Chapters detected: ${analysis.chaptersDetected}
    - Sections detected: ${analysis.sectionsDetected}
    - Paragraphs: ${analysis.paragraphsDetected}
    - Block quotes: ${analysis.blockQuotesDetected}
    - Images: ${analysis.imagesDetected}
    - Tables: ${analysis.tablesDetected}
    - Footnotes: ${analysis.footnotesDetected}
    - Front matter: ${analysis.frontMatterStructure.join(', ') || 'none'}
    - Back matter: ${analysis.backMatterStructure.join(', ') || 'none'}
    - Heading hierarchy: ${JSON.stringify(analysis.headingHierarchy)}
    - Formatting issues: ${analysis.formattingIssues.length}

    Manuscript text (first 15000 characters):
    ${textContent.slice(0, 15000)}`
  }

  private extractTextForAnalysis(document: DocumentNode): string {
    const parts: string[] = []
    traverseDocument(document, (node) => {
      if (node.content && node.type !== 'document' && node.type !== 'front_matter' && node.type !== 'back_matter') {
        parts.push(`[${node.type.toUpperCase()}] ${node.content}`)
      }
    })
    return parts.join('\n\n')
  }
}

export const GROQ_FREE_MODELS = {
  llama70b: 'llama-3.1-70b-versatile',
  llama8b: 'llama-3.1-8b-instant',
  mixtral: 'mixtral-8x7b-32768',
} as const

export type GroqModelId = typeof GROQ_FREE_MODELS[keyof typeof GROQ_FREE_MODELS]

function getGroqConfig(): { apiKey: string; model: string } {
  const envKey = (import.meta as any)?.env?.VITE_GROQ_API_KEY as string | undefined
  const envModel = (import.meta as any)?.env?.VITE_GROQ_MODEL as string | undefined
  return {
    apiKey: envKey || '',
    model: envModel || 'llama-3.1-70b-versatile',
  }
}

export class GroqProvider implements AIProvider {
  name = 'Groq'
  private apiKey: string
  private baseUrl: string
  private model: string

  constructor(apiKey?: string, model?: string) {
    const cfg = getGroqConfig()
    this.apiKey = apiKey || cfg.apiKey || ''
    this.baseUrl = '/api/groq/openai/v1'
    this.model = model || cfg.model || 'llama-3.1-70b-versatile'
  }

  private isPlaceholderKey(key: string): boolean {
    return !key || key.length < 15 || key.includes('xxxx')
  }

  private async fetchWithTimeout(url: string, init: RequestInit, ms = 25000): Promise<Response> {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), ms)
    try {
      const res = await fetch(url, { ...init, signal: controller.signal })
      return res
    } catch (e: any) {
      if (e?.name === 'AbortError') throw new Error('AI request timed out. Please try again.')
      throw e
    } finally { clearTimeout(id) }
  }

  async analyzeDocument(document: DocumentNode, analysis: DocumentAnalysis): Promise<FormattingPlan> {
    if (!this.apiKey || this.isPlaceholderKey(this.apiKey)) throw new Error('AI formatting is currently unavailable. Please try again later.')
    const textContent = this.extractTextForAnalysis(document)
    const prompt = this.buildAnalysisPrompt(textContent, analysis)
    const response = await this.fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'system', content: this.getSystemPrompt() }, { role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      }),
    })
    if (!response.ok) {
      const err = await response.text()
      console.error('Groq API error:', response.status, err)
      throw new Error('AI formatting is currently unavailable. Please try again.')
    }
    const data = await response.json()
    const content = data.choices[0]?.message?.content
    if (!content) throw new Error('AI formatting is currently unavailable. Please try again.')
    return JSON.parse(content)
  }

  async detectStructure(document: DocumentNode): Promise<Partial<DocumentAnalysis>> {
    if (!this.apiKey || this.isPlaceholderKey(this.apiKey)) throw new Error('AI formatting is currently unavailable. Please try again later.')
    const textContent = this.extractTextForAnalysis(document)
    const prompt = `Analyze document structure and return JSON with:
    - chaptersDetected: number
    - sectionsDetected: number
    - paragraphsDetected: number
    - blockQuotesDetected: number
    - imagesDetected: number
    - tablesDetected: number
    - footnotesDetected: number
    - frontMatterStructure: string[]
    - backMatterStructure: string[]
    - headingHierarchy: { chapter: string, section: string, subsection: string }

    Document text (first 10000 chars):
    ${textContent.slice(0, 10000)}`
    const response = await this.fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'system', content: 'You are a document structure analyzer. Return only valid JSON.' }, { role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    })
    if (!response.ok) {
      const err = await response.text()
      console.error('Groq API error:', response.status, err)
      throw new Error('AI formatting is currently unavailable. Please try again.')
    }
    const data = await response.json()
    const content = data.choices[0]?.message?.content
    if (!content) throw new Error('AI formatting is currently unavailable. Please try again.')
    return JSON.parse(content)
  }

  private getSystemPrompt(): string {
    return `You are an expert book formatter and publishing professional. Analyze manuscript structure and create detailed formatting plans.

    Return a JSON object with:
    - documentType: "fiction" | "nonfiction" | "academic" | "devotional" | "business" | "memoir" | "other"
    - chapters: number
    - headingHierarchy: { chapter: string, section: string, subsection: string }
    - frontMatter: Array<{ type: string, title: string, nodes: string[], pageBreakBefore: boolean, numberingStyle: "roman" | "arabic" | "none" }>
    - bodyMatter: Array<{ type: string, title: string, nodes: string[], pageBreakBefore: boolean, numberingStyle: "roman" | "arabic" | "none" }>
    - backMatter: Array<{ type: string, title: string, nodes: string[], pageBreakBefore: boolean, numberingStyle: "roman" | "arabic" | "none" }>
    - formattingDecisions: Array<{ nodeId: string, decision: string, reasoning: string, confidence: number, alternatives?: string[] }>
    - confidence: number (0-1)

    Focus on semantic structure, not visual formatting. Identify chapters, sections, front/back matter components.`
  }

  private buildAnalysisPrompt(textContent: string, analysis: DocumentAnalysis): string {
    return `Analyze this manuscript and create a formatting plan.

    Document Analysis:
    - Chapters detected: ${analysis.chaptersDetected}
    - Sections detected: ${analysis.sectionsDetected}
    - Paragraphs: ${analysis.paragraphsDetected}
    - Block quotes: ${analysis.blockQuotesDetected}
    - Images: ${analysis.imagesDetected}
    - Tables: ${analysis.tablesDetected}
    - Footnotes: ${analysis.footnotesDetected}
    - Front matter: ${analysis.frontMatterStructure.join(', ') || 'none'}
    - Back matter: ${analysis.backMatterStructure.join(', ') || 'none'}
    - Heading hierarchy: ${JSON.stringify(analysis.headingHierarchy)}
    - Formatting issues: ${analysis.formattingIssues.length}

    Manuscript text (first 15000 characters):
    ${textContent.slice(0, 15000)}`
  }

  private extractTextForAnalysis(document: DocumentNode): string {
    const parts: string[] = []
    traverseDocument(document, (node) => {
      if (node.content && node.type !== 'document' && node.type !== 'front_matter' && node.type !== 'back_matter') {
        parts.push(`[${node.type.toUpperCase()}] ${node.content}`)
      }
    })
    return parts.join('\n\n')
  }
}

export function createAIProvider(type: 'nvidia' | 'groq', config?: { apiKey?: string; model?: string }): AIProvider {
  if (type === 'nvidia') return new NVIDIAProvider(config?.apiKey, config?.model)
  if (type === 'groq') return new GroqProvider(config?.apiKey, config?.model)
  throw new Error(`Unknown AI provider: ${type}. Only 'nvidia' and 'groq' are supported.`)
}

export function getNvidiaModels(): Array<{ id: NvidiaModelId; label: string; endpoint: string; description: string }> {
  return [
    { id: NVIDIA_FREE_MODELS.nemotronUltra, label: 'Nemotron 3 Ultra 550B-A55B', endpoint: 'integrate.api.nvidia.com', description: '1M context, hybrid Mamba-Transformer, best reasoning' },
    { id: NVIDIA_FREE_MODELS.deepseekV4Pro, label: 'DeepSeek V4 Pro 0813', endpoint: 'integrate.api.nvidia.com', description: '262K context, MoE for coding & agentic workflows' },
  ]
}

export function getGroqModels(): Array<{ id: GroqModelId; label: string; endpoint: string; description: string }> {
  return [
    { id: GROQ_FREE_MODELS.llama70b, label: 'Llama 3.1 70B Versatile', endpoint: 'api.groq.com', description: 'Groq fastest — 70B, free' },
    { id: GROQ_FREE_MODELS.llama8b, label: 'Llama 3.1 8B Instant', endpoint: 'api.groq.com', description: 'Groq ultra-fast — 8B' },
    { id: GROQ_FREE_MODELS.mixtral, label: 'Mixtral 8x7B', endpoint: 'api.groq.com', description: 'Groq MoE — 32k' },
  ]
}