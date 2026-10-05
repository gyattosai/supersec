'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Download,
  Printer,
  Search,
  Filter,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Users,
  Clock,
  Flame,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  generateProfessorCsv,
  type ProfessorCsvStudent,
} from '@/lib/professor-csv'

export interface ProfessorReportViewProps {
  token: string
  subject: {
    id: string
    code: string
    name: string
    section?: string
    sectionMark?: string
    professor?: string
    termName?: string
    absenceLimit: number
  }
  range: {
    fromDate?: string
    toDate?: string
  }
  heldSessionsCount: number
  heldSessionDates?: string[]
  sessionSummaries?: Array<{
    id: string
    date: string
    sheetTitle?: string
    onRosterCount: number
    presentStarCount: number
    presentCount: number
    excusedCount: number
    conflictCount: number
    absentCount: number
    attendanceRate: number
  }>
  monitoringSummary?: {
    totalHeldClassSessions: number
    activeStudents: number
    noAttendanceCount: number
    below50Count: number
    totalFlaggedCount: number
  }
  preparedByName?: string
  datePrepared?: string
  students: Array<
    ProfessorCsvStudent & {
      id: string
      presentStarCount?: number
      eligibleSessionsCount?: number
      attendanceRate?: number
      categories?: string[]
      sessionMarks?: Record<string, 'P' | 'A' | 'E' | 'C' | '—'>
    }
  >
}

export function ProfessorReportView({
  token,
  subject,
  range,
  heldSessionsCount,
  heldSessionDates = [],
  sessionSummaries = [],
  monitoringSummary,
  preparedByName = 'Matthew Balubar, Class Secretary',
  datePrepared,
  students,
}: ProfessorReportViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchQuery, setSearchQuery] = React.useState('')
  const [filterMode, setFilterMode] = React.useState<'flagged_only' | 'all'>('flagged_only')
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
      sessionDates: heldSessionDates,
      students,
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${subject.code}_low_no_attendance_report.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    window.print()
  }

  // Filter students
  const filteredStudents = students
    .filter((stu) => {
      if (filterMode === 'flagged_only') {
        const isFlagged =
          stu.flag !== 'none' ||
          (stu.categories && stu.categories.length > 0) ||
          stu.streak >= 3 ||
          (stu.attendanceRate !== undefined ? stu.attendanceRate < 50 : stu.attendancePercentage < 50) ||
          stu.presentCount === 0
        if (!isFlagged) return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = stu.name.toLowerCase().includes(q)
        const matchNum = stu.studentNumber.toLowerCase().includes(q)
        if (!matchName && !matchNum) return false
      }

      return true
    })
    .sort((a, b) => {
      const rateA = a.attendanceRate !== undefined ? a.attendanceRate : a.attendancePercentage
      const rateB = b.attendanceRate !== undefined ? b.attendanceRate : b.attendancePercentage
      return rateA - rateB || b.absentCount - a.absentCount
    })

  const termTitle = subject.termName ? `Low / No Attendance Report: ${subject.termName}` : 'Low / No Attendance Report'
  const sectionDisplay = subject.sectionMark || subject.section || 'OLCA113N001'
  const profDisplay = subject.professor || 'Course Instructor'

  return (
    <div className="flex flex-col gap-6 print:text-black">
      {/* 1. Action Toolbar (Screen only) */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between p-4 rounded-xl border border-border bg-surface-1 shadow-sm print:hidden">
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

          <Button type="submit" size="sm" variant="outline" className="h-8 text-xs px-2.5">
            <Filter className="h-3 w-3 mr-1" /> Filter
          </Button>

          {(range.fromDate || range.toDate) && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleClearFilter}
              className="h-8 text-xs text-text-tertiary hover:text-text-primary px-2"
            >
              Reset
            </Button>
          )}
        </form>

        {/* Action Buttons: Print & CSV */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrint}
            className="text-xs font-semibold h-9 min-h-[40px] px-3.5"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Print to PDF
          </Button>

          <Button
            type="button"
            onClick={handleExportCsv}
            className="bg-brand text-on-brand hover:bg-brand-hover text-xs font-semibold h-9 min-h-[40px] px-3.5 shadow-sm"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* 2. Official Header Block (Styled for both Web and Print) */}
      <div className="p-6 rounded-2xl border border-border bg-surface-1 shadow-sm flex flex-col gap-4 print:border-black print:bg-white print:p-0 print:shadow-none">
        <div className="border-b border-border print:border-black pb-3 text-center sm:text-left">
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand block print:text-black">
            SuperSec Academic Attendance Records
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-text-primary print:text-black tracking-tight mt-0.5">
            {termTitle}
          </h1>
        </div>

        {/* Metadata Grid matching primary source PDF */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-xs">
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-text-secondary print:text-black w-28 shrink-0">TO:</span>
              <span className="font-semibold text-text-primary print:text-black">
                Sir {profDisplay}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-text-secondary print:text-black w-28 shrink-0">PREPARED BY:</span>
              <span className="text-text-primary print:text-black">{preparedByName}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-text-secondary print:text-black w-28 shrink-0">SUBJECT:</span>
              <span className="font-semibold text-text-primary print:text-black">
                {subject.name} ({subject.code})
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-text-secondary print:text-black w-28 shrink-0">SECTION:</span>
              <span className="font-mono font-semibold text-text-primary print:text-black">{sectionDisplay}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-text-secondary print:text-black w-28 shrink-0">PERIOD:</span>
              <span className="text-text-primary print:text-black font-mono">
                {heldSessionDates.length > 0
                  ? `${heldSessionDates[0]} – ${heldSessionDates[heldSessionDates.length - 1]}`
                  : 'Term In Progress'}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-text-secondary print:text-black w-28 shrink-0">DATE PREPARED:</span>
              <span className="text-text-primary print:text-black">{datePrepared || 'October 2026'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Top 5 Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 print:grid-cols-5 print:gap-1.5">
        <div className="p-3 rounded-xl border border-border bg-surface-1 shadow-sm flex flex-col gap-1 print:border-black print:bg-white">
          <span className="text-[10px] text-text-secondary print:text-black font-medium">Class Sessions</span>
          <span className="text-xl font-bold font-mono text-text-primary print:text-black">
            {monitoringSummary?.totalHeldClassSessions ?? heldSessionsCount}
          </span>
          <span className="text-[9px] text-text-tertiary print:text-gray-600">held this term</span>
        </div>

        <div className="p-3 rounded-xl border border-border bg-surface-1 shadow-sm flex flex-col gap-1 print:border-black print:bg-white">
          <span className="text-[10px] text-text-secondary print:text-black font-medium">Active Roster</span>
          <span className="text-xl font-bold font-mono text-text-primary print:text-black">
            {monitoringSummary?.activeStudents ?? students.length}
          </span>
          <span className="text-[9px] text-text-tertiary print:text-gray-600">enrolled students</span>
        </div>

        <div className="p-3 rounded-xl border border-border bg-surface-1 shadow-sm flex flex-col gap-1 print:border-black print:bg-white">
          <span className="text-[10px] text-text-secondary print:text-black font-medium">No Attendance</span>
          <span
            className={`text-xl font-bold font-mono ${
              (monitoringSummary?.noAttendanceCount ?? 0) > 0 ? 'text-red-400 print:text-black' : 'text-text-primary print:text-black'
            }`}
          >
            {monitoringSummary?.noAttendanceCount ?? 0}
          </span>
          <span className="text-[9px] text-text-tertiary print:text-gray-600">0 sessions attended</span>
        </div>

        <div className="p-3 rounded-xl border border-border bg-surface-1 shadow-sm flex flex-col gap-1 print:border-black print:bg-white">
          <span className="text-[10px] text-text-secondary print:text-black font-medium">Below 50%</span>
          <span
            className={`text-xl font-bold font-mono ${
              (monitoringSummary?.below50Count ?? 0) > 0 ? 'text-amber-400 print:text-black' : 'text-text-primary print:text-black'
            }`}
          >
            {monitoringSummary?.below50Count ?? 0}
          </span>
          <span className="text-[9px] text-text-tertiary print:text-gray-600">&lt; 50% attendance</span>
        </div>

        <div className="p-3 rounded-xl border border-border bg-surface-1 shadow-sm flex flex-col gap-1 col-span-2 sm:col-span-1 print:border-black print:bg-white">
          <span className="text-[10px] text-text-secondary print:text-black font-medium">Total Flagged</span>
          <span
            className={`text-xl font-bold font-mono ${
              (monitoringSummary?.totalFlaggedCount ?? 0) > 0 ? 'text-rose-400 print:text-black' : 'text-emerald-400 print:text-black'
            }`}
          >
            {monitoringSummary?.totalFlaggedCount ?? 0}
          </span>
          <span className="text-[9px] text-text-tertiary print:text-gray-600">needs review</span>
        </div>
      </div>

      {/* 4. Basis Note Callout */}
      <div className="p-3.5 rounded-xl border border-border bg-surface-2/60 text-xs text-text-secondary print:border-black print:bg-white print:text-black print:p-2">
        <p className="leading-relaxed">
          <strong className="text-text-primary print:text-black">Basis:</strong> Present* count includes both Excused (E) and Conflict (C) — both count towards attendance percentage. Sessions prior to student enrollment (marked —) and No Class days are strictly excluded from calculations. Low attendance is flagged for students below 50% attendance.
        </p>
      </div>

      {/* 5. Section 1: Flagged Students Matrix Table */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-2 print:border-black">
          <div>
            <h2 className="text-sm font-bold text-text-primary print:text-black">
              Section 1: Flagged Students Attendance Matrix
            </h2>
            <p className="text-[11px] text-text-secondary print:text-black">
              Students with 0 sessions attended or below 50% attendance rate, ordered from lowest to highest attendance.
            </p>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <div className="relative w-44">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-quaternary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full h-8 pl-8 pr-2.5 text-xs rounded-lg border border-border bg-surface-1 text-text-primary placeholder:text-text-quaternary focus:border-brand focus:outline-none"
              />
            </div>

            <div className="inline-flex rounded-lg border border-border p-0.5 bg-surface-2">
              <button
                type="button"
                onClick={() => setFilterMode('flagged_only')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                  filterMode === 'flagged_only' ? 'bg-brand text-on-brand' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Flagged ({monitoringSummary?.totalFlaggedCount ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                  filterMode === 'all' ? 'bg-brand text-on-brand' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                All ({students.length})
              </button>
            </div>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-x-auto print:border-black print:shadow-none">
          <table className="w-full text-left text-xs border-collapse print:text-[10px]">
            <thead>
              <tr className="border-b border-border bg-surface-2/80 text-text-secondary font-semibold print:border-black print:bg-gray-100 print:text-black">
                <th className="py-2.5 px-3 w-8 text-center">#</th>
                <th className="py-2.5 px-3 min-w-[140px]">Student Name</th>
                <th className="py-2.5 px-2.5 font-mono text-[11px]">ID #</th>
                {heldSessionDates.map((d) => (
                  <th key={d} className="py-2.5 px-2 text-center font-mono text-[10px] whitespace-nowrap">
                    {d.slice(5)}
                  </th>
                ))}
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Attended*</th>
                <th className="py-2.5 px-2 text-center">Abs</th>
                <th className="py-2.5 px-2.5 text-center font-bold">Rate</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 print:divide-black">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((stu, idx) => {
                  const rate = stu.attendanceRate !== undefined ? stu.attendanceRate : stu.attendancePercentage
                  const attendedCount = stu.presentStarCount !== undefined ? stu.presentStarCount : stu.presentCount
                  const denominator = stu.eligibleSessionsCount !== undefined ? stu.eligibleSessionsCount : heldSessionsCount

                  const isZero = attendedCount === 0 && denominator > 0
                  const isUnder50 = rate < 50

                  return (
                    <tr key={stu.id} className="hover:bg-surface-2/40 print:hover:bg-transparent transition-colors">
                      <td className="py-2 px-3 text-center text-text-quaternary print:text-black font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-semibold text-text-primary print:text-black whitespace-nowrap">
                        {stu.name}
                      </td>
                      <td className="py-2 px-2.5 font-mono text-[11px] text-text-tertiary print:text-black whitespace-nowrap">
                        {stu.studentNumber || '—'}
                      </td>

                      {/* Date marks columns */}
                      {heldSessionDates.map((d) => {
                        const mark = stu.sessionMarks?.[d] || '—'
                        return (
                          <td key={d} className="py-2 px-2 text-center font-mono font-bold text-[11px]">
                            {mark === 'P' && <span className="text-emerald-400 print:text-black">P</span>}
                            {mark === 'A' && <span className="text-red-400 print:text-black">A</span>}
                            {mark === 'E' && <span className="text-amber-400 print:text-black">E</span>}
                            {mark === 'C' && <span className="text-purple-400 print:text-black">C</span>}
                            {mark === '—' && <span className="text-text-quaternary print:text-gray-400">—</span>}
                          </td>
                        )
                      })}

                      {/* Attended Fraction */}
                      <td className="py-2 px-2 text-center font-mono whitespace-nowrap">
                        {attendedCount}/{denominator}
                      </td>

                      {/* Absences */}
                      <td className="py-2 px-2 text-center font-mono text-red-400 print:text-black font-semibold">
                        {stu.absentCount}
                      </td>

                      {/* Attendance Rate % */}
                      <td className="py-2 px-2.5 text-center font-mono font-bold">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] ${
                            isZero
                              ? 'bg-red-500/15 text-red-400 print:bg-transparent print:text-black'
                              : isUnder50
                              ? 'bg-amber-500/15 text-amber-400 print:bg-transparent print:text-black'
                              : 'text-text-primary print:text-black'
                          }`}
                        >
                          {rate}%
                        </span>
                      </td>

                      {/* Category Badge */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        {isZero ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 print:border-black print:text-black print:bg-transparent">
                            No Attendance
                          </span>
                        ) : isUnder50 ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 print:border-black print:text-black print:bg-transparent">
                            Below 50%
                          </span>
                        ) : stu.flag === 'exceeded' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 print:border-black print:text-black print:bg-transparent">
                            Exceeded Limit
                          </span>
                        ) : (
                          <span className="text-[10px] text-text-tertiary print:text-black">
                            Good Standing
                          </span>
                        )}
                      </td>

                      {/* Remarks (Strictly privacy safe) */}
                      <td className="py-2 px-3 text-[11px] text-text-secondary print:text-black whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(stu.conflictCount ?? 0) > 0 && (
                            <span className="text-purple-400 print:text-black font-medium">
                              With Conflict
                            </span>
                          )}
                          {stu.streak >= 3 && (
                            <span className="text-orange-400 print:text-black font-semibold">
                              {stu.streak}A Streak
                            </span>
                          )}
                          {(stu.conflictCount ?? 0) === 0 && stu.streak < 3 && (
                            <span className="text-text-tertiary print:text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={heldSessionDates.length + 8} className="p-8 text-center text-xs text-text-secondary">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-1 opacity-80" />
                    <p className="font-semibold text-text-primary">No students flagged for low attendance.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Section 2: Session-by-Session Breakdown Table */}
      {sessionSummaries.length > 0 && (
        <div className="flex flex-col gap-3 mt-4 print:break-before-page">
          <div className="border-b border-border pb-2 print:border-black">
            <h2 className="text-sm font-bold text-text-primary print:text-black">
              Section 2: Session-by-Session Summary Breakdown
            </h2>
            <p className="text-[11px] text-text-secondary print:text-black">
              Summary of held class sessions, roll call totals, and daily attendance percentages.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface-1 shadow-sm overflow-x-auto print:border-black print:shadow-none">
            <table className="w-full text-left text-xs border-collapse print:text-[10px]">
              <thead>
                <tr className="border-b border-border bg-surface-2/80 text-text-secondary font-semibold print:border-black print:bg-gray-100 print:text-black">
                  <th className="py-2.5 px-3 w-8 text-center">#</th>
                  <th className="py-2.5 px-3 font-mono">Date</th>
                  <th className="py-2.5 px-3">Published Sheet Title / Remarks</th>
                  <th className="py-2.5 px-2.5 text-center">On Roster</th>
                  <th className="py-2.5 px-2.5 text-center font-bold text-emerald-400 print:text-black">Present*</th>
                  <th className="py-2.5 px-2.5 text-center text-amber-400 print:text-black">Excused (E)</th>
                  <th className="py-2.5 px-2.5 text-center text-purple-400 print:text-black">Conflict (C)</th>
                  <th className="py-2.5 px-2.5 text-center text-red-400 print:text-black">Absent (A)</th>
                  <th className="py-2.5 px-3 text-right font-bold">Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 print:divide-black">
                {sessionSummaries.map((sess, idx) => (
                  <tr key={sess.id} className="hover:bg-surface-2/40 print:hover:bg-transparent">
                    <td className="py-2 px-3 text-center text-text-quaternary print:text-black font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 font-mono font-semibold text-text-primary print:text-black whitespace-nowrap">
                      {sess.date}
                    </td>
                    <td className="py-2 px-3 text-text-secondary print:text-black">
                      {sess.sheetTitle || 'Class Session'}
                    </td>
                    <td className="py-2 px-2.5 text-center font-mono">
                      {sess.onRosterCount}
                    </td>
                    <td className="py-2 px-2.5 text-center font-mono font-bold text-emerald-400 print:text-black">
                      {sess.presentStarCount}
                    </td>
                    <td className="py-2 px-2.5 text-center font-mono text-amber-400 print:text-black">
                      {sess.excusedCount}
                    </td>
                    <td className="py-2 px-2.5 text-center font-mono text-purple-400 print:text-black">
                      {sess.conflictCount}
                    </td>
                    <td className="py-2 px-2.5 text-center font-mono text-red-400 print:text-black">
                      {sess.absentCount}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-text-primary print:text-black">
                      {sess.attendanceRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. Section 3: Formal Signatures Block */}
      <div className="p-6 rounded-2xl border border-border bg-surface-1 shadow-sm mt-4 print:border-black print:bg-white print:p-0 print:shadow-none break-inside-avoid">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-tertiary print:text-black mb-6">
          Certification & Acknowledgement
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
          <div className="flex flex-col gap-1">
            <div className="w-56 border-b border-border print:border-black pb-1 mb-1">
              <span className="font-semibold text-text-primary print:text-black block text-sm">
                Matthew Balubar
              </span>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary print:text-black">
              PREPARED BY:
            </span>
            <span className="text-xs text-text-secondary print:text-black">
              Class Secretary
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <div className="w-56 border-b border-border print:border-black pb-1 mb-1">
              <span className="font-semibold text-text-primary print:text-black block text-sm">
                Sir {profDisplay}
              </span>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary print:text-black">
              NOTED BY:
            </span>
            <span className="text-xs text-text-secondary print:text-black">
              Course Instructor
            </span>
          </div>
        </div>
      </div>

      {/* Print Stylesheet Hook */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          @page {
            size: A4 landscape;
            margin: 12mm 15mm;
          }
        }
      `}</style>
    </div>
  )
}
