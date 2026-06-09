'use client'

import { useState, useRef, useEffect } from 'react'
import { formatVND } from '@/lib/format'
import toast from 'react-hot-toast'

interface ParsedCommand {
  type: string
  customerName?: string
  amount?: number
  fuelType?: string
  quantity?: number
  description?: string
  rawText: string
  confidence: number
  displayMessage: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'preview'
  text: string
  parsed?: ParsedCommand
  timestamp: Date
}

const EXAMPLE_COMMANDS = [
  { text: 'Nguyễn Văn A trả nợ 2tr', icon: '💰' },
  { text: 'Thêm nợ cho Việt Hường 500k', icon: '📝' },
  { text: 'Chi mua nước lọc 200k', icon: '💸' },
  { text: 'Nhập E10 5000 lít', icon: '⛽' },
  { text: 'Hôm nay doanh thu bao nhiêu', icon: '📊' },
  { text: 'Tồn E10 còn bao nhiêu', icon: '🛢️' },
  { text: 'Ai đang nợ nhiều nhất', icon: '🏆' },
]

function getTypeLabel(type: string): string {
  switch (type) {
    case 'PAYMENT': return '💰 Trả nợ'
    case 'NEW_DEBT': return '📝 Thêm nợ'
    case 'EXPENSE': return '💸 Chi phí'
    case 'IMPORT': return '⛽ Nhập hàng'
    case 'QUERY_REVENUE': return '📊 Doanh thu'
    case 'QUERY_STOCK': return '🛢️ Tồn kho'
    case 'QUERY_DEBT': return '🏆 Công nợ'
    default: return '❓ Không nhận diện'
  }
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'PAYMENT': return 'bg-green-50 border-green-200'
    case 'NEW_DEBT': return 'bg-red-50 border-red-200'
    case 'EXPENSE': return 'bg-yellow-50 border-yellow-200'
    case 'IMPORT': return 'bg-blue-50 border-blue-200'
    case 'QUERY_REVENUE':
    case 'QUERY_STOCK':
    case 'QUERY_DEBT': return 'bg-purple-50 border-purple-200'
    default: return 'bg-gray-50 border-gray-200'
  }
}

export default function AIPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [processing, setProcessing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const addMessage = (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setMessages((prev) => [
      ...prev,
      { ...msg, id: Date.now().toString() + Math.random(), timestamp: new Date() },
    ])
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || processing) return

    setInput('')
    addMessage({ role: 'user', text })

    try {
      setProcessing(true)

      // Parse command
      const parseRes = await fetch('/api/ai/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!parseRes.ok) throw new Error('Lỗi phân tích câu lệnh')
      const parsed: ParsedCommand = await parseRes.json()

      if (parsed.type === 'UNKNOWN') {
        addMessage({
          role: 'assistant',
          text: parsed.displayMessage,
        })
        return
      }

      // Add preview message
      addMessage({
        role: 'preview',
        text: parsed.displayMessage,
        parsed,
      })
    } catch {
      addMessage({
        role: 'assistant',
        text: '❌ Lỗi xử lý. Vui lòng thử lại.',
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleConfirm = async (parsed: ParsedCommand) => {
    try {
      setProcessing(true)

      const res = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      })

      if (!res.ok) throw new Error('Lỗi thực thi')
      const result = await res.json()

      if (result.success) {
        addMessage({ role: 'assistant', text: result.message })
        toast.success('Thực hiện thành công!')
      } else {
        addMessage({ role: 'assistant', text: `⚠️ ${result.message}` })
      }
    } catch {
      addMessage({
        role: 'assistant',
        text: '❌ Lỗi thực thi. Vui lòng thử lại.',
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleCancel = () => {
    addMessage({ role: 'assistant', text: '🚫 Đã hủy thao tác.' })
  }

  const handleExampleClick = (text: string) => {
    setInput(text)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] animate-fade-in">
      {/* Header */}
      <div className="p-4 md:p-6 pb-3">
        <h1 className="text-2xl font-bold text-gray-900">🤖 AI Nhanh</h1>
        <p className="text-sm text-gray-500 mt-1">Nhập lệnh bằng tiếng Việt để thao tác nhanh</p>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 space-y-4 custom-scrollbar">
        {/* Welcome message */}
        {messages.length === 0 && (
          <div className="space-y-4 py-4">
            <div className="card bg-gradient-to-r from-primary-500 to-accent-500 text-white border-0">
              <h2 className="text-lg font-bold mb-2">👋 Xin chào! Tôi có thể giúp gì?</h2>
              <p className="text-sm opacity-90">
                Nhập câu lệnh tiếng Việt tự nhiên. Tôi sẽ phân tích và thực hiện cho bạn.
              </p>
            </div>

            {/* Example commands */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">💡 Gợi ý câu lệnh</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {EXAMPLE_COMMANDS.map((cmd, i) => (
                  <button
                    key={i}
                    onClick={() => handleExampleClick(cmd.text)}
                    className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-left text-sm"
                  >
                    <span className="text-lg">{cmd.icon}</span>
                    <span className="text-gray-700">{cmd.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-in`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-primary-500 text-white rounded-br-sm'
                  : msg.role === 'preview'
                  ? 'bg-white border-2 border-accent-200 rounded-bl-sm'
                  : 'bg-white border border-gray-200 rounded-bl-sm shadow-sm'
              }`}
            >
              {msg.role === 'preview' && msg.parsed ? (
                <div>
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium mb-2 ${getTypeColor(msg.parsed.type)}`}>
                    {getTypeLabel(msg.parsed.type)}
                  </div>
                  <p className="text-sm text-gray-800 mb-3 whitespace-pre-line">{msg.text}</p>

                  {/* Details */}
                  <div className="text-xs text-gray-500 mb-3 space-y-1">
                    {msg.parsed.customerName && (
                      <p>👤 Khách hàng: <strong>{msg.parsed.customerName}</strong></p>
                    )}
                    {msg.parsed.amount && (
                      <p>💵 Số tiền: <strong>{formatVND(msg.parsed.amount)}</strong></p>
                    )}
                    {msg.parsed.fuelType && (
                      <p>⛽ Nhiên liệu: <strong>{msg.parsed.fuelType}</strong></p>
                    )}
                    {msg.parsed.quantity && (
                      <p>📏 Số lượng: <strong>{msg.parsed.quantity.toLocaleString('vi-VN')} lít</strong></p>
                    )}
                    {msg.parsed.description && (
                      <p>📝 Nội dung: <strong>{msg.parsed.description}</strong></p>
                    )}
                    <p>🎯 Độ tin cậy: {(msg.parsed.confidence * 100).toFixed(0)}%</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConfirm(msg.parsed!)}
                      disabled={processing}
                      className="btn-accent btn-sm"
                    >
                      ✅ Xác nhận
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={processing}
                      className="btn-outline btn-sm"
                    >
                      ❌ Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-line">{msg.text}</p>
              )}

              <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-white/60' : 'text-gray-400'}`}>
                {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {/* Processing indicator */}
        {processing && (
          <div className="flex justify-start animate-slide-in">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-4 md:px-6">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Nhập lệnh... VD: "Việt Hường trả nợ 2tr"'
            className="input flex-1"
            disabled={processing}
            autoFocus
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || processing}
            className="btn-primary px-6"
          >
            {processing ? '⏳' : '🚀'} Gửi
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">
          Nhấn Enter để gửi • Hỗ trợ: trả nợ, thêm nợ, chi phí, nhập hàng, truy vấn
        </p>
      </div>
    </div>
  )
}
