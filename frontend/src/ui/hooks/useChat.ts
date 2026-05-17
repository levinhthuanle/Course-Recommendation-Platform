import { useEffect, useState } from 'react'
import { api } from '../../utils/api'
import type { ChatMessage, ChatThreadSummary, User } from '../types'

export function useChat(currentUser: User | null) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatThreads, setChatThreads] = useState<ChatThreadSummary[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [chatThreadsLoading, setChatThreadsLoading] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)
  const storageKey = currentUser ? `active_chat_thread:${currentUser.id}` : null

  const loadThreads = async (preferredThreadId?: string | null) => {
    if (!currentUser) {
      setChatThreads([])
      setChatMessages([])
      setActiveThreadId(null)
      return
    }

    setChatThreadsLoading(true)
    try {
      const threads = await api.listChatThreads()
      setChatThreads(threads)

      const storedThreadId = storageKey ? localStorage.getItem(storageKey) : null
      const candidateThreadId = preferredThreadId ?? activeThreadId ?? storedThreadId ?? threads[0]?.id ?? null
      const nextThreadId = threads.some((thread) => thread.id === candidateThreadId)
        ? candidateThreadId
        : threads[0]?.id ?? null
      setActiveThreadId(nextThreadId)
      if (storageKey) {
        if (nextThreadId) localStorage.setItem(storageKey, nextThreadId)
        else localStorage.removeItem(storageKey)
      }

      if (nextThreadId) {
        const thread = await api.getChatThread(nextThreadId)
        setChatMessages(thread.messages)
      } else {
        setChatMessages([])
      }
    } catch (e) {
      console.error('Failed to load chat threads', e)
      setChatThreads([])
      setChatMessages([])
    } finally {
      setChatThreadsLoading(false)
    }
  }

  useEffect(() => {
    void loadThreads()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  const selectThread = async (threadId: string) => {
    setActiveThreadId(threadId)
    if (storageKey) localStorage.setItem(storageKey, threadId)
    try {
      const thread = await api.getChatThread(threadId)
      setChatMessages(thread.messages)
    } catch (e) {
      console.error('Failed to load chat thread', e)
    }
  }

  const createNewChat = async () => {
    if (!currentUser) return
    const thread = await api.createChatThread()
    setChatThreads((prev) => [thread, ...prev.filter((item) => item.id !== thread.id)])
    setActiveThreadId(thread.id)
    if (storageKey) localStorage.setItem(storageKey, thread.id)
    setChatMessages([])
  }

  const deleteThread = async (threadId: string) => {
    await api.deleteChatThread(threadId)
    const nextThreads = chatThreads.filter((thread) => thread.id !== threadId)
    setChatThreads(nextThreads)
    if (activeThreadId === threadId) {
      const nextThreadId = nextThreads[0]?.id ?? null
      setActiveThreadId(nextThreadId)
      if (storageKey) {
        if (nextThreadId) localStorage.setItem(storageKey, nextThreadId)
        else localStorage.removeItem(storageKey)
      }
      if (nextThreadId) {
        const thread = await api.getChatThread(nextThreadId)
        setChatMessages(thread.messages)
      } else {
        setChatMessages([])
      }
    }
  }

  const submitChat = async (message: string) => {
    if (!message.trim() || chatLoading) return

    const userMessage = { role: 'user' as const, content: message }
    setChatMessages((prev) => [...prev, userMessage])
    setChatLoading(true)

    try {
      const response = await api.chat(message, chatMessages, activeThreadId)
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.message
        }
      ])
      if (response.thread_id) {
        setActiveThreadId(response.thread_id)
        if (storageKey) localStorage.setItem(storageKey, response.thread_id)
      }
      void loadThreads(response.thread_id ?? activeThreadId)
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
    chatThreads,
    chatThreadsLoading,
    chatLoading,
    activeThreadId,
    loadThreads,
    selectThread,
    createNewChat,
    deleteThread,
    submitChat
  }
}
