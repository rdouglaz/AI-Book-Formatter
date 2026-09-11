import type { DocumentNode, NodeType, NodeMetadata } from '../types'
import { createDocumentNode, generateId } from './helpers'
import { convertToHtml } from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist'
import { marked } from 'marked'
import matter from 'gray-matter'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Use local worker bundled by Vite - fixes CORS and ?import fetch errors
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
} catch {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
}

export interface ParseResult {
  document: DocumentNode
  rawText: string
  metadata: Record<string, unknown>
}

export async function parseDocx(file: File): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await convertToHtml({ arrayBuffer })
  
  const html = result.value
  const messages = result.messages
  
  const document = parseHtmlToDocument(html)
  
  return {
    document,
    rawText: htmlToText(html),
    metadata: { messages: messages.map(m => `${m.type}: ${m.message}`) },
  }
}

export async function parsePdf(file: File): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  
  let fullText = ''
  const pages: string[] = []
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .filter((item): item is pdfjsLib.TextItem => 'str' in item)
      .map(item => item.str)
      .join(' ')
    pages.push(pageText)
    fullText += pageText + '\n\n'
  }
  
  const document = parsePlainTextToDocument(fullText)
  
  return {
    document,
    rawText: fullText,
    metadata: { pageCount: pdf.numPages, pages },
  }
}

export async function parseTxt(file: File): Promise<ParseResult> {
  const text = await file.text()
  const document = parsePlainTextToDocument(text)
  
  return {
    document,
    rawText: text,
    metadata: {},
  }
}

export async function parseMarkdown(file: File): Promise<ParseResult> {
  const text = await file.text()
  const { data: frontmatter, content } = matter(text)
  
  const document = parseMarkdownToDocument(content, frontmatter)
  
  return {
    document,
    rawText: text,
    metadata: { frontmatter },
  }
}

function parseHtmlToDocument(html: string): DocumentNode {
  const doc = createDocumentNode('document', '', [])
  
  const parser = new DOMParser()
  const htmlDoc = parser.parseFromString(html, 'text/html')
  const body = htmlDoc.body
  
  let currentChapter: DocumentNode | null = null
  let currentSection: DocumentNode | null = null
  let currentSubsection: DocumentNode | null = null
  let paragraphOrder = 0
  
  function processElement(element: Element, parent: DocumentNode) {
    const tagName = element.tagName.toLowerCase()
    
    switch (tagName) {
      case 'h1':
        currentChapter = createDocumentNode('chapter', element.textContent || '', [], { level: 1, order: paragraphOrder++ })
        currentSection = null
        currentSubsection = null
        parent.children.push(currentChapter)
        break
      case 'h2':
        currentSection = createDocumentNode('section', element.textContent || '', [], { level: 2, order: paragraphOrder++ })
        currentSubsection = null
        if (currentChapter) {
          currentChapter.children.push(currentSection)
        } else {
          parent.children.push(currentSection)
        }
        break
      case 'h3':
        currentSubsection = createDocumentNode('subsection', element.textContent || '', [], { level: 3, order: paragraphOrder++ })
        if (currentSection) {
          currentSection.children.push(currentSubsection)
        } else if (currentChapter) {
          currentChapter.children.push(currentSubsection)
        } else {
          parent.children.push(currentSubsection)
        }
        break
      case 'h4':
      case 'h5':
      case 'h6':
        const subNode = createDocumentNode('subsection', element.textContent || '', [], { level: parseInt(tagName[1]), order: paragraphOrder++ })
        if (currentSubsection) {
          currentSubsection.children.push(subNode)
        } else if (currentSection) {
          currentSection.children.push(subNode)
        } else if (currentChapter) {
          currentChapter.children.push(subNode)
        } else {
          parent.children.push(subNode)
        }
        break
      case 'p':
        const text = element.textContent?.trim() || ''
        if (text) {
          const para = createDocumentNode('paragraph', text, [], { order: paragraphOrder++ })
          const targetParent = currentSubsection || currentSection || currentChapter || parent
          targetParent.children.push(para)
        }
        break
      case 'blockquote':
        const quoteText = element.textContent?.trim() || ''
        if (quoteText) {
          const quote = createDocumentNode('blockquote', quoteText, [], { order: paragraphOrder++ })
          const targetParent = currentSubsection || currentSection || currentChapter || parent
          targetParent.children.push(quote)
        }
        break
      case 'ul':
      case 'ol':
        const list = createDocumentNode('list', '', [], { order: paragraphOrder++ })
        Array.from(element.children).forEach(li => {
          if (li.tagName.toLowerCase() === 'li') {
            const item = createDocumentNode('list_item', li.textContent?.trim() || '', [], { order: paragraphOrder++ })
            list.children.push(item)
          }
        })
        const targetParent = currentSubsection || currentSection || currentChapter || parent
        targetParent.children.push(list)
        break
      case 'table':
        const table = createDocumentNode('table', '', [], { order: paragraphOrder++ })
        // Simple table parsing - could be enhanced
        const targetParentTable = currentSubsection || currentSection || currentChapter || parent
        targetParentTable.children.push(table)
        break
      case 'img':
        const img = createDocumentNode('image', element.getAttribute('src') || '', [], { order: paragraphOrder++ })
        const targetParentImg = currentSubsection || currentSection || currentChapter || parent
        targetParentImg.children.push(img)
        break
      case 'div':
      case 'span':
        Array.from(element.children).forEach(child => processElement(child, parent))
        break
      default:
        if (element.textContent?.trim()) {
          const para = createDocumentNode('paragraph', element.textContent.trim(), [], { order: paragraphOrder++ })
          const targetParent = currentSubsection || currentSection || currentChapter || parent
          targetParent.children.push(para)
        }
    }
  }
  
  Array.from(body.children).forEach(child => processElement(child, doc))
  
  return doc
}

function parsePlainTextToDocument(text: string): DocumentNode {
  const doc = createDocumentNode('document', '', [])
  const lines = text.split('\n')
  
  let currentChapter: DocumentNode | null = null
  let currentSection: DocumentNode | null = null
  let currentSubsection: DocumentNode | null = null
  let paragraphOrder = 0
  let inFrontMatter = true
  let frontMatterNodes: DocumentNode[] = []
  
  const chapterRegex = /^(chapter|CHAPTER)\s+(\d+|[IVXLCDM]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)[\s:\-.]*\s*(.*)$/i
  const sectionRegex = /^(\d+\.\d+|\d+)\s+(.+)$/
  const headingRegex = /^#{1,6}\s+(.+)$/
  
  let currentParagraphLines: string[] = []
  
  function flushParagraph() {
    if (currentParagraphLines.length > 0) {
      const text = currentParagraphLines.join(' ').trim()
      if (text) {
        const para = createDocumentNode('paragraph', text, [], { order: paragraphOrder++ })
        const targetParent = currentSubsection || currentSection || currentChapter || doc
        targetParent.children.push(para)
      }
      currentParagraphLines = []
    }
  }
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    // Check for chapter heading
    const chapterMatch = trimmed.match(chapterRegex)
    if (chapterMatch) {
      flushParagraph()
      inFrontMatter = false
      const chapterTitle = chapterMatch[3]?.trim() || `Chapter ${chapterMatch[2]}`
      currentChapter = createDocumentNode('chapter', chapterTitle, [], { level: 1, order: paragraphOrder++ })
      doc.children.push(currentChapter)
      currentSection = null
      currentSubsection = null
      continue
    }
    
    // Check for markdown headings
    const headingMatch = trimmed.match(headingRegex)
    if (headingMatch) {
      flushParagraph()
      const level = headingMatch[0].match(/^#+/)?.[0].length || 1
      const headingText = headingMatch[1]
      
      if (level === 1) {
        inFrontMatter = false
        currentChapter = createDocumentNode('chapter', headingText, [], { level: 1, order: paragraphOrder++ })
        doc.children.push(currentChapter)
        currentSection = null
        currentSubsection = null
      } else if (level === 2) {
        currentSection = createDocumentNode('section', headingText, [], { level: 2, order: paragraphOrder++ })
        if (currentChapter) {
          currentChapter.children.push(currentSection)
        } else {
          doc.children.push(currentSection)
        }
        currentSubsection = null
      } else {
        currentSubsection = createDocumentNode('subsection', headingText, [], { level: level, order: paragraphOrder++ })
        const parent = currentSection || currentChapter || doc
        parent.children.push(currentSubsection)
      }
      continue
    }
    
    // Check for numbered sections
    const sectionMatch = trimmed.match(sectionRegex)
    if (sectionMatch && currentChapter) {
      flushParagraph()
      currentSection = createDocumentNode('section', sectionMatch[2], [], { level: 2, order: paragraphOrder++ })
      currentChapter.children.push(currentSection)
      currentSubsection = null
      continue
    }
    
    // Empty line - paragraph break
    if (!trimmed) {
      flushParagraph()
      continue
    }
    
    // Regular text line
    currentParagraphLines.push(trimmed)
  }
  
  flushParagraph()
  
  // If no chapters detected, treat as single chapter
  if (doc.children.filter(c => c.type === 'chapter').length === 0 && doc.children.length > 0) {
    const chapter = createDocumentNode('chapter', 'Chapter 1', doc.children, { level: 1, order: 0 })
    doc.children = [chapter]
  }
  
  return doc
}

function parseMarkdownToDocument(content: string, frontmatter: Record<string, unknown>): DocumentNode {
  const doc = createDocumentNode('document', '', [])
  
  // Add front matter from frontmatter
  if (frontmatter.title || frontmatter.author) {
    const frontMatter = createDocumentNode('front_matter', '', [])
    if (frontmatter.title) {
      frontMatter.children.push(createDocumentNode('title_page', `${frontmatter.title}`, []))
    }
    if (frontmatter.author) {
      frontMatter.children.push(createDocumentNode('title_page', `By ${frontmatter.author}`, []))
    }
    doc.children.push(frontMatter)
  }
  
  // Parse markdown content
  const tokens = marked.lexer(content)
  let currentChapter: DocumentNode | null = null
  let currentSection: DocumentNode | null = null
  let currentSubsection: DocumentNode | null = null
  let paragraphOrder = 0
  
  for (const token of tokens) {
    switch (token.type) {
      case 'heading':
        if (token.depth === 1) {
          currentChapter = createDocumentNode('chapter', token.text, [], { level: 1, order: paragraphOrder++ })
          doc.children.push(currentChapter)
          currentSection = null
          currentSubsection = null
        } else if (token.depth === 2) {
          currentSection = createDocumentNode('section', token.text, [], { level: 2, order: paragraphOrder++ })
          if (currentChapter) {
            currentChapter.children.push(currentSection)
          } else {
            doc.children.push(currentSection)
          }
          currentSubsection = null
        } else {
          currentSubsection = createDocumentNode('subsection', token.text, [], { level: token.depth, order: paragraphOrder++ })
          const parent = currentSection || currentChapter || doc
          parent.children.push(currentSubsection)
        }
        break
      case 'paragraph':
        const para = createDocumentNode('paragraph', token.text, [], { order: paragraphOrder++ })
        const targetParent = currentSubsection || currentSection || currentChapter || doc
        targetParent.children.push(para)
        break
      case 'blockquote':
        const quote = createDocumentNode('blockquote', token.text, [], { order: paragraphOrder++ })
        const targetParentQuote = currentSubsection || currentSection || currentChapter || doc
        targetParentQuote.children.push(quote)
        break
      case 'list':
        const list = createDocumentNode('list', '', [], { order: paragraphOrder++ })
        if (token.items) {
          token.items.forEach(item => {
            const listItem = createDocumentNode('list_item', item.text, [], { order: paragraphOrder++ })
            list.children.push(listItem)
          })
        }
        const targetParentList = currentSubsection || currentSection || currentChapter || doc
        targetParentList.children.push(list)
        break
      case 'table':
        const table = createDocumentNode('table', '', [], { order: paragraphOrder++ })
        const targetParentTable = currentSubsection || currentSection || currentChapter || doc
        targetParentTable.children.push(table)
        break
      case 'hr':
        const pageBreak = createDocumentNode('page_break', '', [], { order: paragraphOrder++ })
        const targetParentHR = currentSubsection || currentSection || currentChapter || doc
        targetParentHR.children.push(pageBreak)
        break
    }
  }
  
  return doc
}

function htmlToText(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}

export async function parseFile(file: File): Promise<ParseResult> {
  const extension = file.name.split('.').pop()?.toLowerCase()
  
  switch (extension) {
    case 'docx':
      return parseDocx(file)
    case 'pdf':
      return parsePdf(file)
    case 'txt':
      return parseTxt(file)
    case 'md':
    case 'markdown':
      return parseMarkdown(file)
    default:
      throw new Error(`Unsupported file format: ${extension}`)
  }
}