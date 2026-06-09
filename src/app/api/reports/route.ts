import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn || session.role !== 'OWNER') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month') // format: 2026-06

    const now = new Date()
    let year = now.getFullYear()
    let month = now.getMonth() // 0-indexed

    if (monthParam) {
      const parts = monthParam.split('-')
      year = parseInt(parts[0])
      month = parseInt(parts[1]) - 1
    }

    const startDate = new Date(year, month, 1)
    const endDate = new Date(year, month + 1, 0, 23, 59, 59)
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    // Get all pump readings for the month via shifts
    const shifts = await prisma.shift.findMany({
      where: {
        shiftDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        pumpReadings: {
          include: { fuelType: true },
        },
        expenses: true,
        debtTransactions: {
          include: { customer: true },
        },
      },
    })

    // Daily revenue calculation
    const dailyRevenue: { date: string; revenue: number }[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dayShifts = shifts.filter((s) => {
        const sd = new Date(s.shiftDate)
        return sd.getDate() === d && sd.getMonth() === month && sd.getFullYear() === year
      })

      let dayRevenue = 0
      dayShifts.forEach((shift) => {
        shift.pumpReadings.forEach((pr) => {
          const liters = pr.endReading - pr.startReading
          dayRevenue += liters * pr.unitPrice
        })
        dayRevenue += shift.otherRevenue
      })

      dailyRevenue.push({ date: dateStr, revenue: Math.round(dayRevenue) })
    }

    // Fuel breakdown
    const fuelBreakdown: Record<string, { code: string; name: string; liters: number; revenue: number }> = {}
    shifts.forEach((shift) => {
      shift.pumpReadings.forEach((pr) => {
        const code = pr.fuelType.code
        if (!fuelBreakdown[code]) {
          fuelBreakdown[code] = { code, name: pr.fuelType.name, liters: 0, revenue: 0 }
        }
        const liters = pr.endReading - pr.startReading
        fuelBreakdown[code].liters += liters
        fuelBreakdown[code].revenue += liters * pr.unitPrice
      })
    })

    // Total revenue
    const totalRevenue = Object.values(fuelBreakdown).reduce((sum, f) => sum + f.revenue, 0) +
      shifts.reduce((sum, s) => sum + s.otherRevenue, 0)

    // Total liters
    const totalLiters = Object.values(fuelBreakdown).reduce((sum, f) => sum + f.liters, 0)

    // Debt summary
    let totalNewDebt = 0
    let totalPayment = 0
    shifts.forEach((shift) => {
      shift.debtTransactions.forEach((dt) => {
        if (dt.type === 'NEW_DEBT') totalNewDebt += dt.amount
        else if (dt.type === 'PAYMENT') totalPayment += dt.amount
      })
    })

    // Also get debt transactions not linked to shifts
    const standaloneDebts = await prisma.debtTransaction.findMany({
      where: {
        shiftId: null,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    })
    standaloneDebts.forEach((dt) => {
      if (dt.type === 'NEW_DEBT') totalNewDebt += dt.amount
      else if (dt.type === 'PAYMENT') totalPayment += dt.amount
    })

    // Expense summary
    const totalExpenses = shifts.reduce((sum, s) => {
      return sum + s.expenses.reduce((eSum, e) => eSum + e.amount, 0)
    }, 0)

    const standaloneExpenses = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        shiftId: null,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    })
    const totalExpensesAll = totalExpenses + (standaloneExpenses._sum.amount || 0)

    // Gross profit estimate
    const totalProfit = totalRevenue - totalExpensesAll

    // Top debtors
    const topDebtors = await prisma.customer.findMany({
      where: { currentDebt: { gt: 0 } },
      orderBy: { currentDebt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        currentDebt: true,
        debtLimit: true,
      },
    })

    return NextResponse.json({
      month: `${year}-${String(month + 1).padStart(2, '0')}`,
      totalRevenue: Math.round(totalRevenue),
      totalLiters: Math.round(totalLiters * 100) / 100,
      totalNewDebt: Math.round(totalNewDebt),
      totalPayment: Math.round(totalPayment),
      totalExpenses: Math.round(totalExpensesAll),
      totalProfit: Math.round(totalProfit),
      dailyRevenue,
      fuelBreakdown: Object.values(fuelBreakdown).map((f) => ({
        ...f,
        liters: Math.round(f.liters * 100) / 100,
        revenue: Math.round(f.revenue),
      })),
      topDebtors,
    })
  } catch (error) {
    console.error('GET /api/reports error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
