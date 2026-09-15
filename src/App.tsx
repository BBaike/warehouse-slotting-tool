import { useState } from 'react'
import { useAppStore } from './state/useAppStore'
import { WarehousesPage } from './pages/WarehousesPage'
import { BoxTypesPage } from './pages/BoxTypesPage'
import { PlanningPage } from './pages/PlanningPage'
import './App.css'

type Tab = 'planning' | 'warehouses' | 'boxTypes'

const TABS: { id: Tab; label: string }[] = [
  { id: 'planning', label: 'Размещение' },
  { id: 'warehouses', label: 'Склады' },
  { id: 'boxTypes', label: 'Типы коробок' },
]

function App() {
  const [tab, setTab] = useState<Tab>('planning')
  const [fallbackDismissed, setFallbackDismissed] = useState(false)
  const store = useAppStore()

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <h1>Планировщик склада</h1>
        </div>
        <nav className="tabs" aria-label="Разделы">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={t.id === tab ? 'tab tab-active' : 'tab'}
              aria-current={t.id === tab ? 'page' : undefined}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {store.usedFallback && !fallbackDismissed && (
        <div className="notice" role="status">
          <span>Сохранённые данные не удалось прочитать — загружен демо-набор.</span>
          <button type="button" className="button" onClick={() => setFallbackDismissed(true)}>
            Понятно
          </button>
        </div>
      )}

      <main className={tab === 'planning' ? 'app-main app-main-wide' : 'app-main'}>
        {tab === 'warehouses' && (
          <WarehousesPage
            warehouses={store.warehouses}
            onAdd={store.addWarehouse}
            onUpdate={store.updateWarehouse}
            onRemove={store.removeWarehouse}
          />
        )}
        {tab === 'boxTypes' && (
          <BoxTypesPage
            boxTypes={store.boxTypes}
            onAdd={store.addBoxType}
            onUpdate={store.updateBoxType}
            onRemove={store.removeBoxType}
          />
        )}
        {tab === 'planning' && (
          <PlanningPage
            warehouses={store.warehouses}
            boxTypes={store.boxTypes}
            batch={store.batch}
            onBatchChange={store.setBatch}
            onOpenWarehouses={() => setTab('warehouses')}
            onOpenBoxTypes={() => setTab('boxTypes')}
          />
        )}
      </main>
    </div>
  )
}

export default App
