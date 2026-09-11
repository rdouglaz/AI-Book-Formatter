import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BookOpen, Type, Palette, Layout, CheckCircle, Loader2 } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Select, Badge, Slider } from '@/components/ui'
import { useAppStore } from '@/store'
import { DESIGN_PRESETS, applyDesignPreset, createDefaultProfile } from '@/utils/formatting'
import type { FormattingProfile, DesignPreset, BookSize } from '@/types'

const BOOK_SIZES: { value: BookSize; label: string; dimensions: string }[] = [
  { value: '5x8', label: '5" × 8"', dimensions: '12.7 × 20.3 cm' },
  { value: '5.5x8.5', label: '5.5" × 8.5"', dimensions: '14 × 21.6 cm' },
  { value: '6x9', label: '6" × 9"', dimensions: '15.2 × 22.9 cm (Trade)' },
  { value: 'A5', label: 'A5', dimensions: '148 × 210 mm' },
]

const PRESET_OPTIONS: { value: DesignPreset; label: string; description: string }[] = [
  { value: 'classic', label: 'Classic', description: 'Elegant traditional nonfiction design' },
  { value: 'modern', label: 'Modern', description: 'Clean contemporary nonfiction' },
  { value: 'literary', label: 'Literary', description: 'Refined typography with generous whitespace' },
  { value: 'academic', label: 'Academic', description: 'Dense but highly structured' },
  { value: 'devotional', label: 'Devotional', description: 'Warm, readable, reflective design' },
  { value: 'business', label: 'Business', description: 'Professional corporate nonfiction style' },
  { value: 'minimal', label: 'Minimal', description: 'Clean modern typography with restrained styling' },
]

export default function DesignPage() {
  const { currentProject, currentFormattingProfile, setCurrentFormattingProfile, setProcessingProgress } = useAppStore()
  const navigate = useNavigate()
  
  const [profile, setProfile] = useState<FormattingProfile>(currentFormattingProfile ?? createDefaultProfile())
  const [activeTab, setActiveTab] = useState<'size' | 'preset' | 'typography' | 'layout' | 'chapter'>('size')
  
  useEffect(() => {
    if (currentFormattingProfile) setProfile(currentFormattingProfile)
  }, [currentFormattingProfile])
  
  const updateProfile = (updates: Partial<FormattingProfile>) => {
    const newProfile = { ...profile, ...updates }
    setProfile(newProfile)
    setCurrentFormattingProfile(newProfile)
  }
  
  const handlePresetChange = (preset: DesignPreset) => {
    const newProfile = applyDesignPreset(profile, preset)
    setProfile(newProfile)
    setCurrentFormattingProfile(newProfile)
  }
  
  const handleSizeChange = (size: BookSize) => {
    updateProfile({ bookSize: size })
  }
  
  const handleTypographyChange = (key: keyof FormattingProfile['typography'], value: any) => {
    updateProfile({
      typography: { ...profile.typography, [key]: value }
    })
  }
  
  const handleLayoutChange = (key: keyof FormattingProfile['layout'], value: any) => {
    updateProfile({
      layout: { ...profile.layout, [key]: value }
    })
  }
  
  const handleChapterStyleChange = (key: keyof FormattingProfile['chapterStyle'], value: any) => {
    updateProfile({
      chapterStyle: { ...profile.chapterStyle, [key]: value }
    })
  }
  
  if (!currentProject) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="text-center">
          <CardContent className="pt-6">
            <BookOpen className="h-12 w-12 text-text-muted mx-auto mb-4" />
            <CardTitle>No Project Loaded</CardTitle>
            <CardDescription>Please upload a manuscript first.</CardDescription>
            <Button onClick={() => navigate('/upload')} className="mt-4">
              Upload Manuscript
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  const tabs = [
    { id: 'size', label: 'Book Size', icon: Layout },
    { id: 'preset', label: 'Design Preset', icon: Palette },
    { id: 'typography', label: 'Typography', icon: Type },
    { id: 'layout', label: 'Layout', icon: Layout },
    { id: 'chapter', label: 'Chapters', icon: BookOpen },
  ] as const
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-40 bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="text-xl font-semibold text-text">AI Book Formatter</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/analyze')}>
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
              { label: 'Design', current: true },
              { label: 'Format', done: false },
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
      
      {/* Tab Navigation */}
      <div className="border-b border-border bg-background/50 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 pb-px" aria-label="Design settings">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === tab.id
                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                    : 'text-text-muted hover:text-text hover:bg-background'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text">Book Design</h1>
          <p className="text-text-muted mt-1">
            Choose your book size, design preset, and customize typography and layout settings.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Book Size */}
            {activeTab === 'size' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layout className="h-5 w-5" />
                    Book Size
                  </CardTitle>
                  <CardDescription>Select the trim size for your book</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {BOOK_SIZES.map(size => (
                      <button
                        key={size.value}
                        onClick={() => handleSizeChange(size.value)}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          profile.bookSize === size.value
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="font-medium text-text">{size.label}</div>
                        <div className="text-sm text-text-muted mt-1">{size.dimensions}</div>
                        {profile.bookSize === size.value && (
                          <div className="mt-2 text-sm text-primary">✓ Selected</div>
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Design Preset */}
            {activeTab === 'preset' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Design Preset
                  </CardTitle>
                  <CardDescription>Choose a professionally designed style for your book</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {PRESET_OPTIONS.map(preset => (
                      <button
                        key={preset.value}
                        onClick={() => handlePresetChange(preset.value)}
                        className={`p-4 rounded-lg border-2 text-left transition-all h-full ${
                          profile.designPreset === preset.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            profile.designPreset === preset.value ? 'bg-primary text-white' : 'bg-border'
                          }`}>
                            <Palette className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-medium text-text">{preset.label}</div>
                            <div className="text-sm text-text-muted mt-0.5">{preset.description}</div>
                            {profile.designPreset === preset.value && (
                              <div className="mt-2 text-sm text-primary">✓ Active</div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Typography */}
            {activeTab === 'typography' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Type className="h-5 w-5" />
                    Typography
                  </CardTitle>
                  <CardDescription>Configure fonts, sizes, and spacing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-text mb-2">Body Font</label>
                      <Select
                        options={[
                          { value: 'Crimson Pro', label: 'Crimson Pro (Serif)' },
                          { value: 'Source Serif 4', label: 'Source Serif 4 (Serif)' },
                          { value: 'Literata', label: 'Literata (Serif)' },
                          { value: 'STIX Two Text', label: 'STIX Two Text (Serif)' },
                          { value: 'Cardo', label: 'Cardo (Serif)' },
                          { value: 'Inter', label: 'Inter (Sans)' },
                          { value: 'IBM Plex Sans', label: 'IBM Plex Sans (Sans)' },
                          { value: 'DM Sans', label: 'DM Sans (Sans)' },
                        ]}
                        value={profile.typography.bodyFont.family}
                        onValueChange={(v) => handleTypographyChange('bodyFont', { ...profile.typography.bodyFont, family: v })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text mb-2">Heading Font</label>
                      <Select
                        options={[
                          { value: 'Crimson Pro', label: 'Crimson Pro (Serif)' },
                          { value: 'Source Serif 4', label: 'Source Serif 4 (Serif)' },
                          { value: 'Literata', label: 'Literata (Serif)' },
                          { value: 'STIX Two Text', label: 'STIX Two Text (Serif)' },
                          { value: 'Cardo', label: 'Cardo (Serif)' },
                          { value: 'Inter', label: 'Inter (Sans)' },
                          { value: 'IBM Plex Sans', label: 'IBM Plex Sans (Sans)' },
                          { value: 'DM Sans', label: 'DM Sans (Sans)' },
                        ]}
                        value={profile.typography.headingFont.family}
                        onValueChange={(v) => handleTypographyChange('headingFont', { ...profile.typography.headingFont, family: v })}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-text mb-2">Body Font Size: {profile.typography.bodyFontSize}pt</label>
                      <Slider
                        value={[profile.typography.bodyFontSize]}
                        onValueChange={([v]) => handleTypographyChange('bodyFontSize', v)}
                        min={9}
                        max={14}
                        step={0.5}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text mb-2">Line Height: {profile.typography.lineHeight}</label>
                      <Slider
                        value={[profile.typography.lineHeight]}
                        onValueChange={([v]) => handleTypographyChange('lineHeight', v)}
                        min={1.3}
                        max={2.0}
                        step={0.05}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text mb-2">First Line Indent: {profile.typography.firstLineIndent}em</label>
                      <Slider
                        value={[profile.typography.firstLineIndent]}
                        onValueChange={([v]) => handleTypographyChange('firstLineIndent', v)}
                        min={0}
                        max={3}
                        step={0.25}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-text mb-2">Chapter Size: {profile.typography.headingFontSizes.chapter}pt</label>
                      <Slider
                        value={[profile.typography.headingFontSizes.chapter]}
                        onValueChange={([v]) => handleTypographyChange('headingFontSizes', { ...profile.typography.headingFontSizes, chapter: v })}
                        min={18}
                        max={36}
                        step={1}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text mb-2">Section Size: {profile.typography.headingFontSizes.section}pt</label>
                      <Slider
                        value={[profile.typography.headingFontSizes.section]}
                        onValueChange={([v]) => handleTypographyChange('headingFontSizes', { ...profile.typography.headingFontSizes, section: v })}
                        min={14}
                        max={22}
                        step={1}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text mb-2">Subsection Size: {profile.typography.headingFontSizes.subsection}pt</label>
                      <Slider
                        value={[profile.typography.headingFontSizes.subsection]}
                        onValueChange={([v]) => handleTypographyChange('headingFontSizes', { ...profile.typography.headingFontSizes, subsection: v })}
                        min={11}
                        max={16}
                        step={1}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Layout */}
            {activeTab === 'layout' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layout className="h-5 w-5" />
                    Page Layout
                  </CardTitle>
                  <CardDescription>Configure margins, page numbers, and running heads</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-medium text-text mb-4">Margins (inches)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <MarginInput label="Top" value={profile.layout.margins.top} onChange={v => handleLayoutChange('margins', { ...profile.layout.margins, top: v })} />
                      <MarginInput label="Bottom" value={profile.layout.margins.bottom} onChange={v => handleLayoutChange('margins', { ...profile.layout.margins, bottom: v })} />
                      <MarginInput label="Inner" value={profile.layout.margins.inner} onChange={v => handleLayoutChange('margins', { ...profile.layout.margins, inner: v })} />
                      <MarginInput label="Outer" value={profile.layout.margins.outer} onChange={v => handleLayoutChange('margins', { ...profile.layout.margins, outer: v })} />
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-text mb-4">Page Numbers</h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={profile.layout.pageNumbers.enabled}
                            onChange={(e) => handleLayoutChange('pageNumbers', { ...profile.layout.pageNumbers, enabled: e.target.checked })}
                            className="h-4 w-4 rounded border-border text-primary"
                          />
                          <span className="text-sm">Enable page numbers</span>
                        </label>
                      </div>
                      
                      {profile.layout.pageNumbers.enabled && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pl-6">
                          <Select
                            label="Position"
                            options={[
                              { value: 'bottom-center', label: 'Bottom Center' },
                              { value: 'bottom-outside', label: 'Bottom Outside' },
                              { value: 'top-center', label: 'Top Center' },
                              { value: 'top-outside', label: 'Top Outside' },
                            ]}
                            value={profile.layout.pageNumbers.position}
                            onValueChange={v => handleLayoutChange('pageNumbers', { ...profile.layout.pageNumbers, position: v })}
                          />
                          <Select
                            label="Format"
                            options={[
                              { value: 'arabic', label: 'Arabic (1, 2, 3)' },
                              { value: 'roman', label: 'Roman (i, ii, iii)' },
                            ]}
                            value={profile.layout.pageNumbers.format}
                            onValueChange={v => handleLayoutChange('pageNumbers', { ...profile.layout.pageNumbers, format: v })}
                          />
                          <Input
                            label="Start Page"
                            type="number"
                            value={profile.layout.pageNumbers.startPage}
                            onChange={(e) => handleLayoutChange('pageNumbers', { ...profile.layout.pageNumbers, startPage: parseInt(e.target.value) })}
                          />
                          <label className="flex items-center gap-2 pt-6">
                            <input
                              type="checkbox"
                              checked={profile.layout.pageNumbers.hideOnChapterOpenings}
                              onChange={(e) => handleLayoutChange('pageNumbers', { ...profile.layout.pageNumbers, hideOnChapterOpenings: e.target.checked })}
                              className="h-4 w-4 rounded border-border text-primary"
                            />
                            <span className="text-sm">Hide on chapter openings</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-text mb-4">Running Heads</h4>
                    <div className="space-y-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={profile.layout.runningHeads.enabled}
                          onChange={(e) => handleLayoutChange('runningHeads', { ...profile.layout.runningHeads, enabled: e.target.checked })}
                          className="h-4 w-4 rounded border-border text-primary"
                        />
                        <span className="text-sm">Enable running heads</span>
                      </label>
                      
                      {profile.layout.runningHeads.enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                          <Select
                            label="Left Page"
                            options={[
                              { value: 'book_title', label: 'Book Title' },
                              { value: 'chapter_title', label: 'Chapter Title' },
                              { value: 'author_name', label: 'Author Name' },
                              { value: 'none', label: 'None' },
                            ]}
                            value={profile.layout.runningHeads.leftPageContent}
                            onValueChange={v => handleLayoutChange('runningHeads', { ...profile.layout.runningHeads, leftPageContent: v })}
                          />
                          <Select
                            label="Right Page"
                            options={[
                              { value: 'book_title', label: 'Book Title' },
                              { value: 'chapter_title', label: 'Chapter Title' },
                              { value: 'author_name', label: 'Author Name' },
                              { value: 'none', label: 'None' },
                            ]}
                            value={profile.layout.runningHeads.rightPageContent}
                            onValueChange={v => handleLayoutChange('runningHeads', { ...profile.layout.runningHeads, rightPageContent: v })}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Chapter Style */}
            {activeTab === 'chapter' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Chapter Style
                  </CardTitle>
                  <CardDescription>Customize chapter opening appearance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Select
                      label="Numbering Style"
                      options={[
                        { value: 'word', label: 'Words (CHAPTER ONE)' },
                        { value: 'numeric', label: 'Numeric (CHAPTER 1)' },
                        { value: 'roman', label: 'Roman (CHAPTER I)' },
                        { value: 'none', label: 'None' },
                      ]}
                      value={profile.chapterStyle.numberingStyle}
                      onValueChange={v => handleChapterStyleChange('numberingStyle', v)}
                    />
                    <Select
                      label="Title Case"
                      options={[
                        { value: 'uppercase', label: 'UPPERCASE' },
                        { value: 'title', label: 'Title Case' },
                        { value: 'sentence', label: 'Sentence case' },
                        { value: 'original', label: 'As Written' },
                      ]}
                      value={profile.chapterStyle.titleCase}
                      onValueChange={v => handleChapterStyleChange('titleCase', v)}
                    />
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 flex-1">
                      <input
                        type="checkbox"
                        checked={profile.chapterStyle.includeChapterLabel}
                        onChange={(e) => handleChapterStyleChange('includeChapterLabel', e.target.checked)}
                        className="h-4 w-4 rounded border-border text-primary"
                      />
                      <span className="text-sm">Include "Chapter" label</span>
                    </label>
                    {profile.chapterStyle.includeChapterLabel && (
                      <Input
                        label="Chapter Label"
                        value={profile.chapterStyle.chapterLabel}
                        onChange={(e) => handleChapterStyleChange('chapterLabel', e.target.value)}
                        placeholder="CHAPTER"
                        className="w-48"
                      />
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-text mb-2">Top Spacing: {profile.chapterStyle.topSpacing}"</label>
                      <Slider
                        value={[profile.chapterStyle.topSpacing]}
                        onValueChange={([v]) => handleChapterStyleChange('topSpacing', v)}
                        min={1}
                        max={5}
                        step={0.25}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text mb-2">Title Spacing: {profile.chapterStyle.titleSpacing}"</label>
                      <Slider
                        value={[profile.chapterStyle.titleSpacing]}
                        onValueChange={([v]) => handleChapterStyleChange('titleSpacing', v)}
                        min={0.5}
                        max={3}
                        step={0.25}
                      />
                    </div>
                  </div>
                  
                  <Select
                    label="First Paragraph Style"
                    options={[
                      { value: 'normal', label: 'Normal' },
                      { value: 'drop-cap', label: 'Drop Cap' },
                      { value: 'small-caps', label: 'Small Caps' },
                      { value: 'bold', label: 'Bold' },
                    ]}
                    value={profile.chapterStyle.firstParagraphStyle}
                    onValueChange={v => handleChapterStyleChange('firstParagraphStyle', v)}
                  />
                  
                  <Select
                    label="Decoration"
                    options={[
                      { value: 'none', label: 'None' },
                      { value: 'line', label: 'Horizontal Line' },
                      { value: 'ornament', label: 'Ornament' },
                    ]}
                    value={profile.chapterStyle.decoration || 'none'}
                    onValueChange={v => handleChapterStyleChange('decoration', v)}
                  />
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Preview Panel */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Live Preview
                </CardTitle>
                <CardDescription>See how your settings affect the book appearance</CardDescription>
              </CardHeader>
              <CardContent>
                <DesignPreview profile={profile} projectTitle={currentProject.title} projectAuthor={currentProject.author} />
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate('/analyze')}>
            <ArrowLeft className="h-4 w-4" />
            Back to Analysis
          </Button>
          <Button type="button" onClick={() => { setCurrentFormattingProfile(profile); navigate('/format') }}>
            Continue to Formatting
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  )
}

function MarginInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-text mb-1">{label}</label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step="0.125"
        min="0.25"
        max="2"
        className="w-full"
      />
    </div>
  )
}

function DesignPreview({ profile, projectTitle, projectAuthor }: { profile: FormattingProfile; projectTitle: string; projectAuthor: string }) {
  const preset = DESIGN_PRESETS[profile.designPreset]
  const bodyFont = profile.typography.bodyFont.family
  const headingFont = profile.typography.headingFont.family
  
  return (
    <div className="space-y-4" style={{ fontFamily: `${bodyFont}, serif` }}>
      {/* Book spine preview */}
      <div className="relative">
        <div className="aspect-[3/4] bg-surface border border-border rounded-lg shadow-lg relative overflow-hidden">
          {/* Cover */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-secondary/10 flex flex-col items-center justify-center p-6">
            <h1 className="text-2xl md:text-3xl font-bold text-primary text-center mb-2" style={{ fontFamily: `${headingFont}, serif` }}>
              {projectTitle}
            </h1>
            <p className="text-primary/80 text-center" style={{ fontFamily: `${bodyFont}, serif` }}>
              by {projectAuthor}
            </p>
            <div className="mt-4 h-px w-1/3 bg-primary/30" />
            <p className="mt-4 text-sm text-primary/60 uppercase tracking-wider">
              {profile.designPreset} • {profile.bookSize.toUpperCase()}
            </p>
          </div>
          
          {/* Spine */}
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-primary/20 border-l border-border flex items-center justify-center">
            <span className="rotate-90 text-xs font-medium text-primary" style={{ fontFamily: `${headingFont}, serif` }}>
              {projectTitle.length > 20 ? projectTitle.slice(0, 20) + '…' : projectTitle}
            </span>
          </div>
        </div>
      </div>
      
      {/* Sample page */}
      <div className="bg-surface border border-border rounded-lg p-6 min-h-[300px]">
        <div className="mb-6 pb-4 border-b border-border">
          <h2 className="text-xl font-bold text-center mb-2" style={{ 
            fontFamily: `${headingFont}, serif`,
            fontSize: `${profile.typography.headingFontSizes.chapter}pt`
          }}>
            {profile.chapterStyle.includeChapterLabel ? `${profile.chapterStyle.chapterLabel} ` : ''}
            {profile.chapterStyle.numberingStyle === 'word' ? 'ONE' : 
             profile.chapterStyle.numberingStyle === 'roman' ? 'I' : '1'}
            {profile.chapterStyle.titleCase === 'uppercase' ? ' SAMPLE CHAPTER' : ' Sample Chapter'}
          </h2>
          <p className="text-sm text-text-muted text-center">Chapter Title</p>
        </div>
        
        <div className="space-y-4 text-justify" style={{ 
          fontSize: `${profile.typography.bodyFontSize}pt`,
          lineHeight: profile.typography.lineHeight,
          textIndent: `${profile.typography.firstLineIndent}em`
        }}>
          <p className="text-text" style={{ fontVariant: profile.chapterStyle.firstParagraphStyle === 'small-caps' ? 'small-caps' : 'normal' }}>
            This is a sample of how your body text will appear in the formatted book. The typography settings you've chosen will be applied consistently throughout the entire manuscript.
          </p>
          <p className="text-text">
            The formatting engine ensures professional-quality typesetting with proper hyphenation, justification, and pagination. Orphans and widows are automatically detected and resolved according to publishing standards.
          </p>
          <p className="text-text">
            <span className="font-medium">Chapter openings</span> receive special treatment with generous top margins, centered titles, and optional decorations. First paragraphs can feature drop caps, small caps, or bold styling based on your design preferences.
          </p>
        </div>
        
        {/* Sample blockquote */}
        <blockquote className="border-l-4 border-primary pl-4 my-4 italic text-text-muted" style={{ 
          fontSize: `${profile.typography.bodyFontSize - 0.5}pt`,
          fontFamily: `${bodyFont}, serif`
        }}>
          "This is a sample block quotation showing how quoted material will be styled in your formatted book."
        </blockquote>
        
        {/* Page number preview */}
        {profile.layout.pageNumbers.enabled && (
          <div className="mt-6 flex justify-center">
            <span className="text-sm text-text-muted" style={{ fontFamily: `${bodyFont}, serif` }}>
              {profile.layout.pageNumbers.format === 'roman' ? 'iii' : '3'}
            </span>
          </div>
        )}
      </div>
      
      {/* Settings summary */}
      <div className="text-xs text-text-muted space-y-1">
        <p><strong>Size:</strong> {profile.bookSize.toUpperCase()}</p>
        <p><strong>Preset:</strong> {profile.designPreset}</p>
        <p><strong>Body:</strong> {bodyFont} {profile.typography.bodyFontSize}pt / {profile.typography.lineHeight}</p>
        <p><strong>Headings:</strong> {headingFont}</p>
        <p><strong>Margins:</strong> T:{profile.layout.margins.top}" B:{profile.layout.margins.bottom}" I:{profile.layout.margins.inner}" O:{profile.layout.margins.outer}"</p>
      </div>
    </div>
  )
}