import { NewsItem } from '../types'
import ScoreBadge from './ScoreBadge'

interface Props {
  item: NewsItem
  expanded?: boolean
  onToggle?: () => void
}

export default function NewsCard({ item, expanded, onToggle }: Props) {
  const date = item.time
    ? new Date(item.time).toLocaleString('zh-CN', { hour12: false })
    : ''

  return (
    <div className="bg-white rounded-lg border p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-blue-700 hover:underline line-clamp-2"
          >
            {item.title}
          </a>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
            {item.source && <span>{item.source}</span>}
            <span>{date}</span>
          </div>
        </div>
        <ScoreBadge score={item.ai_score} />
      </div>
      {(item.content || item.summary) && (
        <p className={`mt-2 text-sm text-gray-600 ${expanded ? '' : 'line-clamp-2'}`}>
          {item.content || item.summary}
        </p>
      )}
      {item.ai_reason && (
        <div className="mt-1 text-xs text-gray-400 italic">{item.ai_reason}</div>
      )}
    </div>
  )
}
