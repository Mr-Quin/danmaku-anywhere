import { AnimeSearch } from './AnimeSearch'
import { DanmakuController } from '@/popup/DanmakuController'
import { DanmakuDashboard } from '@/popup/DanmakuDashboard'
import { Selector } from '@/popup/Selector'
import './App.css'

function App() {
  return (
    <>
      <AnimeSearch />
      <DanmakuController />
      <Selector />
      <DanmakuDashboard />
    </>
  )
}

export default App
