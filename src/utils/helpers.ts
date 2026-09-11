import { v4 as uuidv4 } from 'uuid'
import type { DocumentNode, NodeType, NodeMetadata, BookSizeDimensions } from '../types'

export function generateId(): string {
  return uuidv4()
}

export function createDocumentNode(
  type: NodeType,
  content: string = '',
  children: DocumentNode[] = [],
  metadata: Partial<NodeMetadata> = {}
): DocumentNode {
  return {
    id: generateId(),
    type,
    content,
    children,
    metadata: {
      level: metadata.level,
      order: metadata.order,
      originalStyle: metadata.originalStyle,
      confidence: metadata.confidence,
      pageNumber: metadata.pageNumber,
      isFirstInChapter: metadata.isFirstInChapter,
    },
    formatting: undefined,
  }
}

export function getBookSizeDimensions(size: string): BookSizeDimensions {
  const sizes: Record<string, BookSizeDimensions> = {
    '5x8': { width: 5, height: 8, unit: 'in' },
    '5.5x8.5': { width: 5.5, height: 8.5, unit: 'in' },
    '6x9': { width: 6, height: 9, unit: 'in' },
    'A5': { width: 148, height: 210, unit: 'mm' },
  }
  return sizes[size] || sizes['6x9']
}

export function inchesToPoints(inches: number): number {
  return inches * 72
}

export function mmToPoints(mm: number): number {
  return mm * 2.83465
}

export function pointsToInches(points: number): number {
  return points / 72
}

export function pointsToMm(points: number): number {
  return points / 2.83465
}

export function traverseDocument(
  node: DocumentNode,
  callback: (node: DocumentNode, parent: DocumentNode | null, depth: number) => void,
  parent: DocumentNode | null = null,
  depth: number = 0
): void {
  callback(node, parent, depth)
  node.children.forEach(child => traverseDocument(child, callback, node, depth + 1))
}

export function findNodesByType(node: DocumentNode, type: NodeType): DocumentNode[] {
  const results: DocumentNode[] = []
  traverseDocument(node, (n) => {
    if (n.type === type) results.push(n)
  })
  return results
}

export function findNodeById(node: DocumentNode, id: string): DocumentNode | null {
  let result: DocumentNode | null = null
  traverseDocument(node, (n) => {
    if (n.id === id) result = n
  })
  return result
}

export function getNodePath(root: DocumentNode, targetId: string): DocumentNode[] {
  const path: DocumentNode[] = []
  let found = false
  
  traverseDocument(root, (node, parent) => {
    if (found) return
    path.push(node)
    if (node.id === targetId) {
      found = true
    }
  })
  
  return found ? path : []
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function estimateReadingTime(wordCount: number, wpm: number = 250): number {
  return Math.ceil(wordCount / wpm)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}