import { getIronSession, SessionOptions } from 'iron-session'
import { cookies } from 'next/headers'

export interface SessionData {
  userId: string
  username: string
  displayName: string
  role: 'OWNER' | 'EMPLOYEE'
  isLoggedIn: boolean
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long_for_security',
  cookieName: 'gas-station-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
}

export async function getSession() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  return session
}

export async function getCurrentUser() {
  const session = await getSession()
  if (!session.isLoggedIn) return null
  return {
    userId: session.userId,
    username: session.username,
    displayName: session.displayName,
    role: session.role,
  }
}
