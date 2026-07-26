import db from './db'
import { fetchOgImage } from './fetchImage'

const BATCH_SIZE = 20
const INTERVAL_MS = 5 * 60 * 1000

async function fetchMissingImages() {
  const rows = db.prepare(
    `SELECT id, link FROM news WHERE image_url IS NULL LIMIT ?`
  ).all(BATCH_SIZE) as { id: number; link: string }[]

  if (rows.length === 0) return

  for (const row of rows) {
    const imageUrl = await fetchOgImage(row.link)
    db.prepare(`UPDATE news SET image_url = ? WHERE id = ?`).run(
      imageUrl ?? null,
      row.id
    )
    if (imageUrl) console.log(`[job] fetched image for news #${row.id}`)
    await new Promise(r => setTimeout(r, 1000))
  }
}

export function startImageJob() {
  console.log('[job] image fetcher started')
  fetchMissingImages()
  setInterval(fetchMissingImages, INTERVAL_MS)
}
