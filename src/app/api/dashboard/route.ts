import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSession()

    if (!session.isLoggedIn) {
      return NextResponse.json(
        { error: 'Chưa đăng nhập' },
        { status: 401 }
      )
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (session.role === 'OWNER') {
      // === OWNER: Full dashboard data ===

      // 1. Total revenue today from shifts
      const todayShifts = await prisma.shift.findMany({
        where: {
          shiftDate: {
            gte: today,
            lt: tomorrow,
          },
        },
        include: {
          employee: {
            select: { displayName: true },
          },
          pumpReadings: true,
        },
      })

      let totalRevenueToday = 0
      for (const shift of todayShifts) {
        // Revenue from pump readings
        for (const reading of shift.pumpReadings) {
          const liters = reading.endReading - reading.startReading
          totalRevenueToday += liters * reading.unitPrice
        }
        // Other revenue
        totalRevenueToday += shift.otherRevenue
      }

      // 2. Total debt from customers
      const debtResult = await prisma.customer.aggregate({
        _sum: { currentDebt: true },
      })
      const totalDebt = debtResult._sum.currentDebt || 0

      // 3. Tank volumes
      const tanks = await prisma.tank.findMany({
        include: {
          fuelType: {
            select: { code: true, name: true },
          },
        },
        orderBy: { name: 'asc' },
      })

      const tankSummary = tanks.map((tank) => ({
        id: tank.id,
        name: tank.name,
        fuelCode: tank.fuelType.code,
        fuelName: tank.fuelType.name,
        currentVolume: tank.currentVolume,
        maxCapacity: tank.maxCapacity,
        percentage: tank.maxCapacity > 0
          ? Math.round((tank.currentVolume / tank.maxCapacity) * 100 * 10) / 10
          : 0,
        warningLow: tank.warningLow,
        warningCritical: tank.warningCritical,
        warningHigh: tank.warningHigh,
      }))

      // 4. Total tank volume
      const totalTankVolume = tanks.reduce((sum, t) => sum + t.currentVolume, 0)

      // 5. Shifts today count
      const shiftsToday = todayShifts.length

      // 6. Recent shifts (last 5)
      const recentShifts = await prisma.shift.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            select: { displayName: true },
          },
          pumpReadings: true,
        },
      })

      const recentShiftsData = recentShifts.map((shift) => {
        let revenue = 0
        let totalLiters = 0
        for (const reading of shift.pumpReadings) {
          const liters = reading.endReading - reading.startReading
          revenue += liters * reading.unitPrice
          totalLiters += liters
        }
        revenue += shift.otherRevenue

        return {
          id: shift.id,
          shiftDate: shift.shiftDate,
          startTime: shift.startTime,
          endTime: shift.endTime,
          employee: shift.employee.displayName,
          status: shift.status,
          revenue,
          totalLiters,
        }
      })

      // 7. Top 5 customers with highest debt
      const topDebtors = await prisma.customer.findMany({
        where: {
          currentDebt: { gt: 0 },
        },
        orderBy: { currentDebt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          phone: true,
          currentDebt: true,
          debtLimit: true,
        },
      })

      return NextResponse.json({
        role: 'OWNER',
        kpi: {
          totalRevenueToday,
          totalDebt,
          totalTankVolume,
          shiftsToday,
        },
        tanks: tankSummary,
        recentShifts: recentShiftsData,
        topDebtors,
      })
    } else {
      // === EMPLOYEE: Limited data ===

      // Get employee's shifts today
      const myShiftsToday = await prisma.shift.findMany({
        where: {
          employeeId: session.userId,
          shiftDate: {
            gte: today,
            lt: tomorrow,
          },
        },
        include: {
          pumpReadings: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      const shiftsData = myShiftsToday.map((shift) => {
        let revenue = 0
        let totalLiters = 0
        for (const reading of shift.pumpReadings) {
          const liters = reading.endReading - reading.startReading
          revenue += liters * reading.unitPrice
          totalLiters += liters
        }
        revenue += shift.otherRevenue

        return {
          id: shift.id,
          shiftDate: shift.shiftDate,
          startTime: shift.startTime,
          endTime: shift.endTime,
          status: shift.status,
          revenue,
          totalLiters,
        }
      })

      // Check if there's an open shift
      const openShift = myShiftsToday.find((s) => s.status === 'OPEN')

      return NextResponse.json({
        role: 'EMPLOYEE',
        displayName: session.displayName,
        myShiftsToday: shiftsData,
        hasOpenShift: !!openShift,
        openShiftId: openShift?.id || null,
      })
    }
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Lỗi tải dữ liệu dashboard' },
      { status: 500 }
    )
  }
}
