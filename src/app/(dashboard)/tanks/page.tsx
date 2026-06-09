'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatLiters, formatPercent } from '@/lib/format'
import toast from 'react-hot-toast'

interface TankData {
  id: string
  name: string
  fuelTypeId: string
  maxCapacity: number
  currentVolume: number
  warningLow: number
  warningCritical: number
  warningHigh: number
  fuelType: {
    id: string
    code: string
    name: string
  }
}

function getTankStatus(pct: number, tank: TankData) {
  if (pct < tank.warningCritical) return { label: 'Nguy hiểm', color: 'red', bgColor: 'bg-red-500', textColor: 'text-red-600', borderColor: 'border-red-300', bgLight: 'bg-red-50' }
  if (pct < tank.warningLow) return { label: 'Sắp hết', color: 'yellow', bgColor: 'bg-yellow-500', textColor: 'text-yellow-600', borderColor: 'border-yellow-300', bgLight: 'bg-yellow-50' }
  if (pct > tank.warningHigh) return { label: 'Gần đầy', color: 'orange', bgColor: 'bg-orange-500', textColor: 'text-orange-600', borderColor: 'border-orange-300', bgLight: 'bg-orange-50' }
  return { label: 'An toàn', color: 'green', bgColor: 'bg-green-500', textColor: 'text-green-600', borderColor: 'border-green-300', bgLight: 'bg-green-50' }
}

function getFuelColor(code: string): string {
  switch (code) {
    case 'D1': return '#f59e0b'
    case 'E10': return '#22c55e'
    case 'DS': return '#3b82f6'
    default: return '#6b7280'
  }
}

function TankCard({ tank, animated }: { tank: TankData; animated: boolean }) {
  const [fillHeight, setFillHeight] = useState(0)
  const pct = (tank.currentVolume / tank.maxCapacity) * 100
  const status = getTankStatus(pct, tank)
  const color = getFuelColor(tank.fuelType.code)

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setFillHeight(pct)
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setFillHeight(pct)
    }
  }, [pct, animated])

  return (
    <div className={`card border-2 ${status.borderColor} animate-slide-in`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-lg text-gray-900">{tank.name}</h3>
          <p className="text-sm text-gray-500">{tank.fuelType.name} ({tank.fuelType.code})</p>
        </div>
        <span className={`badge ${status.bgLight} ${status.textColor} font-semibold`}>
          {status.label}
        </span>
      </div>

      {/* Tank Visual */}
      <div className="flex items-end gap-4 mb-4">
        <div className="relative w-20 h-44 bg-gray-100 rounded-lg border-2 border-gray-300 overflow-hidden flex-shrink-0">
          {/* Fill level markers */}
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute w-full border-t border-dashed border-gray-300" style={{ bottom: '90%' }}>
              <span className="absolute -right-1 -top-3 text-[9px] text-gray-400">90%</span>
            </div>
            <div className="absolute w-full border-t border-dashed border-gray-300" style={{ bottom: '30%' }}>
              <span className="absolute -right-1 -top-3 text-[9px] text-gray-400">30%</span>
            </div>
            <div className="absolute w-full border-t border-dashed border-gray-300" style={{ bottom: '10%' }}>
              <span className="absolute -right-1 -top-3 text-[9px] text-gray-400">10%</span>
            </div>
          </div>

          {/* Fill */}
          <div
            className="absolute bottom-0 left-0 w-full tank-fill"
            style={{
              height: `${fillHeight}%`,
              backgroundColor: color,
              opacity: 0.85,
              transition: 'height 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/* Wave effect */}
            <div
              className="absolute top-0 left-0 w-full h-2"
              style={{
                background: `linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%)`,
              }}
            />
          </div>

          {/* Percentage label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-gray-800 bg-white/70 rounded px-1">
              {formatPercent(pct)}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 space-y-2">
          <div>
            <p className="text-xs text-gray-500">Dung tích hiện tại</p>
            <p className="text-xl font-bold" style={{ color }}>
              {formatLiters(tank.currentVolume)} <span className="text-sm font-normal text-gray-500">lít</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Dung tích tối đa</p>
            <p className="text-base font-semibold text-gray-700">
              {formatLiters(tank.maxCapacity)} <span className="text-sm font-normal text-gray-500">lít</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Còn trống</p>
            <p className="text-base text-gray-600">
              {formatLiters(tank.maxCapacity - tank.currentVolume)} <span className="text-sm font-normal text-gray-500">lít</span>
            </p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="h-3 rounded-full transition-all duration-1500 ease-out"
          style={{
            width: `${fillHeight}%`,
            backgroundColor: color,
            transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
    </div>
  )
}

export default function TanksPage() {
  const [tanks, setTanks] = useState<TankData[]>([])
  const [loading, setLoading] = useState(true)
  const [animated, setAnimated] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/tanks')
      if (!res.ok) {
        toast.error('Không thể tải dữ liệu bồn')
        return
      }
      const data = await res.json()
      setTanks(data)
      // Trigger animation after data loads
      setTimeout(() => setAnimated(true), 50)
    } catch {
      toast.error('Lỗi kết nối server')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalVolume = tanks.reduce((sum, t) => sum + t.currentVolume, 0)
  const totalCapacity = tanks.reduce((sum, t) => sum + t.maxCapacity, 0)
  const totalPct = totalCapacity > 0 ? (totalVolume / totalCapacity) * 100 : 0

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-72 bg-gray-200 rounded-xl"></div>
            <div className="h-72 bg-gray-200 rounded-xl"></div>
            <div className="h-72 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">⛽ Tồn bồn</h1>
          <p className="text-sm text-gray-500 mt-1">Theo dõi mức nhiên liệu trong từng bồn chứa</p>
        </div>
        <button onClick={fetchData} className="btn-outline">
          🔄 Làm mới
        </button>
      </div>

      {/* Summary */}
      <div className="card bg-gradient-to-r from-primary-500 to-accent-500 text-white border-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm opacity-80">Tổng tồn kho</p>
            <p className="text-3xl font-bold">{formatLiters(totalVolume)} / {formatLiters(totalCapacity)} lít</p>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-80">Tỷ lệ chung</p>
            <p className="text-3xl font-bold">{formatPercent(totalPct)}</p>
          </div>
        </div>
        <div className="mt-3 w-full bg-white/30 rounded-full h-3">
          <div
            className="h-3 rounded-full bg-white/90 transition-all duration-1500"
            style={{ width: `${totalPct}%` }}
          />
        </div>
      </div>

      {/* Tank Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tanks.map((tank) => (
          <TankCard key={tank.id} tank={tank} animated={animated} />
        ))}
      </div>

      {/* Legend */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">Chú thích mức cảnh báo</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="text-gray-600">Nguy hiểm (&lt;10%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span className="text-gray-600">Sắp hết (10-30%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span className="text-gray-600">An toàn (30-90%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500"></span>
            <span className="text-gray-600">Gần đầy (&gt;90%)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
