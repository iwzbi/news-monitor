import { Router, Request, Response } from 'express'
import db from '../db'
import { clusterNews } from '../cluster'

const router = Router()

router.get('/news', (req: Request, res: Response) => {
  const {
    page = '1',
    limit = '20',
    source,
    min_score,
    keyword,
    date_from,
    date_to,
    sort_by = 'time',
    sort_order = 'desc',
    category,
    region,
    country,
  } = req.query

  const pageNum = Math.max(1, parseInt(page as string))
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)))
  const offset = (pageNum - 1) * limitNum

  const conditions: string[] = []
  const params: any[] = []

  if (source) {
    conditions.push('source = ?')
    params.push(source)
  }
  if (min_score) {
    conditions.push('ai_score >= ?')
    params.push(parseInt(min_score as string))
  }
  if (keyword) {
    conditions.push('(title LIKE ? OR title_cn LIKE ? OR content LIKE ?)')
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
  }
  if (date_from) {
    conditions.push('time >= ?')
    params.push(date_from)
  }
  if (date_to) {
    conditions.push('time <= ?')
    params.push(date_to)
  }
  if (category) {
    conditions.push('category LIKE ?')
    params.push(`%${category}%`)
  }
  if (region) {
    conditions.push('region LIKE ?')
    params.push(`%${region}%`)
  }
  if (country) {
    conditions.push('country = ?')
    params.push(country)
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

  const allowedSorts = ['time', 'ai_score', 'title']
  const sortCol = allowedSorts.includes(sort_by as string) ? sort_by : 'time'
  const sortDir = sort_order === 'asc' ? 'ASC' : 'DESC'

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM news ${where}`).get(...params) as { total: number }

  const rows = db.prepare(
    `SELECT * FROM news ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`
  ).all(...params, limitNum, offset)

  res.json({
    data: rows,
    page: pageNum,
    limit: limitNum,
    total: countRow.total,
    totalPages: Math.ceil(countRow.total / limitNum)
  })
})

router.get('/news/filters', (_req: Request, res: Response) => {
  const categories = db.prepare(`SELECT DISTINCT category FROM news WHERE category IS NOT NULL ORDER BY category`).all() as { category: string }[]
  const regions = db.prepare(`SELECT DISTINCT region FROM news WHERE region IS NOT NULL ORDER BY region`).all() as { region: string }[]
  const countries = db.prepare(`SELECT DISTINCT country FROM news WHERE country IS NOT NULL ORDER BY country`).all() as { country: string }[]
  const sources = db.prepare(`SELECT DISTINCT source FROM news WHERE source IS NOT NULL ORDER BY source`).all() as { source: string }[]

  function splitAndDedup(items: string[]): string[] {
    const set = new Set<string>()
    for (const item of items) {
      const parts = item.split(/[；;]/).map(s => s.trim()).filter(Boolean)
      for (const p of parts) set.add(p)
    }
    return Array.from(set).sort()
  }

  res.json({
    categories: splitAndDedup(categories.map(c => c.category)),
    regions: splitAndDedup(regions.map(r => r.region)),
    countries: splitAndDedup(countries.map(c => c.country)),
    sources: sources.map(s => s.source),
  })
})

router.get('/news/aggregation', (req: Request, res: Response) => {
  const { date_from, date_to, category, region, country } = req.query
  const conditions: string[] = []
  const params: any[] = []

  if (date_from) { conditions.push('time >= ?'); params.push(date_from) }
  if (date_to) { conditions.push('time <= ?'); params.push(date_to) }
  if (category) { conditions.push('category LIKE ?'); params.push(`%${category}%`) }
  if (region) { conditions.push('region LIKE ?'); params.push(`%${region}%`) }
  if (country) { conditions.push('country = ?'); params.push(country) }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

  const rows = db.prepare(`
    SELECT id, category FROM news ${where}
  `).all(...params) as { id: number; category: string }[]

  const aggregated: Record<string, { count: number; news_ids: number[] }> = {}
  for (const row of rows) {
    const cats = (row.category || '未分类').split(/[；;]/).map(s => s.trim()).filter(Boolean)
    for (const cat of cats) {
      if (!aggregated[cat]) aggregated[cat] = { count: 0, news_ids: [] }
      aggregated[cat].count++
      aggregated[cat].news_ids.push(row.id)
    }
  }

  const result = Object.entries(aggregated)
    .map(([category, data]) => ({
      category,
      count: data.count,
      heat_index: Math.round((Math.random() * 40 + 60) * 10) / 10,
      news_ids: data.news_ids,
    }))
    .sort((a, b) => b.count - a.count)

  res.json(result)
})

router.get('/news/timeline', (req: Request, res: Response) => {
  const { date, date_from, date_to, keyword, category, country, range } = req.query
  const conditions: string[] = []
  const params: any[] = []

  const now = Date.now() + 8 * 3600000

  if (date_from || date_to) {
    if (date_from) { conditions.push("date(time) >= ?"); params.push(date_from) }
    if (date_to) { conditions.push("date(time) <= ?"); params.push(date_to) }
  } else if (range) {
    const d = new Date(now)
    if (range === '1h') {
      d.setHours(d.getHours() - 1)
      conditions.push("time >= ?")
      params.push(d.toISOString().replace('Z', '').slice(0, 19))
    } else if (range === '1d') {
      d.setDate(d.getDate() - 1)
      conditions.push("date(time) >= ?")
      params.push(d.toISOString().slice(0, 10))
    } else if (range === '1w') {
      d.setDate(d.getDate() - 7)
      conditions.push("date(time) >= ?")
      params.push(d.toISOString().slice(0, 10))
    }
  } else if (date) {
    conditions.push("date(time) = ?")
    params.push(date)
  } else {
    const today = new Date(now).toISOString().slice(0, 10)
    conditions.push("date(time) = ?")
    params.push(today)
  }

  if (keyword) {
    conditions.push('(title LIKE ? OR title_cn LIKE ? OR content LIKE ?)')
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
  }
  if (category) { conditions.push('category LIKE ?'); params.push(`%${category}%`) }
  if (country) { conditions.push('country = ?'); params.push(country) }

  const where = 'WHERE ' + conditions.join(' AND ')

  const rows = db.prepare(`
    SELECT *, strftime('%H', time) as hour, date(time) as date_only
    FROM news ${where}
    ORDER BY time DESC
  `).all(...params)

  const grouped: Record<string, any[]> = {}
  for (const row of rows as any[]) {
    const h = row.hour || '00'
    if (!grouped[h]) grouped[h] = []
    grouped[h].push(row)
  }

  const timeline = Object.entries(grouped)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([hour, items]) => ({
      hour: `${hour}:00`,
      count: items.length,
      items,
    }))

  const dateRange = date_from || date_to || date || new Date(now).toISOString().slice(0, 10)

  res.json({
    date: dateRange,
    range: range || null,
    total: rows.length,
    timeline,
  })
})

router.get('/news/cluster', (req: Request, res: Response) => {
  const { range = '1d', threshold = '0.05' } = req.query
  const now = Date.now() + 8 * 3600000
  const d = new Date(now)
  let dateFrom = ''

  if (range === '1h') {
    d.setHours(d.getHours() - 1)
    dateFrom = d.toISOString().replace('Z', '').slice(0, 19)
  } else if (range === '1d') {
    d.setDate(d.getDate() - 1)
    dateFrom = d.toISOString().slice(0, 10)
  } else if (range === '1w') {
    d.setDate(d.getDate() - 7)
    dateFrom = d.toISOString().slice(0, 10)
  } else {
    d.setDate(d.getDate() - 1)
    dateFrom = d.toISOString().slice(0, 10)
  }

  const rows = db.prepare(`
    SELECT id, title, title_cn, source, time, datetime_display, category, summary FROM news
    WHERE time >= ?
    ORDER BY time DESC
  `).all(dateFrom) as { id: number; title: string; title_cn: string | null; source: string; time: string; datetime_display: string | null; category: string | null; summary: string | null }[]

  const result = clusterNews(rows, range as string, parseFloat(threshold as string))
  res.json(result)
})

router.get('/news/:id', (req: Request, res: Response) => {
  const row = db.prepare(`SELECT * FROM news WHERE id = ?`).get(req.params.id)
  if (!row) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(row)
})

router.get('/briefs/dates', (_req: Request, res: Response) => {
  const rows = db.prepare(
    `SELECT DISTINCT date FROM briefs ORDER BY date DESC`
  ).all() as { date: string }[]
  res.json(rows.map(r => r.date))
})

router.get('/briefs', (req: Request, res: Response) => {
  const { type, date, limit = '10' } = req.query
  const conditions: string[] = []
  const params: any[] = []

  if (type) {
    conditions.push('type = ?')
    params.push(type)
  }
  if (date) {
    conditions.push('date LIKE ?')
    params.push(`%${date}%`)
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''
  const rows = db.prepare(
    `SELECT * FROM briefs ${where} ORDER BY created_at DESC LIMIT ?`
  ).all(...params, parseInt(limit as string))

  res.json(rows)
})

router.get('/dashboard/stats', (_req: Request, res: Response) => {
  const today = db.prepare(`
    SELECT COUNT(*) as count, AVG(ai_score) as avg_score
    FROM news WHERE date(time) = date('now', '+8 hours')
  `).get()

  const totalNews = db.prepare(`SELECT COUNT(*) as count FROM news`).get() as { count: number }
  const totalSources = db.prepare(`SELECT COUNT(DISTINCT source) as count FROM news WHERE source IS NOT NULL`).get() as { count: number }

  res.json({
    todayNews: (today as any).count || 0,
    todayAvgScore: Math.round(((today as any).avg_score || 0) * 10) / 10,
    totalNews: totalNews.count,
    totalSources: totalSources.count
  })
})

router.get('/dashboard/trends', (req: Request, res: Response) => {
  const days = parseInt((req.query.days as string) || '7')
  const rows = db.prepare(`
    SELECT date(time) as date, COUNT(*) as count, ROUND(AVG(ai_score), 1) as avg_score
    FROM news
    WHERE time >= date('now', '+8 hours', '-' || ? || ' days')
    GROUP BY date(time)
    ORDER BY date(time) ASC
  `).all(days)
  res.json(rows)
})

router.get('/dashboard/sources', (_req: Request, res: Response) => {
  const rows = db.prepare(`
    SELECT source, COUNT(*) as count, ROUND(AVG(ai_score), 1) as avg_score
    FROM news WHERE source IS NOT NULL
    GROUP BY source
    ORDER BY count DESC
  `).all()
  res.json(rows)
})

router.get('/dashboard/score-distribution', (_req: Request, res: Response) => {
  const rows = db.prepare(`
    SELECT
      CASE
        WHEN ai_score >= 9 THEN '9-10'
        WHEN ai_score >= 7 THEN '7-8'
        WHEN ai_score >= 5 THEN '5-6'
        WHEN ai_score >= 3 THEN '3-4'
        ELSE '1-2'
      END as range,
      COUNT(*) as count
    FROM news WHERE ai_score IS NOT NULL
    GROUP BY range
    ORDER BY range DESC
  `).all()
  res.json(rows)
})

router.get('/dashboard/overview', (_req: Request, res: Response) => {
  const today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 24 * 3600000 + 8 * 3600000).toISOString().slice(0, 10)

  const todayCount = db.prepare(`SELECT COUNT(*) as c FROM news WHERE date(time) = ?`).get(today) as { c: number }
  const yesterdayCount = db.prepare(`SELECT COUNT(*) as c FROM news WHERE date(time) = ?`).get(yesterday) as { c: number }

  const policyCount = db.prepare(`SELECT COUNT(*) as c FROM news WHERE date(time) = ? AND (category LIKE '%政策%' OR category LIKE '%政治%')`).get(today) as { c: number }
  const policyYesterday = db.prepare(`SELECT COUNT(*) as c FROM news WHERE date(time) = ? AND (category LIKE '%政策%' OR category LIKE '%政治%')`).get(yesterday) as { c: number }

  const opinionCount = db.prepare(`SELECT COUNT(*) as c FROM news WHERE date(time) = ? AND category LIKE '%舆论%'`).get(today) as { c: number }
  const opinionYesterday = db.prepare(`SELECT COUNT(*) as c FROM news WHERE date(time) = ? AND category LIKE '%舆论%'`).get(yesterday) as { c: number }

  const marketCount = db.prepare(`SELECT COUNT(*) as c FROM news WHERE date(time) = ? AND category LIKE '%经济%'`).get(today) as { c: number }
  const marketYesterday = db.prepare(`SELECT COUNT(*) as c FROM news WHERE date(time) = ? AND category LIKE '%经济%'`).get(yesterday) as { c: number }

  const topNews = db.prepare(`
    SELECT id, title, title_cn, category, ai_score FROM news
    WHERE date(time) = ?
    ORDER BY ai_score DESC NULLS LAST
    LIMIT 3
  `).all(today)

  const summaries = db.prepare(`
    SELECT content FROM briefs
    WHERE date = ? AND type = 'daily'
    ORDER BY created_at DESC LIMIT 1
  `).get(today) as { content: string } | undefined

  res.json({
    date: today,
    importantEvents: { count: todayCount.c, diff: todayCount.c - yesterdayCount.c },
    policyTrends: { count: policyCount.c, diff: policyCount.c - policyYesterday.c },
    publicOpinion: { count: opinionCount.c, diff: opinionCount.c - opinionYesterday.c },
    marketImpact: { count: marketCount.c, diff: marketCount.c - marketYesterday.c },
    topNews,
    keySummary: summaries?.content || null,
  })
})

export default router
