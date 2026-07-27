export interface NewsItem {
  id: number
  title: string
  title_cn?: string | null
  time: string
  datetime_display?: string | null
  content: string
  link: string
  source: string
  category?: string | null
  region?: string | null
  country?: string | null
  ai_score: number | null
  ai_reason: string | null
  full_content: string | null
  summary: string | null
  batch_id: string | null
  created_at: string
}

export interface Brief {
  id: number
  type: 'batch' | 'daily' | 'weekly'
  title: string
  content: string
  date: string
  label: string | null
  news_id: number | null
  created_at: string
}

export interface PaginatedResponse<T> {
  data: T[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface DashboardStats {
  todayNews: number
  todayAvgScore: number
  totalNews: number
  totalSources: number
}

export interface TrendPoint {
  date: string
  count: number
  avg_score: number
}

export interface SourceStats {
  source: string
  count: number
  avg_score: number
}

export interface ScoreDistribution {
  range: string
  count: number
}

export interface FilterOptions {
  categories: string[]
  regions: string[]
  countries: string[]
  sources: string[]
}

export interface AggregationItem {
  category: string
  count: number
  heat_index: number
  news_ids: number[]
}

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

export interface ClusterItem {
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
  clusters: ClusterItem[]
}

export interface TimelineHour {
  hour: string
  items: NewsItem[]
}

export interface DashboardOverview {
  date: string
  importantEvents: { count: number; diff: number }
  policyTrends: { count: number; diff: number }
  publicOpinion: { count: number; diff: number }
  marketImpact: { count: number; diff: number }
  topNews: { id: number; title: string; title_cn: string | null; category: string; ai_score: number | null }[]
  keySummary: string | null
}
