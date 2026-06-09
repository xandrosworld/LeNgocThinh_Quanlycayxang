import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }

    const { id } = params

    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        employee: {
          select: { id: true, displayName: true, username: true },
        },
        pumpReadings: {
          include: {
            pump: { include: { fuelType: true } },
            fuelType: true,
          },
          orderBy: { pump: { number: 'asc' } },
        },
        debtTransactions: {
          include: {
            customer: true,
            fuelType: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        expenses: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!shift) {
      return NextResponse.json({ error: 'Không tìm thấy ca' }, { status: 404 })
    }

    // Employee can only view their own shifts
    if (session.role === 'EMPLOYEE' && shift.employeeId !== session.userId) {
      return NextResponse.json({ error: 'Không có quyền xem ca này' }, { status: 403 })
    }

    // Calculate summary
    const pumpRevenue = shift.pumpReadings.reduce((sum, pr) => {
      const volume = pr.endReading - pr.startReading
      return sum + volume * pr.unitPrice
    }, 0)
    const totalLiters = shift.pumpReadings.reduce((sum, pr) => {
      return sum + (pr.endReading - pr.startReading)
    }, 0)
    const totalRevenue = pumpRevenue + shift.otherRevenue
    const totalNewDebt = shift.debtTransactions
      .filter((dt) => dt.type === 'NEW_DEBT')
      .reduce((sum, dt) => sum + dt.amount, 0)
    const totalDebtPayment = shift.debtTransactions
      .filter((dt) => dt.type === 'PAYMENT')
      .reduce((sum, dt) => sum + dt.amount, 0)
    const totalExpenses = shift.expenses.reduce((sum, e) => sum + e.amount, 0)

    const cashRequired =
      totalRevenue +
      shift.debtPaymentReceived -
      totalNewDebt -
      shift.bankTransferPersonal -
      shift.bankTransferBusiness -
      totalExpenses

    const difference = shift.cashReceived - cashRequired

    return NextResponse.json({
      ...shift,
      summary: {
        pumpRevenue,
        totalLiters,
        totalRevenue,
        totalNewDebt,
        totalDebtPayment,
        totalExpenses,
        cashRequired,
        difference,
      },
    })
  } catch (error) {
    console.error('Error fetching shift:', error)
    return NextResponse.json({ error: 'Lỗi tải thông tin ca' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()

    const existingShift = await prisma.shift.findUnique({
      where: { id },
      include: {
        pumpReadings: {
          include: { pump: true, fuelType: true },
        },
      },
    })

    if (!existingShift) {
      return NextResponse.json({ error: 'Không tìm thấy ca' }, { status: 404 })
    }

    // Permission check
    if (session.role === 'EMPLOYEE') {
      if (existingShift.employeeId !== session.userId) {
        return NextResponse.json({ error: 'Không có quyền sửa ca này' }, { status: 403 })
      }
      if (existingShift.status === 'CLOSED') {
        return NextResponse.json({ error: 'Ca đã chốt, không thể sửa' }, { status: 400 })
      }
    }

    // Owner can reopen a closed shift
    if (body.status === 'OPEN' && existingShift.status === 'CLOSED') {
      if (session.role !== 'OWNER') {
        return NextResponse.json(
          { error: 'Chỉ chủ cây xăng mới có thể mở lại ca' },
          { status: 403 }
        )
      }

      const updatedShift = await prisma.shift.update({
        where: { id },
        data: {
          status: 'OPEN',
          endTime: null,
        },
        include: {
          employee: { select: { id: true, displayName: true, username: true } },
          pumpReadings: {
            include: { pump: true, fuelType: true },
            orderBy: { pump: { number: 'asc' } },
          },
          debtTransactions: {
            include: { customer: true, fuelType: true },
            orderBy: { createdAt: 'desc' },
          },
          expenses: { orderBy: { createdAt: 'desc' } },
        },
      })

      return NextResponse.json(updatedShift)
    }

    // Update pump readings
    if (body.pumpReadings && Array.isArray(body.pumpReadings)) {
      for (const pr of body.pumpReadings) {
        await prisma.pumpReading.update({
          where: { id: pr.id },
          data: {
            endReading: parseFloat(pr.endReading) || 0,
            unitPrice: parseFloat(pr.unitPrice) || 0,
          },
        })
      }
    }

    // Build update data for the shift
    const updateData: Record<string, unknown> = {}

    if (body.cashReceived !== undefined) {
      updateData.cashReceived = parseFloat(body.cashReceived) || 0
    }
    if (body.bankTransferPersonal !== undefined) {
      updateData.bankTransferPersonal = parseFloat(body.bankTransferPersonal) || 0
    }
    if (body.bankTransferBusiness !== undefined) {
      updateData.bankTransferBusiness = parseFloat(body.bankTransferBusiness) || 0
    }
    if (body.debtPaymentReceived !== undefined) {
      updateData.debtPaymentReceived = parseFloat(body.debtPaymentReceived) || 0
    }
    if (body.otherRevenue !== undefined) {
      updateData.otherRevenue = parseFloat(body.otherRevenue) || 0
    }
    if (body.note !== undefined) {
      updateData.note = body.note
    }

    // If closing shift
    if (body.status === 'CLOSED' && existingShift.status === 'OPEN') {
      updateData.status = 'CLOSED'
      updateData.endTime = new Date()

      // Get updated pump readings to calculate sold volumes
      const updatedPumpReadings = await prisma.pumpReading.findMany({
        where: { shiftId: id },
        include: { pump: true, fuelType: true },
      })

      // Update pump currentMeter values
      for (const pr of updatedPumpReadings) {
        await prisma.pump.update({
          where: { id: pr.pumpId },
          data: { currentMeter: pr.endReading },
        })
      }

      // Aggregate sold volume per fuel type, then subtract from tanks
      const volumePerFuelType: Record<string, number> = {}
      for (const pr of updatedPumpReadings) {
        const volume = pr.endReading - pr.startReading
        if (volume > 0) {
          volumePerFuelType[pr.fuelTypeId] = (volumePerFuelType[pr.fuelTypeId] || 0) + volume
        }
      }

      for (const [fuelTypeId, volume] of Object.entries(volumePerFuelType)) {
        // Find tanks for this fuel type
        const tanks = await prisma.tank.findMany({
          where: { fuelTypeId },
        })
        if (tanks.length > 0) {
          // Subtract from first tank (simplification)
          const tank = tanks[0]
          await prisma.tank.update({
            where: { id: tank.id },
            data: {
              currentVolume: Math.max(0, tank.currentVolume - volume),
            },
          })
        }
      }
    }

    const updatedShift = await prisma.shift.update({
      where: { id },
      data: updateData,
      include: {
        employee: { select: { id: true, displayName: true, username: true } },
        pumpReadings: {
          include: {
            pump: { include: { fuelType: true } },
            fuelType: true,
          },
          orderBy: { pump: { number: 'asc' } },
        },
        debtTransactions: {
          include: { customer: true, fuelType: true },
          orderBy: { createdAt: 'desc' },
        },
        expenses: { orderBy: { createdAt: 'desc' } },
      },
    })

    // Recalculate summary
    const pumpRevenue = updatedShift.pumpReadings.reduce((sum, pr) => {
      const volume = pr.endReading - pr.startReading
      return sum + volume * pr.unitPrice
    }, 0)
    const totalLiters = updatedShift.pumpReadings.reduce((sum, pr) => {
      return sum + (pr.endReading - pr.startReading)
    }, 0)
    const totalRevenue = pumpRevenue + updatedShift.otherRevenue
    const totalNewDebt = updatedShift.debtTransactions
      .filter((dt) => dt.type === 'NEW_DEBT')
      .reduce((sum, dt) => sum + dt.amount, 0)
    const totalDebtPayment = updatedShift.debtTransactions
      .filter((dt) => dt.type === 'PAYMENT')
      .reduce((sum, dt) => sum + dt.amount, 0)
    const totalExpenses = updatedShift.expenses.reduce((sum, e) => sum + e.amount, 0)
    const cashRequired =
      totalRevenue +
      updatedShift.debtPaymentReceived -
      totalNewDebt -
      updatedShift.bankTransferPersonal -
      updatedShift.bankTransferBusiness -
      totalExpenses
    const difference = updatedShift.cashReceived - cashRequired

    return NextResponse.json({
      ...updatedShift,
      summary: {
        pumpRevenue,
        totalLiters,
        totalRevenue,
        totalNewDebt,
        totalDebtPayment,
        totalExpenses,
        cashRequired,
        difference,
      },
    })
  } catch (error) {
    console.error('Error updating shift:', error)
    return NextResponse.json({ error: 'Lỗi cập nhật ca' }, { status: 500 })
  }
}
