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
    if (session.role !== 'OWNER') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const where: Record<string, unknown> = {}
    if (from || to) {
      where.createdAt = {}
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from + 'T00:00:00')
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to + 'T23:59:59')
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        shift: {
          select: {
            shiftDate: true,
            employee: { select: { displayName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate monthly total
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const monthlyTotal = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    })

    return NextResponse.json({
      expenses,
      monthlyTotal: monthlyTotal._sum.amount || 0,
    })
  } catch (error) {
    console.error('GET /api/expenses error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }

    const body = await request.json()
    const { description, amount, paidBy, recipient, note, shiftId } = body

    if (!description || !amount) {
      return NextResponse.json({ error: 'Vui lòng điền nội dung và số tiền' }, { status: 400 })
    }

    const expense = await prisma.expense.create({
      data: {
        description,
        amount: parseFloat(amount),
        paidBy: paidBy || null,
        recipient: recipient || null,
        note: note || null,
        shiftId: shiftId || null,
      },
      include: {
        shift: {
          select: {
            shiftDate: true,
            employee: { select: { displayName: true } },
          },
        },
      },
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error('POST /api/expenses error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
