export interface NewsItem {
  title: string
  title_cn?: string
  time?: string
  content?: string
  link: string
  source?: string
  category?: string
  region?: string
  country?: string
  datetime_display?: string
  ai_score?: number
  ai_reason?: string
  full_content?: string
  summary?: string
  batch_id?: string
  // Accept Chinese field names from user
  标题?: string
  领域?: string
  地区?: string
  国家?: string
  url?: string
  iso_date?: string
  Datetime?: string
}

export interface Brief {
  type: 'batch' | 'daily' | 'weekly'
  title: string
  content: string
  date: string
  label?: string
  news_id?: number
}

export interface NewsRow {
  id: number
  title: string
  title_cn: string | null
  time: string | null
  content: string | null
  link: string
  source: string | null
  category: string | null
  region: string | null
  country: string | null
  datetime_display: string | null
  ai_score: number | null
  ai_reason: string | null
  full_content: string | null
  summary: string | null
  batch_id: string | null
  created_at: string
}

export interface BriefRow {
  id: number
  type: string
  title: string
  content: string
  date: string
  label: string | null
  news_id: number | null
  created_at: string
}
