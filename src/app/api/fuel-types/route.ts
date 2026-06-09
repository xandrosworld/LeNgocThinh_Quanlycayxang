import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSession()
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }

    const fuelTypes = await prisma.fuelType.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        sellPrice: true,
      },
      orderBy: { code: 'asc' },
    })

    return NextResponse.json(fuelTypes)
  } catch (error) {
    console.error('GET /api/fuel-types error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
