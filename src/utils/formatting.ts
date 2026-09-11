import type { 
  DocumentNode, 
  FormattingProfile, 
  DesignPreset, 
  BookSize,
  TypographySettings,
  LayoutSettings,
  ChapterStyleSettings,
  NodeFormatting 
} from '../types'
import { traverseDocument, findNodesByType, getBookSizeDimensions, inchesToPoints } from './helpers'

export const DESIGN_PRESETS: Record<DesignPreset, Partial<FormattingProfile>> = {
  classic: {
    name: 'Classic',
    designPreset: 'classic',
    typography: {
      bodyFont: { family: 'Crimson Pro', weight: 400, style: 'normal', source: 'google' },
      headingFont: { family: 'Crimson Pro', weight: 600, style: 'normal', source: 'google' },
      bodyFontSize: 11,
      headingFontSizes: { chapter: 24, section: 16, subsection: 13 },
      lineHeight: 1.65,
      paragraphSpacing: 0,
      firstLineIndent: 1.5,
    },
    layout: {
      margins: { top: 1, bottom: 1, inner: 0.875, outer: 0.75, unit: 'in' },
      pageNumbers: { enabled: true, position: 'bottom-center', format: 'arabic', startPage: 1, hideOnChapterOpenings: true },
      runningHeads: { enabled: true, leftPageContent: 'book_title', rightPageContent: 'chapter_title', fontSize: 9, fontStyle: 'small-caps' },
    },
    headersFooters: {
      header: { enabled: true, leftPageContent: 'book_title', rightPageContent: 'chapter_title', fontSize: 9, fontStyle: 'small-caps' },
      footer: { enabled: true, position: 'bottom-center', format: 'arabic', startPage: 1, hideOnChapterOpenings: true },
    },
    chapterStyle: {
      numberingStyle: 'word',
      titleCase: 'uppercase',
      includeChapterLabel: true,
      chapterLabel: 'CHAPTER',
      topSpacing: 2.5,
      titleSpacing: 1,
      firstParagraphStyle: 'small-caps',
      decoration: 'line',
    },
  },
  modern: {
    name: 'Modern',
    designPreset: 'modern',
    typography: {
      bodyFont: { family: 'Source Serif 4', weight: 400, style: 'normal', source: 'google' },
      headingFont: { family: 'DM Sans', weight: 600, style: 'normal', source: 'google' },
      bodyFontSize: 11,
      headingFontSizes: { chapter: 28, section: 18, subsection: 14 },
      lineHeight: 1.7,
      paragraphSpacing: 0,
      firstLineIndent: 1.5,
    },
    layout: {
      margins: { top: 1, bottom: 0.875, inner: 0.75, outer: 0.625, unit: 'in' },
      pageNumbers: { enabled: true, position: 'bottom-outside', format: 'arabic', startPage: 1, hideOnChapterOpenings: true },
      runningHeads: { enabled: true, leftPageContent: 'book_title', rightPageContent: 'chapter_title', fontSize: 8, fontStyle: 'normal' },
    },
    headersFooters: {
      header: { enabled: true, leftPageContent: 'book_title', rightPageContent: 'chapter_title', fontSize: 8, fontStyle: 'normal' },
      footer: { enabled: true, position: 'bottom-outside', format: 'arabic', startPage: 1, hideOnChapterOpenings: true },
    },
    chapterStyle: {
      numberingStyle: 'numeric',
      titleCase: 'title',
      includeChapterLabel: false,
      chapterLabel: '',
      topSpacing: 3,
      titleSpacing: 1.5,
      firstParagraphStyle: 'normal',
      decoration: 'none',
    },
  },
  literary: {
    name: 'Literary',
    designPreset: 'literary',
    typography: {
      bodyFont: { family: 'Literata', weight: 400, style: 'normal', source: 'google' },
      headingFont: { family: 'Literata', weight: 500, style: 'normal', source: 'google' },
      bodyFontSize: 11.5,
      headingFontSizes: { chapter: 22, section: 15, subsection: 12.5 },
      lineHeight: 1.8,
      paragraphSpacing: 0,
      firstLineIndent: 2,
    },
    layout: {
      margins: { top: 1.125, bottom: 1.125, inner: 1, outer: 0.875, unit: 'in' },
      pageNumbers: { enabled: true, position: 'bottom-center', format: 'arabic', startPage: 1, hideOnChapterOpenings: true },
      runningHeads: { enabled: false, leftPageContent: 'none', rightPageContent: 'none', fontSize: 9, fontStyle: 'italic' },
    },
    headersFooters: {
      header: { enabled: false, leftPageContent: 'none', rightPageContent: 'none', fontSize: 9, fontStyle: 'italic' },
      footer: { enabled: true, position: 'bottom-center', format: 'arabic', startPage: 1, hideOnChapterOpenings: true },
    },
    chapterStyle: {
      numberingStyle: 'roman',
      titleCase: 'title',
      includeChapterLabel: true,
      chapterLabel: 'Chapter',
      topSpacing: 3.5,
      titleSpacing: 2,
      firstParagraphStyle: 'drop-cap',
      decoration: 'ornament',
    },
  },
  academic: {
    name: 'Academic',
    designPreset: 'academic',
    typography: {
      bodyFont: { family: 'STIX Two Text', weight: 400, style: 'normal', source: 'google' },
      headingFont: { family: 'STIX Two Text', weight: 600, style: 'normal', source: 'google' },
      bodyFontSize: 10.5,
      headingFontSizes: { chapter: 18, section: 14, subsection: 12 },
      lineHeight: 1.55,
      paragraphSpacing: 6,
      firstLineIndent: 0,
    },
    layout: {
      margins: { top: 1, bottom: 1, inner: 0.875, outer: 0.75, unit: 'in' },
      pageNumbers: { enabled: true, position: 'top-outside', format: 'arabic', startPage: 1, hideOnChapterOpenings: false },
      runningHeads: { enabled: true, leftPageContent: 'book_title', rightPageContent: 'chapter_title', fontSize: 8, fontStyle: 'small-caps' },
    },
    headersFooters: {
      header: { enabled: true, leftPageContent: 'book_title', rightPageContent: 'chapter_title', fontSize: 8, fontStyle: 'small-caps' },
      footer: { enabled: false, position: 'bottom-center', format: 'arabic', startPage: 1, hideOnChapterOpenings: false },
    },
    chapterStyle: {
      numberingStyle: 'numeric',
      titleCase: 'title',
      includeChapterLabel: true,
      chapterLabel: 'Chapter',
      topSpacing: 1.5,
      titleSpacing: 0.5,
      firstParagraphStyle: 'normal',
      decoration: 'line',
    },
  },
  devotional: {
    name: 'Devotional',
    designPreset: 'devotional',
    typography: {
      bodyFont: { family: 'Cardo', weight: 400, style: 'normal', source: 'google' },
      headingFont: { family: 'Cardo', weight: 700, style: 'normal', source: 'google' },
      bodyFontSize: 12,
      headingFontSizes: { chapter: 20, section: 15, subsection: 13 },
      lineHeight: 1.75,
      paragraphSpacing: 0,
      firstLineIndent: 1.5,
    },
    layout: {
      margins: { top: 1.25, bottom: 1.25, inner: 1, outer: 0.875, unit: 'in' },
      pageNumbers: { enabled: true, position: 'bottom-center', format: 'arabic', startPage: 1, hideOnChapterOpenings: true },
      runningHeads: { enabled: true, leftPageContent: 'book_title', rightPageContent: 'chapter_title', fontSize: 9, fontStyle: 'italic' },
    },
    headersFooters: {
      header: { enabled: true, leftPageContent: 'book_title', rightPageContent: 'chapter_title', fontSize: 9, fontStyle: 'italic' },
      footer: { enabled: true, position: 'bottom-center', format: 'arabic', startPage: 1, hideOnChapterOpenings: true },
    },
    chapterStyle: {
      numberingStyle: 'word',
      titleCase: 'title',
      includeChapterLabel: true,
      chapterLabel: 'Day',
      topSpacing: 2,
      titleSpacing: 1.5,
      firstParagraphStyle: 'small-caps',
      decoration: 'ornament',
    },
  },
  business: {
    name: 'Business',
    designPreset: 'business',
    typography: {
      bodyFont: { family: 'Inter', weight: 400, style: 'normal', source: 'google' },
      headingFont: { family: 'Inter', weight: 600, style: 'normal', source: 'google' },
      bodyFontSize: 11,
      headingFontSizes: { chapter: 26, section: 17, subsection: 13 },
      lineHeight: 1.6,
      paragraphSpacing: 8,
      firstLineIndent: 0,
    },
    layout: {
      margins: { top: 0.875, bottom: 0.875, inner: 0.75, outer: 0.625, unit: 'in' },
      pageNumbers: { enabled: true, position: 'bottom-outside', format: 'arabic', startPage: 1, hideOnChapterOpenings: true },
      runningHeads: { enabled: true, leftPageContent: 'book_title', rightPageContent: 'chapter_title', fontSize: 8, fontStyle: 'normal' },
    },
    headersFooters: {
      header: { enabled: true, leftPageContent: 'book_title', rightPageContent: 'chapter_title', fontSize: 8, fontStyle: 'normal' },
      footer: { enabled: true, position: 'bottom-outside', format: 'arabic', startPage: 1, hideOnChapterOpenings: true },
    },
    chapterStyle: {
      numberingStyle: 'numeric',
      titleCase: 'uppercase',
      includeChapterLabel: true,
      chapterLabel: 'CHAPTER',
      topSpacing: 2,
      titleSpacing: 1,
      firstParagraphStyle: 'bold',
      decoration: 'line',
    },
  },
  minimal: {
    name: 'Minimal',
    designPreset: 'minimal',
    typography: {
      bodyFont: { family: 'IBM Plex Sans', weight: 400, style: 'normal', source: 'google' },
      headingFont: { family: 'IBM Plex Sans', weight: 500, style: 'normal', source: 'google' },
      bodyFontSize: 11,
      headingFontSizes: { chapter: 24, section: 15, subsection: 12 },
      lineHeight: 1.65,
      paragraphSpacing: 6,
      firstLineIndent: 0,
    },
    layout: {
      margins: { top: 1, bottom: 1, inner: 0.875, outer: 0.75, unit: 'in' },
      pageNumbers: { enabled: true, position: 'bottom-center', format: 'arabic', startPage: 1, hideOnChapterOpenings: true },
      runningHeads: { enabled: false, leftPageContent: 'none', rightPageContent: 'none', fontSize: 8, fontStyle: 'normal' },
    },
    headersFooters: {
      header: { enabled: false, leftPageContent: 'none', rightPageContent: 'none', fontSize: 8, fontStyle: 'normal' },
      footer: { enabled: true, position: 'bottom-center', format: 'arabic', startPage: 1, hideOnChapterOpenings: true },
    },
    chapterStyle: {
      numberingStyle: 'none',
      titleCase: 'title',
      includeChapterLabel: false,
      chapterLabel: '',
      topSpacing: 3,
      titleSpacing: 1.5,
      firstParagraphStyle: 'normal',
      decoration: 'none',
    },
  },
}

export function createDefaultProfile(overrides: Partial<FormattingProfile> = {}): FormattingProfile {
  const baseProfile: FormattingProfile = {
    id: 'default',
    name: 'Classic',
    bookSize: '6x9',
    designPreset: 'classic',
    typography: DESIGN_PRESETS.classic.typography!,
    layout: DESIGN_PRESETS.classic.layout!,
    headersFooters: DESIGN_PRESETS.classic.headersFooters!,
    chapterStyle: DESIGN_PRESETS.classic.chapterStyle!,
  }
  
  return deepMerge(baseProfile, overrides)
}

export function applyDesignPreset(profile: FormattingProfile, preset: DesignPreset): FormattingProfile {
  const presetConfig = DESIGN_PRESETS[preset]
  if (!presetConfig) return profile
  
  return deepMerge(profile, { ...presetConfig, designPreset: preset, name: presetConfig.name })
}

function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target }
  
  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceValue = source[key]
    const targetValue = target[key]
    
    if (sourceValue === undefined) continue
    
    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      result[key] = deepMerge(targetValue, sourceValue as Record<string, unknown>) as T[keyof T]
    } else {
      result[key] = sourceValue as T[keyof T]
    }
  }
  
  return result
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function applyFormattingProfile(document: DocumentNode, profile: FormattingProfile): DocumentNode {
  const formattedDoc = cloneDocument(document)
  
  // Apply typography to all text nodes
  traverseDocument(formattedDoc, (node) => {
    node.formatting = applyNodeFormatting(node, profile)
  })
  
  // Apply chapter-specific formatting
  const chapters = findNodesByType(formattedDoc, 'chapter')
  chapters.forEach((chapter, index) => {
    applyChapterFormatting(chapter, profile, index + 1)
  })
  
  // Apply section/subsection formatting
  const sections = findNodesByType(formattedDoc, 'section')
  sections.forEach(section => applySectionFormatting(section, profile))
  
  const subsections = findNodesByType(formattedDoc, 'subsection')
  subsections.forEach(subsection => applySubsectionFormatting(subsection, profile))
  
  // Apply blockquote formatting
  const blockquotes = findNodesByType(formattedDoc, 'blockquote')
  blockquotes.forEach(blockquote => applyBlockquoteFormatting(blockquote, profile))
  
  // Apply list formatting
  const lists = findNodesByType(formattedDoc, 'list')
  lists.forEach(list => applyListFormatting(list, profile))
  
  // Apply paragraph formatting
  const paragraphs = findNodesByType(formattedDoc, 'paragraph')
  paragraphs.forEach((paragraph, index) => applyParagraphFormatting(paragraph, profile, index))
  
  return formattedDoc
}

function cloneDocument(document: DocumentNode): DocumentNode {
  return JSON.parse(JSON.stringify(document))
}

function applyNodeFormatting(node: DocumentNode, profile: FormattingProfile): NodeFormatting {
  const baseFormatting: NodeFormatting = {
    fontFamily: profile.typography.bodyFont.family,
    fontSize: profile.typography.bodyFontSize,
    lineHeight: profile.typography.lineHeight,
    textAlign: 'justify',
    marginTop: 0,
    marginBottom: profile.typography.paragraphSpacing,
    firstLineIndent: profile.typography.firstLineIndent,
  }
  
  return { ...baseFormatting, ...node.formatting }
}

function applyChapterFormatting(chapter: DocumentNode, profile: FormattingProfile, chapterNumber: number): void {
  const { chapterStyle, typography } = profile
  
  chapter.formatting = {
    ...chapter.formatting,
    fontFamily: typography.headingFont.family,
    fontSize: typography.headingFontSizes.chapter,
    fontWeight: typography.headingFont.weight,
    lineHeight: 1.2,
    textAlign: 'center',
    marginTop: inchesToPoints(chapterStyle.topSpacing),
    marginBottom: inchesToPoints(chapterStyle.titleSpacing),
    pageBreakBefore: true,
    keepWithNext: true,
  }
  
  // Format chapter number display
  let displayNumber = chapterNumber.toString()
  switch (chapterStyle.numberingStyle) {
    case 'roman':
      displayNumber = toRoman(chapterNumber)
      break
    case 'word':
      displayNumber = toWords(chapterNumber)
      break
    case 'none':
      displayNumber = ''
      break
  }
  
  let displayTitle = chapter.content
  switch (chapterStyle.titleCase) {
    case 'uppercase':
      displayTitle = chapter.content.toUpperCase()
      break
    case 'title':
      displayTitle = toTitleCase(chapter.content)
      break
    case 'sentence':
      displayTitle = toSentenceCase(chapter.content)
      break
  }
  
  chapter.metadata.displayNumber = displayNumber
  chapter.metadata.displayTitle = displayTitle
  chapter.metadata.chapterLabel = chapterStyle.includeChapterLabel ? chapterStyle.chapterLabel : ''
  chapter.metadata.firstParagraphStyle = chapterStyle.firstParagraphStyle
  chapter.metadata.decoration = chapterStyle.decoration
}

function applySectionFormatting(section: DocumentNode, profile: FormattingProfile): void {
  section.formatting = {
    ...section.formatting,
    fontFamily: profile.typography.headingFont.family,
    fontSize: profile.typography.headingFontSizes.section,
    fontWeight: profile.typography.headingFont.weight,
    lineHeight: 1.3,
    textAlign: 'left',
    marginTop: inchesToPoints(0.5),
    marginBottom: inchesToPoints(0.25),
    keepWithNext: true,
  }
}

function applySubsectionFormatting(subsection: DocumentNode, profile: FormattingProfile): void {
  subsection.formatting = {
    ...subsection.formatting,
    fontFamily: profile.typography.headingFont.family,
    fontSize: profile.typography.headingFontSizes.subsection,
    fontWeight: 500,
    lineHeight: 1.3,
    textAlign: 'left',
    marginTop: inchesToPoints(0.375),
    marginBottom: inchesToPoints(0.125),
    keepWithNext: true,
  }
}

function applyBlockquoteFormatting(blockquote: DocumentNode, profile: FormattingProfile): void {
  blockquote.formatting = {
    ...blockquote.formatting,
    fontFamily: profile.typography.bodyFont.family,
    fontSize: profile.typography.bodyFontSize - 0.5,
    fontStyle: 'italic',
    lineHeight: profile.typography.lineHeight,
    textAlign: 'left',
    marginLeft: inchesToPoints(0.5),
    marginRight: inchesToPoints(0.5),
    marginTop: inchesToPoints(0.5),
    marginBottom: inchesToPoints(0.5),
    firstLineIndent: 0,
  }
}

function applyListFormatting(list: DocumentNode, profile: FormattingProfile): void {
  list.formatting = {
    ...list.formatting,
    marginLeft: inchesToPoints(0.5),
    marginTop: inchesToPoints(0.25),
    marginBottom: inchesToPoints(0.25),
  }
  
  list.children.forEach(item => {
    item.formatting = {
      ...item.formatting,
      fontFamily: profile.typography.bodyFont.family,
      fontSize: profile.typography.bodyFontSize,
      lineHeight: profile.typography.lineHeight,
      marginLeft: inchesToPoints(0.25),
      firstLineIndent: -inchesToPoints(0.25),
    }
  })
}

function applyParagraphFormatting(paragraph: DocumentNode, profile: FormattingProfile, index: number): void {
  const isFirstInChapter = paragraph.metadata.isFirstInChapter
  
  if (isFirstInChapter && profile.chapterStyle.firstParagraphStyle !== 'normal') {
    paragraph.formatting = {
      ...paragraph.formatting,
      firstLineIndent: 0,
      fontFamily: profile.typography.bodyFont.family,
      fontSize: profile.typography.bodyFontSize,
      lineHeight: profile.typography.lineHeight,
    }
    
    switch (profile.chapterStyle.firstParagraphStyle) {
      case 'drop-cap':
        paragraph.metadata.dropCap = true
        break
      case 'small-caps':
        paragraph.metadata.smallCaps = true
        paragraph.metadata.smallCapsLength = 50 // characters
        break
      case 'bold':
        paragraph.formatting.fontWeight = 600
        break
    }
  }
}

export function resolveOrphansAndWidows(document: DocumentNode, profile: FormattingProfile): DocumentNode {
  // This would require actual pagination to work properly
  // For now, mark potential issues
  const formattedDoc = cloneDocument(document)
  
  traverseDocument(formattedDoc, (node, parent, depth) => {
    if (node.type === 'chapter' || node.type === 'section' || node.type === 'subsection') {
      // Mark as potential orphan if near end of page
      // This needs actual page layout to determine
      node.metadata.potentialOrphan = false
    }
  })
  
  return formattedDoc
}

export function generateTableOfContents(document: DocumentNode): DocumentNode {
  const toc = createDocumentNode('table_of_contents', 'Contents', [])
  const chapters = findNodesByType(document, 'chapter')
  
  chapters.forEach((chapter, chapterIndex) => {
    const chapterEntry = createDocumentNode('paragraph', '', [], { level: 1 })
    chapterEntry.content = `${chapter.metadata.displayNumber || `Chapter ${chapterIndex + 1}`}: ${chapter.metadata.displayTitle || chapter.content}`
    chapterEntry.metadata.tocEntry = true
    chapterEntry.metadata.tocLevel = 1
    chapterEntry.metadata.targetChapter = chapter.id
    toc.children.push(chapterEntry)
    
    const sections = findNodesByType(chapter, 'section')
    sections.forEach((section, sectionIndex) => {
      const sectionEntry = createDocumentNode('paragraph', '', [], { level: 2 })
      sectionEntry.content = `${section.content}`
      sectionEntry.metadata.tocEntry = true
      sectionEntry.metadata.tocLevel = 2
      sectionEntry.metadata.targetSection = section.id
      toc.children.push(sectionEntry)
    })
  })
  
  return toc
}

// Helper functions
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

// Export types for use in other modules
export type { FormattingProfile, DesignPreset, BookSize, TypographySettings, LayoutSettings, ChapterStyleSettings, NodeFormatting }