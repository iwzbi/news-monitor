import { ReactNode } from 'react'

interface Props {
  title: string
  value: string | number
  icon?: ReactNode
}

export default function StatCard({ title, value, icon }: Props) {
  return (
    <div className="bg-white rounded-lg border p-4 flex items-center gap-3">
      {icon && <div className="text-2xl">{icon}</div>}
      <div>
        <div className="text-xs text-gray-500">{title}</div>
        <div className="text-xl font-semibold">{value}</div>
      </div>
    </div>
  )
}
