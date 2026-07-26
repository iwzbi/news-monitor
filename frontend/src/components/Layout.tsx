import { NavLink, Outlet } from 'react-router-dom'
import { useState } from 'react'

const navItems = [
  { to: '/', label: '时事热点', icon: '🔥' },
  { to: '/tracking', label: '关注目标', icon: '🎯' },
  { to: '/summary', label: '热点总结', icon: '📊' },
]

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className={`${collapsed ? 'w-14' : 'w-44'} bg-gray-900 shrink-0 flex flex-col transition-all duration-300`}>
        {/* Logo */}
        <div className={`${collapsed ? 'px-2 justify-center' : 'px-4'} h-14 flex items-center gap-2 border-b border-gray-700`}>
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm shrink-0">
            🌐
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-white font-bold text-sm leading-tight truncate">时事监测平台</div>
              <div className="text-gray-400 text-[10px] leading-tight truncate">Current Affairs Monitoring</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  collapsed ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-gray-300 hover:bg-gray-800'
                }`
              }
              title={collapsed ? item.label : undefined}
            >
              <span className="text-base shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse Button at Bottom */}
        <div className="p-2 border-t border-gray-700">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm"
          >
            <span className="text-base">{collapsed ? '»' : '‹'}</span>
            {!collapsed && <span>收起侧边栏</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}
