import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { parseCommand } from '@/lib/ai-parser'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }

    const body = await request.json()
    const { text } = body

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Vui lòng nhập câu lệnh' }, { status: 400 })
    }

    const parsed = parseCommand(text.trim())
    return NextResponse.json(parsed)
  } catch (error) {
    console.error('POST /api/ai/parse error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
