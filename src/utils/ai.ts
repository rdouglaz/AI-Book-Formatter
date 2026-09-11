import type { DocumentNode, FormattingPlan, DocumentAnalysis, FormattingDecision, FormattingPlanSection } from '../types'
import { findNodesByType, traverseDocument } from './helpers'

export interface AIProvider {
  name: string
  analyzeDocument(document: DocumentNode, analysis: DocumentAnalysis): Promise<FormattingPlan>
  detectStructure(document: DocumentNode): Promise<Partial<DocumentAnalysis>>
}

export const NVIDIA_FREE_MODELS = {
  nemotronUltra: 'nvidia/nemotron-3-ultra-550b-a55b',
  lightning: 'nvidia/nemotron-3.5-lightning-30b-a3b',
} as const

export type NvidiaModelId = typeof NVIDIA_FREE_MODELS[keyof typeof NVIDIA_FREE_MODELS]

export function cleanApiKey(raw?: string): string {
  return (raw || '').trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '')
}

export function isUsableKey(key: string, minLen: number): boolean {
  const k = cleanApiKey(key)
  return k.length >= minLen && !k.includes('xxxx') && !k.includes('XXXX')
}

function getNvidiaConfig(): { apiKey: string; model: string } {
  const envKey = (import.meta as any)?.env?.VITE_NVIDIA_API_KEY as string | undefined
  const envModel = (import.meta as any)?.env?.VITE_NVIDIA_MODEL as string | undefined
  return {
    apiKey: cleanApiKey(envKey),
    model: envModel || 'nvidia/nemotron-3-ultra-550b-a55b',
  }
}

// Single source of truth for key status — used by UI gating AND providers
export function getAIKeyStatus(): {
  nvidia: { ok: boolean; len: number; reason: string }
  groq: { ok: boolean; len: number; reason: string }
} {
  const nRaw = (import.meta as any)?.env?.VITE_NVIDIA_API_KEY as string | undefined
  const gRaw = (import.meta as any)?.env?.VITE_GROQ_API_KEY as string | undefined
  const n = cleanApiKey(nRaw)
  const g = cleanApiKey(gRaw)
  const nReason = !n ? 'empty' : n.length < 20 ? `too-short(len ${n.length})` : (n.includes('xxxx') || n.includes('XXXX')) ? 'placeholder' : 'ok'
  const gReason = !g ? 'empty' : g.length < 15 ? `too-short(len ${g.length})` : (g.includes('xxxx') || g.includes('XXXX')) ? 'placeholder' : 'ok'
  return {
    nvidia: { ok: nReason === 'ok', len: n.length, reason: nReason },
    groq: { ok: gReason === 'ok', len: g.length, reason: gReason },
  }
}

export class NVIDIAProvider implements AIProvider {
  name = 'NVIDIA Nemotron'
  private apiKey: string
  private baseUrl: string
  private model: string

  constructor(apiKey?: string, model?: string) {
    const cfg = getNvidiaConfig()
    this.apiKey = cleanApiKey(apiKey) || cfg.apiKey || ''
    // Use Vite/Vercel proxy to avoid CORS — same origin /api/nvidia
    this.baseUrl = '/api/nvidia/v1'
    this.model = model || cfg.model || 'nvidia/nemotron-3-ultra-550b-a55b'
  }

  private isPlaceholderKey(key: string): boolean {
    return !isUsableKey(key, 20)
  }

  async analyzeDocument(document: DocumentNode, analysis: DocumentAnalysis): Promise<FormattingPlan> {
    const textContent = this.extractTextForAnalysis(document)
    const prompt = this.buildAnalysisPrompt(textContent, analysis)
    // No baked key (e.g. Vercel bundle built before vars were added):
    // fall back to the server route, which reads keys at request time.
    if (this.isPlaceholderKey(this.apiKey)) {
      console.warn(`[AI nvidia] no baked key, using server route for ${this.model}`)
      return callViaServer('nvidia', this.model, {
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      })
    }

    // NVIDIA 503s often; fail fast (20s, 1 retry) so the chain moves on quickly.
    const response = await fetchWithRetry(
      `${this.baseUrl}/chat/completions`,
      {
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
      },
      { timeoutMs: 20000, retries: 1 }
    )

    if (!response.ok) {
      const err = await response.text()
      console.error(`[AI nvidia] HTTP ${response.status} model=${this.model} body=`, err.slice(0, 500))
      const e: any = new Error('AI formatting is currently unavailable. Please try again.')
      e.code = `AI_HTTP_${response.status}`
      throw e
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      const e: any = new Error('AI formatting is currently unavailable. Please try again.')
      e.code = 'AI_EMPTY'
      throw e
    }

    return parseJsonResponse(content)
  }

  async detectStructure(document: DocumentNode): Promise<Partial<DocumentAnalysis>> {
    if (this.isPlaceholderKey(this.apiKey)) {
      const e: any = new Error('AI formatting is currently unavailable. Please try again later.')
      e.code = 'AI_CONFIG'
      throw e
    }
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

    const response = await fetchWithRetry(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are a document structure analyzer. Return only valid JSON, no markdown fences.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error(`[AI nvidia] HTTP ${response.status} model=${this.model} body=`, err.slice(0, 500))
      const e: any = new Error('AI formatting is currently unavailable. Please try again.')
      e.code = `AI_HTTP_${response.status}`
      throw e
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      const e: any = new Error('AI formatting is currently unavailable. Please try again.')
      e.code = 'AI_EMPTY'
      throw e
    }

    return parseJsonResponse(content)
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
  gptOss120b: 'openai/gpt-oss-120b',
  gptOss20b: 'openai/gpt-oss-20b',
} as const

export type GroqModelId = typeof GROQ_FREE_MODELS[keyof typeof GROQ_FREE_MODELS]

function getGroqConfig(): { apiKey: string; model: string } {
  const envKey = (import.meta as any)?.env?.VITE_GROQ_API_KEY as string | undefined
  const envModel = (import.meta as any)?.env?.VITE_GROQ_MODEL as string | undefined
  return {
    apiKey: cleanApiKey(envKey),
    model: envModel || 'openai/gpt-oss-120b',
  }
}

// Shared: extract JSON even if model wraps it in markdown fences
function parseJsonResponse(content: string): any {
  const trimmed = content.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenceMatch) return JSON.parse(fenceMatch[1].trim())
    const objMatch = trimmed.match(/\{[\s\S]*\}/)
    if (objMatch) return JSON.parse(objMatch[0])
    throw new Error('AI returned non-JSON response')
  }
}

// Server-side route (Vercel function api/ai.js). Used when the browser has
// no baked key — keys are read from runtime env, so no rebuild is needed.
async function callViaServer(
  provider: 'nvidia' | 'groq',
  model: string,
  payload: { messages: any[]; temperature: number; max_tokens: number }
): Promise<any> {
  const res = await fetchWithRetry(
    '/api/ai',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, model, ...payload }),
    },
    { timeoutMs: 60000, retries: 0 }
  );
  const json = await res.json().catch(() => ({} as any));
  if (!res.ok || !(json as any)?.ok) {
    const code = (json as any)?.error || `AI_HTTP_${res.status}`;
    console.error(`[AI ${provider}] server route failed [${code}] model=${model}`);
    const e: any = new Error(
      code === 'AI_CONFIG'
        ? 'AI formatting is currently unavailable. Please try again later.'
        : 'AI formatting is currently unavailable. Please try again.'
    );
    e.code = code;
    throw e;
  }
  const content = (json as any)?.data?.choices?.[0]?.message?.content;
  if (!content) {
    const e: any = new Error('AI formatting is currently unavailable. Please try again.');
    e.code = 'AI_EMPTY';
    throw e;
  }
  return parseJsonResponse(content);
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: { timeoutMs?: number; retries?: number } = {}
): Promise<Response> {
  const { timeoutMs = 25000, retries = 2 } = opts
  let lastErr: any = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, { ...init, signal: controller.signal })
      // Retry on transient overload/rate-limit
      if ((res.status === 503 || res.status === 429) && attempt < retries) {
        await res.text().catch(() => {})
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
        continue
      }
      return res
    } catch (e: any) {
      lastErr = e
      if (e?.name === 'AbortError' && attempt < retries) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
        continue
      }
      if (e?.name === 'AbortError') {
        const t: any = new Error('AI request timed out. Please try again.')
        t.code = 'AI_TIMEOUT'
        throw t
      }
      throw e
    } finally { clearTimeout(id) }
  }
  throw lastErr || new Error('AI request failed. Please try again.')
}

export class GroqProvider implements AIProvider {
  name = 'Groq'
  private apiKey: string
  private baseUrl: string
  private model: string

  constructor(apiKey?: string, model?: string) {
    const cfg = getGroqConfig()
    this.apiKey = cleanApiKey(apiKey) || cfg.apiKey || ''
    this.baseUrl = '/api/groq/openai/v1'
    this.model = model || cfg.model || 'openai/gpt-oss-120b'
  }

  private isPlaceholderKey(key: string): boolean {
    return !isUsableKey(key, 15)
  }

  async analyzeDocument(document: DocumentNode, analysis: DocumentAnalysis): Promise<FormattingPlan> {
    const textContent = this.extractTextForAnalysis(document)
    const prompt = this.buildAnalysisPrompt(textContent, analysis)
    if (this.isPlaceholderKey(this.apiKey)) {
      console.warn(`[AI groq] no baked key, using server route for ${this.model}`)
      return callViaServer('groq', this.model, {
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      })
    }
    const response = await fetchWithRetry(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'system', content: this.getSystemPrompt() }, { role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    })
    if (!response.ok) {
      const err = await response.text()
      console.error(`[AI groq] HTTP ${response.status} model=${this.model} body=`, err.slice(0, 500))
      const e: any = new Error('AI formatting is currently unavailable. Please try again.')
      e.code = `AI_HTTP_${response.status}`
      throw e
    }
    const data = await response.json()
    const content = data.choices[0]?.message?.content
    if (!content) {
      const e: any = new Error('AI formatting is currently unavailable. Please try again.')
      e.code = 'AI_EMPTY'
      throw e
    }
    return parseJsonResponse(content)
  }

  async detectStructure(document: DocumentNode): Promise<Partial<DocumentAnalysis>> {
    if (this.isPlaceholderKey(this.apiKey)) {
      const e: any = new Error('AI formatting is currently unavailable. Please try again later.')
      e.code = 'AI_CONFIG'
      throw e
    }
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
    const response = await fetchWithRetry(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'system', content: 'You are a document structure analyzer. Return only valid JSON, no markdown fences.' }, { role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    })
    if (!response.ok) {
      const err = await response.text()
      console.error(`[AI groq] HTTP ${response.status} model=${this.model} body=`, err.slice(0, 500))
      const e: any = new Error('AI formatting is currently unavailable. Please try again.')
      e.code = `AI_HTTP_${response.status}`
      throw e
    }
    const data = await response.json()
    const content = data.choices[0]?.message?.content
    if (!content) {
      const e: any = new Error('AI formatting is currently unavailable. Please try again.')
      e.code = 'AI_EMPTY'
      throw e
    }
    return parseJsonResponse(content)
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
    { id: NVIDIA_FREE_MODELS.lightning, label: 'Nemotron 3.5 Lightning 30B-A3B', endpoint: 'integrate.api.nvidia.com', description: 'Fastest 30B A3B MoE, best availability fallback' },
  ]
}

export function getGroqModels(): Array<{ id: GroqModelId; label: string; endpoint: string; description: string }> {
  return [
    { id: GROQ_FREE_MODELS.gptOss120b, label: 'GPT OSS 120B', endpoint: 'api.groq.com', description: 'OpenAI flagship open-weight, 500 tps' },
    { id: GROQ_FREE_MODELS.gptOss20b, label: 'GPT OSS 20B', endpoint: 'api.groq.com', description: 'Fast 20B MoE, 1000 tps' },
  ]
}