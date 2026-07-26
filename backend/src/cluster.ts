import { Jieba } from '@node-rs/jieba'

const jieba = new Jieba()

const STOP_WORDS = new Set([
  '的', '了', '在', '是', '与', '对', '为', '和', '就', '都', '而', '及',
  '从', '被', '让', '把', '给', '向', '到', '等', '将', '已', '于', '以',
  '中', '个', '之', '上', '下', '大', '新', '有', '不', '也', '人', '他',
  '她', '这', '那', '其', '但', '如', '所', '能', '可', '会', '要', '后',
  '来', '出', '去', '过', '更', '又', '很', '最', '再', '还', '只', '由',
  '因', '该', '则', '或', '两', '些', '一', '多', '做', '进行', '表示',
  '并', '同时', '目前', '此前', '其中', '以及', '通过', '举行', '发表',
])
const STOP_CHARS = new Set('的了是在与对为和就都而及从被让把给向到等将已于以个之上下有不也人他她这那其但如所能会要后来出去过更又很最再还只由因该则或两些一做')

export interface ClusterNewsItem {
  id: number
  title_cn: string | null
  title: string
  source: string
  time: string
  datetime_display: string | null
  category: string | null
  summary: string | null
}

export interface ClusterResult {
  id: number
  title: string
  keywords: string[]
  summary: string
  count: number
  heat_index: number
  news: ClusterNewsItem[]
}

export interface ClusterOutput {
  range: string
  total_news: number
  cached: boolean
  clusters: ClusterResult[]
}

export function tokenize(text: string): Set<string> {
  const tokens = new Set<string>()

  // 1. Jieba word segmentation (keep 2+ char words)
  const words = jieba.cut(text, true)
  for (const w of words) {
    if (w.length >= 2 && !STOP_WORDS.has(w) && !/^\d+$/.test(w)) {
      tokens.add(w)
    }
  }

  // 2. Character bigrams (for coverage)
  const clean = text.replace(/[^\u4e00-\u9fff\w]/g, '').toLowerCase()
  for (let i = 0; i < clean.length - 1; i++) {
    const a = clean[i], b = clean[i + 1]
    if (STOP_CHARS.has(a) || STOP_CHARS.has(b)) continue
    tokens.add(a + b)
  }

  // 3. English words
  const eng = text.match(/[a-zA-Z]{2,}/g)
  if (eng) for (const w of eng) tokens.add(w.toLowerCase())

  return tokens
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let intersection = 0
  for (const w of a) if (b.has(w)) intersection++
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}

function singleLinkageClustering(
  items: { id: number; words: Set<string> }[],
  threshold: number
): number[][] {
  const n = items.length
  const parent = Array.from({ length: n }, (_, i) => i)

  function find(x: number): number {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x] }
    return x
  }

  function union(x: number, y: number) {
    const rx = find(x), ry = find(y)
    if (rx !== ry) parent[rx] = ry
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (jaccard(items[i].words, items[j].words) > threshold) {
        union(i, j)
      }
    }
  }

  const groups: Record<number, number[]> = {}
  for (let i = 0; i < n; i++) {
    const root = find(i)
    if (!groups[root]) groups[root] = []
    groups[root].push(i)
  }

  return Object.values(groups)
}

function extractKeywords(cluster: { words: Set<string> }[]): string[] {
  const freq: Record<string, number> = {}
  for (const item of cluster) {
    for (const w of item.words) {
      // Prefer longer tokens as keywords
      const weight = w.length >= 3 ? 3 : w.length >= 2 ? 2 : 1
      freq[w] = (freq[w] || 0) + weight
    }
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word)
}

function extractSummary(clusterItems: { summary?: string | null; title_cn?: string | null; title: string }[], keywords: string[]): string {
  const sentences: string[] = []

  for (const item of clusterItems) {
    if (item.summary) {
      const parts = item.summary.split(/[。！？\n]/)
      for (const p of parts) {
        const trimmed = p.trim()
        if (trimmed.length >= 8) sentences.push(trimmed)
      }
    }
  }

  if (sentences.length === 0) {
    for (const item of clusterItems) {
      const t = item.title_cn || item.title
      if (t.length >= 6) sentences.push(t)
    }
  }

  if (sentences.length === 0) return ''

  const keywordSet = new Set(keywords)
  const scored = sentences.map(s => {
    const tokens = tokenize(s)
    let score = 0
    for (const t of tokens) {
      if (keywordSet.has(t)) score += t.length >= 3 ? 3 : 2
    }
    return { s, score }
  })

  scored.sort((a, b) => b.score - a.score)

  const selected: string[] = []
  const seen = new Set<string>()
  for (const { s } of scored) {
    if (selected.length >= 2) break
    if (seen.has(s)) continue
    seen.add(s)
    selected.push(s)
  }

  return selected.join('。') + (selected.length > 0 ? '。' : '')
}

interface NewsItem {
  id: number
  title_cn?: string | null
  title: string
  source: string
  time: string
  datetime_display?: string | null
  category?: string | null
  summary?: string | null
}

let cache: { range: string; threshold: number; result: ClusterOutput; timestamp: number } | null = null
const CACHE_TTL = 24 * 60 * 60 * 1000

export function clusterNews(
  news: NewsItem[],
  range: string,
  threshold: number
): ClusterOutput {
  if (cache &&
      cache.range === range &&
      cache.threshold === threshold &&
      Date.now() - cache.timestamp < CACHE_TTL) {
    return { ...cache.result, cached: true }
  }

  const items = news.map(n => ({
    id: n.id,
    words: tokenize(n.title_cn || n.title),
    title_cn: n.title_cn || null,
    title: n.title,
    source: n.source,
    time: n.time,
    datetime_display: n.datetime_display || null,
    category: n.category || null,
    summary: n.summary || null,
  }))

  const groups = singleLinkageClustering(items, threshold)

  // Calculate heat index: weighted combination of count, source diversity, time concentration
  function calcHeat(clusterItems: typeof items): number {
    const countScore = Math.min(clusterItems.length / 10, 1) * 40

    const sources = new Set(clusterItems.map(i => i.source))
    const sourceScore = Math.min(sources.size / 5, 1) * 30

    const times = clusterItems.map(i => new Date(i.time).getTime()).sort()
    let timeScore = 10
    if (times.length >= 2) {
      const span = times[times.length - 1] - times[0]
      const hours = span / 3600000
      timeScore = hours < 6 ? 30 : hours < 24 ? 20 : 10
    }

    return Math.round((countScore + sourceScore + timeScore) * 10) / 10
  }

  const clusters: ClusterResult[] = groups
    .map((group, idx) => {
      const clusterItems = group.map(i => items[i])
      const keywords = extractKeywords(clusterItems)
      const title = keywords.slice(0, 2).join('与') || '未分类'
      const summary = extractSummary(clusterItems, keywords)

      return {
        id: idx + 1,
        title,
        keywords,
        summary,
        count: group.length,
        heat_index: calcHeat(clusterItems),
        news: clusterItems.map(item => ({
          id: item.id,
          title_cn: item.title_cn,
          title: item.title,
          source: item.source,
          time: item.time,
          datetime_display: item.datetime_display,
          category: item.category,
          summary: item.summary,
        })),
      }
    })
    .filter(c => c.count >= 2)  // Only show clusters with 2+ news
    .sort((a, b) => b.count - a.count)

  const result: ClusterOutput = {
    range,
    total_news: news.length,
    cached: false,
    clusters,
  }

  cache = { range, threshold, result, timestamp: Date.now() }
  return result
}
