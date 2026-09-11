import type { DocumentNode, DocumentAnalysis, FormattingIssue, HeadingHierarchy, NodeType } from '../types'
import { traverseDocument, findNodesByType, countWords } from './helpers'

export function analyzeDocument(document: DocumentNode): DocumentAnalysis {
  const chapters = findNodesByType(document, 'chapter')
  const sections = findNodesByType(document, 'section')
  const subsections = findNodesByType(document, 'subsection')
  const paragraphs = findNodesByType(document, 'paragraph')
  const blockquotes = findNodesByType(document, 'blockquote')
  const images = findNodesByType(document, 'image')
  const tables = findNodesByType(document, 'table')
  const footnotes = findNodesByType(document, 'footnote')
  const lists = findNodesByType(document, 'list')
  
  const frontMatterNodes = findNodesByType(document, 'front_matter')
  const backMatterNodes = findNodesByType(document, 'back_matter')
  const titlePages = findNodesByType(document, 'title_page')
  const copyrightPages = findNodesByType(document, 'copyright_page')
  const dedications = findNodesByType(document, 'dedication')
  const epigraphs = findNodesByType(document, 'epigraph')
  const tocNodes = findNodesByType(document, 'table_of_contents')
  const forewords = findNodesByType(document, 'foreword')
  const prefaces = findNodesByType(document, 'preface')
  const acknowledgments = findNodesByType(document, 'acknowledgments')
  const halfTitles = findNodesByType(document, 'half_title')
  const subtitles = findNodesByType(document, 'subtitle')
  
  const formattingIssues = detectFormattingIssues(document)
  
  const frontMatterStructure: string[] = []
  if (halfTitles.length) frontMatterStructure.push('half_title')
  if (titlePages.length) frontMatterStructure.push('title_page')
  if (subtitles.length) frontMatterStructure.push('subtitle')
  if (copyrightPages.length) frontMatterStructure.push('copyright_page')
  if (dedications.length) frontMatterStructure.push('dedication')
  if (epigraphs.length) frontMatterStructure.push('epigraph')
  if (tocNodes.length) frontMatterStructure.push('table_of_contents')
  if (forewords.length) frontMatterStructure.push('foreword')
  if (prefaces.length) frontMatterStructure.push('preface')
  if (acknowledgments.length) frontMatterStructure.push('acknowledgments')
  
  const backMatterStructure: string[] = []
  if (backMatterNodes.length) backMatterStructure.push('back_matter')
  
  const headingHierarchy = detectHeadingHierarchy(document)
  
  return {
    id: crypto.randomUUID(),
    versionId: '',
    chaptersDetected: chapters.length,
    sectionsDetected: sections.length + subsections.length,
    paragraphsDetected: paragraphs.length,
    blockQuotesDetected: blockquotes.length,
    imagesDetected: images.length,
    tablesDetected: tables.length,
    footnotesDetected: footnotes.length,
    formattingIssues,
    frontMatterStructure,
    backMatterStructure,
    headingHierarchy,
    createdAt: new Date().toISOString(),
  }
}

function detectFormattingIssues(document: DocumentNode): FormattingIssue[] {
  const issues: FormattingIssue[] = []
  const paragraphs = findNodesByType(document, 'paragraph')
  const chapters = findNodesByType(document, 'chapter')
  const headings = [
    ...chapters,
    ...findNodesByType(document, 'section'),
    ...findNodesByType(document, 'subsection'),
  ]
  const blockquotes = findNodesByType(document, 'blockquote')
  const lists = findNodesByType(document, 'list')
  
  // Check for inconsistent paragraph spacing
  const paragraphSpacing = new Map<string, number>()
  paragraphs.forEach(p => {
    const spacing = p.formatting?.marginBottom || 0
    const key = `${spacing}`
    paragraphSpacing.set(key, (paragraphSpacing.get(key) || 0) + 1)
  })
  
  if (paragraphSpacing.size > 3) {
    issues.push({
      id: crypto.randomUUID(),
      type: 'inconsistent_paragraph_spacing',
      severity: 'warning',
      message: `Found ${paragraphSpacing.size} different paragraph spacing values`,
      nodeIds: paragraphs.map(p => p.id),
      suggestion: 'Normalize paragraph spacing according to design preset',
      autoFixable: true,
    })
  }
  
  // Check for inconsistent indentation
  const indentations = new Map<string, number>()
  paragraphs.forEach(p => {
    const indent = p.formatting?.firstLineIndent || 0
    const key = `${indent}`
    indentations.set(key, (indentations.get(key) || 0) + 1)
  })
  
  if (indentations.size > 2) {
    issues.push({
      id: crypto.randomUUID(),
      type: 'inconsistent_indentation',
      severity: 'warning',
      message: `Found ${indentations.size} different indentation values`,
      nodeIds: paragraphs.map(p => p.id),
      suggestion: 'Apply consistent first-line indentation',
      autoFixable: true,
    })
  }
  
  // Check for inconsistent heading styles
  const headingStyles = new Map<string, number>()
  headings.forEach(h => {
    const style = JSON.stringify(h.formatting || {})
    headingStyles.set(style, (headingStyles.get(style) || 0) + 1)
  })
  
  if (headingStyles.size > headings.length * 0.5 && headings.length > 2) {
    issues.push({
      id: crypto.randomUUID(),
      type: 'inconsistent_heading_style',
      severity: 'warning',
      message: 'Heading styles are inconsistent across the document',
      nodeIds: headings.map(h => h.id),
      suggestion: 'Apply consistent heading hierarchy styling',
      autoFixable: true,
    })
  }
  
  // Check for orphan headings (headings at end of page)
  // This would need actual pagination - placeholder for now
  
  // Check for repeated page breaks
  const pageBreaks = findNodesByType(document, 'page_break')
  let consecutiveBreaks = 0
  traverseDocument(document, (node) => {
    if (node.type === 'page_break') {
      consecutiveBreaks++
      if (consecutiveBreaks > 1) {
        issues.push({
          id: crypto.randomUUID(),
          type: 'repeated_page_breaks',
          severity: 'warning',
          message: 'Consecutive page breaks detected',
          nodeIds: [node.id],
          suggestion: 'Remove unnecessary page breaks',
          autoFixable: true,
        })
      }
    } else {
      consecutiveBreaks = 0
    }
  })
  
  // Check for missing chapter breaks
  if (chapters.length > 1) {
    let prevChapterEnd = 0
    chapters.forEach((chapter, index) => {
      if (index > 0) {
        // Check if there's a page break before chapter
        const hasPageBreakBefore = chapter.formatting?.pageBreakBefore
        if (!hasPageBreakBefore) {
          issues.push({
            id: crypto.randomUUID(),
            type: 'missing_chapter_breaks',
            severity: 'info',
            message: `Chapter "${chapter.content}" may be missing a page break before it`,
            nodeIds: [chapter.id],
            suggestion: 'Add page break before chapter start',
            autoFixable: true,
          })
        }
      }
      prevChapterEnd = index
    })
  }
  
  // Check for unusual spacing (multiple blank lines)
  // This would be detected during parsing
  
  // Check for inconsistent quotation formatting
  const quoteStyles = new Map<string, number>()
  blockquotes.forEach(q => {
    const style = JSON.stringify(q.formatting || {})
    quoteStyles.set(style, (quoteStyles.get(style) || 0) + 1)
  })
  
  if (quoteStyles.size > 1 && blockquotes.length > 2) {
    issues.push({
      id: crypto.randomUUID(),
      type: 'inconsistent_quotation_formatting',
      severity: 'info',
      message: 'Block quotes have inconsistent formatting',
      nodeIds: blockquotes.map(q => q.id),
      suggestion: 'Apply consistent quotation styling',
      autoFixable: true,
    })
  }
  
  // Check for inconsistent lists
  const listStyles = new Map<string, number>()
  lists.forEach(l => {
    const style = JSON.stringify(l.formatting || {})
    listStyles.set(style, (listStyles.get(style) || 0) + 1)
  })
  
  if (listStyles.size > 1 && lists.length > 2) {
    issues.push({
      id: crypto.randomUUID(),
      type: 'inconsistent_lists',
      severity: 'info',
      message: 'Lists have inconsistent formatting',
      nodeIds: lists.map(l => l.id),
      suggestion: 'Apply consistent list styling',
      autoFixable: true,
    })
  }
  
  // Check for oversized whitespace
  paragraphs.forEach(p => {
    const text = p.content.trim()
    if (text.length === 0 && p.formatting && (p.formatting.marginTop || 0) > 50) {
      issues.push({
        id: crypto.randomUUID(),
        type: 'oversized_whitespace',
        severity: 'warning',
        message: 'Excessive whitespace detected in empty paragraph',
        nodeIds: [p.id],
        suggestion: 'Remove or reduce excessive spacing',
        autoFixable: true,
      })
    }
  })
  
  return issues
}

function detectHeadingHierarchy(document: DocumentNode): HeadingHierarchy {
  const chapters = findNodesByType(document, 'chapter')
  const sections = findNodesByType(document, 'section')
  const subsections = findNodesByType(document, 'subsection')
  
  // Determine the actual hierarchy based on document structure
  let chapterLevel = 'H1'
  let sectionLevel = 'H2'
  let subsectionLevel = 'H3'
  
  if (chapters.length === 0 && sections.length > 0) {
    chapterLevel = 'H1'
    sectionLevel = 'H2'
    subsectionLevel = 'H3'
  } else if (chapters.length > 0) {
    chapterLevel = 'H1'
    sectionLevel = 'H2'
    subsectionLevel = 'H3'
  }
  
  return {
    chapter: chapterLevel,
    section: sectionLevel,
    subsection: subsectionLevel,
  }
}

export function getDocumentStats(document: DocumentNode): Record<string, number> {
  const stats: Record<string, number> = {}
  
  traverseDocument(document, (node) => {
    stats[node.type] = (stats[node.type] || 0) + 1
    if (node.type === 'paragraph') {
      stats.wordCount = (stats.wordCount || 0) + countWords(node.content)
    }
  })
  
  return stats
}

export function estimatePageCount(
  document: DocumentNode,
  wordsPerPage: number = 300
): number {
  let totalWords = 0
  traverseDocument(document, (node) => {
    if (node.type === 'paragraph' || node.type === 'blockquote') {
      totalWords += countWords(node.content)
    }
  })
  
  // Add overhead for chapters, headings, etc.
  const headingCount = findNodesByType(document, 'chapter').length +
                       findNodesByType(document, 'section').length +
                       findNodesByType(document, 'subsection').length
  
  totalWords += headingCount * 50 // Approximate words for headings
  
  return Math.max(1, Math.ceil(totalWords / wordsPerPage))
}