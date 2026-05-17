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

  const maxDailyValue = Math.max(...adminUsage.map((item) => Math.max(item.search, item.chat, item.total)), 1)
  const searchTotal = adminStats?.queries?.search ?? 0
  const chatTotal = adminStats?.queries?.chat ?? 0
  const queryTotal = Math.max(searchTotal + chatTotal, 1)
  const searchPercent = Math.round((searchTotal / queryTotal) * 100)
  const chatPercent = 100 - searchPercent
  const donutRadius = 44
  const donutCircumference = 2 * Math.PI * donutRadius
  const searchArc = (searchTotal / queryTotal) * donutCircumference
  const topTermMax = Math.max(...(adminStats?.top_terms || []).map((item) => item.count), 1)

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
                <line x1="0" y1="120" x2="600" y2="120" stroke="currentColor" strokeOpacity="0.15" />
                <path d={renderUsageArea(adminUsage, 600, 120)} fill="url(#usageFill)" />
                <path
                  d={renderUsagePath(adminUsage, 600, 120)}
                  fill="none"
                  stroke="#F5B800"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                {adminUsage.map((d, idx) => {
                  const maxValue = Math.max(...adminUsage.map((item) => item.total), 1)
                  const stepX = 600 / Math.max(adminUsage.length - 1, 1)
                  const x = idx * stepX
                  const y = 120 - (d.total / maxValue) * 120
                  return <circle key={d.day} cx={x} cy={y} r="4" fill="#F5B800" />
                })}
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
          <div className="adminChartsGrid">
            <div className="adminMiniChart">
              <div className="adminMiniChartHeader">
                <strong>Search vs Chat</strong>
                <span>daily volume</span>
              </div>
              <div className="adminBarChart">
                {adminUsage.map((day) => (
                  <div key={day.day} className="adminBarGroup" title={`${day.day}: search ${day.search}, chat ${day.chat}`}>
                    <div className="adminBars">
                      <span
                        className="adminBar search"
                        style={{ height: `${Math.max((day.search / maxDailyValue) * 100, day.search ? 8 : 0)}%` }}
                      />
                      <span
                        className="adminBar chat"
                        style={{ height: `${Math.max((day.chat / maxDailyValue) * 100, day.chat ? 8 : 0)}%` }}
                      />
                    </div>
                    <small>{day.day.slice(5)}</small>
                  </div>
                ))}
              </div>
              <div className="adminLegend">
                <span><i className="legendSearch" />Search</span>
                <span><i className="legendChat" />Chat</span>
              </div>
            </div>
            <div className="adminMiniChart">
              <div className="adminMiniChartHeader">
                <strong>Query Mix</strong>
                <span>{searchPercent}% search</span>
              </div>
              <div className="adminDonutWrap">
                <svg viewBox="0 0 120 120" className="adminDonut" role="img" aria-label="Search and chat query mix">
                  <circle cx="60" cy="60" r={donutRadius} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="16" />
                  <circle
                    cx="60"
                    cy="60"
                    r={donutRadius}
                    fill="none"
                    stroke="#F5B800"
                    strokeWidth="16"
                    strokeDasharray={`${searchArc} ${donutCircumference - searchArc}`}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r={donutRadius}
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="16"
                    strokeDasharray={`${donutCircumference - searchArc} ${searchArc}`}
                    strokeDashoffset={-searchArc}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div>
                  <strong>{searchPercent}% / {chatPercent}%</strong>
                  <span>Search / chat split</span>
                </div>
              </div>
            </div>
            <div className="adminMiniChart adminTermBars">
              <div className="adminMiniChartHeader">
                <strong>Top Terms</strong>
                <span>frequency</span>
              </div>
              {(adminStats?.top_terms || []).slice(0, 6).map((item) => (
                <div className="adminTermBar" key={item.term}>
                  <span>{item.term}</span>
                  <div>
                    <i style={{ width: `${Math.max((item.count / topTermMax) * 100, 6)}%` }} />
                  </div>
                  <em>{item.count}</em>
                </div>
              ))}
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
