import { useEffect, useState } from 'react'
import { api, NewsQuery } from '../api'
import { NewsItem, FilterOptions, ClusterOutput } from '../types'

const categoryColors: Record<string, string> = {
  '政治': 'bg-red-100 text-red-700',
  '经济': 'bg-green-100 text-green-700',
  '外交': 'bg-blue-100 text-blue-700',
  '军事': 'bg-orange-100 text-orange-700',
  '科技': 'bg-purple-100 text-purple-700',
  '环境': 'bg-teal-100 text-teal-700',
  '社会': 'bg-gray-100 text-gray-700',
}

function getCategoryColor(cat: string | null | undefined): string {
  if (!cat) return 'bg-gray-100 text-gray-600'
  for (const [key, val] of Object.entries(categoryColors)) {
    if (cat.includes(key)) return val
  }
  return 'bg-gray-100 text-gray-600'
}

function MiniSparkline({ data }: { data: number[] }) {
  if (!data.length) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const h = 24
  const w = 48
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={w} height={h} className="inline-block ml-2">
      <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="1.5" />
    </svg>
  )
}

function NewsDetailModal({ item, onClose }: { item: NewsItem; onClose: () => void }) {
  const displayTime = item.datetime_display || (item.time ? new Date(item.time).toLocaleString('zh-CN', { hour12: false }) : '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            {item.category && (
              <span className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${getCategoryColor(item.category)}`}>
                {item.category}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
        </div>
        <div className="flex-1 overflow-auto px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900 mb-3 leading-snug">
            {item.title_cn || item.title}
          </h2>
          <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
            {item.source && <span className="text-blue-600 font-medium">{item.source}</span>}
            <span>{displayTime}</span>
            {item.country && <span>{item.country}</span>}
            {item.region && <span>{item.region}</span>}
          </div>

          {item.summary && (
            <div className="mb-4">
              <div className="text-xs font-bold text-gray-500 mb-1">AI 摘要</div>
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {item.summary}
              </div>
            </div>
          )}

          {(item.full_content || item.content) && (
            <div>
              <div className="text-xs font-bold text-gray-500 mb-1">完整内容</div>
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {item.full_content || item.content}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-3 border-t shrink-0">
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            查看原文
          </a>
        </div>
      </div>
    </div>
  )
}

export default function Hotspots() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<FilterOptions>({ categories: [], regions: [], countries: [], sources: [] })
  const [cluster, setCluster] = useState<ClusterOutput | null>(null)
  const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [expandedClusterId, setExpandedClusterId] = useState<number | null>(null)
  const [expandedSummaryIds, setExpandedSummaryIds] = useState<Set<number>>(new Set())

  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('')
  const [keyword, setKeyword] = useState('')

  const limit = 20

  useEffect(() => {
    api.news.filters().then(setFilters)
  }, [])

  const fetchNews = () => {
    setLoading(true)
    const q: NewsQuery = { page, limit }
    if (keyword) q.keyword = keyword
    if (selectedCategory) q.category = selectedCategory
    if (selectedCountry) q.country = selectedCountry
    if (selectedRegion) q.region = selectedRegion
    api.news.list(q).then(res => {
      setItems(res.data)
      setTotal(res.total)
    }).finally(() => setLoading(false))
  }

  const fetchCluster = () => {
    api.news.cluster('1w').then(setCluster)
  }

  useEffect(() => { fetchNews(); fetchCluster() }, [page, selectedCategory, selectedCountry, selectedRegion])

  const search = () => { setPage(1); fetchNews() }

  const resetFilters = () => {
    setSelectedCategory('')
    setSelectedCountry('')
    setSelectedRegion('')
    setKeyword('')
    setPage(1)
  }

  const toggleSummary = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalPages = Math.ceil(total / limit)
  const now = new Date()
  const timeStr = now.toLocaleString('zh-CN', { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div className="flex flex-col h-full">
      <header className="h-14 bg-white border-b flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔥</span>
          <h1 className="text-lg font-bold text-gray-900">时事热点</h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>{timeStr}</span>
          <button className="p-1.5 hover:bg-gray-100 rounded" title="通知">🔔</button>
          <button className="p-1.5 hover:bg-gray-100 rounded" title="设置">⚙️</button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">👤</div>
            <span className="text-sm text-gray-700">分析员</span>
          </div>
        </div>
      </header>

       <div className="flex flex-1 overflow-hidden">
        <div className="flex-[6] flex flex-col overflow-hidden">
          {/* Title */}
          <div className="bg-white px-6 pt-4 pb-2 shrink-0">
            <h2 className="text-base font-bold text-gray-900">新闻列表</h2>
          </div>

          {/* Filter Bar */}
          <div className="bg-white border-b px-6 py-3 flex items-center gap-3 flex-wrap shrink-0">
            <span className="text-sm text-gray-500">领域</span>
            <select
              className="border rounded px-3 py-1.5 text-sm bg-white"
              value={selectedCategory}
              onChange={e => { setSelectedCategory(e.target.value); setPage(1) }}
            >
              <option value="">全部领域</option>
              {filters.categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <span className="text-sm text-gray-500">国家</span>
            <select
              className="border rounded px-3 py-1.5 text-sm bg-white"
              value={selectedCountry}
              onChange={e => { setSelectedCountry(e.target.value); setPage(1) }}
            >
              <option value="">全部国家</option>
              {filters.countries.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <span className="text-sm text-gray-500">区域</span>
            <select
              className="border rounded px-3 py-1.5 text-sm bg-white"
              value={selectedRegion}
              onChange={e => { setSelectedRegion(e.target.value); setPage(1) }}
            >
              <option value="">全部区域</option>
              {filters.regions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  className="border rounded pl-8 pr-3 py-1.5 text-sm w-56"
                  placeholder="搜索新闻关键词"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && search()}
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              </div>
              <button
                className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700"
                onClick={search}
              >搜索</button>
              <button
                className="border text-gray-600 px-3 py-1.5 rounded text-sm hover:bg-gray-50"
                onClick={resetFilters}
              >重置</button>
            </div>
          </div>

          {/* News List */}
          <div className="flex-1 overflow-auto p-6">
            {loading ? (
              <div className="text-center py-10 text-gray-400">加载中...</div>
            ) : items.length === 0 ? (
              <div className="text-center py-10 text-gray-400">无匹配新闻</div>
            ) : (
              <div className="space-y-3">
                {items.map(item => {
                  const catColor = getCategoryColor(item.category)
                  const displayTime = item.datetime_display || (item.time ? new Date(item.time).toLocaleString('zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '')
                  const isExpanded = expandedIds.has(item.id)
                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-lg border p-4 hover:shadow-sm transition-shadow cursor-pointer flex items-start gap-3"
                      onClick={() => setSelectedItem(item)}
                    >
                      {/* Image or blue dot */}
                      {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt=""
                            className="w-20 h-14 object-cover rounded flex-shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        ) : (
                          <div className="w-20 h-14 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center text-gray-400 text-xs">
                            无图
                          </div>
                        )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          {item.category && (
                            <span className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${catColor}`}>
                              {item.category}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 hover:text-blue-600 line-clamp-2">
                          {item.title_cn || item.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          {item.source && <span className="text-blue-600">{item.source}</span>}
                          <span>{displayTime}</span>
                          {item.country && <span className="text-gray-400">{item.country}</span>}
                          {item.region && <span className="text-gray-400">{item.region}</span>}
                        </div>
                        {item.summary && (
                          <div className="mt-2" onClick={e => e.stopPropagation()}>
                            <p className={`text-sm text-gray-600 leading-relaxed whitespace-pre-wrap ${isExpanded ? '' : 'line-clamp-2'}`}>
                              {item.summary}
                            </p>
                            {item.summary.length > 80 && (
                              <button
                                className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                                onClick={() => toggleSummary(item.id)}
                              >
                                {isExpanded ? '收起' : '展开'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <button className="text-gray-300 hover:text-yellow-500 shrink-0 text-lg" title="收藏" onClick={e => e.stopPropagation()}>☆</button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <span className="text-xs text-gray-500">共 {total} 条新闻</span>
                <div className="flex items-center gap-1">
                  <button
                    className="px-2 py-1 border rounded text-sm disabled:opacity-30"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >{'<'}</button>
                  {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 3, totalPages - 6))
                    const p = start + i
                    if (p > totalPages) return null
                    return (
                      <button
                        key={p}
                        className={`w-8 h-8 rounded text-sm ${p === page ? 'bg-blue-600 text-white' : 'border hover:bg-gray-50'}`}
                        onClick={() => setPage(p)}
                      >{p}</button>
                    )
                  })}
                  {totalPages > 7 && <span className="text-gray-400 px-1">...</span>}
                  <button
                    className="px-2 py-1 border rounded text-sm disabled:opacity-30"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >{'>'}</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="flex-[4] border-l bg-white overflow-auto shrink-0 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900">热点聚合</h2>
            <span className="text-xs text-gray-400">基于内容聚类</span>
          </div>
          <div className="space-y-2">
            {cluster?.clusters.map((item, idx) => {
              const isExpanded = expandedClusterId === item.id
              return (
                <div key={item.id} className="border rounded-lg overflow-hidden">
                  <div
                    className="p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setExpandedClusterId(isExpanded ? null : item.id)}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg font-bold text-orange-500 shrink-0">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 line-clamp-2">{item.title}</div>
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                          {item.keywords.slice(0, 3).map(kw => (
                            <span key={kw} className="inline-block text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                              {kw}
                            </span>
                          ))}
                        </div>
                        {item.summary && (
                          <div className="mt-2">
                            <div className={`text-xs text-gray-500 leading-relaxed whitespace-pre-wrap ${expandedSummaryIds.has(item.id) ? '' : 'line-clamp-3'}`}>
                              {item.summary}
                            </div>
                            {item.summary.length > 60 && (
                              <button
                                className="text-xs text-blue-600 hover:text-blue-800 mt-0.5"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setExpandedSummaryIds(prev => {
                                    const next = new Set(prev)
                                    if (next.has(item.id)) next.delete(item.id)
                                    else next.add(item.id)
                                    return next
                                  })
                                }}
                              >
                                {expandedSummaryIds.has(item.id) ? '收起' : '展开'}
                              </button>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-xs text-gray-400">
                            新闻 {item.count} 条
                          </div>
                          <div className="flex items-center">
                            <span className="text-sm font-bold text-blue-600">{item.heat_index}</span>
                            <span className="text-red-500 text-xs ml-1">↑</span>
                          </div>
                        </div>
                      </div>
                      <span className={`text-gray-400 text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t bg-gray-50 px-3 py-2 space-y-1.5 max-h-60 overflow-auto">
                      {item.news.map(n => (
                        <div
                          key={n.id}
                          className="flex items-start gap-2 text-xs py-1 hover:bg-white rounded px-1 cursor-pointer transition-colors"
                          onClick={async (e) => {
                            e.stopPropagation()
                            try {
                              const full = await api.news.get(n.id)
                              setSelectedItem(full)
                            } catch {
                              setSelectedItem({
                                id: n.id,
                                title: n.title,
                                title_cn: n.title_cn,
                                time: n.time,
                                datetime_display: n.datetime_display,
                                content: '',
                                link: '',
                                source: n.source,
                                category: n.category,
                                region: null,
                                country: null,
                                ai_score: null,
                                ai_reason: null,
                                full_content: null,
                                summary: null,
                                batch_id: null,
                                created_at: '',
                              } as NewsItem)
                            }
                          }}
                        >
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-gray-800 line-clamp-1">{n.title_cn || n.title}</div>
                            <div className="text-gray-400 mt-0.5">{n.source} · {n.datetime_display || n.time?.slice(5, 16)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {(!cluster || cluster.clusters.length === 0) && (
              <div className="text-center py-6 text-gray-400 text-sm">暂无数据</div>
            )}
          </div>
        </aside>
      </div>

      {selectedItem && <NewsDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />}
    </div>
  )
}
