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
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')

    const now = new Date()
    let startDate: Date
    let endDate: Date

    if (fromParam && toParam) {
      startDate = new Date(fromParam + 'T00:00:00')
      endDate = new Date(toParam + 'T23:59:59')
    } else {
      // Default: this month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    }

    // Get all shifts in period
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
      },
    })

    // Get fuel types for cost price lookup
    const fuelTypes = await prisma.fuelType.findMany()
    const fuelTypeMap = new Map(fuelTypes.map((ft) => [ft.id, ft]))

    // Calculate revenue, COGS, discount per fuel type
    let totalRevenue = 0
    let totalCOGS = 0
    let totalDiscount = 0
    const fuelDetails: Record<string, { code: string; name: string; liters: number; revenue: number; cogs: number; discount: number }> = {}

    // Daily profit data
    const dailyMap: Record<string, { date: string; revenue: number; cogs: number; discount: number; expense: number }> = {}

    shifts.forEach((shift) => {
      const dateKey = new Date(shift.shiftDate).toISOString().split('T')[0]
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { date: dateKey, revenue: 0, cogs: 0, discount: 0, expense: 0 }
      }

      shift.pumpReadings.forEach((pr) => {
        const ft = fuelTypeMap.get(pr.fuelTypeId)
        if (!ft) return
        const liters = pr.endReading - pr.startReading
        if (liters <= 0) return

        const revenue = liters * pr.unitPrice
        const cogs = liters * ft.costPrice
        const discount = liters * ft.discount

        totalRevenue += revenue
        totalCOGS += cogs
        totalDiscount += discount

        if (!fuelDetails[ft.code]) {
          fuelDetails[ft.code] = { code: ft.code, name: ft.name, liters: 0, revenue: 0, cogs: 0, discount: 0 }
        }
        fuelDetails[ft.code].liters += liters
        fuelDetails[ft.code].revenue += revenue
        fuelDetails[ft.code].cogs += cogs
        fuelDetails[ft.code].discount += discount

        dailyMap[dateKey].revenue += revenue
        dailyMap[dateKey].cogs += cogs
        dailyMap[dateKey].discount += discount
      })

      // Other revenue
      totalRevenue += shift.otherRevenue
      dailyMap[dateKey].revenue += shift.otherRevenue

      // Expenses from shifts
      shift.expenses.forEach((e) => {
        dailyMap[dateKey].expense += e.amount
      })
    })

    // Standalone expenses
    const standaloneExpenses = await prisma.expense.findMany({
      where: {
        shiftId: null,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    let totalExpenses = shifts.reduce((sum, s) => sum + s.expenses.reduce((eSum, e) => eSum + e.amount, 0), 0)
    standaloneExpenses.forEach((e) => {
      totalExpenses += e.amount
      const dateKey = e.createdAt.toISOString().split('T')[0]
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { date: dateKey, revenue: 0, cogs: 0, discount: 0, expense: 0 }
      }
      dailyMap[dateKey].expense += e.amount
    })

    const grossProfit = totalRevenue - totalCOGS
    const netProfit = grossProfit - totalExpenses

    // Sort daily data
    const dailyProfit = Object.values(dailyMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        ...d,
        revenue: Math.round(d.revenue),
        cogs: Math.round(d.cogs),
        discount: Math.round(d.discount),
        expense: Math.round(d.expense),
        grossProfit: Math.round(d.revenue - d.cogs),
        netProfit: Math.round(d.revenue - d.cogs - d.expense),
      }))

    return NextResponse.json({
      period: {
        from: startDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0],
      },
      totalRevenue: Math.round(totalRevenue),
      totalCOGS: Math.round(totalCOGS),
      totalDiscount: Math.round(totalDiscount),
      grossProfit: Math.round(grossProfit),
      totalExpenses: Math.round(totalExpenses),
      netProfit: Math.round(netProfit),
      fuelDetails: Object.values(fuelDetails).map((f) => ({
        ...f,
        liters: Math.round(f.liters * 100) / 100,
        revenue: Math.round(f.revenue),
        cogs: Math.round(f.cogs),
        discount: Math.round(f.discount),
      })),
      dailyProfit,
    })
  } catch (error) {
    console.error('GET /api/profit error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
