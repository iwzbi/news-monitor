export default function Tracking() {
  const now = new Date()
  const timeStr = now.toLocaleString('zh-CN', { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div className="flex flex-col h-full">
      <header className="h-14 bg-white border-b flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <h1 className="text-lg font-bold text-gray-900">关注目标</h1>
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
      <div className="flex-1 flex items-center justify-center text-gray-400">
        暂无内容
      </div>
    </div>
  )
}
