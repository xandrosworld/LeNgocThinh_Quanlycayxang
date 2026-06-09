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
    if (session.role !== 'OWNER') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 })
    }

    const tanks = await prisma.tank.findMany({
      include: {
        fuelType: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(tanks)
  } catch (error) {
    console.error('GET /api/tanks error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
