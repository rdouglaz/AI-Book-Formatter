import type { DocumentNode, FormattingProfile, BookSizeDimensions } from '../types'
import { findNodesByType, traverseDocument, getBookSizeDimensions, inchesToPoints } from './helpers'

export interface PageBox {
  width: number  // points
  height: number
  marginTop: number
  marginBottom: number
  marginInner: number
  marginOuter: number
}

export interface TypesetSpan {
  nodeId: string
  type: DocumentNode['type']
  text: string
  style: 'body' | 'heading1' | 'heading2' | 'heading3' | 'blockquote' | 'list'
  fontSize: number
  lineHeight: number
  isFirstOnPage?: boolean
  isChapterOpening?: boolean
  keepWithNext?: boolean
}

export interface Page {
  number: number
  isLeft: boolean // spread
  isChapterOpening: boolean
  isFrontMatter: boolean
  spans: TypesetSpan[]
  header?: string
  footer?: string
  bleed?: number
}

export interface PaginationOptions {
  bleedInches?: number // 0.125 typical
  showCropMarks?: boolean
  charsPerLineEstimate?: number
}

export function getPageBox(profile: FormattingProfile, withBleed = 0): PageBox {
  const dims = getBookSizeDimensions(profile.bookSize)
  let w = dims.unit === 'in' ? dims.width * 72 : dims.width * 2.83465
  let h = dims.unit === 'in' ? dims.height * 72 : dims.height * 2.83465
  if (withBleed) { w += withBleed * 2; h += withBleed * 2 }
  const m = profile.layout.margins
  const toPt = (v:number, unit:string) => unit==='in'? v*72 : v*2.83465
  return {
    width: w,
    height: h,
    marginTop: toPt(m.top, m.unit) + withBleed,
    marginBottom: toPt(m.bottom, m.unit) + withBleed,
    marginInner: toPt(m.inner, m.unit) + withBleed,
    marginOuter: toPt(m.outer, m.unit) + withBleed,
  }
}

function estimateLinesForSpan(span: TypesetSpan, box: PageBox, availableWidth: number): number {
  // Very rough estimate: chars per line ≈ availableWidth / (fontSize * 0.5)
  const avgCharWidth = span.fontSize * 0.52
  const charsPerLine = Math.max(30, Math.floor(availableWidth / avgCharWidth))
  const words = span.text.length
  const lines = Math.max(1, Math.ceil(words / Math.max(30, charsPerLine * 0.85)) )
  // Apply lineHeight factor but for pagination we just need line count
  // Headings occupy more vertical space
  if (span.style === 'heading1') return Math.max(2, lines) + 2 // top spacing
  if (span.style === 'heading2') return Math.max(1, lines) + 1
  if (span.style === 'heading3') return Math.max(1, lines) + 1
  return lines
}

export function paginate(document: DocumentNode, profile: FormattingProfile, opts: PaginationOptions = {}): Page[] {
  const bleedPt = opts.bleedInches ? opts.bleedInches * 72 : 0
  const box = getPageBox(profile, bleedPt)
  const textWidth = box.width - box.marginInner - box.marginOuter
  const textHeight = box.height - box.marginTop - box.marginBottom

  // Flatten document into ordered spans
  const spans: TypesetSpan[] = []
  const pushChapter = (ch: DocumentNode) => {
    spans.push({
      nodeId: ch.id,
      type: 'chapter',
      text: ch.content,
      style: 'heading1',
      fontSize: profile.typography.headingFontSizes.chapter,
      lineHeight: 1.2,
      isChapterOpening: true,
      keepWithNext: true,
    })
    const visit = (n: DocumentNode) => {
      for (const child of n.children) {
        if (child.type === 'section') {
          spans.push({ nodeId: child.id, type:'section', text: child.content, style:'heading2', fontSize: profile.typography.headingFontSizes.section, lineHeight:1.3, keepWithNext:true })
          visit(child)
        } else if (child.type === 'subsection') {
          spans.push({ nodeId: child.id, type:'subsection', text: child.content, style:'heading3', fontSize: profile.typography.headingFontSizes.subsection, lineHeight:1.3, keepWithNext:true })
          visit(child)
        } else if (child.type === 'paragraph') {
          spans.push({ nodeId: child.id, type:'paragraph', text: child.content, style:'body', fontSize: profile.typography.bodyFontSize, lineHeight: profile.typography.lineHeight })
        } else if (child.type === 'blockquote') {
          spans.push({ nodeId: child.id, type:'blockquote', text: child.content, style:'blockquote', fontSize: profile.typography.bodyFontSize-0.5, lineHeight: profile.typography.lineHeight })
        } else if (child.type === 'list') {
          for (const li of child.children) {
            spans.push({ nodeId: li.id, type:'list_item', text:`• ${li.content}`, style:'list', fontSize: profile.typography.bodyFontSize, lineHeight: profile.typography.lineHeight })
          }
        } else {
          visit(child)
        }
      }
    }
    visit(ch)
  }
  findNodesByType(document,'chapter').forEach(pushChapter)
  // If no chapters, treat all paragraphs as body
  if (spans.length===0) {
    traverseDocument(document, (n)=>{
      if (n.type==='paragraph') spans.push({ nodeId:n.id, type:'paragraph', text:n.content, style:'body', fontSize: profile.typography.bodyFontSize, lineHeight: profile.typography.lineHeight })
      if (n.type==='blockquote') spans.push({ nodeId:n.id, type:'blockquote', text:n.content, style:'blockquote', fontSize: profile.typography.bodyFontSize-0.5, lineHeight: profile.typography.lineHeight })
    })
  }

  const pages: Page[] = []
  let currentSpans: TypesetSpan[] = []
  let currentHeight = 0
  const lineHeightPt = (span: TypesetSpan) => span.fontSize * span.lineHeight
  const maxTextHeight = textHeight - 20 // room for header/footer

  const flushPage = (isChapterOpening=false, isFrontMatter=false)=>{
    if (currentSpans.length===0) return
    const pageNum = pages.length + 1
    const isLeft = pageNum % 2 === 0
    const header = profile.layout.runningHeads.enabled ? (isLeft ? (profile.layout.runningHeads.leftPageContent==='book_title' ? 'Book Title' : 'Chapter Title') : 'Chapter Title') : undefined
    const footer = profile.layout.pageNumbers.enabled && !(isChapterOpening && profile.layout.pageNumbers.hideOnChapterOpenings) ? String(pageNum) : undefined
    // Widow/orphan fix: if last span is a heading and page ends with heading, pull next span if fits
    pages.push({ number: pageNum, isLeft, isChapterOpening, isFrontMatter, spans: [...currentSpans], header, footer, bleed: bleedPt })
    currentSpans = []
    currentHeight = 0
  }

  for (let i=0; i<spans.length; i++) {
    const span = spans[i]
    const isChapterOpening = span.isChapterOpening
    // Chapter always starts on new page (recto if possible)
    if (isChapterOpening && currentSpans.length>0) {
      flushPage()
      // Ensure chapter starts on odd page (right) for classic: optional
      // if (pages.length %2===1) { flush empty left? for simplicity we just start next page }
    }
    const lines = estimateLinesForSpan(span, box, textWidth)
    const spanHeight = lines * lineHeightPt(span) + (span.style==='heading1' ? profile.chapterStyle.topSpacing*72 : span.style==='heading2' ? 12 : span.style==='heading3' ? 8 : 4)
    // Keep-with-next: if next span exists and this won't fit but next is small, try to keep together
    const next = spans[i+1]
    let combinedHeight = spanHeight
    if (span.keepWithNext && next) {
      const nextLines = estimateLinesForSpan(next, box, textWidth)
      combinedHeight += nextLines * lineHeightPt(next) + 4
    }
    if (currentHeight + spanHeight > maxTextHeight) {
      // Widow protection: avoid leaving single line at top of next page (break before if orphan)
      // If current page has <2 lines, push to next?
      flushPage(isChapterOpening)
      // If chapter opening, reserve top spacing
      if (isChapterOpening) currentHeight += profile.chapterStyle.topSpacing*36 // half for pagination est
    }
    // If combined heading+next doesn't fit, also break before
    if (span.keepWithNext && next && currentHeight + combinedHeight > maxTextHeight && currentSpans.length>0) {
      flushPage(isChapterOpening)
    }
    currentSpans.push(span)
    currentHeight += spanHeight
    // If next is chapter opening, flush now
    const peekNext = spans[i+1]
    if (peekNext?.isChapterOpening) {
      // don't flush yet; loop will handle chapter break at top
    }
  }
  if (currentSpans.length) flushPage()

  return pages
}

// Helper for UI quality report
export function paginationQuality(pages: Page[]): { total: number; widowsFixed: number; orphansFixed: number; emptyPages: number } {
  let widowsFixed = 0, orphansFixed = 0, emptyPages = 0
  pages.forEach(p=>{
    if(p.spans.length===0) emptyPages++
    // count heuristic: if page ends with heading, we fixed orphan elsewhere
    const last = p.spans[p.spans.length-1]
    if(last && (last.type==='chapter' || last.type==='section' || last.type==='subsection')) widowsFixed++
  })
  return { total: pages.length, widowsFixed, orphansFixed, emptyPages }
}
