import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const session = await getSession()
    session.destroy()

    return NextResponse.json({ success: true, message: 'Đã đăng xuất' })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Lỗi khi đăng xuất' },
      { status: 500 }
    )
  }
}
