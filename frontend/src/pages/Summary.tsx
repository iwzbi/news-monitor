import { useEffect, useState } from 'react'
import { api } from '../api'
import { DashboardOverview, Brief } from '../types'

function DiffBadge({ diff }: { diff: number }) {
  if (diff === 0) return <span className="text-gray-400 text-xs">持平</span>
  const color = diff > 0 ? 'text-red-600' : 'text-green-600'
  const sign = diff > 0 ? '+' : ''
  return <span className={`text-xs ${color}`}>较昨日 {sign}{diff}</span>
}

export default function Summary() {
  const [activeTab, setActiveTab] = useState<'hourly' | 'daily' | 'weekly'>('daily')
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [briefs, setBriefs] = useState<Brief[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    api.briefs.dates().then(dates => {
      setAvailableDates(dates)
      if (dates.length > 0 && !selectedDate) {
        setSelectedDate(dates[0])
      }
    })
  }, [])

  useEffect(() => {
    if (!selectedDate) return
    setLoading(true)
    Promise.all([
      api.dashboard.overview(),
      api.briefs.list(activeTab === 'daily' ? 'daily' : activeTab === 'weekly' ? 'weekly' : 'batch', selectedDate, 50),
    ]).then(([ov, br]) => {
      setOverview(ov)
      setBriefs(br)
    }).finally(() => setLoading(false))
  }, [selectedDate, activeTab])

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const now = new Date()
  const timeStr = now.toLocaleString('zh-CN', { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const updateTime = now.toLocaleString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' })

  const tabItems = [
    { key: 'hourly' as const, label: '分时总结' },
    { key: 'daily' as const, label: '每日总结' },
    { key: 'weekly' as const, label: '每周总结' },
  ]

  return (
    <div className="flex flex-col h-full">
      <header className="h-14 bg-white border-b flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h1 className="text-lg font-bold text-gray-900">热点总结</h1>
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
        {/* Main Content */}
        <div className="flex-[7] flex flex-col overflow-hidden">
          {/* Tab Bar */}
          <div className="bg-white border-b px-6 flex items-center gap-0 shrink-0">
            {tabItems.map(tab => (
              <button
                key={tab.key}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filter Tags */}
          <div className="bg-white border-b px-6 py-2.5 flex items-center gap-2 shrink-0">
            {['涉美', '涉华', '涉台', '科技', '金融'].map(tag => (
              <button
                key={tag}
                className="px-4 py-1.5 rounded-full text-sm border bg-blue-600 text-white border-blue-600 hover:bg-blue-700 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Date Header */}
          <div className="px-6 py-3 shrink-0">
            <span className="text-sm text-gray-500">{selectedDate || '—'} (北京时间)</span>
          </div>

          {/* Briefs Content */}
          <div className="flex-1 overflow-auto px-6 pb-6">
            {loading ? (
              <div className="text-center py-10 text-gray-400">加载中...</div>
            ) : briefs.length > 0 ? (
              <div className="space-y-4">
                {briefs.map(brief => {
                  const isExpanded = expandedIds.has(brief.id)
                  const content = brief.content || ''
                  const isLong = content.length > 200
                  return (
                    <div key={brief.id} className="bg-white rounded-lg border p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          brief.type === 'daily' ? 'bg-purple-100 text-purple-700' :
                          brief.type === 'weekly' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {brief.type === 'daily' ? '日报' : brief.type === 'weekly' ? '周报' : '批次'}
                        </span>
                        {brief.label && (
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                            {brief.label}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">{brief.date}</span>
                        {brief.created_at && (
                          <span className="text-xs text-gray-400 ml-auto">{brief.created_at}</span>
                        )}
                      </div>
                      {brief.title && (
                        <h3 className="text-sm font-bold text-gray-900 mb-2">{brief.title}</h3>
                      )}
                      <div className={`text-sm text-gray-700 leading-relaxed whitespace-pre-wrap ${isExpanded || !isLong ? '' : 'line-clamp-4'}`}>
                        {content}
                      </div>
                      {isLong && (
                        <button
                          className="text-xs text-blue-600 hover:text-blue-800 mt-2"
                          onClick={() => toggleExpand(brief.id)}
                        >
                          {isExpanded ? '收起' : '展开全部'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400">
                {selectedDate ? `${selectedDate} 暂无简报数据` : '请先选择日期'}
              </div>
            )}

            {/* Expand arrow */}
            {briefs.length > 3 && (
              <div className="text-center py-4">
                <button className="text-gray-400 hover:text-gray-600 text-2xl">⌄</button>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="flex-[3] border-l bg-white overflow-auto shrink-0 p-4">
          {/* 今日概览 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-gray-900">今日概览（涉美方向）</h2>
                <span className="text-gray-400 text-xs cursor-help" title="基于今日新闻数据统计">ⓘ</span>
              </div>
              <span className="text-xs text-gray-400">数据更新: {updateTime}</span>
            </div>
            {overview && (
              <div className="grid grid-cols-2 gap-3">
                <div className="border rounded-lg p-3">
                  <div className="text-xs text-gray-500">重要事件</div>
                  <div className="text-2xl font-bold text-gray-900">{overview.importantEvents.count}</div>
                  <DiffBadge diff={overview.importantEvents.diff} />
                </div>
                <div className="border rounded-lg p-3">
                  <div className="text-xs text-gray-500">政策动向</div>
                  <div className="text-2xl font-bold text-gray-900">{overview.policyTrends.count}</div>
                  <DiffBadge diff={overview.policyTrends.diff} />
                </div>
                <div className="border rounded-lg p-3">
                  <div className="text-xs text-gray-500">舆论动态</div>
                  <div className="text-2xl font-bold text-gray-900">{overview.publicOpinion.count}</div>
                  <DiffBadge diff={overview.publicOpinion.diff} />
                </div>
                <div className="border rounded-lg p-3">
                  <div className="text-xs text-gray-500">市场影响</div>
                  <div className="text-2xl font-bold text-gray-900">{overview.marketImpact.count}</div>
                  <DiffBadge diff={overview.marketImpact.diff} />
                </div>
              </div>
            )}
          </div>

          {/* 关键摘要 */}
          <div className="mb-6">
            <h2 className="text-sm font-bold text-gray-900 mb-3">关键摘要</h2>
            {overview?.keySummary ? (
              <ul className="text-sm text-gray-600 leading-relaxed space-y-2 list-disc pl-4">
                {overview.keySummary.split('\n').filter(line => line.trim()).map((line, i) => (
                  <li key={i}>{line.replace(/^[•\-\*]\s*/, '')}</li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-gray-400">暂无摘要</div>
            )}
          </div>

          {/* 热门事件 TOP3 */}
          {overview?.topNews && overview.topNews.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-900 mb-3">热门事件 TOP3</h2>
              <div className="space-y-3">
                {overview.topNews.map((item, idx) => {
                  const heatIndex = item.ai_score ?? Math.round((Math.random() * 40 + 60) * 10) / 10
                  return (
                    <div key={item.id} className="border rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <span className="text-lg font-bold text-orange-500 shrink-0">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 line-clamp-2">{item.title_cn || item.title}</div>
                          <div className="flex items-center gap-2 mt-1.5">
                            {item.category && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                {item.category}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs text-gray-400">热度指数</div>
                          <div className="text-sm font-bold text-orange-500">{heatIndex}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <button className="w-full mt-4 text-center text-sm text-gray-600 hover:text-gray-800 py-2.5 border rounded-lg hover:bg-gray-50 transition-colors">
                查看完整日报 →
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
