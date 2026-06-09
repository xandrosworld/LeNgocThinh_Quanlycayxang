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
    const lite = searchParams.get('lite') === '1'

    if (session.role !== 'OWNER' && !lite) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 })
    }

    if (lite) {
      const customers = await prisma.customer.findMany({
        select: {
          id: true,
          name: true,
          phone: true,
          currentDebt: true,
          debtLimit: true,
        },
        orderBy: { name: 'asc' },
      })

      return NextResponse.json({ customers })
    }

    const customers = await prisma.customer.findMany({
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          include: {
            fuelType: true,
            shift: {
              select: { id: true, shiftDate: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Calculate summary for each customer
    const customersWithSummary = customers.map((customer) => {
      const totalNewDebt = customer.transactions
        .filter((t) => t.type === 'NEW_DEBT')
        .reduce((sum, t) => sum + t.amount, 0)
      const totalPayment = customer.transactions
        .filter((t) => t.type === 'PAYMENT')
        .reduce((sum, t) => sum + t.amount, 0)

      const debtRatio = customer.debtLimit > 0 ? (customer.currentDebt / customer.debtLimit) * 100 : 0

      let debtStatus: 'normal' | 'warning' | 'over'
      if (debtRatio > 100) {
        debtStatus = 'over'
      } else if (debtRatio > 80) {
        debtStatus = 'warning'
      } else {
        debtStatus = 'normal'
      }

      return {
        ...customer,
        totalNewDebt,
        totalPayment,
        debtRatio,
        debtStatus,
      }
    })

    // Summary
    const totalDebt = customers.reduce((sum, c) => sum + c.currentDebt, 0)
    const customersWithDebt = customers.filter((c) => c.currentDebt > 0).length
    const customersOverLimit = customers.filter((c) => c.currentDebt > c.debtLimit).length

    return NextResponse.json({
      customers: customersWithSummary,
      summary: {
        totalDebt,
        customersWithDebt,
        customersOverLimit,
        totalCustomers: customers.length,
      },
    })
  } catch (error) {
    console.error('Error fetching debts:', error)
    return NextResponse.json({ error: 'Lỗi tải danh sách công nợ' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }

    const body = await request.json()
    const { name, phone, debtLimit, note } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Tên khách hàng là bắt buộc' }, { status: 400 })
    }

    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        debtLimit: parseFloat(debtLimit) || 50000000,
        note: note?.trim() || null,
      },
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error('Error creating customer:', error)
    return NextResponse.json({ error: 'Lỗi tạo khách hàng' }, { status: 500 })
  }
}
