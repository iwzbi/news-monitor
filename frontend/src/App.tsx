import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Hotspots from './pages/Hotspots'
import Tracking from './pages/Tracking'
import Summary from './pages/Summary'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Hotspots />} />
          <Route path="/tracking" element={<Tracking />} />
          <Route path="/summary" element={<Summary />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
