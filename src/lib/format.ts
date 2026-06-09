/**
 * Format số tiền VND: 165.923.880đ
 */
export function formatVND(amount: number): string {
  if (isNaN(amount)) return '0đ'
  return Math.round(amount).toLocaleString('vi-VN') + 'đ'
}

/**
 * Format số lít: 6.429
 */
export function formatLiters(liters: number): string {
  if (isNaN(liters)) return '0'
  return Math.round(liters * 100) / 100 > 0
    ? liters.toLocaleString('vi-VN', { maximumFractionDigits: 2 })
    : '0'
}

/**
 * Format ngày tiếng Việt: 08/06/2026
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Format ngày giờ: 08/06/2026 15:00
 */
export function formatDateTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format phần trăm: 52.0%
 */
export function formatPercent(value: number): string {
  return (Math.round(value * 10) / 10) + '%'
}

/**
 * Parse date string to input format YYYY-MM-DD
 */
export function toInputDate(date: Date | string): string {
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}
