'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { formatVND, formatLiters, formatDateTime } from '@/lib/format'
import toast from 'react-hot-toast'

/* ───── Types ───── */
interface PumpReading {
  id: string
  pumpId: string
  fuelTypeId: string
  startReading: number
  endReading: number
  unitPrice: number
  pump: {
    id: string
    number: number
    name: string
    fuelType: { id: string; code: string; name: string }
  }
  fuelType: { id: string; code: string; name: string }
}

interface DebtTransaction {
  id: string
  customerId: string
  type: 'NEW_DEBT' | 'PAYMENT'
  amount: number
  note: string | null
  fuelTypeId: string | null
  createdAt: string
  customer: { id: string; name: string; phone: string | null; currentDebt: number }
  fuelType: { id: string; code: string; name: string } | null
}

interface Expense {
  id: string
  description: string
  amount: number
  paidBy: string | null
  recipient: string | null
  note: string | null
  createdAt: string
}

interface ShiftSummary {
  pumpRevenue: number
  totalLiters: number
  totalRevenue: number
  totalNewDebt: number
  totalDebtPayment: number
  totalExpenses: number
  cashRequired: number
  difference: number
}

interface ShiftDetail {
  id: string
  shiftDate: string
  startTime: string
  endTime: string | null
  employeeId: string
  status: 'OPEN' | 'CLOSED'
  note: string | null
  otherRevenue: number
  cashReceived: number
  bankTransferPersonal: number
  bankTransferBusiness: number
  debtPaymentReceived: number
  employee: { id: string; displayName: string; username: string }
  pumpReadings: PumpReading[]
  debtTransactions: DebtTransaction[]
  expenses: Expense[]
  summary: ShiftSummary
}

interface CustomerOption {
  id: string
  name: string
  phone: string | null
  currentDebt: number
  debtLimit: number
}

interface FuelTypeOption {
  id: string
  code: string
  name: string
}

/* ───── Main Component ───── */
export default function ShiftDetailPage() {
  const params = useParams()
  const router = useRouter()
  const shiftId = params.id as string

  const [shift, setShift] = useState<ShiftDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [closing, setClosing] = useState(false)
  const [reopening, setReopening] = useState(false)

  // Editable state
  const [pumpReadings, setPumpReadings] = useState<Array<{
    id: string
    endReading: string
    unitPrice: string
  }>>([])
  const [cashReceived, setCashReceived] = useState('')
  const [bankTransferPersonal, setBankTransferPersonal] = useState('')
  const [bankTransferBusiness, setBankTransferBusiness] = useState('')
  const [debtPaymentReceived, setDebtPaymentReceived] = useState('')
  const [otherRevenue, setOtherRevenue] = useState('')
  const [shiftNote, setShiftNote] = useState('')

  // Modal state
  const [showDebtModal, setShowDebtModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false)

  // Debt form
  const [debtCustomerId, setDebtCustomerId] = useState('')
  const [debtType, setDebtType] = useState<'NEW_DEBT' | 'PAYMENT'>('NEW_DEBT')
  const [debtFuelTypeId, setDebtFuelTypeId] = useState('')
  const [debtAmount, setDebtAmount] = useState('')
  const [debtNote, setDebtNote] = useState('')
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [fuelTypes, setFuelTypes] = useState<FuelTypeOption[]>([])
  const [savingDebt, setSavingDebt] = useState(false)

  // Expense form
  const [expenseDescription, setExpenseDescription] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expensePaidBy, setExpensePaidBy] = useState('')
  const [expenseRecipient, setExpenseRecipient] = useState('')
  const [expenseNote, setExpenseNote] = useState('')
  const [savingExpense, setSavingExpense] = useState(false)

  // New customer form
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerDebtLimit, setNewCustomerDebtLimit] = useState('50000000')
  const [creatingCustomer, setCreatingCustomer] = useState(false)

  // Current session
  const [currentUser, setCurrentUser] = useState<{ userId: string; role: string } | null>(null)

  const fetchShift = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/shifts/${shiftId}`)
      if (!res.ok) throw new Error('Lỗi tải thông tin ca')
      const data: ShiftDetail = await res.json()
      setShift(data)

      // Initialize editable fields
      setPumpReadings(
        data.pumpReadings.map((pr) => ({
          id: pr.id,
          endReading: pr.endReading.toString(),
          unitPrice: pr.unitPrice.toString(),
        }))
      )
      setCashReceived(data.cashReceived.toString())
      setBankTransferPersonal(data.bankTransferPersonal.toString())
      setBankTransferBusiness(data.bankTransferBusiness.toString())
      setDebtPaymentReceived(data.debtPaymentReceived.toString())
      setOtherRevenue(data.otherRevenue.toString())
      setShiftNote(data.note || '')
    } catch (error) {
      console.error(error)
      toast.error('Không thể tải thông tin ca')
    } finally {
      setLoading(false)
    }
  }, [shiftId])

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch('/api/debts?lite=1')
      if (res.ok) {
        const data = await res.json()
        setCustomers(data.customers || [])
      }
    } catch {
      // silently fail
    }
  }, [])

  const fetchFuelTypes = useCallback(async () => {
    try {
      const res = await fetch('/api/fuel-types')
      if (res.ok) {
        const data = await res.json()
        setFuelTypes(Array.isArray(data) ? data : [])
      }
    } catch {
      // Use fuel types from pump readings
    }
  }, [])

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          setCurrentUser({ userId: data.user.id, role: data.user.role })
        }
      }
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    fetchShift()
    fetchCustomers()
    fetchFuelTypes()
    fetchCurrentUser()
  }, [fetchShift, fetchCustomers, fetchFuelTypes, fetchCurrentUser])

  // Derive fuel types from pump readings if API not available
  const availableFuelTypes = useMemo(() => {
    if (fuelTypes.length > 0) return fuelTypes
    if (!shift) return []
    const unique = new Map<string, FuelTypeOption>()
    shift.pumpReadings.forEach((pr) => {
      if (!unique.has(pr.fuelType.id)) {
        unique.set(pr.fuelType.id, pr.fuelType)
      }
    })
    return Array.from(unique.values())
  }, [fuelTypes, shift])

  const isOpen = shift?.status === 'OPEN'
  const isOwner = currentUser?.role === 'OWNER'
  const canEdit = isOpen && (isOwner || shift?.employeeId === currentUser?.userId)

  /* ───── Calculated values ───── */
  const calculated = useMemo(() => {
    if (!shift) return null

    const pumpData = shift.pumpReadings.map((pr, i) => {
      const endReading = parseFloat(pumpReadings[i]?.endReading || '0') || 0
      const unitPrice = parseFloat(pumpReadings[i]?.unitPrice || '0') || 0
      const volume = Math.max(0, endReading - pr.startReading)
      const revenue = volume * unitPrice
      return { volume, revenue, endReading, unitPrice }
    })

    const pumpRevenue = pumpData.reduce((sum, p) => sum + p.revenue, 0)
    const totalLiters = pumpData.reduce((sum, p) => sum + p.volume, 0)
    const otherRev = parseFloat(otherRevenue) || 0
    const totalRevenue = pumpRevenue + otherRev

    const totalNewDebt = shift.debtTransactions
      .filter((dt) => dt.type === 'NEW_DEBT')
      .reduce((sum, dt) => sum + dt.amount, 0)
    const totalDebtPayment = shift.debtTransactions
      .filter((dt) => dt.type === 'PAYMENT')
      .reduce((sum, dt) => sum + dt.amount, 0)
    const totalExpenses = shift.expenses.reduce((sum, e) => sum + e.amount, 0)

    const debtPaymentReceivedVal = parseFloat(debtPaymentReceived) || 0
    const bankPersonalVal = parseFloat(bankTransferPersonal) || 0
    const bankBusinessVal = parseFloat(bankTransferBusiness) || 0
    const cashReceivedVal = parseFloat(cashReceived) || 0

    const cashRequired =
      totalRevenue +
      debtPaymentReceivedVal -
      totalNewDebt -
      bankPersonalVal -
      bankBusinessVal -
      totalExpenses

    const difference = cashReceivedVal - cashRequired

    return {
      pumpData,
      pumpRevenue,
      totalLiters,
      totalRevenue,
      totalNewDebt,
      totalDebtPayment,
      totalExpenses,
      cashRequired,
      cashReceivedVal,
      difference,
    }
  }, [shift, pumpReadings, otherRevenue, debtPaymentReceived, bankTransferPersonal, bankTransferBusiness, cashReceived])

  /* ───── Save shift ───── */
  const handleSave = async () => {
    if (saving || !shift) return
    try {
      setSaving(true)
      const res = await fetch(`/api/shifts/${shiftId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pumpReadings: pumpReadings.map((pr) => ({
            id: pr.id,
            endReading: pr.endReading,
            unitPrice: pr.unitPrice,
          })),
          cashReceived,
          bankTransferPersonal,
          bankTransferBusiness,
          debtPaymentReceived,
          otherRevenue,
          note: shiftNote,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Lỗi lưu')
      }
      toast.success('Đã lưu thông tin ca')
      await fetchShift()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi lưu thông tin ca'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  /* ───── Close shift ───── */
  const handleCloseShift = async () => {
    if (closing || !shift) return
    if (!confirm('Bạn có chắc chắn muốn CHỐT CA? Sau khi chốt, chỉ chủ cây xăng mới có thể mở lại.')) return

    try {
      setClosing(true)
      // Save first
      const saveRes = await fetch(`/api/shifts/${shiftId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pumpReadings: pumpReadings.map((pr) => ({
            id: pr.id,
            endReading: pr.endReading,
            unitPrice: pr.unitPrice,
          })),
          cashReceived,
          bankTransferPersonal,
          bankTransferBusiness,
          debtPaymentReceived,
          otherRevenue,
          note: shiftNote,
          status: 'CLOSED',
        }),
      })
      if (!saveRes.ok) {
        const err = await saveRes.json()
        throw new Error(err.error || 'Lỗi chốt ca')
      }
      toast.success('🎉 Đã chốt ca thành công!')
      await fetchShift()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi chốt ca'
      toast.error(message)
    } finally {
      setClosing(false)
    }
  }

  /* ───── Reopen shift ───── */
  const handleReopenShift = async () => {
    if (reopening || !shift) return
    if (!confirm('Bạn có chắc chắn muốn MỞ LẠI ca này?')) return

    try {
      setReopening(true)
      const res = await fetch(`/api/shifts/${shiftId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'OPEN' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Lỗi mở lại ca')
      }
      toast.success('Đã mở lại ca')
      await fetchShift()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi mở lại ca'
      toast.error(message)
    } finally {
      setReopening(false)
    }
  }

  /* ───── Add debt transaction ───── */
  const handleAddDebt = async () => {
    if (savingDebt) return
    if (!debtCustomerId) {
      toast.error('Vui lòng chọn khách hàng')
      return
    }
    if (!debtAmount || parseFloat(debtAmount) <= 0) {
      toast.error('Số tiền phải lớn hơn 0')
      return
    }
    try {
      setSavingDebt(true)
      const res = await fetch('/api/debts/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: debtCustomerId,
          shiftId,
          type: debtType,
          fuelTypeId: debtFuelTypeId || null,
          amount: debtAmount,
          note: debtNote,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Lỗi thêm công nợ')
      }
      toast.success(debtType === 'NEW_DEBT' ? 'Đã thêm nợ mới' : 'Đã ghi nhận trả nợ')
      setShowDebtModal(false)
      resetDebtForm()
      await fetchShift()
      await fetchCustomers()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi thêm công nợ'
      toast.error(message)
    } finally {
      setSavingDebt(false)
    }
  }

  const resetDebtForm = () => {
    setDebtCustomerId('')
    setDebtType('NEW_DEBT')
    setDebtFuelTypeId('')
    setDebtAmount('')
    setDebtNote('')
  }

  /* ───── Add expense ───── */
  const handleAddExpense = async () => {
    if (savingExpense) return
    if (!expenseDescription.trim()) {
      toast.error('Vui lòng nhập nội dung chi phí')
      return
    }
    if (!expenseAmount || parseFloat(expenseAmount) <= 0) {
      toast.error('Số tiền phải lớn hơn 0')
      return
    }
    try {
      setSavingExpense(true)
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId,
          description: expenseDescription,
          amount: expenseAmount,
          paidBy: expensePaidBy,
          recipient: expenseRecipient,
          note: expenseNote,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Lỗi thêm chi phí')
      }
      toast.success('Đã thêm chi phí')
      setShowExpenseModal(false)
      resetExpenseForm()
      await fetchShift()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi thêm chi phí'
      toast.error(message)
    } finally {
      setSavingExpense(false)
    }
  }

  const resetExpenseForm = () => {
    setExpenseDescription('')
    setExpenseAmount('')
    setExpensePaidBy('')
    setExpenseRecipient('')
    setExpenseNote('')
  }

  /* ───── Create new customer ───── */
  const handleCreateCustomer = async () => {
    if (creatingCustomer) return
    if (!newCustomerName.trim()) {
      toast.error('Vui lòng nhập tên khách hàng')
      return
    }
    try {
      setCreatingCustomer(true)
      const res = await fetch('/api/debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCustomerName,
          phone: newCustomerPhone,
          debtLimit: newCustomerDebtLimit,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Lỗi tạo khách hàng')
      }
      const customer = await res.json()
      toast.success('Đã tạo khách hàng mới')
      setShowNewCustomerModal(false)
      setNewCustomerName('')
      setNewCustomerPhone('')
      setNewCustomerDebtLimit('50000000')
      await fetchCustomers()
      setDebtCustomerId(customer.id)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi tạo khách hàng'
      toast.error(message)
    } finally {
      setCreatingCustomer(false)
    }
  }

  /* ───── Pump reading update helper ───── */
  const updatePumpReading = (index: number, field: 'endReading' | 'unitPrice', value: string) => {
    setPumpReadings((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  /* ───── Fuel color helper ───── */
  const fuelColor = (code: string) => {
    switch (code) {
      case 'D1':
        return 'bg-amber-100 text-amber-700'
      case 'E10':
        return 'bg-green-100 text-green-700'
      case 'DS':
        return 'bg-blue-100 text-blue-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  /* ───── Loading state ───── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-primary-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-500">Đang tải thông tin ca...</p>
        </div>
      </div>
    )
  }

  if (!shift) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-gray-500 text-lg mb-4">Không tìm thấy ca</p>
        <button onClick={() => router.push('/shifts')} className="btn-primary">
          Quay lại danh sách
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={() => router.push('/shifts')}
            className="text-sm text-gray-500 hover:text-primary-500 mb-2 inline-flex items-center gap-1"
          >
            ← Danh sách ca
          </button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            Ca ngày {formatDateTime(shift.shiftDate)}
            {shift.status === 'OPEN' ? (
              <span className="badge-info text-sm">Đang mở</span>
            ) : (
              <span className="badge-success text-sm">Đã chốt</span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Nhân viên: <strong>{shift.employee.displayName}</strong>
            {shift.endTime && ` • Kết thúc: ${formatDateTime(shift.endTime)}`}
          </p>
        </div>

        <div className="flex gap-2">
          {canEdit && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-accent"
            >
              {saving ? 'Đang lưu...' : '💾 Lưu'}
            </button>
          )}
          {!isOpen && isOwner && (
            <button
              onClick={handleReopenShift}
              disabled={reopening}
              className="btn-outline"
            >
              {reopening ? 'Đang mở...' : '🔓 Mở lại ca'}
            </button>
          )}
        </div>
      </div>

      {/* ═══ Section A: Pump Readings ═══ */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-primary-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">A</span>
          Số cột bơm
        </h2>

        {/* Desktop table */}
        <div className="hidden md:block table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Vòi</th>
                <th>Nhiên liệu</th>
                <th className="text-right">Số đầu</th>
                <th className="text-right">Số cuối</th>
                <th className="text-right">Sản lượng (lít)</th>
                <th className="text-right">Đơn giá</th>
                <th className="text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {shift.pumpReadings.map((pr, index) => {
                const endReading = parseFloat(pumpReadings[index]?.endReading || '0') || 0
                const unitPrice = parseFloat(pumpReadings[index]?.unitPrice || '0') || 0
                const volume = Math.max(0, endReading - pr.startReading)
                const revenue = volume * unitPrice

                return (
                  <tr key={pr.id}>
                    <td className="font-medium">{pr.pump.name}</td>
                    <td>
                      <span className={`badge ${fuelColor(pr.fuelType.code)}`}>
                        {pr.fuelType.code}
                      </span>
                    </td>
                    <td className="text-right font-mono text-gray-500">
                      {pr.startReading.toLocaleString('vi-VN')}
                    </td>
                    <td className="text-right">
                      {canEdit ? (
                        <input
                          type="number"
                          className="number-input w-32 ml-auto"
                          value={pumpReadings[index]?.endReading || ''}
                          onChange={(e) => updatePumpReading(index, 'endReading', e.target.value)}
                          min={pr.startReading}
                          step="0.01"
                        />
                      ) : (
                        <span className="font-mono">{endReading.toLocaleString('vi-VN')}</span>
                      )}
                    </td>
                    <td className="text-right font-mono font-medium text-accent-600">
                      {formatLiters(volume)}
                    </td>
                    <td className="text-right">
                      {canEdit ? (
                        <input
                          type="number"
                          className="number-input w-28 ml-auto"
                          value={pumpReadings[index]?.unitPrice || ''}
                          onChange={(e) => updatePumpReading(index, 'unitPrice', e.target.value)}
                          step="1"
                        />
                      ) : (
                        <span className="font-mono">{formatVND(unitPrice)}</span>
                      )}
                    </td>
                    <td className="text-right font-mono font-bold">
                      {formatVND(revenue)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td colSpan={4} className="text-right">Tổng cộng:</td>
                <td className="text-right font-mono text-accent-600">
                  {calculated ? formatLiters(calculated.totalLiters) : '0'}
                </td>
                <td></td>
                <td className="text-right font-mono text-lg text-accent-600">
                  {calculated ? formatVND(calculated.pumpRevenue) : '0đ'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {shift.pumpReadings.map((pr, index) => {
            const endReading = parseFloat(pumpReadings[index]?.endReading || '0') || 0
            const unitPrice = parseFloat(pumpReadings[index]?.unitPrice || '0') || 0
            const volume = Math.max(0, endReading - pr.startReading)
            const revenue = volume * unitPrice

            return (
              <div key={pr.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold">{pr.pump.name}</span>
                  <span className={`badge ${fuelColor(pr.fuelType.code)}`}>
                    {pr.fuelType.code} - {pr.fuelType.name}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Số đầu</label>
                    <p className="font-mono text-sm">{pr.startReading.toLocaleString('vi-VN')}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Số cuối</label>
                    {canEdit ? (
                      <input
                        type="number"
                        className="number-input text-sm"
                        value={pumpReadings[index]?.endReading || ''}
                        onChange={(e) => updatePumpReading(index, 'endReading', e.target.value)}
                        min={pr.startReading}
                        step="0.01"
                      />
                    ) : (
                      <p className="font-mono text-sm">{endReading.toLocaleString('vi-VN')}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Đơn giá</label>
                    {canEdit ? (
                      <input
                        type="number"
                        className="number-input text-sm"
                        value={pumpReadings[index]?.unitPrice || ''}
                        onChange={(e) => updatePumpReading(index, 'unitPrice', e.target.value)}
                        step="1"
                      />
                    ) : (
                      <p className="font-mono text-sm">{formatVND(unitPrice)}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Sản lượng</label>
                    <p className="font-mono text-sm text-accent-600 font-bold">{formatLiters(volume)} lít</p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t text-right">
                  <span className="text-sm text-gray-500">Thành tiền: </span>
                  <span className="font-mono font-bold text-lg">{formatVND(revenue)}</span>
                </div>
              </div>
            )
          })}
          <div className="bg-gray-50 rounded-lg p-4 flex justify-between items-center font-bold">
            <span>Tổng cộng:</span>
            <span className="font-mono text-lg text-accent-600">
              {calculated ? formatVND(calculated.pumpRevenue) : '0đ'}
            </span>
          </div>
        </div>
      </div>

      {/* ═══ Section B: Thu tiền trong ca ═══ */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-accent-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">B</span>
          Thu tiền trong ca
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">💵 Tiền mặt thực nhận</label>
            {canEdit ? (
              <input
                type="number"
                className="number-input"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                placeholder="0"
              />
            ) : (
              <p className="font-mono text-lg font-bold py-2">{formatVND(parseFloat(cashReceived) || 0)}</p>
            )}
          </div>
          <div>
            <label className="label">🏦 CK khách lẻ</label>
            {canEdit ? (
              <input
                type="number"
                className="number-input"
                value={bankTransferPersonal}
                onChange={(e) => setBankTransferPersonal(e.target.value)}
                placeholder="0"
              />
            ) : (
              <p className="font-mono text-lg py-2">{formatVND(parseFloat(bankTransferPersonal) || 0)}</p>
            )}
          </div>
          <div>
            <label className="label">🏢 CK doanh nghiệp</label>
            {canEdit ? (
              <input
                type="number"
                className="number-input"
                value={bankTransferBusiness}
                onChange={(e) => setBankTransferBusiness(e.target.value)}
                placeholder="0"
              />
            ) : (
              <p className="font-mono text-lg py-2">{formatVND(parseFloat(bankTransferBusiness) || 0)}</p>
            )}
          </div>
          <div>
            <label className="label">💳 Khách trả nợ</label>
            {canEdit ? (
              <input
                type="number"
                className="number-input"
                value={debtPaymentReceived}
                onChange={(e) => setDebtPaymentReceived(e.target.value)}
                placeholder="0"
              />
            ) : (
              <p className="font-mono text-lg py-2">{formatVND(parseFloat(debtPaymentReceived) || 0)}</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className="label">📦 Doanh thu khác (keo ron, v.v.)</label>
            {canEdit ? (
              <input
                type="number"
                className="number-input"
                value={otherRevenue}
                onChange={(e) => setOtherRevenue(e.target.value)}
                placeholder="0"
              />
            ) : (
              <p className="font-mono text-lg py-2">{formatVND(parseFloat(otherRevenue) || 0)}</p>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Section C: Công nợ phát sinh ═══ */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="w-8 h-8 bg-warning-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">C</span>
            Công nợ phát sinh
          </h2>
          {canEdit && (
            <button onClick={() => setShowDebtModal(true)} className="btn-outline btn-sm">
              + Thêm công nợ
            </button>
          )}
        </div>

        {shift.debtTransactions.length === 0 ? (
          <p className="text-gray-400 text-center py-6">Chưa có giao dịch công nợ trong ca này</p>
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Loại</th>
                    <th>Nhiên liệu</th>
                    <th className="text-right">Số tiền</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {shift.debtTransactions.map((dt) => (
                    <tr key={dt.id}>
                      <td className="font-medium">{dt.customer.name}</td>
                      <td>
                        {dt.type === 'NEW_DEBT' ? (
                          <span className="badge-danger">Nợ mới</span>
                        ) : (
                          <span className="badge-success">Trả nợ</span>
                        )}
                      </td>
                      <td>
                        {dt.fuelType ? (
                          <span className={`badge ${fuelColor(dt.fuelType.code)}`}>
                            {dt.fuelType.code}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className={`text-right font-mono font-medium ${dt.type === 'NEW_DEBT' ? 'text-danger-600' : 'text-success-600'}`}>
                        {dt.type === 'NEW_DEBT' ? '+' : '-'}{formatVND(dt.amount)}
                      </td>
                      <td className="text-gray-500 text-sm">{dt.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex flex-col sm:flex-row justify-end gap-4 text-sm">
              <div className="flex justify-between sm:gap-2">
                <span className="text-gray-500">Tổng nợ mới:</span>
                <span className="font-mono font-bold text-danger-600">
                  {calculated ? formatVND(calculated.totalNewDebt) : '0đ'}
                </span>
              </div>
              <div className="flex justify-between sm:gap-2">
                <span className="text-gray-500">Tổng trả nợ:</span>
                <span className="font-mono font-bold text-success-600">
                  {calculated ? formatVND(calculated.totalDebtPayment) : '0đ'}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ═══ Section D: Chi phí trong ca ═══ */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="w-8 h-8 bg-danger-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">D</span>
            Chi phí trong ca
          </h2>
          {canEdit && (
            <button onClick={() => setShowExpenseModal(true)} className="btn-outline btn-sm">
              + Thêm chi phí
            </button>
          )}
        </div>

        {shift.expenses.length === 0 ? (
          <p className="text-gray-400 text-center py-6">Chưa có chi phí trong ca này</p>
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nội dung</th>
                    <th className="text-right">Số tiền</th>
                    <th>Người chi</th>
                    <th>Người nhận</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {shift.expenses.map((exp) => (
                    <tr key={exp.id}>
                      <td className="font-medium">{exp.description}</td>
                      <td className="text-right font-mono font-medium text-danger-600">
                        {formatVND(exp.amount)}
                      </td>
                      <td>{exp.paidBy || '—'}</td>
                      <td>{exp.recipient || '—'}</td>
                      <td className="text-gray-500 text-sm">{exp.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex justify-end">
              <div className="flex gap-2 text-sm">
                <span className="text-gray-500">Tổng chi phí:</span>
                <span className="font-mono font-bold text-danger-600">
                  {calculated ? formatVND(calculated.totalExpenses) : '0đ'}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ═══ Section E: Kết quả chốt ca ═══ */}
      <div className="card border-2 border-primary-200 bg-primary-50/30">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-primary-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">E</span>
          Kết quả chốt ca
        </h2>

        {calculated && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Left column */}
              <div className="space-y-3">
                <ResultRow label="⛽ Tổng lít bán" value={formatLiters(calculated.totalLiters) + ' lít'} />
                <ResultRow label="💰 Doanh thu cột bơm" value={formatVND(calculated.pumpRevenue)} />
                <ResultRow label="📦 Doanh thu khác" value={formatVND(parseFloat(otherRevenue) || 0)} />
                <div className="border-t pt-2">
                  <ResultRow
                    label="📊 Doanh thu lý thuyết"
                    value={formatVND(calculated.totalRevenue)}
                    bold
                  />
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-3">
                <ResultRow label="📕 Tổng khách nợ mới" value={formatVND(calculated.totalNewDebt)} negative />
                <ResultRow label="📗 Tổng khách trả nợ" value={formatVND(parseFloat(debtPaymentReceived) || 0)} positive />
                <ResultRow label="🏦 CK khách lẻ" value={formatVND(parseFloat(bankTransferPersonal) || 0)} />
                <ResultRow label="🏢 CK doanh nghiệp" value={formatVND(parseFloat(bankTransferBusiness) || 0)} />
                <ResultRow label="💸 Tổng chi phí" value={formatVND(calculated.totalExpenses)} negative />
              </div>
            </div>

            <div className="border-t-2 border-primary-200 pt-4 mt-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Tiền phải bàn giao</p>
                  <p className="text-xl font-bold font-mono text-primary-500">
                    {formatVND(calculated.cashRequired)}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Tiền mặt thực nhận</p>
                  <p className="text-xl font-bold font-mono">
                    {formatVND(calculated.cashReceivedVal)}
                  </p>
                </div>
                <div className={`rounded-lg p-4 text-center border-2 ${
                  calculated.difference >= 0
                    ? 'bg-success-50 border-success-500'
                    : 'bg-danger-50 border-danger-500'
                }`}>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Lệch</p>
                  <p className={`text-xl font-bold font-mono ${
                    calculated.difference >= 0 ? 'money-positive' : 'money-negative'
                  }`}>
                    {calculated.difference >= 0 ? '+' : ''}{formatVND(calculated.difference)}
                  </p>
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="mt-4">
              <label className="label">📝 Ghi chú ca</label>
              {canEdit ? (
                <textarea
                  className="input min-h-[80px]"
                  value={shiftNote}
                  onChange={(e) => setShiftNote(e.target.value)}
                  placeholder="Ghi chú cho ca này..."
                />
              ) : (
                <p className="text-gray-600 py-2">{shiftNote || 'Không có ghi chú'}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              {canEdit && (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-accent flex-1"
                  >
                    {saving ? 'Đang lưu...' : '💾 Lưu thông tin'}
                  </button>
                  <button
                    onClick={handleCloseShift}
                    disabled={closing}
                    className="btn-primary flex-1 btn-lg"
                  >
                    {closing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Đang chốt ca...
                      </>
                    ) : (
                      '🔒 Chốt ca'
                    )}
                  </button>
                </>
              )}
              {!isOpen && isOwner && (
                <button
                  onClick={handleReopenShift}
                  disabled={reopening}
                  className="btn-outline flex-1"
                >
                  {reopening ? 'Đang mở lại...' : '🔓 Mở lại ca'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ Debt Modal ═══ */}
      {showDebtModal && (
        <Modal onClose={() => { setShowDebtModal(false); resetDebtForm() }} title="Thêm giao dịch công nợ">
          <div className="space-y-4">
            <div>
              <label className="label">Loại giao dịch</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setDebtType('NEW_DEBT')}
                  className={`flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                    debtType === 'NEW_DEBT'
                      ? 'border-danger-500 bg-danger-50 text-danger-600'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  📕 Nợ mới
                </button>
                <button
                  onClick={() => setDebtType('PAYMENT')}
                  className={`flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                    debtType === 'PAYMENT'
                      ? 'border-success-500 bg-success-50 text-success-600'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  📗 Trả nợ
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700">Khách hàng</label>
                <button
                  onClick={() => setShowNewCustomerModal(true)}
                  className="text-xs text-accent-500 hover:text-accent-600 font-medium"
                >
                  + Tạo mới
                </button>
              </div>
              <select
                className="input"
                value={debtCustomerId}
                onChange={(e) => setDebtCustomerId(e.target.value)}
              >
                <option value="">-- Chọn khách hàng --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''} — Nợ: {formatVND(c.currentDebt)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Nhiên liệu (không bắt buộc)</label>
              <select
                className="input"
                value={debtFuelTypeId}
                onChange={(e) => setDebtFuelTypeId(e.target.value)}
              >
                <option value="">-- Không chọn --</option>
                {availableFuelTypes.map((ft) => (
                  <option key={ft.id} value={ft.id}>
                    {ft.code} - {ft.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Số tiền</label>
              <input
                type="number"
                className="number-input"
                value={debtAmount}
                onChange={(e) => setDebtAmount(e.target.value)}
                placeholder="0"
                min="0"
              />
            </div>

            <div>
              <label className="label">Ghi chú</label>
              <input
                type="text"
                className="input"
                value={debtNote}
                onChange={(e) => setDebtNote(e.target.value)}
                placeholder="Ghi chú..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowDebtModal(false); resetDebtForm() }}
                className="btn-ghost flex-1"
              >
                Hủy
              </button>
              <button
                onClick={handleAddDebt}
                disabled={savingDebt}
                className={`flex-1 ${debtType === 'NEW_DEBT' ? 'btn-danger' : 'btn-accent'}`}
              >
                {savingDebt ? 'Đang lưu...' : debtType === 'NEW_DEBT' ? 'Thêm nợ mới' : 'Ghi nhận trả nợ'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ═══ Expense Modal ═══ */}
      {showExpenseModal && (
        <Modal onClose={() => { setShowExpenseModal(false); resetExpenseForm() }} title="Thêm chi phí">
          <div className="space-y-4">
            <div>
              <label className="label">Nội dung chi phí *</label>
              <input
                type="text"
                className="input"
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
                placeholder="Mua vật tư, sửa chữa..."
              />
            </div>

            <div>
              <label className="label">Số tiền *</label>
              <input
                type="number"
                className="number-input"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder="0"
                min="0"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Người chi</label>
                <input
                  type="text"
                  className="input"
                  value={expensePaidBy}
                  onChange={(e) => setExpensePaidBy(e.target.value)}
                  placeholder="Ai chi..."
                />
              </div>
              <div>
                <label className="label">Người nhận</label>
                <input
                  type="text"
                  className="input"
                  value={expenseRecipient}
                  onChange={(e) => setExpenseRecipient(e.target.value)}
                  placeholder="Ai nhận..."
                />
              </div>
            </div>

            <div>
              <label className="label">Ghi chú</label>
              <input
                type="text"
                className="input"
                value={expenseNote}
                onChange={(e) => setExpenseNote(e.target.value)}
                placeholder="Ghi chú..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowExpenseModal(false); resetExpenseForm() }}
                className="btn-ghost flex-1"
              >
                Hủy
              </button>
              <button
                onClick={handleAddExpense}
                disabled={savingExpense}
                className="btn-danger flex-1"
              >
                {savingExpense ? 'Đang lưu...' : 'Thêm chi phí'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ═══ New Customer Modal ═══ */}
      {showNewCustomerModal && (
        <Modal onClose={() => setShowNewCustomerModal(false)} title="Tạo khách hàng mới">
          <div className="space-y-4">
            <div>
              <label className="label">Tên khách hàng *</label>
              <input
                type="text"
                className="input"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="Tên khách hàng..."
              />
            </div>

            <div>
              <label className="label">Số điện thoại</label>
              <input
                type="text"
                className="input"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                placeholder="0123 456 789"
              />
            </div>

            <div>
              <label className="label">Hạn mức nợ</label>
              <input
                type="number"
                className="number-input"
                value={newCustomerDebtLimit}
                onChange={(e) => setNewCustomerDebtLimit(e.target.value)}
                placeholder="50000000"
              />
              <p className="text-xs text-gray-400 mt-1">
                Mặc định: {formatVND(50000000)}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowNewCustomerModal(false)}
                className="btn-ghost flex-1"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateCustomer}
                disabled={creatingCustomer}
                className="btn-primary flex-1"
              >
                {creatingCustomer ? 'Đang tạo...' : 'Tạo khách hàng'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ───── Helper Components ───── */

function ResultRow({
  label,
  value,
  bold,
  positive,
  negative,
}: {
  label: string
  value: string
  bold?: boolean
  positive?: boolean
  negative?: boolean
}) {
  let valueClass = 'text-gray-900'
  if (positive) valueClass = 'text-success-600'
  if (negative) valueClass = 'text-danger-600'
  if (bold) valueClass += ' text-lg'

  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${bold ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
        {label}
      </span>
      <span className={`font-mono font-medium ${valueClass}`}>{value}</span>
    </div>
  )
}

function Modal({
  onClose,
  title,
  children,
}: {
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-in">
        <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
