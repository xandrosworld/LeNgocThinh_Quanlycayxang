'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatVND, formatLiters, formatDate } from '@/lib/format'
import toast from 'react-hot-toast'

interface FuelType {
  id: string
  code: string
  name: string
  costPrice: number
}

interface FuelImportItem {
  id: string
  fuelTypeId: string
  quantity: number
  unitPrice: number
  licensePlate: string | null
  driverName: string | null
  supplier: string | null
  importDate: string
  note: string | null
  createdAt: string
  fuelType: FuelType
  createdBy: { displayName: string }
}

export default function ImportsPage() {
  const [imports, setImports] = useState<FuelImportItem[]>([])
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [fuelTypeId, setFuelTypeId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [driverName, setDriverName] = useState('')
  const [supplier, setSupplier] = useState('')
  const [importDate, setImportDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [importsRes, ftRes] = await Promise.all([
        fetch('/api/imports'),
        fetch('/api/settings'),
      ])

      if (importsRes.status === 403) {
        toast.error('Bạn không có quyền truy cập trang này')
        return
      }

      const importsData = await importsRes.json()
      setImports(importsData)

      if (ftRes.ok) {
        const ftData = await ftRes.json()
        setFuelTypes(ftData.fuelTypes || [])
      }
    } catch {
      toast.error('Không thể tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-fill cost price when fuel type changes
  useEffect(() => {
    if (fuelTypeId) {
      const ft = fuelTypes.find((f) => f.id === fuelTypeId)
      if (ft) {
        setUnitPrice(ft.costPrice.toString())
      }
    }
  }, [fuelTypeId, fuelTypes])

  const resetForm = () => {
    setFuelTypeId('')
    setQuantity('')
    setUnitPrice('')
    setLicensePlate('')
    setDriverName('')
    setSupplier('')
    setImportDate(new Date().toISOString().split('T')[0])
    setNote('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fuelTypeId || !quantity || !unitPrice) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc')
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch('/api/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fuelTypeId,
          quantity,
          unitPrice,
          licensePlate,
          driverName,
          supplier,
          importDate,
          note,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Lỗi tạo phiếu nhập')
      }

      toast.success('Đã tạo phiếu nhập hàng')
      resetForm()
      setShowForm(false)
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi tạo phiếu nhập')
    } finally {
      setSubmitting(false)
    }
  }

  // Summary
  const totalQuantity = imports.reduce((sum, i) => sum + i.quantity, 0)
  const totalCost = imports.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-24 bg-gray-200 rounded-xl"></div>
            <div className="h-24 bg-gray-200 rounded-xl"></div>
          </div>
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
          <h1 className="text-2xl font-bold text-gray-900">📦 Nhập hàng</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý nhập nhiên liệu vào bồn</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          {showForm ? '✕ Đóng' : '+ Tạo phiếu nhập'}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card">
          <div className="card-header">Tổng lượng nhập</div>
          <div className="card-value text-accent-500">{formatLiters(totalQuantity)} lít</div>
          <p className="text-xs text-gray-400 mt-1">{imports.length} phiếu nhập</p>
        </div>
        <div className="card">
          <div className="card-header">Tổng giá trị nhập</div>
          <div className="card-value text-primary-500">{formatVND(totalCost)}</div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card animate-slide-in">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tạo phiếu nhập hàng mới</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="label">Ngày nhập *</label>
                <input
                  type="date"
                  value={importDate}
                  onChange={(e) => setImportDate(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Loại nhiên liệu *</label>
                <select
                  value={fuelTypeId}
                  onChange={(e) => setFuelTypeId(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">-- Chọn mặt hàng --</option>
                  {fuelTypes.map((ft) => (
                    <option key={ft.id} value={ft.id}>
                      {ft.name} ({ft.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Số lượng (lít) *</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="input"
                  placeholder="VD: 5000"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="label">Đơn giá nhập (đ/lít) *</label>
                <input
                  type="number"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="input"
                  placeholder="VD: 21800"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="label">Biển số xe</label>
                <input
                  type="text"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  className="input"
                  placeholder="VD: 51C-123.45"
                />
              </div>

              <div>
                <label className="label">Tên tài xế</label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="input"
                  placeholder="VD: Nguyễn Văn A"
                />
              </div>

              <div>
                <label className="label">Nhà cung cấp</label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="input"
                  placeholder="VD: Petrolimex"
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

            {/* Preview */}
            {quantity && unitPrice && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Thành tiền:</span>{' '}
                  {formatLiters(parseFloat(quantity || '0'))} lít × {formatVND(parseFloat(unitPrice || '0'))}/lít ={' '}
                  <span className="font-bold">{formatVND(parseFloat(quantity || '0') * parseFloat(unitPrice || '0'))}</span>
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? '⏳ Đang lưu...' : '💾 Lưu phiếu nhập'}
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

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Ngày</th>
              <th>Nhiên liệu</th>
              <th className="text-right">Số lượng</th>
              <th className="text-right">Đơn giá</th>
              <th className="text-right">Thành tiền</th>
              <th>Nhà cung cấp</th>
              <th>Biển số</th>
              <th>Tài xế</th>
              <th>Người tạo</th>
            </tr>
          </thead>
          <tbody>
            {imports.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center text-gray-400 py-8">
                  Chưa có phiếu nhập hàng nào
                </td>
              </tr>
            ) : (
              imports.map((imp) => (
                <tr key={imp.id}>
                  <td className="whitespace-nowrap">{formatDate(imp.importDate)}</td>
                  <td>
                    <span className="badge-info">{imp.fuelType.code}</span>
                    <span className="ml-1 text-xs text-gray-500">{imp.fuelType.name}</span>
                  </td>
                  <td className="text-right font-medium">{formatLiters(imp.quantity)} lít</td>
                  <td className="text-right">{formatVND(imp.unitPrice)}</td>
                  <td className="text-right font-semibold text-primary-500">
                    {formatVND(imp.quantity * imp.unitPrice)}
                  </td>
                  <td>{imp.supplier || '-'}</td>
                  <td>{imp.licensePlate || '-'}</td>
                  <td>{imp.driverName || '-'}</td>
                  <td className="text-xs text-gray-500">{imp.createdBy.displayName}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
