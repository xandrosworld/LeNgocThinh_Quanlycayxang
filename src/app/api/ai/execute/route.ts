import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

function formatMoney(amount: number): string {
  return Math.round(amount).toLocaleString('vi-VN') + 'đ'
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }

    const body = await request.json()
    const { type, customerName, amount, fuelType, quantity, description } = body
    const ownerOnlyTypes = ['IMPORT', 'QUERY_REVENUE', 'QUERY_STOCK', 'QUERY_DEBT']

    if (session.role !== 'OWNER' && ownerOnlyTypes.includes(type)) {
      return NextResponse.json({ error: 'Không có quyền thực hiện lệnh này' }, { status: 403 })
    }

    switch (type) {
      case 'PAYMENT': {
        if (!customerName || !amount) {
          return NextResponse.json({ error: 'Thiếu tên khách hoặc số tiền' }, { status: 400 })
        }

        const customer = await prisma.customer.findFirst({
          where: {
            name: {
              contains: customerName,
              mode: 'insensitive',
            },
          },
        })

        if (!customer) {
          return NextResponse.json({
            success: false,
            message: `Không tìm thấy khách hàng "${customerName}". Vui lòng kiểm tra lại tên.`,
          })
        }

        const paymentAmount = parseFloat(amount)

        await prisma.$transaction([
          prisma.debtTransaction.create({
            data: {
              customerId: customer.id,
              type: 'PAYMENT',
              amount: paymentAmount,
              note: `AI: ${customerName} trả nợ`,
            },
          }),
          prisma.customer.update({
            where: { id: customer.id },
            data: {
              currentDebt: Math.max(0, customer.currentDebt - paymentAmount),
            },
          }),
        ])

        const newDebt = Math.max(0, customer.currentDebt - paymentAmount)
        return NextResponse.json({
          success: true,
          message: `✅ Đã ghi nhận ${customer.name} trả nợ ${formatMoney(paymentAmount)}. Nợ còn lại: ${formatMoney(newDebt)}`,
        })
      }

      case 'NEW_DEBT': {
        if (!customerName || !amount) {
          return NextResponse.json({ error: 'Thiếu tên khách hoặc số tiền' }, { status: 400 })
        }

        const customer = await prisma.customer.findFirst({
          where: {
            name: {
              contains: customerName,
              mode: 'insensitive',
            },
          },
        })

        if (!customer) {
          return NextResponse.json({
            success: false,
            message: `Không tìm thấy khách hàng "${customerName}". Vui lòng kiểm tra lại tên.`,
          })
        }

        const debtAmount = parseFloat(amount)

        // Find fuel type if specified
        let fuelTypeId = null
        if (fuelType) {
          const ft = await prisma.fuelType.findFirst({ where: { code: fuelType } })
          if (ft) fuelTypeId = ft.id
        }

        await prisma.$transaction([
          prisma.debtTransaction.create({
            data: {
              customerId: customer.id,
              type: 'NEW_DEBT',
              amount: debtAmount,
              fuelTypeId,
              note: `AI: Thêm nợ cho ${customerName}`,
            },
          }),
          prisma.customer.update({
            where: { id: customer.id },
            data: {
              currentDebt: customer.currentDebt + debtAmount,
            },
          }),
        ])

        const newDebt = customer.currentDebt + debtAmount
        return NextResponse.json({
          success: true,
          message: `✅ Đã thêm nợ ${formatMoney(debtAmount)} cho ${customer.name}. Tổng nợ: ${formatMoney(newDebt)}`,
        })
      }

      case 'EXPENSE': {
        if (!amount) {
          return NextResponse.json({ error: 'Thiếu số tiền' }, { status: 400 })
        }

        const expenseAmount = parseFloat(amount)
        const desc = description || 'Chi phí (qua AI)'

        await prisma.expense.create({
          data: {
            description: desc,
            amount: expenseAmount,
            paidBy: session.displayName,
            note: 'Tạo qua AI nhanh',
          },
        })

        return NextResponse.json({
          success: true,
          message: `✅ Đã ghi nhận chi phí "${desc}": ${formatMoney(expenseAmount)}`,
        })
      }

      case 'IMPORT': {
        if (!fuelType || !quantity) {
          return NextResponse.json({ error: 'Thiếu loại nhiên liệu hoặc số lượng' }, { status: 400 })
        }

        const ft = await prisma.fuelType.findFirst({ where: { code: fuelType } })
        if (!ft) {
          return NextResponse.json({
            success: false,
            message: `Không tìm thấy loại nhiên liệu "${fuelType}"`,
          })
        }

        const importQty = parseFloat(quantity)

        await prisma.$transaction(async (tx) => {
          await tx.fuelImport.create({
            data: {
              fuelTypeId: ft.id,
              quantity: importQty,
              unitPrice: ft.costPrice,
              createdById: session.userId,
              note: 'Tạo qua AI nhanh',
            },
          })

          const tank = await tx.tank.findFirst({ where: { fuelTypeId: ft.id } })
          if (tank) {
            const newVolume = Math.min(tank.currentVolume + importQty, tank.maxCapacity)
            await tx.tank.update({
              where: { id: tank.id },
              data: { currentVolume: newVolume },
            })
          }
        })

        return NextResponse.json({
          success: true,
          message: `✅ Đã nhập ${importQty.toLocaleString('vi-VN')} lít ${ft.name} (${ft.code})`,
        })
      }

      case 'QUERY_REVENUE': {
        const today = new Date()
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

        const todayShifts = await prisma.shift.findMany({
          where: {
            shiftDate: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          include: {
            pumpReadings: true,
          },
        })

        let totalRevenue = 0
        todayShifts.forEach((shift) => {
          shift.pumpReadings.forEach((pr) => {
            totalRevenue += (pr.endReading - pr.startReading) * pr.unitPrice
          })
          totalRevenue += shift.otherRevenue
        })

        return NextResponse.json({
          success: true,
          message: `📊 Doanh thu hôm nay: ${formatMoney(totalRevenue)} (${todayShifts.length} ca)`,
        })
      }

      case 'QUERY_STOCK': {
        const tanks = await prisma.tank.findMany({
          include: { fuelType: true },
        })

        if (fuelType) {
          const tank = tanks.find((t) => t.fuelType.code === fuelType)
          if (tank) {
            const pct = ((tank.currentVolume / tank.maxCapacity) * 100).toFixed(1)
            return NextResponse.json({
              success: true,
              message: `⛽ ${tank.name} (${tank.fuelType.code}): ${tank.currentVolume.toLocaleString('vi-VN')} / ${tank.maxCapacity.toLocaleString('vi-VN')} lít (${pct}%)`,
            })
          }
        }

        const lines = tanks.map((t) => {
          const pct = ((t.currentVolume / t.maxCapacity) * 100).toFixed(1)
          return `• ${t.name} (${t.fuelType.code}): ${t.currentVolume.toLocaleString('vi-VN')} / ${t.maxCapacity.toLocaleString('vi-VN')} lít (${pct}%)`
        })

        return NextResponse.json({
          success: true,
          message: `⛽ Tồn kho hiện tại:\n${lines.join('\n')}`,
        })
      }

      case 'QUERY_DEBT': {
        const topDebtors = await prisma.customer.findMany({
          where: { currentDebt: { gt: 0 } },
          orderBy: { currentDebt: 'desc' },
          take: 5,
        })

        if (topDebtors.length === 0) {
          return NextResponse.json({
            success: true,
            message: '✅ Không có khách hàng nào đang nợ.',
          })
        }

        const lines = topDebtors.map((c, i) =>
          `${i + 1}. ${c.name}: ${formatMoney(c.currentDebt)}`
        )

        return NextResponse.json({
          success: true,
          message: `💰 Top khách nợ nhiều:\n${lines.join('\n')}`,
        })
      }

      default:
        return NextResponse.json({
          success: false,
          message: 'Không hiểu lệnh. Vui lòng thử lại.',
        })
    }
  } catch (error) {
    console.error('POST /api/ai/execute error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
