'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatVND, formatLiters } from '@/lib/format'
import toast from 'react-hot-toast'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface ReportData {
  month: string
  totalRevenue: number
  totalLiters: number
  totalNewDebt: number
  totalPayment: number
  totalExpenses: number
  totalProfit: number
  dailyRevenue: { date: string; revenue: number }[]
  fuelBreakdown: { code: string; name: string; liters: number; revenue: number }[]
  topDebtors: { id: string; name: string; currentDebt: number; debtLimit: number }[]
}

function getMonthOptions(): { value: string; label: string }[] {
  const options = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`
    options.push({ value, label })
  }
  return options
}

export default function ReportsPage() {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [month, setMonth] = useState(currentMonth)
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const monthOptions = getMonthOptions()

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/reports?month=${month}`)
      if (res.status === 403) {
        toast.error('Bạn không có quyền xem báo cáo')
        return
      }
      if (!res.ok) throw new Error('Lỗi tải báo cáo')
      const result = await res.json()
      setData(result)
    } catch {
      toast.error('Không thể tải dữ liệu báo cáo')
    } finally {
      setLoading(false)
    }
  }, [month])

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
              <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="h-80 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    )
  }

  // Chart data: Daily revenue
  const dailyRevenueChart = {
    labels: data.dailyRevenue.map((d) => {
      const day = d.date.split('-')[2]
      return day
    }),
    datasets: [
      {
        label: 'Doanh thu (đ)',
        data: data.dailyRevenue.map((d) => d.revenue),
        borderColor: '#0d9488',
        backgroundColor: 'rgba(13, 148, 136, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 6,
      },
    ],
  }

  // Fuel volume bar chart
  const fuelVolumeChart = {
    labels: data.fuelBreakdown.map((f) => f.code),
    datasets: [
      {
        label: 'Sản lượng (lít)',
        data: data.fuelBreakdown.map((f) => f.liters),
        backgroundColor: ['#f59e0b', '#22c55e', '#3b82f6'],
        borderRadius: 8,
      },
    ],
  }

  // Top debtors bar chart
  const topDebtorsChart = {
    labels: data.topDebtors.slice(0, 8).map((c) => c.name),
    datasets: [
      {
        label: 'Nợ hiện tại (đ)',
        data: data.topDebtors.slice(0, 8).map((c) => c.currentDebt),
        backgroundColor: '#ef4444',
        borderRadius: 8,
      },
    ],
  }

  // Revenue doughnut chart
  const revenueDoughnutChart = {
    labels: data.fuelBreakdown.map((f) => `${f.code} - ${f.name}`),
    datasets: [
      {
        data: data.fuelBreakdown.map((f) => f.revenue),
        backgroundColor: ['#f59e0b', '#22c55e', '#3b82f6'],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  }

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) => formatVND(ctx.parsed.y),
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

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 16,
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) => {
            const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0)
            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0'
            return `${ctx.label}: ${formatVND(ctx.parsed)} (${pct}%)`
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
          <h1 className="text-2xl font-bold text-gray-900">📊 Báo cáo tháng</h1>
          <p className="text-sm text-gray-500 mt-1">Tổng hợp doanh thu, sản lượng, công nợ</p>
        </div>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="input w-auto"
        >
          {monthOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="card">
          <div className="card-header">Tổng doanh thu</div>
          <div className="text-xl font-bold text-accent-500">{formatVND(data.totalRevenue)}</div>
        </div>
        <div className="card">
          <div className="card-header">Tổng lít bán</div>
          <div className="text-xl font-bold text-primary-500">{formatLiters(data.totalLiters)}</div>
        </div>
        <div className="card">
          <div className="card-header">Công nợ phát sinh</div>
          <div className="text-xl font-bold text-danger-500">{formatVND(data.totalNewDebt)}</div>
        </div>
        <div className="card">
          <div className="card-header">Khách trả nợ</div>
          <div className="text-xl font-bold text-success-500">{formatVND(data.totalPayment)}</div>
        </div>
        <div className="card">
          <div className="card-header">Tổng chi phí</div>
          <div className="text-xl font-bold text-warning-500">{formatVND(data.totalExpenses)}</div>
        </div>
        <div className="card">
          <div className="card-header">Lợi nhuận</div>
          <div className={`text-xl font-bold ${data.totalProfit >= 0 ? 'text-success-500' : 'text-danger-500'}`}>
            {formatVND(data.totalProfit)}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Revenue Line Chart */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">📈 Doanh thu theo ngày</h3>
          <div className="h-72">
            <Line data={dailyRevenueChart} options={lineChartOptions} />
          </div>
        </div>

        {/* Fuel Volume Bar Chart */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">📊 Sản lượng theo mặt hàng</h3>
          <div className="h-72">
            <Bar data={fuelVolumeChart} options={barChartOptions} />
          </div>
        </div>

        {/* Top Debtors Bar Chart */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">💰 Top khách nợ nhiều</h3>
          <div className="h-72">
            {data.topDebtors.length > 0 ? (
              <Bar data={topDebtorsChart} options={{
                ...barChartOptions,
                indexAxis: 'y' as const,
                plugins: {
                  ...barChartOptions.plugins,
                  tooltip: {
                    callbacks: {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      label: (ctx: any) => formatVND(ctx.parsed.x),
                    },
                  },
                },
              }} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                Không có khách nợ
              </div>
            )}
          </div>
        </div>

        {/* Revenue Doughnut Chart */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">🎯 Tỷ trọng doanh thu</h3>
          <div className="h-72">
            <Doughnut data={revenueDoughnutChart} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top debtors table */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Top khách nợ nhiều</h3>
          <div className="table-container border-0 shadow-none">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Khách hàng</th>
                  <th className="text-right">Nợ hiện tại</th>
                  <th className="text-right">Hạn mức</th>
                </tr>
              </thead>
              <tbody>
                {data.topDebtors.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-400 py-4">Không có dữ liệu</td>
                  </tr>
                ) : (
                  data.topDebtors.map((c, i) => (
                    <tr key={c.id}>
                      <td className="font-medium">{i + 1}</td>
                      <td className="font-medium text-gray-900">{c.name}</td>
                      <td className="text-right text-danger-500 font-semibold">{formatVND(c.currentDebt)}</td>
                      <td className="text-right text-gray-500">{formatVND(c.debtLimit)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fuel breakdown table */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Mặt hàng bán chạy</h3>
          <div className="table-container border-0 shadow-none">
            <table className="table">
              <thead>
                <tr>
                  <th>Mặt hàng</th>
                  <th className="text-right">Sản lượng</th>
                  <th className="text-right">Doanh thu</th>
                  <th className="text-right">Tỷ trọng</th>
                </tr>
              </thead>
              <tbody>
                {data.fuelBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-400 py-4">Không có dữ liệu</td>
                  </tr>
                ) : (
                  data.fuelBreakdown.map((f) => {
                    const totalRev = data.fuelBreakdown.reduce((sum, fb) => sum + fb.revenue, 0)
                    const pct = totalRev > 0 ? ((f.revenue / totalRev) * 100).toFixed(1) : '0'
                    return (
                      <tr key={f.code}>
                        <td>
                          <span className="badge-info mr-1">{f.code}</span>
                          <span className="text-gray-600">{f.name}</span>
                        </td>
                        <td className="text-right font-medium">{formatLiters(f.liters)} lít</td>
                        <td className="text-right font-semibold text-accent-500">{formatVND(f.revenue)}</td>
                        <td className="text-right text-gray-500">{pct}%</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
