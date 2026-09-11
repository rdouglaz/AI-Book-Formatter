export interface User {
  id: string
  email: string
  name: string
  createdAt: string
}

export interface Project {
  id: string
  userId: string
  title: string
  author: string
  description?: string
  createdAt: string
  updatedAt: string
  currentVersionId?: string
}

export interface DocumentNode {
  id: string
  type: NodeType
  content: string
  children: DocumentNode[]
  metadata: NodeMetadata
  formatting?: NodeFormatting
}

export type NodeType = 
  | 'document'
  | 'front_matter'
  | 'chapter'
  | 'section'
  | 'subsection'
  | 'paragraph'
  | 'blockquote'
  | 'list'
  | 'list_item'
  | 'table'
  | 'image'
  | 'caption'
  | 'footnote'
  | 'endnote'
  | 'bibliography'
  | 'back_matter'
  | 'page_break'
  | 'title_page'
  | 'copyright_page'
  | 'dedication'
  | 'epigraph'
  | 'table_of_contents'
  | 'foreword'
  | 'preface'
  | 'acknowledgments'
  | 'half_title'
  | 'subtitle'

export interface NodeMetadata {
  level?: number
  order?: number
  originalStyle?: Record<string, unknown>
  confidence?: number
  pageNumber?: number
  isFirstInChapter?: boolean
  [key: string]: any
}

export interface NodeFormatting {
  fontFamily?: string
  fontSize?: number
  fontWeight?: number
  fontStyle?: string
  lineHeight?: number
  textAlign?: 'left' | 'center' | 'right' | 'justify'
  marginTop?: number
  marginBottom?: number
  marginLeft?: number
  marginRight?: number
  paddingTop?: number
  paddingBottom?: number
  paddingLeft?: number
  paddingRight?: number
  firstLineIndent?: number
  pageBreakBefore?: boolean
  pageBreakAfter?: boolean
  keepWithNext?: boolean
  keepLinesTogether?: boolean
}

export interface DocumentVersion {
  id: string
  projectId: string
  versionNumber: number
  document: DocumentNode
  analysis?: DocumentAnalysis
  formattingPlan?: FormattingPlan
  createdAt: string
  isOriginal: boolean
}

export interface DocumentAnalysis {
  id: string
  versionId: string
  chaptersDetected: number
  sectionsDetected: number
  paragraphsDetected: number
  blockQuotesDetected: number
  imagesDetected: number
  tablesDetected: number
  footnotesDetected: number
  formattingIssues: FormattingIssue[]
  frontMatterStructure: string[]
  backMatterStructure: string[]
  headingHierarchy: HeadingHierarchy
  createdAt: string
}

export interface FormattingIssue {
  id: string
  type: IssueType
  severity: 'error' | 'warning' | 'info'
  message: string
  nodeIds: string[]
  suggestion?: string
  autoFixable: boolean
}

export type IssueType = 
  | 'inconsistent_heading_style'
  | 'inconsistent_font_usage'
  | 'inconsistent_font_size'
  | 'inconsistent_paragraph_spacing'
  | 'inconsistent_indentation'
  | 'inconsistent_line_spacing'
  | 'unnecessary_blank_lines'
  | 'repeated_page_breaks'
  | 'missing_chapter_breaks'
  | 'unusual_spacing'
  | 'inconsistent_quotation_formatting'
  | 'inconsistent_lists'
  | 'orphan_heading'
  | 'widow_orphan'
  | 'oversized_whitespace'
  | 'problematic_page_break'
  | 'missing_front_matter'
  | 'missing_back_matter'

export interface HeadingHierarchy {
  chapter: string
  section: string
  subsection: string
}

export interface FormattingPlan {
  id: string
  versionId: string
  documentType: 'fiction' | 'nonfiction' | 'academic' | 'devotional' | 'business' | 'memoir' | 'other'
  chapters: number
  headingHierarchy: HeadingHierarchy
  frontMatter: FormattingPlanSection[]
  bodyMatter: FormattingPlanSection[]
  backMatter: FormattingPlanSection[]
  formattingDecisions: FormattingDecision[]
  confidence: number
  createdAt: string
}

export interface FormattingPlanSection {
  type: string
  title: string
  nodes: string[]
  pageBreakBefore: boolean
  numberingStyle?: 'roman' | 'arabic' | 'none'
}

export interface FormattingDecision {
  nodeId: string
  decision: string
  reasoning: string
  confidence: number
  alternatives?: string[]
}

export interface FormattingProfile {
  id: string
  name: string
  bookSize: BookSize
  designPreset: DesignPreset
  typography: TypographySettings
  layout: LayoutSettings
  headersFooters: HeaderFooterSettings
  chapterStyle: ChapterStyleSettings
}

export type BookSize = 
  | '5x8'
  | '5.5x8.5'
  | '6x9'
  | 'A5'
  | 'custom'

export interface BookSizeDimensions {
  width: number
  height: number
  unit: 'in' | 'mm'
}

export type DesignPreset = 
  | 'classic'
  | 'modern'
  | 'literary'
  | 'academic'
  | 'devotional'
  | 'business'
  | 'minimal'

export interface TypographySettings {
  bodyFont: FontDefinition
  headingFont: FontDefinition
  displayFont?: FontDefinition
  bodyFontSize: number
  headingFontSizes: Record<string, number>
  lineHeight: number
  paragraphSpacing: number
  firstLineIndent: number
}

export interface FontDefinition {
  family: string
  weight: number
  style: 'normal' | 'italic'
  source: 'system' | 'google' | 'custom'
  url?: string
}

export interface LayoutSettings {
  margins: MarginSettings
  pageNumbers: PageNumberSettings
  runningHeads: RunningHeadSettings
}

export interface MarginSettings {
  top: number
  bottom: number
  inner: number
  outer: number
  unit: 'in' | 'mm'
}

export interface PageNumberSettings {
  enabled: boolean
  position: 'top' | 'bottom' | 'top-outside' | 'bottom-outside' | 'top-center' | 'bottom-center'
  format: 'arabic' | 'roman' | 'alpha'
  startPage: number
  hideOnChapterOpenings: boolean
}

export interface RunningHeadSettings {
  enabled: boolean
  leftPageContent: 'book_title' | 'chapter_title' | 'author_name' | 'none'
  rightPageContent: 'book_title' | 'chapter_title' | 'author_name' | 'none'
  fontSize: number
  fontStyle: 'normal' | 'italic' | 'small-caps'
}

export interface HeaderFooterSettings {
  header: RunningHeadSettings
  footer: PageNumberSettings
}

export interface ChapterStyleSettings {
  numberingStyle: 'numeric' | 'roman' | 'word' | 'none'
  titleCase: 'uppercase' | 'title' | 'sentence' | 'original'
  includeChapterLabel: boolean
  chapterLabel: string
  topSpacing: number
  titleSpacing: number
  firstParagraphStyle: 'drop-cap' | 'small-caps' | 'bold' | 'normal'
  decoration?: 'line' | 'ornament' | 'none'
}

export interface ExportJob {
  id: string
  projectId: string
  versionId: string
  format: ExportFormat
  status: 'pending' | 'processing' | 'completed' | 'failed'
  fileUrl?: string
  error?: string
  createdAt: string
  completedAt?: string
}

export type ExportFormat = 'pdf' | 'docx' | 'epub' | 'markdown'

export interface ExportFile {
  id: string
  jobId: string
  format: ExportFormat
  filename: string
  size: number
  url: string
  createdAt: string
}

export interface AIProvider {
  name: string
  analyzeDocument(document: DocumentNode): Promise<FormattingPlan>
  detectStructure(document: DocumentNode): Promise<DocumentAnalysis>
}

export interface ProcessingProgress {
  stage: 'uploading' | 'parsing' | 'analyzing' | 'ai_analysis' | 'formatting' | 'preview' | 'exporting'
  progress: number
  message: string
}