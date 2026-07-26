import { Router, Request, Response } from 'express'
import db from '../db'
import { NewsItem, Brief } from '../types'

const router = Router()

function normalizeItem(item: any): NewsItem {
  return {
    title: item.title || item['标题'] || '',
    title_cn: item.title_cn || item['标题'] || null,
    time: item.time || item.iso_date || item['iso_date'] || null,
    content: item.content ?? null,
    link: item.link || item.url || item['url'] || '',
    source: item.source || item['source'] || null,
    category: item.category || item['领域'] || null,
    region: item.region || item['地区'] || null,
    country: item.country || item['国家'] || null,
    datetime_display: item.datetime_display || item.Datetime || null,
    ai_score: item.ai_score ?? null,
    ai_reason: item.ai_reason ?? null,
    full_content: item.full_content ?? null,
    summary: item.summary ?? item.Summary ?? null,
    batch_id: item.batch_id ?? null,
  }
}

router.post('/news/batch', (req: Request, res: Response) => {
  const raw = Array.isArray(req.body) ? req.body : [req.body]
  const items = raw.map(normalizeItem)
  if (items.length === 0) {
    res.status(400).json({ error: 'Expected non-empty array or object' })
    return
  }

  const insert = db.prepare(`
    INSERT OR REPLACE INTO news (title, title_cn, time, content, link, source, category, region, country, datetime_display, ai_score, ai_reason, full_content, summary, batch_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const tx = db.transaction((data: NewsItem[]) => {
    let count = 0
    for (const item of data) {
      const result = insert.run(
        item.title, item.title_cn, item.time, item.content,
        item.link, item.source, item.category, item.region, item.country,
        item.datetime_display ?? null,
        item.ai_score ?? null, item.ai_reason ?? null,
        item.full_content ?? null, item.summary ?? null, item.batch_id ?? null
      )
      if (result.changes > 0) count++
    }
    return count
  })

  const inserted = tx(items)
  res.json({ inserted, total: items.length })
})

router.post('/brief', (req: Request, res: Response) => {
  const brief: Brief = req.body
  if (!brief.type || !brief.content || !brief.date) {
    res.status(400).json({ error: 'Missing required fields: type, content, date' })
    return
  }

  const stmt = db.prepare(`
    INSERT INTO briefs (type, title, content, date, label, news_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const result = stmt.run(
    brief.type,
    brief.title || '',
    brief.content,
    brief.date,
    brief.label ?? null,
    brief.news_id ?? null
  )
  res.json({ id: result.lastInsertRowid })
})

router.post('/brief/append', (req: Request, res: Response) => {
  const { date, content } = req.body
  if (!date || !content) {
    res.status(400).json({ error: 'Missing date or content' })
    return
  }

  const existing = db.prepare(
    `SELECT id, content FROM briefs WHERE type = 'batch' AND date = ? ORDER BY created_at DESC LIMIT 1`
  ).get(date) as { id: number; content: string } | undefined

  if (existing) {
    db.prepare(`UPDATE briefs SET content = content || '\n\n' || ? WHERE id = ?`).run(content, existing.id)
    res.json({ id: existing.id, appended: true })
  } else {
    const result = db.prepare(
      `INSERT INTO briefs (type, title, content, date) VALUES ('batch', '', ?, ?)`
    ).run(content, date)
    res.json({ id: result.lastInsertRowid, appended: false })
  }
})

router.get('/accumulated', (req: Request, res: Response) => {
  const { date, type = 'day' } = req.query

  if (!date || typeof date !== 'string') {
    res.status(400).json({ error: 'Missing date query param (yyyy-mm-dd)' })
    return
  }

  if (type === 'day') {
    const rows = db.prepare(
      `SELECT * FROM news WHERE date(time) = ? ORDER BY ai_score DESC, time DESC`
    ).all(date)
    const briefs = db.prepare(
      `SELECT * FROM briefs WHERE date = ? ORDER BY created_at ASC`
    ).all(date)
    res.json({ news: rows, briefs })
  } else if (type === 'week') {
    const startDate = date
    const endDate = req.query.endDate as string || date
    const rows = db.prepare(
      `SELECT * FROM news WHERE date(time) >= ? AND date(time) <= ? ORDER BY ai_score DESC, time DESC`
    ).all(startDate, endDate)
    const briefs = db.prepare(
      `SELECT * FROM briefs WHERE date >= ? AND date <= ? ORDER BY created_at ASC`
    ).all(startDate, endDate)
    res.json({ news: rows, briefs })
  } else {
    res.status(400).json({ error: 'Invalid type, use "day" or "week"' })
  }
})

export default router
