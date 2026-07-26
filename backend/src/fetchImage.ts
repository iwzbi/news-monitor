import * as cheerio from 'cheerio'

export async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)',
        'Accept': 'text/html',
      },
    })
    clearTimeout(timeout)

    if (!res.ok) return null

    const html = await res.text()
    const $ = cheerio.load(html)

    const og = $('meta[property="og:image"]').attr('content')
      || $('meta[name="twitter:image"]').attr('content')
      || $('meta[name="twitter:image:src"]').attr('content')

    if (!og) return null

    try {
      return new URL(og, url).href
    } catch {
      return null
    }
  } catch {
    return null
  }
}
