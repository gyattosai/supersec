'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Download, Search, Filter, Calendar, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  generateProfessorCsv,
  getFlagBadgeInfo,
  type ProfessorCsvStudent,
} from '@/lib/professor-csv'

export interface ProfessorReportViewProps {
  token: string
  subject: {
    id: string
    code: string
    name: string
    section?: string
    absenceLimit: number
  }
  range: {
    fromDate?: string
    toDate?: string
  }
  heldSessionsCount: number
  students: Array<ProfessorCsvStudent & { id: string }>
}

export function ProfessorReportView({
  token,
  subject,
  range,
  heldSessionsCount,
  students,
}: ProfessorReportViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchQuery, setSearchQuery] = React.useState('')
  const [fromDate, setFromDate] = React.useState(range.fromDate || '')
  const [toDate, setToDate] = React.useState(range.toDate || '')

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (fromDate) params.set('fromDate', fromDate)
    else params.delete('fromDate')

    if (toDate) params.set('toDate', toDate)
    else params.delete('toDate')

    router.push(`/prof/${token}?${params.toString()}`)
  }

  const handleClearFilter = () => {
    setFromDate('')
    setToDate('')
    router.push(`/prof/${token}`)
  }

  const handleExportCsv = () => {
    const csvContent = generateProfessorCsv({
      subjectCode: subject.code,
      heldSessionsCount,
      students,
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${subject.code}_attendance_report.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const filteredStudents = students.filter((stu) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return stu.name.toLowerCase().includes(q) || stu.studentNumber.toLowerCase().includes(q)
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Controls & Actions Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between p-4 rounded-xl border border-border bg-surface-1">
        {/* Date Filter Form */}
        <form onSubmit={handleApplyFilter} className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Calendar className="h-3.5 w-3.5 text-text-quaternary" />
            <span>From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-surface-2 border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <span>To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-surface-2 border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <Button type="submit" size="sm" variant="outline" className="h-7 text-xs px-2.5">
            <Filter className="h-3 w-3 mr-1" /> Filter
          </Button>

          {(range.fromDate || range.toDate) && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleClearFilter}
              className="h-7 text-xs text-text-tertiary hover:text-text-primary px-2"
            >
              Reset
            </Button>
          )}
        </form>

        {/* Export CSV Button */}
        <Button
          type="button"
          onClick={handleExportCsv}
          className="bg-brand text-on-brand hover:bg-brand-hover text-xs font-semibold h-8 min-h-[44px] md:min-h-0 px-3 self-end md:self-auto"
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Export CSV
        </Button>
      </div>

      {/* Student Search & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-quaternary" />
          <input
            type="text"
            placeholder="Search student or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-surface-1 text-text-primary placeholder:text-text-quaternary focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="text-xs text-text-tertiary">
          Showing <span className="font-semibold text-text-primary">{filteredStudents.length}</span> of{' '}
          {students.length} students · Absence limit: <span className="font-semibold text-text-primary">{subject.absenceLimit}</span>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-border bg-surface-1 shadow-2 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface-2/60 text-text-secondary font-medium">
              <th className="py-3 px-4">Student</th>
              <th className="py-3 px-3 text-center">P</th>
              <th className="py-3 px-3 text-center">A</th>
              <th className="py-3 px-3 text-center">E</th>
              <th className="py-3 px-3 text-center">Rate</th>
              <th className="py-3 px-3 text-center">Recit</th>
              <th className="py-3 px-3 text-center">Streak</th>
              <th className="py-3 px-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredStudents.map((stu) => {
              const flagInfo = getFlagBadgeInfo(stu.flag)

              let rateVariant: 'success' | 'warning' | 'danger' = 'success'
              if (stu.attendancePercentage < 70) rateVariant = 'danger'
              else if (stu.attendancePercentage < 80) rateVariant = 'warning'

              return (
                <tr key={stu.id} className="hover:bg-hover transition-colors">
                  {/* Name + ID */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-text-primary">{stu.name}</div>
                    <div className="text-[11px] text-text-quaternary font-mono">
                      {stu.studentNumber || '—'}
                    </div>
                  </td>

                  {/* P / A / E */}
                  <td className="py-3 px-3 text-center font-medium text-success">
                    {stu.presentCount}
                  </td>
                  <td className="py-3 px-3 text-center font-medium text-danger">
                    {stu.absentCount}
                  </td>
                  <td className="py-3 px-3 text-center font-medium text-warning">
                    {stu.excusedCount}
                  </td>

                  {/* Attendance Rate */}
                  <td className="py-3 px-3 text-center">
                    <Badge variant={rateVariant} className="font-mono text-[11px]">
                      {stu.attendancePercentage}%
                    </Badge>
                  </td>

                  {/* Recitations */}
                  <td className="py-3 px-3 text-center font-medium text-text-primary">
                    {stu.recitationsCount > 0 ? (
                      <span className="text-brand-text font-bold">+{stu.recitationsCount}</span>
                    ) : (
                      '0'
                    )}
                  </td>

                  {/* Absence Streak */}
                  <td className="py-3 px-3 text-center">
                    {stu.streak > 0 ? (
                      <span className="text-danger font-medium">{stu.streak}A</span>
                    ) : (
                      <span className="text-text-quaternary">—</span>
                    )}
                  </td>

                  {/* Warning Flag Badge */}
                  <td className="py-3 px-4 text-right">
                    <Badge variant={flagInfo.variant} className="text-[11px]">
                      {flagInfo.label}
                    </Badge>
                  </td>
                </tr>
              )
            })}

            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-text-tertiary">
                  <AlertCircle className="h-6 w-6 mx-auto mb-1 text-text-quaternary" />
                  No students found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
