import type { DocumentNode, FormattingProfile, ExportFormat } from '../types'
import { findNodesByType, getBookSizeDimensions } from './helpers'
import { paginate, getPageBox, type Page } from './pagination'
import { jsPDF } from 'jspdf'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak, SectionType, Header, Footer, TableOfContents, convertInchesToTwip, PageNumber, NumberFormat, TabStopType, TabStopPosition } from 'docx'
import * as JSZipModule from 'jszip'
const JSZip: any = (JSZipModule as any).default ?? JSZipModule

export interface ExportOptions {
  format: ExportFormat
  document: DocumentNode
  profile: FormattingProfile
  projectTitle: string
  projectAuthor: string
  includeTOC: boolean
  bleed?: boolean
  onProgress?: (progress:number, message:string)=>void
}

function formatChapterNumber(num:number, style:string): string {
  if(style==='roman'){ const map:[number,string][]=[[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']]; let n=num,r=''; for(const [v,s] of map){while(n>=v){r+=s;n-=v}} return r }
  if(style==='word'){ const w=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty']; if(num<w.length) return w[num]; return String(num) }
  if(style==='none') return ''; return String(num)
}
function formatTitle(title:string, style:string){
  if(style==='uppercase') return title.toUpperCase()
  if(style==='title') return title.replace(/\w\S*/g, t=> t[0].toUpperCase()+t.slice(1).toLowerCase())
  if(style==='sentence') return title[0]?.toUpperCase()+title.slice(1).toLowerCase()
  return title
}

function wrapText(text:string, maxChars:number): string[] {
  const words = text.split(/\s+/)
  const lines:string[]=[]; let cur=''
  for(const w of words){
    if((cur + ' ' + w).trim().length > maxChars){
      if(cur) lines.push(cur)
      cur=w
    } else cur = (cur? cur+' ':'')+w
  }
  if(cur) lines.push(cur)
  return lines.length? lines : [text]
}

// ---------- PDF ----------
async function exportToPDF(document: DocumentNode, profile: FormattingProfile, title:string, author:string, includeTOC:boolean, bleed:boolean, onProgress?:(n:number,m:string)=>void): Promise<Blob>{
  onProgress?.(10,'Paginating...')
  const pages = paginate(document, profile, { bleedInches: bleed?0.125:0, showCropMarks: bleed })
  const box = getPageBox(profile, bleed?0.125*72:0)
  const pdf = new jsPDF({ unit:'pt', format:[box.width, box.height], orientation: box.width > box.height ? 'landscape':'portrait' })
  // embed font handling: jsPDF built-in fonts only (Helvetica) — map serif -> Times, sans -> Helvetica
  const bodyFontName = profile.typography.bodyFont.family.toLowerCase().includes('inter')||profile.typography.bodyFont.family.toLowerCase().includes('plex')||profile.typography.bodyFont.family.toLowerCase().includes('sans') ? 'helvetica':'times'
  const headingFontName = profile.typography.headingFont.family.toLowerCase().includes('inter')||profile.typography.headingFont.family.toLowerCase().includes('plex')||profile.typography.headingFont.family.toLowerCase().includes('sans')||profile.typography.headingFont.family.toLowerCase().includes('dm') ? 'helvetica':'times'

  const marginTop = box.marginTop, marginBottom=box.marginBottom, marginInner=box.marginInner, marginOuter=box.marginOuter
  const textWidth = box.width - marginInner - marginOuter
  const bleedPt = bleed?9:0

  // Title page as first page if no paginated title
  // Render pages
  for(let pi=0; pi<pages.length; pi++){
    const page = pages[pi]
    if(pi>0) pdf.addPage([box.width, box.height])
    const isLeft = page.isLeft
    const leftMargin = isLeft ? marginOuter : marginInner
    // Crop marks if bleed
    if(bleed){
      pdf.setDrawColor(0); pdf.setLineWidth(0.25)
      const m=9
      // top-left
      pdf.line(bleedPt, m, bleedPt, m+12); pdf.line(m, bleedPt, m+12, bleedPt)
      // top-right
      pdf.line(box.width-bleedPt, m, box.width-bleedPt, m+12); pdf.line(box.width-m-12, bleedPt, box.width-m, bleedPt)
      // bottom-left
      pdf.line(bleedPt, box.height-m, bleedPt, box.height-m-12); pdf.line(m, box.height-bleedPt, m+12, box.height-bleedPt)
      // bottom-right
      pdf.line(box.width-bleedPt, box.height-m, box.width-bleedPt, box.height-m-12); pdf.line(box.width-m-12, box.height-bleedPt, box.width-m, box.height-bleedPt)
    }
    // Header
    if(page.header && profile.layout.runningHeads.enabled){
      pdf.setFont(headingFontName, page.isLeft? 'normal':'italic'); pdf.setFontSize(profile.layout.runningHeads.fontSize)
      pdf.setTextColor(80)
      const hx = leftMargin, hy = marginTop - 12
      pdf.text(page.header, page.isLeft? hx : hx+textWidth, hy, { align: page.isLeft? 'left':'right', maxWidth:textWidth })
      pdf.setTextColor(0)
    }
    let y = marginTop + 8
    // Chapter opening top spacing
    if(page.isChapterOpening){ y += profile.chapterStyle.topSpacing*36 }

    for(const span of page.spans){
      const isHeading = span.style==='heading1' || span.style==='heading2' || span.style==='heading3'
      const fontName = isHeading ? headingFontName : bodyFontName
      const style = span.style==='blockquote' ? 'italic' : (span.style==='heading1' ? 'bold' : 'normal')
      pdf.setFont(fontName, style)
      pdf.setFontSize(span.fontSize)
      const align = span.style==='heading1' ? 'center' : (span.style==='blockquote' ? 'left' : 'justify')
      const lineH = span.fontSize * span.lineHeight
      const maxChars = Math.floor(textWidth / (span.fontSize*0.5))
      const lines = wrapText(span.text, maxChars)
      // Heading centering
      if(span.style==='heading1'){
        const headingText = span.text
        // For chapter headings we already have formatted title? Use span.text as is
        for(const line of lines){
          if(y + lineH > box.height - marginBottom) break
          pdf.text(line, box.width/2, y, { align:'center', maxWidth:textWidth })
          y+= lineH
        }
        // decoration line/ornament
        if(profile.chapterStyle.decoration==='line'){
          pdf.setDrawColor(80); pdf.setLineWidth(0.5)
          pdf.line(box.width/2-30, y+4, box.width/2+30, y+4)
          y+= 12
        } else if(profile.chapterStyle.decoration==='ornament'){
          pdf.setFont(fontName,'normal'); pdf.setFontSize(10)
          pdf.text('— — —', box.width/2, y+6, { align:'center' })
          y+= 16
        } else y+= 8
        // title spacing
        y+= profile.chapterStyle.titleSpacing*8
        continue
      }
      // Normal spans
      for(const line of lines){
        if(y + lineH > box.height - marginBottom){
          // Should not happen because pagination already split, but guard
          break
        }
        // indent handling: first line indent
        let x = leftMargin
        let w = textWidth
        if(span.style==='body' && lines.indexOf(line)===0){
          const indent = profile.typography.firstLineIndent* span.fontSize*0.6
          // skip indent for first para of chapter if small-caps/drop-cap
          // for pagination rendering we keep simple
          x += indent; w -= indent
        }
        if(span.style==='blockquote'){ x += 18; w -= 36 }
        if(align==='justify'){
          // jsPDF justify via split + custom? Use left for simplicity and allow word spacing
          pdf.text(line, x, y, { maxWidth:w, align:'left' })
        } else {
          pdf.text(line, x, y, { maxWidth:w, align: align as any })
        }
        y+= lineH
      }
      y+= 2 // paragraph gap
    }

    // Footer / page number
    if(page.footer){
      const fy = box.height - marginBottom + 16
      pdf.setFont(bodyFontName,'normal'); pdf.setFontSize(9); pdf.setTextColor(90)
      const fx = box.width/2
      pdf.text(page.footer, fx, fy, { align:'center' })
      pdf.setTextColor(0)
    }

    onProgress?.(10 + Math.round((pi/pages.length)*80), `Rendering PDF page ${pi+1}/${pages.length}`)
    await new Promise(r=> setTimeout(r, 5))
  }

  // If includeTOC, we prepend TOC pages? Already handled via pagination spans; for now add TOC note page at start if requested and not already
  // (pagination already includes spans, so nothing extra)

  onProgress?.(95,'Finalizing PDF')
  return pdf.output('blob')
}

// ---------- DOCX ----------
async function exportToDOCX(document: DocumentNode, profile: FormattingProfile, title:string, author:string, includeTOC:boolean, onProgress?:(n:number,m:string)=>void): Promise<Blob>{
  onProgress?.(10,'Building DOCX...')
  const dims = getBookSizeDimensions(profile.bookSize)
  const widthTwip = Math.round((dims.unit==='in'?dims.width:dims.width/25.4)*1440)
  const heightTwip = Math.round((dims.unit==='in'?dims.height:dims.height/25.4)*1440)
  const m = profile.layout.margins
  const toTwip = (v:number, unit:string)=> Math.round((unit==='in'?v:v/25.4)*1440)

  const sections:any[]=[]
  const children: any[]=[]

  // Title page
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing:{ after:400 }, children:[new TextRun({ text: title, bold:true, size:48, font: profile.typography.headingFont.family })] }))
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing:{ after:200 }, children:[new TextRun({ text:`by ${author}`, italics:true, size:28, font: profile.typography.bodyFont.family })] }))
  children.push(new Paragraph({ children:[new TextRun({ text:'', break:1 })], pageBreakBefore:true }))

  // TOC
  if(includeTOC){
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing:{ after:300 }, children:[new TextRun({ text:'Contents', bold:true, size:32, font: profile.typography.headingFont.family })] }))
    findNodesByType(document,'chapter').forEach((ch,i)=>{
      const num = formatChapterNumber(i+1, profile.chapterStyle.numberingStyle)
      const label = profile.chapterStyle.includeChapterLabel ? profile.chapterStyle.chapterLabel+' ' : ''
      const t = formatTitle(ch.content, profile.chapterStyle.titleCase)
      const entry = [label+num, t].filter(Boolean).join(' — ')
      children.push(new Paragraph({ tabStops:[{type:TabStopType.RIGHT, position: TabStopPosition.MAX}], children:[new TextRun({ text: entry, size:24, font:profile.typography.bodyFont.family }), new TextRun({ text:'\t'}), new TextRun({ text: String(i+3), size:24, font:profile.typography.bodyFont.family })] }))
    })
    children.push(new Paragraph({ children:[new TextRun({ text:'', break:1 })], pageBreakBefore:true }))
  }

  // Chapters
  const chapters = findNodesByType(document,'chapter')
  for(let ci=0; ci<chapters.length; ci++){
    const ch = chapters[ci]
    onProgress?.(20+Math.round((ci/chapters.length)*60), `DOCX chapter ${ci+1}/${chapters.length}`)
    const num = formatChapterNumber(ci+1, profile.chapterStyle.numberingStyle)
    const label = profile.chapterStyle.includeChapterLabel ? profile.chapterStyle.chapterLabel+' ' : ''
    const t = formatTitle(ch.content, profile.chapterStyle.titleCase)
    const heading = [label+num, t].filter(Boolean).join(' ')
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing:{ before: Math.round(profile.chapterStyle.topSpacing*240), after: Math.round(profile.chapterStyle.titleSpacing*240)}, pageBreakBefore:true, children:[new TextRun({ text: heading, bold:true, size: profile.typography.headingFontSizes.chapter*2, font: profile.typography.headingFont.family, allCaps: profile.chapterStyle.titleCase==='uppercase' })] }))
    if(profile.chapterStyle.decoration==='line'){
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, children:[new TextRun({ text:'──────────', size:18, color:'888888' })] }))
    } else if(profile.chapterStyle.decoration==='ornament'){
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, children:[new TextRun({ text:'— — —', size:20, italics:true })] }))
    }
    const render = (node: DocumentNode)=>{
      for(const child of node.children){
        if(child.type==='section'){
          children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing:{ before:240, after:120 }, children:[new TextRun({ text: child.content, bold:true, size: profile.typography.headingFontSizes.section*2, font: profile.typography.headingFont.family })] }))
          render(child)
        } else if(child.type==='subsection'){
          children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, spacing:{ before:180, after:80 }, children:[new TextRun({ text: child.content, bold:true, size: profile.typography.headingFontSizes.subsection*2, font: profile.typography.headingFont.family })] }))
          render(child)
        } else if(child.type==='paragraph'){
          const isFirst = child.metadata.isFirstInChapter
          const smallCaps = child.metadata.smallCaps
          const indent = (isFirst && profile.chapterStyle.firstParagraphStyle!=='normal') ? 0 : Math.round(profile.typography.firstLineIndent*240)
          children.push(new Paragraph({ alignment: isFirst? AlignmentType.LEFT: AlignmentType.JUSTIFIED, indent:{ firstLine: indent }, spacing:{ line: Math.round(profile.typography.lineHeight*240), after: profile.typography.paragraphSpacing? Math.round(profile.typography.paragraphSpacing*20): 0 }, children:[new TextRun({ text: child.content, size: profile.typography.bodyFontSize*2, font: profile.typography.bodyFont.family, smallCaps: !!smallCaps })] }))
        } else if(child.type==='blockquote'){
          children.push(new Paragraph({ indent:{ left: 720, right:720 }, spacing:{ before:200, after:200 }, children:[new TextRun({ text: child.content, italics:true, size: (profile.typography.bodyFontSize-0.5)*2, font: profile.typography.bodyFont.family })] }))
        } else if(child.type==='list'){
          for(const li of child.children){
            children.push(new Paragraph({ bullet:{ level:0 }, indent:{ left:720 }, spacing:{ after:80 }, children:[new TextRun({ text: li.content, size: profile.typography.bodyFontSize*2, font: profile.typography.bodyFont.family })] }))
          }
        } else render(child)
      }
    }
    render(ch)
  }

  const doc = new Document({
    sections:[{
      properties:{
        page:{ size:{ width: widthTwip, height: heightTwip, orientation: dims.width> dims.height ? 'landscape':'portrait' as any }, margin:{ top: toTwip(m.top,m.unit), bottom: toTwip(m.bottom,m.unit), left: toTwip(m.inner,m.unit), right: toTwip(m.outer,m.unit), header: 720, footer:720 } },
        type: SectionType.NEXT_PAGE
      },
      headers:{ default: new Header({ children:[new Paragraph({ alignment: AlignmentType.CENTER, children:[new TextRun({ text: profile.layout.runningHeads.enabled ? title : '', size:18, smallCaps: profile.layout.runningHeads.fontStyle==='small-caps', font: profile.typography.bodyFont.family })] })] }) },
      footers:{ default: new Footer({ children:[new Paragraph({ alignment: AlignmentType.CENTER, children:[new TextRun({ children:['', PageNumber.CURRENT] , size:18, font: profile.typography.bodyFont.family})] })] }) },
      children
    }]
  })

  onProgress?.(95,'Packing DOCX')
  const blob = await Packer.toBlob(doc)
  return blob
}

// ---------- EPUB ----------
async function exportToEPUB(document: DocumentNode, profile: FormattingProfile, title:string, author:string, includeTOC:boolean, onProgress?:(n:number,m:string)=>void): Promise<Blob>{
  onProgress?.(10,'Building EPUB...')
  const zip = new JSZip()
  zip.file('mimetype','application/epub+zip', { compression:'STORE' })
  zip.file('META-INF/container.xml', `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`)
  const css = `body{font-family:${profile.typography.bodyFont.family},serif;line-height:${profile.typography.lineHeight};margin:1em} h1{font-family:${profile.typography.headingFont.family},serif;text-align:center;margin-top:2em;font-size:${profile.typography.headingFontSizes.chapter}pt} h2{font-family:${profile.typography.headingFont.family},serif;font-size:${profile.typography.headingFontSizes.section}pt;margin-top:1.2em} h3{font-size:${profile.typography.headingFontSizes.subsection}pt} p{text-align:justify;text-indent:${profile.typography.firstLineIndent}em;margin:0 0 0.6em} blockquote{margin:1em 1.5em;font-style:italic;border-left:2px solid #1a1a2e;padding-left:1em} .toc a{text-decoration:none;color:inherit}`

  const chapters = findNodesByType(document,'chapter')
  const manifest: string[]=[]
  const spine: string[]=[]
  const navPoints: string[]=[]

  const addFile = (id:string, href:string, content:string)=>{
    zip.file(`OEBPS/${href}`, content)
    manifest.push(`<item id="${id}" href="${href}" media-type="application/xhtml+xml"/>`)
    spine.push(`<itemref idref="${id}"/>`)
  }

  // Title page
  addFile('title','title.xhtml', `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${title}</title><link rel="stylesheet" href="style.css"/></head><body><h1>${title}</h1><p style="text-align:center"><em>by ${author}</em></p><p style="text-align:center;color:#888">${profile.designPreset} • ${profile.bookSize}</p></body></html>`)

  if(includeTOC){
    let tocBody = `<h1>Contents</h1><nav epub:type="toc"><ol>`
    chapters.forEach((ch,i)=>{
      const num = formatChapterNumber(i+1, profile.chapterStyle.numberingStyle)
      const label = profile.chapterStyle.includeChapterLabel ? profile.chapterStyle.chapterLabel+' ' : ''
      const t = formatTitle(ch.content, profile.chapterStyle.titleCase)
      const heading = [label+num, t].filter(Boolean).join(' — ')
      tocBody += `<li><a href="chapter${i+1}.xhtml">${heading}</a></li>`
      navPoints.push(`<navPoint id="np${i+1}" playOrder="${i+1}"><navLabel><text>${heading}</text></navLabel><content src="chapter${i+1}.xhtml"/></navPoint>`)
    })
    tocBody+=`</ol></nav>`
    addFile('toc','toc.xhtml', `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title><link rel="stylesheet" href="style.css"/></head><body>${tocBody}</body></html>`)
    // nav.xhtml for EPUB3
    addFile('nav','nav.xhtml', `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Navigation</title><link rel="stylesheet" href="style.css"/></head><body><nav epub:type="toc" id="toc">${tocBody}</nav></body></html>`)
  }

  for(let i=0;i<chapters.length;i++){
    onProgress?.(20+Math.round((i/chapters.length)*60), `EPUB chapter ${i+1}/${chapters.length}`)
    const ch = chapters[i]
    const num = formatChapterNumber(i+1, profile.chapterStyle.numberingStyle)
    const label = profile.chapterStyle.includeChapterLabel ? profile.chapterStyle.chapterLabel+' ' : ''
    const t = formatTitle(ch.content, profile.chapterStyle.titleCase)
    const heading = [label+num, t].filter(Boolean).join(' ')
    let body = `<h1>${heading}</h1>`
    if(profile.chapterStyle.decoration==='line') body+=`<hr style="width:60px;margin:12px auto"/>`
    else if(profile.chapterStyle.decoration==='ornament') body+=`<p style="text-align:center">— — —</p>`
    const render = (node: DocumentNode):string=>{
      let out=''
      for(const child of node.children){
        if(child.type==='section') out+=`<h2>${child.content}</h2>`+render(child)
        else if(child.type==='subsection') out+=`<h3>${child.content}</h3>`+render(child)
        else if(child.type==='paragraph') out+=`<p>${child.content}</p>`
        else if(child.type==='blockquote') out+=`<blockquote><p>${child.content}</p></blockquote>`
        else if(child.type==='list'){ out+=`<ul>`; child.children.forEach(li=> out+=`<li>${li.content}</li>`); out+=`</ul>` }
        else out+=render(child)
      }
      return out
    }
    body+=render(ch)
    addFile(`chapter${i+1}`, `chapter${i+1}.xhtml`, `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${heading}</title><link rel="stylesheet" href="style.css"/></head><body>${body}</body></html>`)
  }

  zip.file('OEBPS/style.css', css)
  // content.opf
  const opf = `<?xml version="1.0" encoding="utf-8"?><package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${title}</dc:title><dc:creator>${author}</dc:creator><dc:language>en</dc:language><dc:identifier id="bookid">urn:uuid:${crypto.randomUUID()}</dc:identifier><meta property="dcterms:modified">${new Date().toISOString().slice(0,19)}Z</meta></metadata><manifest><item id="style" href="style.css" media-type="text/css"/>${manifest.join('')}<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/></manifest><spine>${spine.join('')}</spine></package>`
  zip.file('OEBPS/content.opf', opf)
  const ncx = `<?xml version="1.0" encoding="utf-8"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="urn:uuid:${crypto.randomUUID()}"/></head><docTitle><text>${title}</text></docTitle><navMap>${navPoints.join('')}</navMap></ncx>`
  zip.file('OEBPS/toc.ncx', ncx)

  onProgress?.(92,'Zipping EPUB')
  const blob = await zip.generateAsync({ type:'blob', mimeType:'application/epub+zip', compression:'DEFLATE', compressionOptions:{ level:6 } })
  return blob
}

// ---------- Markdown ----------
function renderMarkdown(document: DocumentNode, profile: FormattingProfile, title:string, author:string, includeTOC:boolean): string {
  let md = `---\ntitle: "${title}"\nauthor: "${author}"\n---\n\n# ${title}\n\n*by ${author}*\n\n---\n\n`
  if(includeTOC){
    md+=`## Contents\n\n`
    findNodesByType(document,'chapter').forEach((c,i)=>{ const num=formatChapterNumber(i+1, profile.chapterStyle.numberingStyle); const label=profile.chapterStyle.includeChapterLabel?profile.chapterStyle.chapterLabel+' ':''; const t=formatTitle(c.content, profile.chapterStyle.titleCase); md+=`${i+1}. ${label}${num?num+': ':''}${t}\n` })
    md+=`\n---\n\n`
  }
  findNodesByType(document,'chapter').forEach((ch,i)=>{
    const num=formatChapterNumber(i+1, profile.chapterStyle.numberingStyle); const label=profile.chapterStyle.includeChapterLabel?profile.chapterStyle.chapterLabel+' ':''; const t=formatTitle(ch.content, profile.chapterStyle.titleCase); const heading=[label+num,t].filter(Boolean).join(' — '); md+=`# ${heading}\n\n`
    const render=(node: DocumentNode)=>{ let out=''; for(const child of node.children){ if(child.type==='section') out+=`## ${child.content}\n\n`+render(child); else if(child.type==='subsection') out+=`### ${child.content}\n\n`+render(child); else if(child.type==='paragraph') out+=`${child.content}\n\n`; else if(child.type==='blockquote') out+=`> ${child.content}\n\n`; else if(child.type==='list'){ child.children.forEach(li=> out+=`- ${li.content}\n`); out+='\n' } else out+=render(child) } return out }; md+=render(ch)
  })
  return md
}

export async function exportDocument(options: ExportOptions): Promise<Blob>{
  const { format, document, profile, projectTitle, projectAuthor, includeTOC, bleed, onProgress } = options
  onProgress?.(5,'Preparing...')
  await new Promise(r=> setTimeout(r,200))
  if(format==='pdf') return exportToPDF(document, profile, projectTitle, projectAuthor, includeTOC, !!bleed, onProgress)
  if(format==='docx') return exportToDOCX(document, profile, projectTitle, projectAuthor, includeTOC, onProgress)
  if(format==='epub') return exportToEPUB(document, profile, projectTitle, projectAuthor, includeTOC, onProgress)
  if(format==='markdown'){
    onProgress?.(30,'Generating Markdown...')
    const md = renderMarkdown(document, profile, projectTitle, projectAuthor, includeTOC)
    onProgress?.(100,'Done')
    return new Blob([md], {type:'text/markdown'})
  }
  throw new Error(`Unsupported format ${format}`)
}

export function renderDocumentToHTML(document: DocumentNode, profile: FormattingProfile, title:string, author:string, includeTOC:boolean): string {
  // Use pagination to split into .book-page divs, each page rendered as HTML
  const pages = paginate(document, profile, { bleedInches:0 })
  let html = `<div style="font-family:${profile.typography.bodyFont.family},serif">`
  // Title page
  html += `<div class="book-page" style="min-height:720px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:48px;border-bottom:2px solid #eee"><h1 style="font-family:${profile.typography.headingFont.family},serif;font-size:${profile.typography.headingFontSizes.chapter}pt">${title}</h1><p><em>by ${author}</em></p><p style="font-size:10pt;color:#888;margin-top:24px">${profile.designPreset} • ${profile.bookSize}</p><p style="font-size:9pt;color:#888;margin-top:8px">${pages.length} pages • bleed ${profile.layout.margins.inner}" inner</p></div>`
  pages.forEach((page, pi)=>{
    const inner = page.isLeft ? profile.layout.margins.outer : profile.layout.margins.inner
    const outer = page.isLeft ? profile.layout.margins.inner : profile.layout.margins.outer
    html += `<div class="book-page" style="padding:${profile.layout.margins.top}in ${outer}in ${profile.layout.margins.bottom}in ${inner}in;border-bottom:1px solid #e5e5e5;min-height:700px;position:relative">`
    // header
    if(page.header) html += `<div style="position:absolute;top:12px;left:${inner}in;right:${outer}in;text-align:${page.isLeft?'left':'right'};font-size:${profile.layout.runningHeads.fontSize}pt;color:#888;font-variant:${profile.layout.runningHeads.fontStyle==='small-caps'?'small-caps':'normal'}">${page.header}</div>`
    // spans
    for(const span of page.spans){
      if(span.style==='heading1'){
        html += `<h1 style="font-family:${profile.typography.headingFont.family},serif;text-align:center;margin-top:${page.isChapterOpening?profile.chapterStyle.topSpacing*16:8}px;margin-bottom:${profile.chapterStyle.titleSpacing*16}px;font-size:${span.fontSize}pt;font-weight:600">${span.text}</h1>`
        if(profile.chapterStyle.decoration==='line') html+=`<hr style="width:60px;margin:12px auto;border:1px solid #111"/>`
        else if(profile.chapterStyle.decoration==='ornament') html+=`<div style="text-align:center;margin:12px 0">— — —</div>`
      } else if(span.style==='heading2'){
        html += `<h2 style="font-family:${profile.typography.headingFont.family},serif;font-size:${span.fontSize}pt;margin-top:18px;margin-bottom:8px">${span.text}</h2>`
      } else if(span.style==='heading3'){
        html += `<h3 style="font-family:${profile.typography.headingFont.family},serif;font-size:${span.fontSize}pt;margin-top:12px;margin-bottom:6px">${span.text}</h3>`
      } else if(span.style==='blockquote'){
        html += `<blockquote style="margin:12px 24px;font-style:italic;border-left:3px solid #1a1a2e;padding-left:12px;font-size:${span.fontSize}pt;line-height:${span.lineHeight}">${span.text}</blockquote>`
      } else if(span.style==='list'){
        html += `<div style="margin-left:24px;font-size:${span.fontSize}pt;line-height:${span.lineHeight}">${span.text}</div>`
      } else {
        const indent = span.type==='paragraph' && profile.typography.firstLineIndent ? `${profile.typography.firstLineIndent}em` : '0'
        html += `<p style="text-align:justify;text-indent:${indent};font-size:${span.fontSize}pt;line-height:${span.lineHeight};margin:0 0 0.55em">${span.text}</p>`
      }
    }
    if(page.footer) html += `<div style="position:absolute;bottom:12px;left:0;right:0;text-align:center;font-size:9pt;color:#888">${page.footer}</div>`
    html += `</div>`
  })
  html += `</div>`
  return html
}
