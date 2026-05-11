import { useCallback, useEffect, useState } from 'react'
import { api } from '../../utils/api'
import type { AdminFile, AdminStats, AdminUsageDay, Mode, User } from '../types'

export function useAdminDashboard(mode: Mode, currentUser: User | null) {
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [ingestLoading, setIngestLoading] = useState(false)
  const [adminMessage, setAdminMessage] = useState<string | null>(null)
  const [adminFiles, setAdminFiles] = useState<AdminFile[]>([])
  const [adminFilesLoading, setAdminFilesLoading] = useState(false)
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null)
  const [adminUsage, setAdminUsage] = useState<AdminUsageDay[]>([])

  const refreshFiles = useCallback(async () => {
    const filesRes = await api.listAdminFiles()
    setAdminFiles(filesRes.files || [])
  }, [])

  useEffect(() => {
    if (mode !== 'admin' || currentUser?.role !== 'admin') return

    setAdminFilesLoading(true)
    Promise.all([api.listAdminFiles(), api.getAdminStats(), api.getAdminUsage(7)])
      .then(([filesRes, statsRes, usageRes]) => {
        setAdminFiles(filesRes.files || [])
        setAdminStats(statsRes || null)
        setAdminUsage(usageRes.days || [])
      })
      .catch(() => {
        setAdminFiles([])
        setAdminStats(null)
        setAdminUsage([])
      })
      .finally(() => setAdminFilesLoading(false))
  }, [mode, currentUser])

  const ingestAll = async () => {
    setIngestLoading(true)
    setAdminMessage(null)
    try {
      const res = await api.ingest(true)
      setAdminMessage(res?.message || 'Ingest completed')
    } catch (e: any) {
      setAdminMessage(e?.message || 'Ingest failed')
    } finally {
      setIngestLoading(false)
    }
  }

  const uploadPdf = async () => {
    if (!uploadFile) return

    setUploadLoading(true)
    setAdminMessage(null)
    try {
      const res = await api.uploadPdf(uploadFile)
      setAdminMessage(res?.message || 'Upload completed')
      setUploadFile(null)
      await refreshFiles()
    } catch (e: any) {
      setAdminMessage(e?.message || 'Upload failed')
    } finally {
      setUploadLoading(false)
    }
  }

  const deleteFile = async (filename: string) => {
    setAdminMessage(null)
    setAdminFilesLoading(true)
    try {
      const res = await api.deleteAdminFile(filename)
      setAdminMessage(res?.message || 'File deleted')
      await refreshFiles()
    } catch (e: any) {
      setAdminMessage(e?.message || 'Delete failed')
    } finally {
      setAdminFilesLoading(false)
    }
  }

  const clearIndex = async (filename: string) => {
    setAdminMessage(null)
    setAdminFilesLoading(true)
    try {
      const res = await api.clearAdminIndexForFile(filename)
      setAdminMessage(res?.message || 'Index cleared')
    } catch (e: any) {
      setAdminMessage(e?.message || 'Index clear failed')
    } finally {
      setAdminFilesLoading(false)
    }
  }

  return {
    uploadFile,
    uploadLoading,
    ingestLoading,
    adminMessage,
    adminFiles,
    adminFilesLoading,
    adminStats,
    adminUsage,
    setUploadFile,
    ingestAll,
    uploadPdf,
    deleteFile,
    clearIndex
  }
}
