import type { Translation } from '../i18n/translations'
import { renderUsageArea, renderUsagePath } from '../lib/chart'
import { formatBytes } from '../lib/text'
import type { AdminFile, AdminStats, AdminUsageDay } from '../types'

type Props = {
  adminFiles: AdminFile[]
  adminFilesLoading: boolean
  adminMessage: string | null
  adminStats: AdminStats | null
  adminUsage: AdminUsageDay[]
  ingestLoading: boolean
  t: Translation
  uploadFile: File | null
  uploadLoading: boolean
  onClearIndex: (filename: string) => void
  onDeleteFile: (filename: string) => void
  onIngestAll: () => void
  onUploadFileChange: (file: File | null) => void
  onUploadPdf: () => void
}

export function AdminPage({
  adminFiles,
  adminFilesLoading,
  adminMessage,
  adminStats,
  adminUsage,
  ingestLoading,
  t,
  uploadFile,
  uploadLoading,
  onClearIndex,
  onDeleteFile,
  onIngestAll,
  onUploadFileChange,
  onUploadPdf
}: Props) {
  const confirmClearIndex = (filename: string) => {
    if (window.confirm(t.clearIndexConfirm)) onClearIndex(filename)
  }

  const confirmDeleteFile = (filename: string) => {
    if (window.confirm(t.deleteConfirm)) onDeleteFile(filename)
  }

  return (
    <div className="adminPanel">
      <div className="adminHeader">
        <div>
          <h2>{t.adminPanel}</h2>
          <p>{t.adminSubtitle}</p>
        </div>
      </div>
      <div className="adminActions">
        <div className="adminCard adminStats">
          <h3>Dashboard</h3>
          <div className="adminChart">
            {adminUsage.length === 0 ? (
              <div className="adminFilesEmpty">No usage data yet</div>
            ) : (
              <svg viewBox="0 0 600 160" role="img" aria-label="Query usage chart">
                <defs>
                  <linearGradient id="usageFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#F5B800" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#F5B800" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={renderUsageArea(adminUsage, 600, 120)} fill="url(#usageFill)" />
                <path
                  d={renderUsagePath(adminUsage, 600, 120)}
                  fill="none"
                  stroke="#F5B800"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            )}
            <div className="adminChartLabels">
              {adminUsage.map((d, idx) => (
                <span key={d.day} className={idx % 2 === 0 ? 'show' : ''}>
                  {d.day.slice(5)}
                </span>
              ))}
            </div>
          </div>
          <div className="adminStatsGrid">
            <div className="statTile">
              <span>{t.usersTotal}</span>
              <strong>{adminStats?.users?.total ?? '---'}</strong>
            </div>
            <div className="statTile">
              <span>{t.adminsTotal}</span>
              <strong>{adminStats?.users?.admins ?? '---'}</strong>
            </div>
            <div className="statTile">
              <span>{t.totalQueries}</span>
              <strong>{adminStats?.queries?.total ?? '---'}</strong>
            </div>
            <div className="statTile">
              <span>{t.searchQueries}</span>
              <strong>{adminStats?.queries?.search ?? '---'}</strong>
            </div>
            <div className="statTile">
              <span>{t.chatQueries}</span>
              <strong>{adminStats?.queries?.chat ?? '---'}</strong>
            </div>
          </div>
          <div className="adminTerms">
            <div className="adminTermsTitle">{t.topTerms}</div>
            <div className="adminTermsList">
              {(adminStats?.top_terms || []).map((item) => (
                <span key={item.term}>
                  {item.term} <em>{item.count}</em>
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="adminCard">
          <h3>{t.ingestAll}</h3>
          <p>{t.ingestAllDesc}</p>
          <button onClick={onIngestAll} disabled={ingestLoading}>
            {ingestLoading ? t.ingesting : t.ingestAll}
          </button>
        </div>
        <div className="adminCard adminUpload">
          <h3>{t.uploadPdf}</h3>
          <p>{t.uploadDesc}</p>
          <label className="uploadDrop">
            <input type="file" accept="application/pdf" onChange={(e) => onUploadFileChange(e.target.files?.[0] || null)} />
            <div className="uploadIcon">PDF</div>
            <div>
              <strong>{t.chooseFile}</strong>
              <span>{uploadFile ? uploadFile.name : 'PDF (A4), 1 course per page'}</span>
            </div>
          </label>
          <button onClick={onUploadPdf} disabled={!uploadFile || uploadLoading}>
            {uploadLoading ? t.uploading : t.uploadPdf}
          </button>
        </div>
        <div className="adminCard adminFiles">
          <h3>{t.ingestedFiles}</h3>
          {adminFilesLoading ? (
            <div className="adminFilesEmpty">Loading...</div>
          ) : adminFiles.length === 0 ? (
            <div className="adminFilesEmpty">{t.noFiles}</div>
          ) : (
            <div className="adminFilesTable">
              <div className="adminFilesHeader">
                <span>Name</span>
                <span>Size</span>
                <span>Actions</span>
              </div>
              {adminFiles.map((file) => (
                <div key={file.name} className="adminFilesRow">
                  <span className="adminFileName" title={file.name}>
                    {file.name}
                  </span>
                  <span>{formatBytes(file.size)}</span>
                  <div className="adminFilesActions">
                    <button className="ghost" onClick={() => confirmClearIndex(file.name)}>
                      {t.clearIndex}
                    </button>
                    <button className="danger" onClick={() => confirmDeleteFile(file.name)}>
                      {t.deleteFile}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {adminMessage && <div className="adminMessage">{adminMessage}</div>}
    </div>
  )
}
