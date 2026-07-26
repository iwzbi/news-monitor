import express from 'express'
import cors from 'cors'
import ingestRoutes from './routes/ingest'
import queryRoutes from './routes/query'

const app = express()
const PORT = parseInt(process.env.PORT || '3456')

app.use(cors())
app.use(express.json({ limit: '5mb' }))

app.use('/api', ingestRoutes)
app.use('/api', queryRoutes)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on port ${PORT}`)
})
