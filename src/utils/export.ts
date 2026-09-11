import type { DocumentNode, FormattingProfile, ExportFormat } from '../types'
import { traverseDocument, findNodesByType, getBookSizeDimensions, inchesToPoints, generateId } from './helpers'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak, PageOrientation, PageMargin, Header, Footer, TableOfContents, Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun, ExternalHyperlink } from 'docx'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { EPUBGen } from 'epub-gen'
import { marked } from 'marked'

export interface ExportOptions {
  format: ExportFormat
  document: DocumentNode
  profile: FormattingProfile
  projectTitle: string
  projectAuthor: string
  includeTOC: boolean
  onProgress?: (progress: number, message: string) => void
}

export async function exportDocument(options: ExportOptions): Promise<Blob> {
  const { format, document, profile, projectTitle, projectAuthor, includeTOC, onProgress } = options
  
  switch (format) {
    case 'pdf':
      return exportToPDF(document, profile, projectTitle, projectAuthor, includeTOC, onProgress)
    case 'docx':
      return exportToDOCX(document, profile, projectTitle, projectAuthor, includeTOC, onProgress)
    case 'epub':
      return exportToEPUB(document, profile, projectTitle, projectAuthor, includeTOC, onProgress)
    case 'markdown':
      return exportToMarkdown(document, profile, projectTitle, projectAuthor, includeTOC, onProgress)
    default:
      throw new Error(`Unsupported export format: ${format}`)
  }
}

async function exportToPDF(
  document: DocumentNode,
  profile: FormattingProfile,
  title: string,
  author: string,
  includeTOC: boolean,
  onProgress?: (progress: number, message: string) => void
): Promise<Blob> {
  // For PDF, we'll render HTML pages and convert to PDF
  // This is a simplified approach - a production version would use a proper layout engine
  
  onProgress?.(10, 'Preparing document for PDF...')
  
  const html = renderDocumentToHTML(document, profile, title, author, includeTOC)
  
  onProgress?.(30, 'Rendering pages...')
  
  // Create a temporary container to render HTML
  const container = document.createElement('div')
  container.innerHTML = html
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '0'
  document.body.appendChild(container)
  
  try {
    const pages = container.querySelectorAll('.book-page')
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: getPDFFormat(profile.bookSize),
    })
    
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    
    for (let i = 0; i < pages.length; i++) {
      onProgress?.(30 + (i / pages.length) * 60, `Rendering page ${i + 1} of ${pages.length}...`)
      
      const page = pages[i] as HTMLElement
      const canvas = await html2canvas(page, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: page.offsetWidth,
        height: page.offsetHeight,
      })
      
      const imgData = canvas.toDataURL('image/png')
      
      if (i > 0) {
        pdf.addPage()
      }
      
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight)
    }
    
    onProgress?.(95, 'Finalizing PDF...')
    
    const blob = pdf.output('blob')
    document.body.removeChild(container)
    
    onProgress?.(100, 'PDF export complete')
    return blob
  } catch (error) {
    document.body.removeChild(container)
    throw error
  }
}

async function exportToDOCX(
  document: DocumentNode,
  profile: FormattingProfile,
  title: string,
  author: string,
  includeTOC: boolean,
  onProgress?: (progress: number, message: string) => void
): Promise<Blob> {
  onProgress?.(10, 'Building DOCX document...')
  
  const size = getBookSizeDimensions(profile.bookSize)
  const margins = profile.layout.margins
  
  const docxMargins: PageMargin = {
    top: inchesToPoints(margins.top),
    bottom: inchesToPoints(margins.bottom),
    left: inchesToPoints(margins.inner),
    right: inchesToPoints(margins.outer),
    header: inchesToPoints(0.5),
    footer: inchesToPoints(0.5),
  }
  
  const children: Paragraph[] = []
  
  // Title page
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 48,
          font: profile.typography.headingFont.family,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  )
  
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `by ${author}`,
          size: 28,
          font: profile.typography.bodyFont.family,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
    })
  )
  
  children.push(new Paragraph({ children: [new PageBreak()] }))
  
  // Copyright page placeholder
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Copyright © ${new Date().getFullYear()} ${author}`,
          size: 20,
          font: profile.typography.bodyFont.family,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 200 },
    })
  )
  
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'All rights reserved.',
          size: 20,
          font: profile.typography.bodyFont.family,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  )
  
  children.push(new Paragraph({ children: [new PageBreak()] }))
  
  // TOC placeholder
  if (includeTOC) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Contents',
            bold: true,
            size: 32,
            font: profile.typography.headingFont.family,
          }),
        ],
        alignment: AlignmentType.CENTER,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
      })
    )
    
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Table of Contents will be generated by Word',
            italics: true,
            size: 20,
            font: profile.typography.bodyFont.family,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    )
    
    children.push(new Paragraph({ children: [new PageBreak()] }))
  }
  
  // Process document nodes
  onProgress?.(30, 'Processing chapters...')
  
  const chapters = findNodesByType(document, 'chapter')
  
  for (let i = 0; i < chapters.length; i++) {
    onProgress?.(30 + (i / chapters.length) * 60, `Processing chapter ${i + 1} of ${chapters.length}...`)
    
    const chapter = chapters[i]
    
    // Chapter heading
    const chapterNumber = i + 1
    const displayNumber = formatChapterNumber(chapterNumber, profile.chapterStyle.numberingStyle)
    const displayTitle = formatChapterTitle(chapter.content, profile.chapterStyle.titleCase)
    const chapterLabel = profile.chapterStyle.includeChapterLabel ? profile.chapterStyle.chapterLabel : ''
    
    const chapterHeadingText = [chapterLabel, displayNumber, displayTitle].filter(Boolean).join(' ')
    
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: chapterHeadingText,
            bold: true,
            size: profile.typography.headingFontSizes.chapter * 2,
            font: profile.typography.headingFont.family,
            allCaps: profile.chapterStyle.titleCase === 'uppercase',
          }),
        ],
        alignment: AlignmentType.CENTER,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: inchesToPoints(profile.chapterStyle.topSpacing), after: inchesToPoints(profile.chapterStyle.titleSpacing) },
        pageBreakBefore: true,
      })
    )
    
    // Process chapter content
    await processNodeForDOCX(chapter, children, profile, 1)
  }
  
  onProgress?.(95, 'Generating DOCX file...')
  
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: docxMargins,
          size: {
            orientation: PageOrientation.PORTRAIT,
            width: inchesToPoints(size.width),
            height: inchesToPoints(size.height),
          },
        },
      },
      children,
    }],
  })
  
  const blob = await Packer.toBlob(doc)
  
  onProgress?.(100, 'DOCX export complete')
  return blob
}

async function processNodeForDOCX(
  node: DocumentNode,
  children: Paragraph[],
  profile: FormattingProfile,
  depth: number
): Promise<void> {
  const formatting = node.formatting || {}
  
  switch (node.type) {
    case 'chapter':
      // Already handled above
      for (const child of node.children) {
        await processNodeForDOCX(child, children, profile, depth + 1)
      }
      break
      
    case 'section':
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: node.content,
              bold: true,
              size: profile.typography.headingFontSizes.section * 2,
              font: profile.typography.headingFont.family,
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      )
      for (const child of node.children) {
        await processNodeForDOCX(child, children, profile, depth + 1)
      }
      break
      
    case 'subsection':
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: node.content,
              bold: true,
              size: profile.typography.headingFontSizes.subsection * 2,
              font: profile.typography.headingFont.family,
            }),
          ],
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 150, after: 50 },
        })
      )
      for (const child of node.children) {
        await processNodeForDOCX(child, children, profile, depth + 1)
      }
      break
      
    case 'paragraph':
      const isFirstInChapter = node.metadata.isFirstInChapter
      const isDropCap = node.metadata.dropCap
      const isSmallCaps = node.metadata.smallCaps
      
      const runs: TextRun[] = []
      
      if (isDropCap && node.content.length > 0) {
        runs.push(
          new TextRun({
            text: node.content[0],
            bold: true,
            size: profile.typography.bodyFontSize * 6,
            font: profile.typography.bodyFont.family,
          })
        )
        runs.push(
          new TextRun({
            text: node.content.slice(1),
            size: profile.typography.bodyFontSize * 2,
            font: profile.typography.bodyFont.family,
          })
        )
      } else if (isSmallCaps) {
        const smallCapsLength = node.metadata.smallCapsLength || 50
        const smallCapsText = node.content.slice(0, smallCapsLength).toUpperCase()
        const restText = node.content.slice(smallCapsLength)
        
        runs.push(
          new TextRun({
            text: smallCapsText,
            size: profile.typography.bodyFontSize * 2,
            font: profile.typography.bodyFont.family,
            smallCaps: true,
          })
        )
        if (restText) {
          runs.push(
            new TextRun({
              text: restText,
              size: profile.typography.bodyFontSize * 2,
              font: profile.typography.bodyFont.family,
            })
          )
        }
      } else {
        runs.push(
          new TextRun({
            text: node.content,
            size: (formatting.fontSize || profile.typography.bodyFontSize) * 2,
            font: formatting.fontFamily || profile.typography.bodyFont.family,
            bold: formatting.fontWeight && formatting.fontWeight >= 600,
            italics: formatting.fontStyle === 'italic',
          })
        )
      }
      
      children.push(
        new Paragraph({
          children: runs,
          alignment: getAlignmentType(formatting.textAlign),
          spacing: {
            before: formatting.marginTop ? inchesToPoints(formatting.marginTop / 72) : 0,
            after: formatting.marginBottom ? inchesToPoints(formatting.marginBottom / 72) : 0,
            line: Math.round((formatting.lineHeight || profile.typography.lineHeight) * 240),
            lineRule: 'auto',
          },
          indent: {
            firstLine: formatting.firstLineIndent ? inchesToPoints(formatting.firstLineIndent / 72) : undefined,
            left: formatting.marginLeft ? inchesToPoints(formatting.marginLeft / 72) : undefined,
            right: formatting.marginRight ? inchesToPoints(formatting.marginRight / 72) : undefined,
          },
        })
      )
      break
      
    case 'blockquote':
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: node.content,
              size: ((formatting.fontSize || profile.typography.bodyFontSize) - 1) * 2,
              font: formatting.fontFamily || profile.typography.bodyFont.family,
              italics: true,
            }),
          ],
          alignment: AlignmentType.LEFT,
          indent: {
            left: inchesToPoints(0.5),
            right: inchesToPoints(0.5),
          },
          spacing: {
            before: 200,
            after: 200,
            line: Math.round((formatting.lineHeight || profile.typography.lineHeight) * 240),
          },
        })
      )
      break
      
    case 'list':
      for (const item of node.children) {
        await processNodeForDOCX(item, children, profile, depth + 1)
      }
      break
      
    case 'list_item':
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `• ${node.content}`,
              size: profile.typography.bodyFontSize * 2,
              font: profile.typography.bodyFont.family,
            }),
          ],
          indent: {
            left: inchesToPoints(0.5),
            hanging: inchesToPoints(0.25),
          },
          spacing: { after: 100 },
          bullet: { level: 0 },
        })
      )
      break
      
    case 'page_break':
      children.push(new Paragraph({ children: [new PageBreak()] }))
      break
      
    default:
      // Process children for other node types
      for (const child of node.children) {
        await processNodeForDOCX(child, children, profile, depth + 1)
      }
  }
}

async function exportToEPUB(
  document: DocumentNode,
  profile: FormattingProfile,
  title: string,
  author: string,
  includeTOC: boolean,
  onProgress?: (progress: number, message: string) => void
): Promise<Blob> {
  onProgress?.(10, 'Building EPUB...')
  
  const chapters = findNodesByType(document, 'chapter')
  const content: Array<{ title: string; content: string }> = []
  
  // Title page
  content.push({
    title: 'Title Page',
    content: `<h1>${title}</h1><p class="author">by ${author}</p>`,
  })
  
  // Copyright
  content.push({
    title: 'Copyright',
    content: `<p>Copyright © ${new Date().getFullYear()} ${author}</p><p>All rights reserved.</p>`,
  })
  
  // Process chapters
  for (let i = 0; i < chapters.length; i++) {
    onProgress?.(20 + (i / chapters.length) * 70, `Processing chapter ${i + 1} of ${chapters.length}...`)
    
    const chapter = chapters[i]
    const chapterNumber = i + 1
    const displayNumber = formatChapterNumber(chapterNumber, profile.chapterStyle.numberingStyle)
    const displayTitle = formatChapterTitle(chapter.content, profile.chapterStyle.titleCase)
    const chapterLabel = profile.chapterStyle.includeChapterLabel ? profile.chapterStyle.chapterLabel : ''
    
    const chapterHeadingText = [chapterLabel, displayNumber, displayTitle].filter(Boolean).join(' ')
    
    let chapterHTML = `<h1>${chapterHeadingText}</h1>`
    chapterHTML += await renderNodeToHTML(chapter, profile)
    
    content.push({
      title: chapterHeadingText,
      content: chapterHTML,
    })
  }
  
  onProgress?.(95, 'Generating EPUB file...')
  
  const epubGen = new EPUBGen({
    title,
    author,
    publisher: 'AI Book Formatter',
    content,
    toc: includeTOC,
    css: generateEPUBCSS(profile),
  })
  
  const blob = await epubGen.generate()
  
  onProgress?.(100, 'EPUB export complete')
  return blob
}

async function exportToMarkdown(
  document: DocumentNode,
  profile: FormattingProfile,
  title: string,
  author: string,
  includeTOC: boolean,
  onProgress?: (progress: number, message: string) => void
): Promise<Blob> {
  onProgress?.(10, 'Generating Markdown...')
  
  let markdown = `---\ntitle: "${title}"\nauthor: "${author}"\ndate: "${new Date().toISOString().split('T')[0]}"\n---\n\n`
  
  markdown += `# ${title}\n\nby ${author}\n\n---\n\n`
  
  if (includeTOC) {
    markdown += '## Contents\n\n'
    const chapters = findNodesByType(document, 'chapter')
    chapters.forEach((chapter, i) => {
      const displayNumber = formatChapterNumber(i + 1, profile.chapterStyle.numberingStyle)
      const displayTitle = formatChapterTitle(chapter.content, profile.chapterStyle.titleCase)
      markdown += `${i + 1}. ${displayNumber}: ${displayTitle}\n`
    })
    markdown += '\n---\n\n'
  }
  
  const chapters = findNodesByType(document, 'chapter')
  
  for (let i = 0; i < chapters.length; i++) {
    onProgress?.(20 + (i / chapters.length) * 70, `Processing chapter ${i + 1} of ${chapters.length}...`)
    
    const chapter = chapters[i]
    const chapterNumber = i + 1
    const displayNumber = formatChapterNumber(chapterNumber, profile.chapterStyle.numberingStyle)
    const displayTitle = formatChapterTitle(chapter.content, profile.chapterStyle.titleCase)
    const chapterLabel = profile.chapterStyle.includeChapterLabel ? profile.chapterStyle.chapterLabel : ''
    
    const chapterHeadingText = [chapterLabel, displayNumber, displayTitle].filter(Boolean).join(' ')
    
    markdown += `# ${chapterHeadingText}\n\n`
    markdown += await renderNodeToMarkdown(chapter, profile)
    markdown += '\n\n'
  }
  
  onProgress?.(95, 'Finalizing Markdown...')
  
  const blob = new Blob([markdown], { type: 'text/markdown' })
  
  onProgress?.(100, 'Markdown export complete')
  return blob
}

function renderDocumentToHTML(
  document: DocumentNode,
  profile: FormattingProfile,
  title: string,
  author: string,
  includeTOC: boolean
): string {
  const size = getBookSizeDimensions(profile.bookSize)
  const margins = profile.layout.margins
  
  const pageWidth = size.unit === 'in' ? size.width * 96 : size.width * 96 / 25.4
  const pageHeight = size.unit === 'in' ? size.height * 96 : size.height * 96 / 25.4
  const marginTop = margins.unit === 'in' ? margins.top * 96 : margins.top * 96 / 25.4
  const marginBottom = margins.unit === 'in' ? margins.bottom * 96 : margins.bottom * 96 / 25.4
  const marginInner = margins.unit === 'in' ? margins.inner * 96 : margins.inner * 96 / 25.4
  const marginOuter = margins.unit === 'in' ? margins.outer * 96 : margins.outer * 96 / 25.4
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          size: ${size.width}${size.unit} ${size.height}${size.unit};
          margin: ${margins.top}${margins.unit} ${margins.outer}${margins.unit} ${margins.bottom}${margins.unit} ${margins.inner}${margins.unit};
          @top-left { content: "${profile.headersFooters.header.enabled ? title : ''}"; font-size: 9pt; font-variant: small-caps; }
          @top-right { content: "${profile.headersFooters.header.enabled ? 'Chapter Title' : ''}"; font-size: 9pt; font-variant: small-caps; }
          @bottom-center { content: counter(page); font-size: 10pt; }
        }
        body { font-family: "${profile.typography.bodyFont.family}", serif; font-size: ${profile.typography.bodyFontSize}pt; line-height: ${profile.typography.lineHeight}; margin: 0; padding: 0; }
        .book-page { width: ${pageWidth}px; height: ${pageHeight}px; box-sizing: border-box; padding: ${marginTop}px ${marginOuter}px ${marginBottom}px ${marginInner}px; page-break-after: always; position: relative; }
        .book-page:last-child { page-break-after: auto; }
        h1 { font-family: "${profile.typography.headingFont.family}", serif; font-size: ${profile.typography.headingFontSizes.chapter}pt; text-align: center; margin-top: ${profile.chapterStyle.topSpacing * 96}px; margin-bottom: ${profile.chapterStyle.titleSpacing * 96}px; page-break-before: always; }
        h2 { font-family: "${profile.typography.headingFont.family}", serif; font-size: ${profile.typography.headingFontSizes.section}pt; margin-top: 48px; margin-bottom: 24px; }
        h3 { font-family: "${profile.typography.headingFont.family}", serif; font-size: ${profile.typography.headingFontSizes.subsection}pt; margin-top: 36px; margin-bottom: 12px; }
        p { margin: 0; text-align: justify; text-indent: ${profile.typography.firstLineIndent * 96}px; }
        p.first-paragraph { text-indent: 0; font-variant: small-caps; }
        blockquote { margin: 48px 48px; font-style: italic; font-size: ${profile.typography.bodyFontSize - 0.5}pt; }
        ul, ol { margin-left: 48px; }
        li { margin-bottom: 12px; }
        .chapter { page-break-before: always; }
        .front-matter, .back-matter { page-break-before: always; }
      </style>
    </head>
    <body>
  `
  
  // Render front matter
  const frontMatter = findNodesByType(document, 'front_matter')
  if (frontMatter.length > 0) {
    html += '<div class="front-matter">'
    frontMatter[0].children.forEach(node => {
      html += renderNodeToHTMLString(node, profile)
    })
    html += '</div>'
  }
  
  // Render chapters
  const chapters = findNodesByType(document, 'chapter')
  chapters.forEach((chapter, index) => {
    html += renderNodeToHTMLString(chapter, profile, index === 0)
  })
  
  // Render back matter
  const backMatter = findNodesByType(document, 'back_matter')
  if (backMatter.length > 0) {
    html += '<div class="back-matter">'
    backMatter[0].children.forEach(node => {
      html += renderNodeToHTMLString(node, profile)
    })
    html += '</div>'
  }
  
  html += '</body></html>'
  
  return html
}

function renderNodeToHTMLString(node: DocumentNode, profile: FormattingProfile, isFirstChapter: boolean = false): string {
  const formatting = node.formatting || {}
  
  switch (node.type) {
    case 'chapter':
      const chapterNumber = parseInt(node.metadata.displayNumber || '1')
      const displayNumber = formatChapterNumber(chapterNumber, profile.chapterStyle.numberingStyle)
      const displayTitle = formatChapterTitle(node.content, profile.chapterStyle.titleCase)
      const chapterLabel = profile.chapterStyle.includeChapterLabel ? profile.chapterStyle.chapterLabel : ''
      const headingText = [chapterLabel, displayNumber, displayTitle].filter(Boolean).join(' ')
      
      let html = `<div class="chapter"><h1>${headingText}</h1>`
      node.children.forEach(child => {
        html += renderNodeToHTMLString(child, profile)
      })
      html += '</div>'
      return html
      
    case 'section':
      return `<h2>${node.content}</h2>` + node.children.map(c => renderNodeToHTMLString(c, profile)).join('')
      
    case 'subsection':
      return `<h3>${node.content}</h3>` + node.children.map(c => renderNodeToHTMLString(c, profile)).join('')
      
    case 'paragraph':
      const isFirst = node.metadata.isFirstInChapter
      const isDropCap = node.metadata.dropCap
      const isSmallCaps = node.metadata.smallCaps
      
      let className = 'paragraph'
      if (isFirst) className += ' first-paragraph'
      
      let content = node.content
      if (isDropCap && content.length > 0) {
        content = `<span class="drop-cap">${content[0]}</span>${content.slice(1)}`
      }
      if (isSmallCaps) {
        const len = node.metadata.smallCapsLength || 50
        content = `<span class="small-caps">${content.slice(0, len).toUpperCase()}</span>${content.slice(len)}`
      }
      
      return `<p class="${className}">${content}</p>`
      
    case 'blockquote':
      return `<blockquote>${node.content}</blockquote>`
      
    case 'list':
      return `<ul>${node.children.map(c => renderNodeToHTMLString(c, profile)).join('')}</ul>`
      
    case 'list_item':
      return `<li>${node.content}</li>`
      
    case 'page_break':
      return '<div style="page-break-before: always;"></div>'
      
    default:
      return node.children.map(c => renderNodeToHTMLString(c, profile)).join('')
  }
}

async function renderNodeToHTML(node: DocumentNode, profile: FormattingProfile): Promise<string> {
  return renderNodeToHTMLString(node, profile)
}

async function renderNodeToMarkdown(node: DocumentNode, profile: FormattingProfile): Promise<string> {
  let markdown = ''
  
  for (const child of node.children) {
    switch (child.type) {
      case 'section':
        markdown += `## ${child.content}\n\n`
        markdown += await renderNodeToMarkdown(child, profile)
        break
      case 'subsection':
        markdown += `### ${child.content}\n\n`
        markdown += await renderNodeToMarkdown(child, profile)
        break
      case 'paragraph':
        markdown += `${child.content}\n\n`
        break
      case 'blockquote':
        markdown += `> ${child.content}\n\n`
        break
      case 'list':
        child.children.forEach(item => {
          markdown += `- ${item.content}\n`
        })
        markdown += '\n'
        break
      default:
        markdown += await renderNodeToMarkdown(child, profile)
    }
  }
  
  return markdown
}

function getPDFFormat(size: BookSize): [number, number] {
  const dims = getBookSizeDimensions(size)
  if (dims.unit === 'in') {
    return [dims.width * 72, dims.height * 72]
  }
  return [dims.width * 72 / 25.4, dims.height * 72 / 25.4]
}

function formatChapterNumber(number: number, style: string): string {
  switch (style) {
    case 'roman':
      return toRoman(number)
    case 'word':
      return toWords(number)
    case 'none':
      return ''
    default:
      return number.toString()
  }
}

function formatChapterTitle(title: string, style: string): string {
  switch (style) {
    case 'uppercase':
      return title.toUpperCase()
    case 'title':
      return toTitleCase(title)
    case 'sentence':
      return toSentenceCase(title)
    default:
      return title
  }
}

function toRoman(num: number): string {
  const romanNumerals: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
  ]
  
  let result = ''
  for (const [value, numeral] of romanNumerals) {
    while (num >= value) {
      result += numeral
      num -= value
    }
  }
  return result
}

function toWords(num: number): string {
  const words = [
    'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
    'twenty-one', 'twenty-two', 'twenty-three', 'twenty-four', 'twenty-five', 'twenty-six', 'twenty-seven', 'twenty-eight', 'twenty-nine', 'thirty',
  ]
  
  if (num < words.length) return words[num]
  
  if (num < 100) {
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
    const ten = Math.floor(num / 10)
    const one = num % 10
    return tens[ten] + (one ? '-' + words[one] : '')
  }
  
  return num.toString()
}

function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
}

function toSentenceCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

function getAlignmentType(align?: string): AlignmentType {
  switch (align) {
    case 'center': return AlignmentType.CENTER
    case 'right': return AlignmentType.RIGHT
    case 'justify': return AlignmentType.JUSTIFIED
    default: return AlignmentType.LEFT
  }
}

function generateEPUBCSS(profile: FormattingProfile): string {
  return `
    body { font-family: "${profile.typography.bodyFont.family}", serif; font-size: ${profile.typography.bodyFontSize}pt; line-height: ${profile.typography.lineHeight}; margin: 1em; }
    h1 { font-family: "${profile.typography.headingFont.family}", serif; font-size: ${profile.typography.headingFontSizes.chapter}pt; text-align: center; margin-top: 2em; margin-bottom: 1em; page-break-before: always; }
    h2 { font-family: "${profile.typography.headingFont.family}", serif; font-size: ${profile.typography.headingFontSizes.section}pt; margin-top: 1.5em; margin-bottom: 0.5em; }
    h3 { font-family: "${profile.typography.headingFont.family}", serif; font-size: ${profile.typography.headingFontSizes.subsection}pt; margin-top: 1em; margin-bottom: 0.5em; }
    p { margin: 0 0 0.5em; text-align: justify; text-indent: ${profile.typography.firstLineIndent}em; }
    p.first-paragraph { text-indent: 0; font-variant: small-caps; }
    blockquote { margin: 1em 2em; font-style: italic; font-size: ${profile.typography.bodyFontSize - 0.5}pt; }
    .drop-cap { float: left; font-size: 3em; line-height: 1; padding-right: 0.1em; font-weight: bold; }
    .small-caps { font-variant: small-caps; }
  `
}