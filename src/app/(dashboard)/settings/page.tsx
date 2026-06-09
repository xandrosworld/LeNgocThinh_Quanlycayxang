'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatVND, formatLiters } from '@/lib/format'
import toast from 'react-hot-toast'

interface FuelTypeData {
  id: string
  code: string
  name: string
  sellPrice: number
  costPrice: number
  discount: number
}

interface TankData {
  id: string
  name: string
  maxCapacity: number
  currentVolume: number
  fuelType: {
    id: string
    code: string
    name: string
  }
}

export default function SettingsPage() {
  const [fuelTypes, setFuelTypes] = useState<FuelTypeData[]>([])
  const [tanks, setTanks] = useState<TankData[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  // Edit states
  const [sellPrices, setSellPrices] = useState<Record<string, string>>({})
  const [costPrices, setCostPrices] = useState<Record<string, string>>({})
  const [discounts, setDiscounts] = useState<Record<string, string>>({})
  const [tankCapacities, setTankCapacities] = useState<Record<string, string>>({})
  const [debtLimit, setDebtLimit] = useState('')

  // Saving states
  const [savingSellPrices, setSavingSellPrices] = useState(false)
  const [savingCostPrices, setSavingCostPrices] = useState(false)
  const [savingDiscounts, setSavingDiscounts] = useState(false)
  const [savingTanks, setSavingTanks] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/settings')
      if (res.status === 403) {
        toast.error('Bạn không có quyền truy cập cài đặt')
        return
      }
      if (!res.ok) throw new Error('Lỗi tải cài đặt')

      const data = await res.json()
      setFuelTypes(data.fuelTypes)
      setTanks(data.tanks)
      setSettings(data.settings)

      // Initialize edit states
      const sp: Record<string, string> = {}
      const cp: Record<string, string> = {}
      const dc: Record<string, string> = {}
      data.fuelTypes.forEach((ft: FuelTypeData) => {
        sp[ft.id] = ft.sellPrice.toString()
        cp[ft.id] = ft.costPrice.toString()
        dc[ft.id] = ft.discount.toString()
      })
      setSellPrices(sp)
      setCostPrices(cp)
      setDiscounts(dc)

      const tc: Record<string, string> = {}
      data.tanks.forEach((t: TankData) => {
        tc[t.id] = t.maxCapacity.toString()
      })
      setTankCapacities(tc)

      setDebtLimit(data.settings.defaultDebtLimit || '50000000')
    } catch {
      toast.error('Không thể tải cài đặt')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const saveSection = async (section: string, data: unknown, setSaving: (v: boolean) => void) => {
    try {
      setSaving(true)
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, data }),
      })

      if (!res.ok) throw new Error('Lỗi lưu cài đặt')
      toast.success('Đã lưu cài đặt!')
      fetchData()
    } catch {
      toast.error('Không thể lưu cài đặt')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSellPrices = () => {
    const data = fuelTypes.map((ft) => ({
      id: ft.id,
      sellPrice: sellPrices[ft.id] || ft.sellPrice,
    }))
    saveSection('sellPrices', data, setSavingSellPrices)
  }

  const handleSaveCostPrices = () => {
    const data = fuelTypes.map((ft) => ({
      id: ft.id,
      costPrice: costPrices[ft.id] || ft.costPrice,
    }))
    saveSection('costPrices', data, setSavingCostPrices)
  }

  const handleSaveDiscounts = () => {
    const data = fuelTypes.map((ft) => ({
      id: ft.id,
      discount: discounts[ft.id] || ft.discount,
    }))
    saveSection('discounts', data, setSavingDiscounts)
  }

  const handleSaveTanks = () => {
    const data = tanks.map((t) => ({
      id: t.id,
      maxCapacity: tankCapacities[t.id] || t.maxCapacity,
    }))
    saveSection('tanks', data, setSavingTanks)
  }

  const handleSaveSettings = () => {
    saveSection('settings', { defaultDebtLimit: debtLimit }, setSavingSettings)
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">⚙️ Cài đặt</h1>
        <p className="text-sm text-gray-500 mt-1">Quản lý giá bán, giá nhập, chiết khấu, dung tích bồn</p>
      </div>

      {/* Section 1: Giá bán */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">💰 Giá bán từng mặt hàng</h2>
            <p className="text-xs text-gray-500">Giá bán lẻ cho khách hàng (đ/lít)</p>
          </div>
          <button
            onClick={handleSaveSellPrices}
            disabled={savingSellPrices}
            className="btn-primary btn-sm"
          >
            {savingSellPrices ? '⏳ Đang lưu...' : '💾 Lưu'}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {fuelTypes.map((ft) => (
            <div key={ft.id}>
              <label className="label">{ft.name} ({ft.code})</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={sellPrices[ft.id] || ''}
                  onChange={(e) => setSellPrices({ ...sellPrices, [ft.id]: e.target.value })}
                  className="input"
                  min="0"
                />
                <span className="text-sm text-gray-400 whitespace-nowrap">đ/lít</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Hiện tại: {formatVND(ft.sellPrice)}/lít
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Giá nhập */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">📦 Giá nhập / Giá vốn</h2>
            <p className="text-xs text-gray-500">Giá nhập trung bình dùng tính lợi nhuận (đ/lít)</p>
          </div>
          <button
            onClick={handleSaveCostPrices}
            disabled={savingCostPrices}
            className="btn-primary btn-sm"
          >
            {savingCostPrices ? '⏳ Đang lưu...' : '💾 Lưu'}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {fuelTypes.map((ft) => (
            <div key={ft.id}>
              <label className="label">{ft.name} ({ft.code})</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={costPrices[ft.id] || ''}
                  onChange={(e) => setCostPrices({ ...costPrices, [ft.id]: e.target.value })}
                  className="input"
                  min="0"
                />
                <span className="text-sm text-gray-400 whitespace-nowrap">đ/lít</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Hiện tại: {formatVND(ft.costPrice)}/lít
              </p>
            </div>
          ))}
        </div>
        {/* Profit margin preview */}
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm font-medium text-green-800 mb-2">📊 Biên lợi nhuận hiện tại:</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {fuelTypes.map((ft) => {
              const margin = ft.sellPrice - ft.costPrice
              const pct = ft.sellPrice > 0 ? ((margin / ft.sellPrice) * 100).toFixed(1) : '0'
              return (
                <div key={ft.id} className="text-green-700">
                  <strong>{ft.code}:</strong> {formatVND(margin)}/lít ({pct}%)
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Section 3: Chiết khấu */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">🏷️ Chiết khấu / Hoa hồng</h2>
            <p className="text-xs text-gray-500">Mức chiết khấu cho đại lý/khách sỉ (đ/lít)</p>
          </div>
          <button
            onClick={handleSaveDiscounts}
            disabled={savingDiscounts}
            className="btn-primary btn-sm"
          >
            {savingDiscounts ? '⏳ Đang lưu...' : '💾 Lưu'}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {fuelTypes.map((ft) => (
            <div key={ft.id}>
              <label className="label">{ft.name} ({ft.code})</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={discounts[ft.id] || ''}
                  onChange={(e) => setDiscounts({ ...discounts, [ft.id]: e.target.value })}
                  className="input"
                  min="0"
                />
                <span className="text-sm text-gray-400 whitespace-nowrap">đ/lít</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Hiện tại: {formatVND(ft.discount)}/lít
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Dung tích bồn */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">🛢️ Dung tích bồn chứa</h2>
            <p className="text-xs text-gray-500">Dung tích tối đa của từng bồn (lít)</p>
          </div>
          <button
            onClick={handleSaveTanks}
            disabled={savingTanks}
            className="btn-primary btn-sm"
          >
            {savingTanks ? '⏳ Đang lưu...' : '💾 Lưu'}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {tanks.map((t) => (
            <div key={t.id}>
              <label className="label">{t.name} ({t.fuelType.code})</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={tankCapacities[t.id] || ''}
                  onChange={(e) => setTankCapacities({ ...tankCapacities, [t.id]: e.target.value })}
                  className="input"
                  min="1000"
                />
                <span className="text-sm text-gray-400">lít</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Hiện tại: {formatLiters(t.maxCapacity)} lít | Tồn: {formatLiters(t.currentVolume)} lít
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 5: Hạn mức nợ */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">📋 Hạn mức nợ mặc định</h2>
            <p className="text-xs text-gray-500">Áp dụng khi tạo khách hàng mới</p>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="btn-primary btn-sm"
          >
            {savingSettings ? '⏳ Đang lưu...' : '💾 Lưu'}
          </button>
        </div>
        <div className="max-w-sm">
          <label className="label">Hạn mức nợ tối đa</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={debtLimit}
              onChange={(e) => setDebtLimit(e.target.value)}
              className="input"
              min="0"
            />
            <span className="text-sm text-gray-400">đ</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Hiện tại: {formatVND(parseFloat(debtLimit) || 0)}
          </p>
        </div>
      </div>
    </div>
  )
}
