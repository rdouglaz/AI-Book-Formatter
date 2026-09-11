import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { 
  User, 
  Project, 
  DocumentNode, 
  DocumentVersion, 
  DocumentAnalysis, 
  FormattingPlan, 
  FormattingProfile,
  ExportJob,
  ProcessingProgress
} from '../types'

interface AppState {
  user: User | null
  projects: Project[]
  currentProject: Project | null
  currentVersion: DocumentVersion | null
  currentDocument: DocumentNode | null
  currentAnalysis: DocumentAnalysis | null
  currentFormattingPlan: FormattingPlan | null
  currentFormattingProfile: FormattingProfile | null
  exportJobs: ExportJob[]
  processingProgress: ProcessingProgress | null
  isAuthenticated: boolean
  
  setUser: (user: User | null) => void
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void
  setCurrentProject: (project: Project | null) => void
  
  setCurrentVersion: (version: DocumentVersion | null) => void
  setCurrentDocument: (document: DocumentNode | null) => void
  setCurrentAnalysis: (analysis: DocumentAnalysis | null) => void
  setCurrentFormattingPlan: (plan: FormattingPlan | null) => void
  setCurrentFormattingProfile: (profile: FormattingProfile | null) => void
  
  addExportJob: (job: ExportJob) => void
  updateExportJob: (id: string, updates: Partial<ExportJob>) => void
  
  setProcessingProgress: (progress: ProcessingProgress | null) => void
  
  logout: () => void
}

const defaultFormattingProfile: FormattingProfile = {
  id: 'default',
  name: 'Classic',
  bookSize: '6x9',
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
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      projects: [],
      currentProject: null,
      currentVersion: null,
      currentDocument: null,
      currentAnalysis: null,
      currentFormattingPlan: null,
      currentFormattingProfile: defaultFormattingProfile,
      exportJobs: [],
      processingProgress: null,
      isAuthenticated: false,
      
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      setProjects: (projects) => set({ projects }),
      
      addProject: (project) => set((state) => ({ 
        projects: [project, ...state.projects] 
      })),
      
      updateProject: (id, updates) => set((state) => ({
        projects: state.projects.map(p => p.id === id ? { ...p, ...updates } : p),
        currentProject: state.currentProject?.id === id ? { ...state.currentProject, ...updates } : state.currentProject,
      })),
      
      deleteProject: (id) => set((state) => ({
        projects: state.projects.filter(p => p.id !== id),
        currentProject: state.currentProject?.id === id ? null : state.currentProject,
      })),
      
      setCurrentProject: (project) => set({ currentProject: project }),
      
      setCurrentVersion: (version) => set({ currentVersion: version }),
      
      setCurrentDocument: (document) => set({ currentDocument: document }),
      
      setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),
      
      setCurrentFormattingPlan: (plan) => set({ currentFormattingPlan: plan }),
      
      setCurrentFormattingProfile: (profile) => set({ currentFormattingProfile: profile }),
      
      addExportJob: (job) => set((state) => ({ exportJobs: [job, ...state.exportJobs] })),
      
      updateExportJob: (id, updates) => set((state) => ({
        exportJobs: state.exportJobs.map(j => j.id === id ? { ...j, ...updates } : j),
      })),
      
      setProcessingProgress: (progress) => set({ processingProgress: progress }),
      
      logout: () => set({ 
        user: null, 
        projects: [], 
        currentProject: null, 
        currentVersion: null,
        currentDocument: null,
        currentAnalysis: null,
        currentFormattingPlan: null,
        exportJobs: [],
        isAuthenticated: false,
      }),
    }),
    {
      name: 'ai-book-formatter-storage-v2',
      partialize: (state) => ({
        user: state.user,
        projects: state.projects.filter(p => p.id !== 'demo-project-1'),
        currentFormattingProfile: state.currentFormattingProfile,
      }),
    }
  )
)