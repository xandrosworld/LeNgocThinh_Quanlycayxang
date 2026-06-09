'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatVND } from '@/lib/format'
import toast from 'react-hot-toast'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

interface ProfitData {
  period: { from: string; to: string }
  totalRevenue: number
  totalCOGS: number
  totalDiscount: number
  grossProfit: number
  totalExpenses: number
  netProfit: number
  fuelDetails: {
    code: string
    name: string
    liters: number
    revenue: number
    cogs: number
    discount: number
  }[]
  dailyProfit: {
    date: string
    revenue: number
    cogs: number
    discount: number
    expense: number
    grossProfit: number
    netProfit: number
  }[]
}

type PeriodType = 'this_month' | 'last_month' | 'custom'

export default function ProfitPage() {
  const [data, setData] = useState<ProfitData | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodType, setPeriodType] = useState<PeriodType>('this_month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      const now = new Date()
      let from: string
      let to: string

      if (periodType === 'this_month') {
        from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      } else if (periodType === 'last_month') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        from = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-01`
        const lastDay = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).getDate()
        to = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      } else {
        if (!customFrom || !customTo) {
          setLoading(false)
          return
        }
        from = customFrom
        to = customTo
      }

      const res = await fetch(`/api/profit?from=${from}&to=${to}`)
      if (res.status === 403) {
        toast.error('Bạn không có quyền xem lợi nhuận')
        return
      }
      if (!res.ok) throw new Error('Lỗi tải dữ liệu')
      const result = await res.json()
      setData(result)
    } catch {
      toast.error('Không thể tải dữ liệu lợi nhuận')
    } finally {
      setLoading(false)
    }
  }, [periodType, customFrom, customTo])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading || !data) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="h-80 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    )
  }

  const grossProfitMargin = data.totalRevenue > 0
    ? ((data.grossProfit / data.totalRevenue) * 100).toFixed(1)
    : '0'
  const netProfitMargin = data.totalRevenue > 0
    ? ((data.netProfit / data.totalRevenue) * 100).toFixed(1)
    : '0'

  // Chart data
  const profitChartData = {
    labels: data.dailyProfit.map((d) => d.date.split('-')[2]),
    datasets: [
      {
        label: 'Doanh thu',
        data: data.dailyProfit.map((d) => d.revenue),
        borderColor: '#0d9488',
        backgroundColor: 'rgba(13, 148, 136, 0.05)',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 2,
      },
      {
        label: 'Lợi nhuận gộp',
        data: data.dailyProfit.map((d) => d.grossProfit),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 2,
      },
      {
        label: 'Lợi nhuận ròng',
        data: data.dailyProfit.map((d) => d.netProfit),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 2,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 16,
        },
      },
      tooltip: {
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) =>
            `${ctx.dataset.label || ''}: ${formatVND(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: string | number) => {
            const num = typeof value === 'string' ? parseFloat(value) : value
            if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'tr'
            if (num >= 1_000) return (num / 1_000).toFixed(0) + 'k'
            return num.toString()
          },
        },
      },
    },
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💰 Lợi nhuận</h1>
          <p className="text-sm text-gray-500 mt-1">Phân tích doanh thu, giá vốn và lợi nhuận</p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="card">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex gap-2">
            <button
              onClick={() => setPeriodType('this_month')}
              className={periodType === 'this_month' ? 'btn-primary' : 'btn-outline'}
            >
              Tháng này
            </button>
            <button
              onClick={() => setPeriodType('last_month')}
              className={periodType === 'last_month' ? 'btn-primary' : 'btn-outline'}
            >
              Tháng trước
            </button>
            <button
              onClick={() => setPeriodType('custom')}
              className={periodType === 'custom' ? 'btn-primary' : 'btn-outline'}
            >
              Tùy chọn
            </button>
          </div>
          {periodType === 'custom' && (
            <div className="flex gap-2 items-end">
              <div>
                <label className="label">Từ</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Đến</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="input"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="card">
          <div className="card-header">Doanh thu</div>
          <div className="text-xl font-bold text-accent-500">{formatVND(data.totalRevenue)}</div>
          <p className="text-xs text-gray-400 mt-1">Tổng bán ra</p>
        </div>
        <div className="card">
          <div className="card-header">Giá vốn</div>
          <div className="text-xl font-bold text-gray-700">{formatVND(data.totalCOGS)}</div>
          <p className="text-xs text-gray-400 mt-1">Lít bán × Giá nhập TB</p>
        </div>
        <div className="card">
          <div className="card-header">Chiết khấu/HH</div>
          <div className="text-xl font-bold text-blue-500">{formatVND(data.totalDiscount)}</div>
          <p className="text-xs text-gray-400 mt-1">Lít bán × CK/lít</p>
        </div>
        <div className="card border-2 border-green-200 bg-green-50/50">
          <div className="card-header">Lợi nhuận gộp</div>
          <div className="text-xl font-bold text-success-500">{formatVND(data.grossProfit)}</div>
          <p className="text-xs text-gray-400 mt-1">DT - Giá vốn ({grossProfitMargin}%)</p>
        </div>
        <div className="card">
          <div className="card-header">Chi phí</div>
          <div className="text-xl font-bold text-danger-500">{formatVND(data.totalExpenses)}</div>
          <p className="text-xs text-gray-400 mt-1">Tổng chi trong kỳ</p>
        </div>
        <div className="card border-2 border-blue-200 bg-blue-50/50">
          <div className="card-header">Lợi nhuận ròng</div>
          <div className={`text-xl font-bold ${data.netProfit >= 0 ? 'text-success-500' : 'text-danger-500'}`}>
            {formatVND(data.netProfit)}
          </div>
          <p className="text-xs text-gray-400 mt-1">LN gộp - Chi phí ({netProfitMargin}%)</p>
        </div>
      </div>

      {/* Formula Explanation */}
      <div className="card bg-gray-50">
        <h3 className="font-semibold text-gray-900 mb-3">📐 Công thức tính</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-gray-400">1.</span>
            <span><strong>Giá vốn</strong> = Σ (Lít bán × Giá nhập trung bình)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-gray-400">2.</span>
            <span><strong>Hoa hồng/CK</strong> = Σ (Lít bán × Chiết khấu/lít)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-gray-400">3.</span>
            <span><strong>Lợi nhuận gộp</strong> = Doanh thu - Giá vốn</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-gray-400">4.</span>
            <span><strong>Lợi nhuận ròng</strong> = Lợi nhuận gộp - Chi phí</span>
          </div>
        </div>
      </div>

      {/* Profit Trend Chart */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">📈 Xu hướng lợi nhuận theo ngày</h3>
        <div className="h-80">
          <Line data={profitChartData} options={chartOptions} />
        </div>
      </div>

      {/* Fuel Details Table */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Chi tiết theo mặt hàng</h3>
        <div className="table-container border-0 shadow-none">
          <table className="table">
            <thead>
              <tr>
                <th>Mặt hàng</th>
                <th className="text-right">Sản lượng (lít)</th>
                <th className="text-right">Doanh thu</th>
                <th className="text-right">Giá vốn</th>
                <th className="text-right">Chiết khấu</th>
                <th className="text-right">LN gộp</th>
              </tr>
            </thead>
            <tbody>
              {data.fuelDetails.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-400 py-4">
                    Không có dữ liệu trong kỳ này
                  </td>
                </tr>
              ) : (
                <>
                  {data.fuelDetails.map((f) => (
                    <tr key={f.code}>
                      <td>
                        <span className="badge-info mr-1">{f.code}</span>
                        {f.name}
                      </td>
                      <td className="text-right">{f.liters.toLocaleString('vi-VN')}</td>
                      <td className="text-right font-medium">{formatVND(f.revenue)}</td>
                      <td className="text-right">{formatVND(f.cogs)}</td>
                      <td className="text-right">{formatVND(f.discount)}</td>
                      <td className="text-right font-semibold text-success-500">
                        {formatVND(f.revenue - f.cogs)}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-gray-50">
                    <td>Tổng cộng</td>
                    <td className="text-right">
                      {data.fuelDetails.reduce((s, f) => s + f.liters, 0).toLocaleString('vi-VN')}
                    </td>
                    <td className="text-right">{formatVND(data.totalRevenue)}</td>
                    <td className="text-right">{formatVND(data.totalCOGS)}</td>
                    <td className="text-right">{formatVND(data.totalDiscount)}</td>
                    <td className="text-right text-success-500">{formatVND(data.grossProfit)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
