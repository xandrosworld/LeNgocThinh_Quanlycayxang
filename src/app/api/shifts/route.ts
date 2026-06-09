import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const employeeId = searchParams.get('employeeId')

    const where: Record<string, unknown> = {}

    if (status && (status === 'OPEN' || status === 'CLOSED')) {
      where.status = status
    }

    if (dateFrom || dateTo) {
      where.shiftDate = {}
      if (dateFrom) {
        (where.shiftDate as Record<string, unknown>).gte = new Date(dateFrom)
      }
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        ;(where.shiftDate as Record<string, unknown>).lte = endDate
      }
    }

    // Employees can only see their own shifts
    if (session.role === 'EMPLOYEE') {
      where.employeeId = session.userId
    } else if (employeeId) {
      where.employeeId = employeeId
    }

    const shifts = await prisma.shift.findMany({
      where,
      include: {
        employee: {
          select: { id: true, displayName: true, username: true },
        },
        pumpReadings: {
          include: {
            pump: true,
            fuelType: true,
          },
        },
        _count: {
          select: {
            debtTransactions: true,
            expenses: true,
          },
        },
      },
      orderBy: { shiftDate: 'desc' },
    })

    // Calculate totals for each shift
    const shiftsWithTotals = shifts.map((shift) => {
      const pumpRevenue = shift.pumpReadings.reduce((sum, pr) => {
        const volume = pr.endReading - pr.startReading
        return sum + volume * pr.unitPrice
      }, 0)
      const totalLiters = shift.pumpReadings.reduce((sum, pr) => {
        return sum + (pr.endReading - pr.startReading)
      }, 0)
      const totalRevenue = pumpRevenue + shift.otherRevenue

      return {
        ...shift,
        pumpRevenue,
        totalLiters,
        totalRevenue,
      }
    })

    return NextResponse.json(shiftsWithTotals)
  } catch (error) {
    console.error('Error fetching shifts:', error)
    return NextResponse.json({ error: 'Lỗi tải danh sách ca' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }

    // Check if employee already has an open shift
    if (session.role === 'EMPLOYEE') {
      const openShift = await prisma.shift.findFirst({
        where: {
          employeeId: session.userId,
          status: 'OPEN',
        },
      })
      if (openShift) {
        return NextResponse.json(
          { error: 'Bạn đang có ca mở. Vui lòng chốt ca trước khi tạo ca mới.' },
          { status: 400 }
        )
      }
    }

    const body = await request.json()
    const employeeId = body.employeeId || session.userId

    // Get all pumps with their fuel types
    const pumps = await prisma.pump.findMany({
      include: { fuelType: true },
      orderBy: { number: 'asc' },
    })

    const now = new Date()

    // Create shift with pump readings
    const shift = await prisma.shift.create({
      data: {
        shiftDate: now,
        startTime: now,
        employeeId,
        status: 'OPEN',
        pumpReadings: {
          create: pumps.map((pump) => ({
            pumpId: pump.id,
            fuelTypeId: pump.fuelTypeId,
            startReading: pump.currentMeter,
            endReading: pump.currentMeter,
            unitPrice: pump.fuelType.sellPrice,
          })),
        },
      },
      include: {
        employee: {
          select: { id: true, displayName: true, username: true },
        },
        pumpReadings: {
          include: {
            pump: true,
            fuelType: true,
          },
        },
      },
    })

    return NextResponse.json(shift, { status: 201 })
  } catch (error) {
    console.error('Error creating shift:', error)
    return NextResponse.json({ error: 'Lỗi tạo ca mới' }, { status: 500 })
  }
}
