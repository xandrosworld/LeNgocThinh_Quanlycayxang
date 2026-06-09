import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }

    const body = await request.json()
    const { customerId, shiftId, type, fuelTypeId, amount, note } = body

    if (!customerId) {
      return NextResponse.json({ error: 'Khách hàng là bắt buộc' }, { status: 400 })
    }

    if (!type || (type !== 'NEW_DEBT' && type !== 'PAYMENT')) {
      return NextResponse.json({ error: 'Loại giao dịch không hợp lệ' }, { status: 400 })
    }

    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Số tiền phải lớn hơn 0' }, { status: 400 })
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({ where: { id: customerId } })
    if (!customer) {
      return NextResponse.json({ error: 'Không tìm thấy khách hàng' }, { status: 404 })
    }

    // Create transaction and update customer debt in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.debtTransaction.create({
        data: {
          customerId,
          shiftId: shiftId || null,
          type,
          fuelTypeId: fuelTypeId || null,
          amount: parsedAmount,
          note: note?.trim() || null,
        },
        include: {
          customer: true,
          fuelType: true,
        },
      })

      // Update customer currentDebt
      const debtChange = type === 'NEW_DEBT' ? parsedAmount : -parsedAmount
      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: {
          currentDebt: {
            increment: debtChange,
          },
        },
      })

      return { transaction, updatedCustomer }
    })

    return NextResponse.json(result.transaction, { status: 201 })
  } catch (error) {
    console.error('Error creating debt transaction:', error)
    return NextResponse.json({ error: 'Lỗi tạo giao dịch công nợ' }, { status: 500 })
  }
}
