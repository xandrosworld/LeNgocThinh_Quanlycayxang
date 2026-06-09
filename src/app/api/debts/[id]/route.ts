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
    if (session.role !== 'OWNER') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 })
    }

    const { id } = params

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        transactions: {
          include: {
            fuelType: true,
            shift: {
              select: { id: true, shiftDate: true, employee: { select: { displayName: true } } },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Không tìm thấy khách hàng' }, { status: 404 })
    }

    // Calculate summary
    const totalNewDebt = customer.transactions
      .filter((t) => t.type === 'NEW_DEBT')
      .reduce((sum, t) => sum + t.amount, 0)
    const totalPayment = customer.transactions
      .filter((t) => t.type === 'PAYMENT')
      .reduce((sum, t) => sum + t.amount, 0)
    const debtRatio =
      customer.debtLimit > 0 ? (customer.currentDebt / customer.debtLimit) * 100 : 0

    return NextResponse.json({
      ...customer,
      totalNewDebt,
      totalPayment,
      debtRatio,
    })
  } catch (error) {
    console.error('Error fetching customer:', error)
    return NextResponse.json({ error: 'Lỗi tải thông tin khách hàng' }, { status: 500 })
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

    if (session.role !== 'OWNER') {
      return NextResponse.json({ error: 'Chỉ chủ cây xăng mới có quyền sửa' }, { status: 403 })
    }

    const { id } = params
    const body = await request.json()

    const existing = await prisma.customer.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy khách hàng' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (body.name !== undefined) {
      updateData.name = body.name.trim()
    }
    if (body.phone !== undefined) {
      updateData.phone = body.phone?.trim() || null
    }
    if (body.debtLimit !== undefined) {
      updateData.debtLimit = parseFloat(body.debtLimit) || 0
    }
    if (body.note !== undefined) {
      updateData.note = body.note?.trim() || null
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: updateData,
      include: {
        transactions: {
          include: { fuelType: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating customer:', error)
    return NextResponse.json({ error: 'Lỗi cập nhật khách hàng' }, { status: 500 })
  }
}
