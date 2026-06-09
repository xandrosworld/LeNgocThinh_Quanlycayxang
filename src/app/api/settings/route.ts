import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSession()
    if (!session.isLoggedIn || session.role !== 'OWNER') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 })
    }

    const fuelTypes = await prisma.fuelType.findMany({
      orderBy: { code: 'asc' },
    })

    const tanks = await prisma.tank.findMany({
      include: { fuelType: true },
      orderBy: { name: 'asc' },
    })

    const settings = await prisma.setting.findMany()
    const settingsMap: Record<string, string> = {}
    settings.forEach((s) => {
      settingsMap[s.key] = s.value
    })

    return NextResponse.json({
      fuelTypes,
      tanks,
      settings: settingsMap,
    })
  } catch (error) {
    console.error('GET /api/settings error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn || session.role !== 'OWNER') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 })
    }

    const body = await request.json()
    const { section, data } = body

    switch (section) {
      case 'sellPrices': {
        // data: [{ id, sellPrice }]
        for (const item of data) {
          await prisma.fuelType.update({
            where: { id: item.id },
            data: { sellPrice: parseFloat(item.sellPrice) },
          })
        }
        break
      }

      case 'costPrices': {
        // data: [{ id, costPrice }]
        for (const item of data) {
          await prisma.fuelType.update({
            where: { id: item.id },
            data: { costPrice: parseFloat(item.costPrice) },
          })
        }
        break
      }

      case 'discounts': {
        // data: [{ id, discount }]
        for (const item of data) {
          await prisma.fuelType.update({
            where: { id: item.id },
            data: { discount: parseFloat(item.discount) },
          })
        }
        break
      }

      case 'tanks': {
        // data: [{ id, maxCapacity }]
        for (const item of data) {
          await prisma.tank.update({
            where: { id: item.id },
            data: { maxCapacity: parseFloat(item.maxCapacity) },
          })
        }
        break
      }

      case 'settings': {
        // data: { key: value }
        for (const [key, value] of Object.entries(data)) {
          await prisma.setting.upsert({
            where: { key },
            update: { value: String(value) },
            create: { key, value: String(value) },
          })
        }
        break
      }

      default:
        return NextResponse.json({ error: 'Section không hợp lệ' }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Đã lưu cài đặt' })
  } catch (error) {
    console.error('PUT /api/settings error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
