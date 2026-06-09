import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSession()

    if (!session.isLoggedIn) {
      return NextResponse.json(
        { error: 'Chưa đăng nhập' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      user: {
        id: session.userId,
        username: session.username,
        displayName: session.displayName,
        role: session.role,
      },
    })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json(
      { error: 'Lỗi kiểm tra phiên đăng nhập' },
      { status: 500 }
    )
  }
}
