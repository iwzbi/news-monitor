const BASE = '/api'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
  return res.json()
}

export interface NewsQuery {
  page?: number
  limit?: number
  source?: string
  min_score?: number
  keyword?: string
  date_from?: string
  date_to?: string
  sort_by?: string
  sort_order?: string
  category?: string
  region?: string
  country?: string
}

export const api = {
  news: {
    list: (q: NewsQuery) => {
      const params = new URLSearchParams()
      if (q.page) params.set('page', String(q.page))
      if (q.limit) params.set('limit', String(q.limit))
      if (q.source) params.set('source', q.source)
      if (q.min_score) params.set('min_score', String(q.min_score))
      if (q.keyword) params.set('keyword', q.keyword)
      if (q.date_from) params.set('date_from', q.date_from)
      if (q.date_to) params.set('date_to', q.date_to)
      if (q.sort_by) params.set('sort_by', q.sort_by)
      if (q.sort_order) params.set('sort_order', q.sort_order)
      if (q.category) params.set('category', q.category)
      if (q.region) params.set('region', q.region)
      if (q.country) params.set('country', q.country)
      return get<import('../types').PaginatedResponse<import('../types').NewsItem>>(`/news?${params}`)
    },
    get: (id: number) => get<import('../types').NewsItem>(`/news/${id}`),
    filters: () => get<import('../types').FilterOptions>('/news/filters'),
    aggregation: (q: { category?: string; region?: string; country?: string } = {}) => {
      const params = new URLSearchParams()
      if (q.category) params.set('category', q.category)
      if (q.region) params.set('region', q.region)
      if (q.country) params.set('country', q.country)
      const qs = params.toString()
      return get<import('../types').AggregationItem[]>(`/news/aggregation${qs ? '?' + qs : ''}`)
    },
    cluster: (range = '1d', threshold?: number) => {
      const params = new URLSearchParams({ range })
      if (threshold) params.set('threshold', String(threshold))
      return get<import('../types').ClusterOutput>(`/news/cluster?${params}`)
    },
    timeline: (date?: string, keyword?: string, category?: string, country?: string) => {
      const params = new URLSearchParams()
      if (date) params.set('date', date)
      if (keyword) params.set('keyword', keyword)
      if (category) params.set('category', category)
      if (country) params.set('country', country)
      const qs = params.toString()
      return get<{ date: string; timeline: import('../types').TimelineHour[] }>(`/news/timeline${qs ? '?' + qs : ''}`)
    },
  },
  briefs: {
    list: (type?: string, date?: string, limit = 10) => {
      const params = new URLSearchParams()
      if (type) params.set('type', type)
      if (date) params.set('date', date)
      params.set('limit', String(limit))
      return get<import('../types').Brief[]>(`/briefs?${params}`)
    },
    dates: () => get<string[]>('/briefs/dates'),
  },
  dashboard: {
    stats: () => get<import('../types').DashboardStats>('/dashboard/stats'),
    trends: (days = 7) => get<import('../types').TrendPoint[]>(`/dashboard/trends?days=${days}`),
    sources: () => get<import('../types').SourceStats[]>('/dashboard/sources'),
    scoreDistribution: () => get<import('../types').ScoreDistribution[]>('/dashboard/score-distribution'),
    overview: () => get<import('../types').DashboardOverview>('/dashboard/overview'),
  },
}
