'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatVND, formatDate } from '@/lib/format'
import toast from 'react-hot-toast'

interface ExpenseItem {
  id: string
  description: string
  amount: number
  paidBy: string | null
  recipient: string | null
  note: string | null
  createdAt: string
  shiftId: string | null
  shift: {
    shiftDate: string
    employee: { displayName: string }
  } | null
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([])
  const [monthlyTotal, setMonthlyTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Filter
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Form
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [recipient, setRecipient] = useState('')
  const [note, setNote] = useState('')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)

      const res = await fetch(`/api/expenses?${params.toString()}`)
      if (!res.ok) {
        toast.error('Không thể tải dữ liệu chi phí')
        return
      }

      const data = await res.json()
      setExpenses(data.expenses)
      setMonthlyTotal(data.monthlyTotal)
    } catch {
      toast.error('Lỗi kết nối server')
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const resetForm = () => {
    setDescription('')
    setAmount('')
    setPaidBy('')
    setRecipient('')
    setNote('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description || !amount) {
      toast.error('Vui lòng điền nội dung và số tiền')
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, amount, paidBy, recipient, note }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Lỗi tạo chi phí')
      }

      toast.success('Đã ghi nhận chi phí')
      resetForm()
      setShowForm(false)
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi tạo chi phí')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredTotal = expenses.reduce((sum, e) => sum + e.amount, 0)

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-24 bg-gray-200 rounded-xl"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💸 Chi phí</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý các khoản chi tiêu</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          {showForm ? '✕ Đóng' : '+ Thêm chi phí'}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card">
          <div className="card-header">Chi phí tháng này</div>
          <div className="card-value text-danger-500">{formatVND(monthlyTotal)}</div>
        </div>
        <div className="card">
          <div className="card-header">Tổng hiển thị</div>
          <div className="card-value text-primary-500">{formatVND(filteredTotal)}</div>
          <p className="text-xs text-gray-400 mt-1">{expenses.length} khoản chi</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card animate-slide-in">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Thêm chi phí mới</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Nội dung chi *</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input"
                  placeholder="VD: Mua nước uống, sửa máy bơm..."
                  required
                />
              </div>

              <div>
                <label className="label">Số tiền (đ) *</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input"
                  placeholder="VD: 200000"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="label">Người chi</label>
                <input
                  type="text"
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="input"
                  placeholder="Ai chi tiền?"
                />
              </div>

              <div>
                <label className="label">Người nhận</label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="input"
                  placeholder="Ai nhận tiền?"
                />
              </div>

              <div className="md:col-span-2">
                <label className="label">Ghi chú</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="input"
                  placeholder="Ghi chú thêm..."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? '⏳ Đang lưu...' : '💾 Lưu chi phí'}
              </button>
              <button
                type="button"
                className="btn-outline"
                onClick={() => {
                  resetForm()
                  setShowForm(false)
                }}
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Date Filter */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">🔍 Lọc theo ngày</h3>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div>
            <label className="label">Từ ngày</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Đến ngày</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input"
            />
          </div>
          <button
            onClick={() => {
              setDateFrom('')
              setDateTo('')
            }}
            className="btn-ghost"
          >
            Xóa bộ lọc
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Ngày</th>
              <th>Nội dung</th>
              <th className="text-right">Số tiền</th>
              <th>Người chi</th>
              <th>Người nhận</th>
              <th>Ca/Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-8">
                  Không có khoản chi phí nào
                </td>
              </tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.id}>
                  <td className="whitespace-nowrap">{formatDate(exp.createdAt)}</td>
                  <td className="font-medium text-gray-900">{exp.description}</td>
                  <td className="text-right font-semibold text-danger-500">{formatVND(exp.amount)}</td>
                  <td>{exp.paidBy || '-'}</td>
                  <td>{exp.recipient || '-'}</td>
                  <td className="text-sm text-gray-500">
                    {exp.shift ? (
                      <span>Ca {formatDate(exp.shift.shiftDate)} - {exp.shift.employee.displayName}</span>
                    ) : (
                      <span>{exp.note || 'Ngoài ca'}</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
