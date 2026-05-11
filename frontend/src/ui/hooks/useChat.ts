import { useState } from 'react'
import { api } from '../../utils/api'
import type { ChatMessage } from '../types'

export function useChat() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)

  const submitChat = async (message: string) => {
    if (!message.trim() || chatLoading) return

    const userMessage = { role: 'user' as const, content: message }
    setChatMessages((prev) => [...prev, userMessage])
    setChatLoading(true)

    try {
      const response = await api.chat(message, chatMessages)
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.message
        }
      ])
    } catch (e: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Xin lá»—i, Ä‘Ã£ xáº£y ra lá»—i: ${e?.message || 'KhÃ´ng thá»ƒ káº¿t ná»‘i Ä‘áº¿n server'}`
        }
      ])
    } finally {
      setChatLoading(false)
    }
  }

  return {
    chatMessages,
    chatLoading,
    submitChat
  }
}
