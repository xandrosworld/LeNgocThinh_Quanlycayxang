/**
 * AI Local Parser - Xử lý câu lệnh tiếng Việt
 * Không cần API key, chạy hoàn toàn local
 */

export interface ParsedCommand {
  type: 'PAYMENT' | 'NEW_DEBT' | 'EXPENSE' | 'IMPORT' | 'QUERY_REVENUE' | 'QUERY_STOCK' | 'QUERY_DEBT' | 'UNKNOWN'
  customerName?: string
  amount?: number
  fuelType?: string
  quantity?: number
  description?: string
  rawText: string
  confidence: number
  displayMessage: string
}

/**
 * Parse số tiền từ text tiếng Việt
 * 2tr → 2,000,000
 * 500k → 500,000
 * 1tr5 → 1,500,000
 * 2 triệu → 2,000,000
 * 200 ngàn → 200,000
 */
function parseAmount(text: string): number | null {
  // Pattern: 1tr5, 2tr, 1.5tr
  let match = text.match(/(\d+(?:[.,]\d+)?)\s*tr\s*(\d+)?/i)
  if (match) {
    const main = parseFloat(match[1].replace(',', '.'))
    const sub = match[2] ? parseInt(match[2]) : 0
    if (sub > 0) {
      return (main + sub / 10) * 1_000_000
    }
    return main * 1_000_000
  }

  // Pattern: 2 triệu, 2.5 triệu
  match = text.match(/(\d+(?:[.,]\d+)?)\s*triệu/i)
  if (match) {
    return parseFloat(match[1].replace(',', '.')) * 1_000_000
  }

  // Pattern: 500k, 200K
  match = text.match(/(\d+(?:[.,]\d+)?)\s*k\b/i)
  if (match) {
    return parseFloat(match[1].replace(',', '.')) * 1_000
  }

  // Pattern: 200 ngàn, 200 nghìn
  match = text.match(/(\d+(?:[.,]\d+)?)\s*(?:ngàn|nghìn|ngan|nghin)/i)
  if (match) {
    return parseFloat(match[1].replace(',', '.')) * 1_000
  }

  // Pattern: số đơn lẻ lớn (>= 1000)
  match = text.match(/(\d{1,3}(?:[.,]\d{3})+)/)
  if (match) {
    return parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
  }

  // Pattern: số lớn không có dấu phân cách
  match = text.match(/(\d+)/)
  if (match) {
    const num = parseInt(match[1])
    if (num >= 1000) return num
  }

  return null
}

/**
 * Parse tên khách hàng từ câu lệnh
 */
function extractCustomerName(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }
  return null
}

/**
 * Parse loại nhiên liệu
 */
function extractFuelType(text: string): string | null {
  const lower = text.toLowerCase()
  if (/\be10\b|xăng\s*e10|xăng\s*10/i.test(lower)) return 'E10'
  if (/\bd1\b|dầu\s*d1|dầu\s*do\b/i.test(lower)) return 'D1'
  if (/\bd5\b|\bds\b|dầu\s*d5|dầu\s*ds/i.test(lower)) return 'DS'
  if (/xăng/i.test(lower)) return 'E10'
  if (/dầu/i.test(lower)) return 'D1'
  return null
}

/**
 * Parse số lượng lít
 */
function extractQuantity(text: string): number | null {
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(?:lít|lit|l\b)/i)
  if (match) {
    return parseFloat(match[1].replace(',', '.'))
  }
  return null
}

/**
 * Format số tiền cho hiển thị
 */
function formatAmount(amount: number): string {
  return Math.round(amount).toLocaleString('vi-VN') + 'đ'
}

/**
 * Parse câu lệnh tiếng Việt thành hành động
 */
export function parseCommand(input: string): ParsedCommand {
  const text = input.trim()
  const lower = text.toLowerCase()

  // === QUERY: Doanh thu ===
  if (/doanh thu|bán được|thu được/i.test(lower) && /bao nhiêu|hôm nay|tháng|tuần/i.test(lower)) {
    return {
      type: 'QUERY_REVENUE',
      rawText: text,
      confidence: 0.9,
      displayMessage: 'Truy vấn doanh thu hôm nay...',
    }
  }

  // === QUERY: Tồn kho ===
  if (/tồn|còn bao nhiêu|còn lại/i.test(lower) && /e10|d1|d5|ds|xăng|dầu|bồn/i.test(lower)) {
    const fuel = extractFuelType(text)
    return {
      type: 'QUERY_STOCK',
      fuelType: fuel || undefined,
      rawText: text,
      confidence: 0.85,
      displayMessage: fuel ? `Truy vấn tồn kho ${fuel}...` : 'Truy vấn tồn kho...',
    }
  }

  // === QUERY: Ai nợ nhiều nhất ===
  if (/ai.*nợ.*nhiều|nợ.*nhiều.*nhất|top.*nợ/i.test(lower)) {
    return {
      type: 'QUERY_DEBT',
      rawText: text,
      confidence: 0.9,
      displayMessage: 'Truy vấn khách hàng nợ nhiều nhất...',
    }
  }

  // === PAYMENT: Trả nợ ===
  if (/trả\s*(nợ|tiền)/i.test(lower)) {
    const customerPatterns = [
      /^(.+?)\s+trả\s*(?:nợ|tiền)/i,
      /trả\s*(?:nợ|tiền).*?(?:cho|của)\s+(.+?)(?:\s+\d|\s*$)/i,
    ]
    const customerName = extractCustomerName(text, customerPatterns)
    const amount = parseAmount(text)
    
    return {
      type: 'PAYMENT',
      customerName: customerName || undefined,
      amount: amount || undefined,
      rawText: text,
      confidence: customerName && amount ? 0.95 : 0.6,
      displayMessage: customerName && amount
        ? `Ghi nhận khách ${customerName} trả nợ ${formatAmount(amount)}?`
        : 'Không thể nhận diện đầy đủ thông tin trả nợ.',
    }
  }

  // === NEW_DEBT: Thêm nợ / Nợ thêm ===
  if (/(?:thêm|tạo)\s*nợ|nợ\s*(?:thêm|mới)|ghi\s*nợ/i.test(lower)) {
    const customerPatterns = [
      /(?:thêm|tạo)\s*nợ\s*(?:cho|của)\s+(.+?)(?:\s+\d|\s+mặt)/i,
      /^(.+?)\s+(?:nợ\s*thêm|ghi\s*nợ)/i,
    ]
    const customerName = extractCustomerName(text, customerPatterns)
    const amount = parseAmount(text)
    const fuelType = extractFuelType(text)
    
    return {
      type: 'NEW_DEBT',
      customerName: customerName || undefined,
      amount: amount || undefined,
      fuelType: fuelType || undefined,
      rawText: text,
      confidence: customerName && amount ? 0.9 : 0.5,
      displayMessage: customerName && amount
        ? `Thêm nợ cho ${customerName}: ${formatAmount(amount)}${fuelType ? ` (${fuelType})` : ''}?`
        : 'Không thể nhận diện đầy đủ thông tin công nợ.',
    }
  }

  // === EXPENSE: Chi phí ===
  if (/^chi\s|chi\s*(?:mua|trả|phí)|mua\s/i.test(lower)) {
    const amount = parseAmount(text)
    const descMatch = text.match(/(?:chi|mua)\s+(.+?)(?:\s+\d|\s+\w*tr|\s+\w*k\b)/i)
    const description = descMatch ? descMatch[1].trim() : undefined
    
    return {
      type: 'EXPENSE',
      amount: amount || undefined,
      description: description,
      rawText: text,
      confidence: amount ? 0.85 : 0.5,
      displayMessage: amount
        ? `Ghi nhận chi phí${description ? ` "${description}"` : ''}: ${formatAmount(amount)}?`
        : 'Không thể nhận diện số tiền chi phí.',
    }
  }

  // === IMPORT: Nhập hàng ===
  if (/nhập\s/i.test(lower) && (extractFuelType(text) || extractQuantity(text))) {
    const fuelType = extractFuelType(text)
    const quantity = extractQuantity(text)
    
    return {
      type: 'IMPORT',
      fuelType: fuelType || undefined,
      quantity: quantity || undefined,
      rawText: text,
      confidence: fuelType && quantity ? 0.9 : 0.5,
      displayMessage: fuelType && quantity
        ? `Nhập ${fuelType}: ${quantity.toLocaleString('vi-VN')} lít?`
        : 'Không thể nhận diện đầy đủ thông tin nhập hàng.',
    }
  }

  // === UNKNOWN ===
  return {
    type: 'UNKNOWN',
    rawText: text,
    confidence: 0,
    displayMessage: 'Xin lỗi, tôi không hiểu câu lệnh này. Hãy thử lại với format khác.',
  }
}
