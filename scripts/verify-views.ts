import { getPayload } from 'payload'
import config from '../src/payload.config'
import { getPublicSubjectPageData } from '../src/lib/data/public-views'
import { getProfessorReport, createReportLink, getActiveReportLink } from '../src/lib/data/reports'
import { getTodayClasses } from '../src/lib/dashboard-helpers'

import { getActiveTerm } from '../src/lib/data/terms'

async function verifyViews() {
  const payload = await getPayload({ config })

  console.log('--- 1. Testing Secretary Dashboard Data ---')
  const activeTerm = await getActiveTerm(payload)
  const subjects = await payload.find({ collection: 'subjects' })
  console.log('  Term:', activeTerm?.name)
  console.log('  Subjects count:', subjects.docs.length)
  console.log('  Subject names:', subjects.docs.map((s) => s.code).join(', '))
  const todayClasses = getTodayClasses(subjects.docs as any[], 'MON')
  console.log('  Monday classes:', todayClasses.length)

  console.log('\n--- 2. Testing Public Subject Page View ---')
  if (subjects.docs.length > 0) {
    const subj = subjects.docs[0]
    console.log(`  Querying public subject page for: ${subj.code} (${subj.slug})`)
    const pageData = await getPublicSubjectPageData(payload, subj.slug)
    if (pageData) {
      console.log('  Subject:', pageData.subject.name)
      console.log('  Roster count:', pageData.roster.length)
      console.log('  Published sessions count:', pageData.sessions.length)
      const allEntries = pageData.sessions.flatMap((s) => s.entries)
      const conflictEntries = allEntries.filter((e) => e.attendance === 'C')
      console.log(`  Schedule conflict ('C') entries in subject:`, conflictEntries.length)
      const sampleStudent = pageData.roster[0]
      console.log('  Sample student in roster:', sampleStudent?.name)
    } else {
      console.log('  Public subject page data returned null!')
    }
  }

  console.log('\n--- 3. Testing Professor Report View ---')
  const sampleSubject = await payload.find({
    collection: 'subjects',
    limit: 1,
  })
  if (sampleSubject.docs.length > 0) {
    const subj = sampleSubject.docs[0]
    let activeLink = await getActiveReportLink(payload, subj.id)
    if (!activeLink) {
      console.log(`  Creating active report link for ${subj.code}...`)
      activeLink = (await createReportLink(payload, { subjectId: subj.id })) as any
    }
    console.log(`  Subject: ${subj.code} (${subj.name}) - Token: ${activeLink?.token}`)
    const report = await getProfessorReport(payload, activeLink!.token)
    if (report.status === 'active') {
      console.log('  Subject code:', report.subject.code)
      console.log('  Total enrolled students in report:', report.students.length)
      console.log('  Total held sessions:', report.heldSessionsCount)
      console.log('  Sample student stats:', report.students.slice(0, 3).map((st) => ({
        name: st.name,
        present: st.presentCount,
        absent: st.absentCount,
        excused: st.excusedCount,
        conflict: st.conflictCount,
        rate: st.attendancePercentage + '%',
      })))
    } else {
      console.log('  Professor report status:', report.status)
    }
  }

  process.exit(0)
}

verifyViews().catch((err) => {
  console.error('Error verifying views:', err)
  process.exit(1)
})
