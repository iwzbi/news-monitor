interface Props {
  score: number | null
}

export default function ScoreBadge({ score }: Props) {
  if (score === null || score === undefined) return null
  const color =
    score >= 8 ? 'bg-green-100 text-green-800' :
    score >= 6 ? 'bg-blue-100 text-blue-800' :
    score >= 4 ? 'bg-yellow-100 text-yellow-800' :
    'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${color}`}>
      {score}
    </span>
  )
}
