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

    const imports = await prisma.fuelImport.findMany({
      include: {
        fuelType: true,
        createdBy: {
          select: { displayName: true },
        },
      },
      orderBy: { importDate: 'desc' },
    })

    return NextResponse.json(imports)
  } catch (error) {
    console.error('GET /api/imports error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn || session.role !== 'OWNER') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 })
    }

    const body = await request.json()
    const { fuelTypeId, quantity, unitPrice, licensePlate, driverName, supplier, importDate, note } = body

    if (!fuelTypeId || !quantity || !unitPrice) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ thông tin' }, { status: 400 })
    }

    // Create import record and update tank in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const fuelImport = await tx.fuelImport.create({
        data: {
          fuelTypeId,
          quantity: parseFloat(quantity),
          unitPrice: parseFloat(unitPrice),
          licensePlate: licensePlate || null,
          driverName: driverName || null,
          supplier: supplier || null,
          importDate: importDate ? new Date(importDate) : new Date(),
          note: note || null,
          createdById: session.userId,
        },
        include: {
          fuelType: true,
          createdBy: { select: { displayName: true } },
        },
      })

      // Update tank volume
      const tank = await tx.tank.findFirst({
        where: { fuelTypeId },
      })

      if (tank) {
        const newVolume = Math.min(tank.currentVolume + parseFloat(quantity), tank.maxCapacity)
        await tx.tank.update({
          where: { id: tank.id },
          data: { currentVolume: newVolume },
        })
      }

      return fuelImport
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('POST /api/imports error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
