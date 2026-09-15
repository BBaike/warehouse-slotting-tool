import { useState } from 'react'
import { useAppStore } from './state/useAppStore'
import { WarehousesPage } from './pages/WarehousesPage'
import { BoxTypesPage } from './pages/BoxTypesPage'
import { PlanningPage } from './pages/PlanningPage'
import './App.css'

type Tab = 'warehouses' | 'boxTypes' | 'planning'

const TABS: { id: Tab; label: string }[] = [
  { id: 'warehouses', label: 'Склады' },
  { id: 'boxTypes', label: 'Типы коробок' },
  { id: 'planning', label: 'Размещение' },
]

function App() {
  const [tab, setTab] = useState<Tab>('warehouses')
  const store = useAppStore()

  return (
    <div className="app">
      <header className="app-header">
        <h1>Планировщик склада</h1>
        <nav className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={t.id === tab ? 'tab tab-active' : 'tab'}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="app-main">
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
          />
        )}
      </main>
    </div>
  )
}

export default App
