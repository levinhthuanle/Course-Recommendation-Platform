export type Hit = {
  id: string
  course_code?: string
  title?: string
  summary?: string
}

export type CourseDetail = {
  id: string
  course_code: string
  title: string
  summary: string
  content: string
  course_name_en?: string
  course_name_vi?: string
  relation_to_curriculum?: string
  credit_points?: string
  prior_courses?: string
  course_description?: string
  course_goals?: string[]
  required_reading?: string[]
}

export type User = {
  id: number
  email: string
  role: 'user' | 'admin'
}

export type Mode = 'home' | 'search' | 'chat' | 'admin'
export type Theme = 'light' | 'dark'

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type ChatThreadSummary = {
  id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
}

export type ChatThreadDetail = ChatThreadSummary & {
  messages: ChatMessage[]
}

export type ChatResponse = {
  message: string
  success: boolean
  thread_id?: string
  thread_title?: string
}

export type AdminFile = {
  name: string
  size: number
  modified: number
}

export type AdminUsageDay = {
  day: string
  total: number
  search: number
  chat: number
}

export type AdminStats = {
  users?: {
    total?: number
    admins?: number
  }
  queries?: {
    total?: number
    search?: number
    chat?: number
  }
  top_terms?: Array<{
    term: string
    count: number
  }>
}
