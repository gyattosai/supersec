import { classAttendancePdfFilename, compiledAttendancePdfFilename, subjectAttendancePdfFilename, type ClassAttendancePdfData, type SubjectAttendancePdfData } from "@shared/reportPdf";

import { formatDateTime12Hour } from "@/lib/time";

async function createPdf() {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  return { document: new jsPDF({ format: "a4", unit: "pt" }), autoTable: autoTableModule.default };
}

function drawHeader(document: Awaited<ReturnType<typeof createPdf>>["document"], eyebrow: string, title: string, subtitle: string) {
  document.setFillColor(15, 16, 17);
  document.rect(0, 0, 595, 108, "F");
  document.setTextColor(207, 90, 22);
  document.setFont("helvetica", "bold");
  document.setFontSize(9);
  document.text(eyebrow.toUpperCase(), 42, 37);
  document.setTextColor(255, 255, 255);
  document.setFontSize(20);
  document.text(title, 42, 65);
  document.setFont("helvetica", "normal");
  document.setFontSize(9);
  document.setTextColor(205, 210, 214);
  document.text(subtitle, 42, 85);
}

function summaryRows(data: { present: number; absent: number; excused: number; conflict?: number; notSet: number }) {
  const rows = [
    ["Present", String(data.present)],
    ["Absent", String(data.absent)],
    ["Excused", String(data.excused)],
  ];
  if (data.conflict !== undefined && data.conflict > 0) {
    rows.push(["With Schedule Conflict", String(data.conflict)]);
  }
  rows.push(["Not set", String(data.notSet)]);
  return rows;
}
export function formatReportTimestamp(value: Date | string | number) { return formatDateTime12Hour(value); }
function generatedAt() { return `Prepared ${formatReportTimestamp(new Date())} · supersec`; }
function tableFinalY(document: Awaited<ReturnType<typeof createPdf>>["document"]) { return (document as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 136; }

export async function downloadSubjectAttendancePdf(data: SubjectAttendancePdfData) {
  const { document, autoTable } = await createPdf();
  drawHeader(document, "Subject attendance", data.subjectName, `${data.subjectCode} · ${generatedAt()}`);
  autoTable(document, { startY: 136, head: [["Official status", "Total"]], body: summaryRows(data), theme: "grid", headStyles: { fillColor: [207, 90, 22], textColor: [22, 8, 4] }, styles: { fontSize: 10, cellPadding: 8 } });
  document.setTextColor(74, 80, 87);
  document.setFontSize(9);
  document.text("Aggregate Subject Attendance. Student names, private excuse reasons, Zoom source data, and review notes are excluded.", 42, 277, { maxWidth: 510 });
  document.save(subjectAttendancePdfFilename(data.subjectCode));
}

export async function downloadCompiledAttendancePdf(subjects: SubjectAttendancePdfData[]) {
  const { document, autoTable } = await createPdf();
  drawHeader(document, "Selected Subjects", "Compiled Attendance Report", `${subjects.length} selected ${subjects.length === 1 ? "Subject" : "Subjects"} · ${generatedAt()}`);
  autoTable(document, { startY: 136, head: [["Subject", "Code", "Present", "Absent", "Excused", "Not set"]], body: subjects.map(subject => [subject.subjectName, subject.subjectCode, String(subject.present), String(subject.absent), String(subject.excused), String(subject.notSet)]), theme: "grid", headStyles: { fillColor: [207, 90, 22], textColor: [22, 8, 4] }, styles: { fontSize: 9, cellPadding: 7 }, columnStyles: { 0: { cellWidth: 170 } } });
  document.setTextColor(74, 80, 87);
  document.setFontSize(9);
  document.text("Aggregate Attendance for only the selected Subjects. No student names, private notes, excuse reasons, Zoom input, or review data are included.", 42, tableFinalY(document) + 28, { maxWidth: 510 });
  document.save(compiledAttendancePdfFilename(subjects.length));
}

export async function downloadClassAttendancePdf(data: ClassAttendancePdfData) {
  const { document, autoTable } = await createPdf();
  const sessionDate = new Date(data.startsAt);
  const formattedSessionDate = Number.isNaN(sessionDate.getTime())
    ? "Class Session"
    : sessionDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const formattedSessionTime = Number.isNaN(sessionDate.getTime()) ? "" : ` · ${formatDateTime12Hour(sessionDate)}`;

  // Page Dimensions: A4 = 595.28 x 841.89 pt
  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 40;

  // Draw Executive Modern Header Banner
  document.setFillColor(15, 23, 42); // slate-900
  document.rect(0, 0, pageWidth, 115, "F");

  // Top Accent Brand Strip
  document.setFillColor(249, 115, 22); // orange-500
  document.rect(0, 0, pageWidth, 4, "F");

  // Brand Logo Mark Pill
  document.setFillColor(249, 115, 22);
  document.roundedRect(marginX, 22, 28, 22, 4, 4, "F");
  document.setTextColor(255, 255, 255);
  document.setFont("helvetica", "bold");
  document.setFontSize(10);
  document.text("SS", marginX + 7, 37);

  // Institution / System Label
  document.setFontSize(11);
  document.setFont("helvetica", "bold");
  document.setTextColor(255, 255, 255);
  document.text("supersec", marginX + 36, 32);

  document.setFontSize(8);
  document.setFont("helvetica", "normal");
  document.setTextColor(148, 163, 184); // slate-400
  document.text("OFFICIAL ATTENDANCE SYSTEM", marginX + 36, 42);

  // Subject Code Badge (Right-aligned)
  const subjectCode = data.subjectCode || "CLASS";
  const badgeWidth = Math.max(65, subjectCode.length * 7 + 16);
  document.setFillColor(30, 41, 59); // slate-800
  document.roundedRect(pageWidth - marginX - badgeWidth, 24, badgeWidth, 20, 4, 4, "F");
  document.setFont("helvetica", "bold");
  document.setFontSize(9);
  document.setTextColor(251, 146, 60); // orange-400
  document.text(subjectCode, pageWidth - marginX - badgeWidth + 8, 37);

  // Document Title
  document.setFont("helvetica", "bold");
  document.setFontSize(16);
  document.setTextColor(255, 255, 255);
  document.text("CLASS ATTENDANCE SHEET", marginX, 68);

  // Subject Name & Details
  document.setFont("helvetica", "normal");
  document.setFontSize(10);
  document.setTextColor(226, 232, 240); // slate-200
  const profPart = data.professorName ? ` · Instructor: Prof. ${data.professorName}` : "";
  document.text(`${data.subjectName}${profPart}`, marginX, 85);

  // Schedule & Generated Date
  document.setFontSize(8.5);
  document.setTextColor(148, 163, 184); // slate-400
  document.text(`Date: ${formattedSessionDate}${formattedSessionTime}   |   ${generatedAt()}`, marginX, 102);

  // KPI Metrics Summary Table
  const totalStudents = data.students.length;
  const conflictCount =
    data.conflict ?? data.students.filter(s => s.status === "CONFLICT" || s.hasScheduleConflict).length;
  const presentPct = totalStudents > 0 ? Math.round((data.present / totalStudents) * 100) : 0;
  const absentPct = totalStudents > 0 ? Math.round((data.absent / totalStudents) * 100) : 0;
  const excusedPct = totalStudents > 0 ? Math.round((data.excused / totalStudents) * 100) : 0;
  const conflictPct = totalStudents > 0 ? Math.round((conflictCount / totalStudents) * 100) : 0;

  const kpiHeaders = ["Total Enrolled", "Present", "Absent", "Excused", "Schedule Conflict", "Unmarked"];
  const kpiValues = [
    `${totalStudents} Students`,
    `${data.present} (${presentPct}%)`,
    `${data.absent} (${absentPct}%)`,
    `${data.excused} (${excusedPct}%)`,
    `${conflictCount} (${conflictPct}%)`,
    `${data.notSet}`,
  ];

  autoTable(document, {
    startY: 125,
    margin: { left: marginX, right: marginX },
    head: [kpiHeaders],
    body: [kpiValues],
    theme: "grid",
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [241, 245, 249],
      fontSize: 8,
      fontStyle: "bold",
      halign: "center",
      cellPadding: 5,
    },
    styles: {
      fontSize: 8.5,
      fontStyle: "bold",
      halign: "center",
      cellPadding: 6,
      textColor: [15, 23, 42],
    },
    didParseCell(dataCell) {
      if (dataCell.section === "body") {
        if (dataCell.column.index === 1) dataCell.cell.styles.textColor = [16, 185, 129];
        if (dataCell.column.index === 2) dataCell.cell.styles.textColor = [239, 68, 68];
        if (dataCell.column.index === 3) dataCell.cell.styles.textColor = [14, 165, 233];
        if (dataCell.column.index === 4) dataCell.cell.styles.textColor = [168, 85, 247];
      }
    },
  });

  // Table Section Header
  const tableStartY = tableFinalY(document) + 16;
  document.setFont("helvetica", "bold");
  document.setFontSize(10);
  document.setTextColor(15, 23, 42);
  document.text("STUDENT ATTENDANCE ROSTER", marginX, tableStartY - 5);

  // Student Roster Table
  const rosterRows = data.students.map((student, index) => {
    let displayStatus = "UNMARKED";
    if (student.status === "PRESENT") displayStatus = "PRESENT";
    else if (student.status === "ABSENT") displayStatus = "ABSENT";
    else if (student.status === "EXCUSED") displayStatus = "EXCUSED";
    else if (student.status === "CONFLICT") displayStatus = "WITH CONFLICT";

    let notes = student.excuseReason || "-";
    if (student.status === "CONFLICT" || student.hasScheduleConflict) {
      notes = student.excuseReason ? `Conflict: ${student.excuseReason}` : "With Schedule Conflict";
    }

    let verification = "Pending";
    if (student.status === "PRESENT") verification = "In-Class / Zoom Verified";
    else if (student.status === "EXCUSED") verification = "Excuse Approved";
    else if (student.status === "CONFLICT") verification = "Conflict Verified";
    else if (student.status === "ABSENT") verification = "Unexcused";

    return [
      String(index + 1),
      student.canonicalName,
      displayStatus,
      notes,
      student.verificationMethod || verification,
    ];
  });

  autoTable(document, {
    startY: tableStartY,
    margin: { left: marginX, right: marginX },
    head: [["#", "Student Full Name", "Status", "Excuse / Conflict Notes", "Verification"]],
    body: rosterRows,
    theme: "striped",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: "bold",
      cellPadding: 6,
    },
    styles: {
      fontSize: 8,
      cellPadding: 5.5,
      textColor: [30, 41, 59],
      valign: "middle",
      overflow: "linebreak",
    },
    columnStyles: {
      0: { cellWidth: 24, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 155, fontStyle: "bold" },
      2: { cellWidth: 85, halign: "center", fontStyle: "bold" },
      3: { cellWidth: 155, textColor: [71, 85, 105] },
      4: { cellWidth: 96, halign: "center", textColor: [100, 116, 139] },
    },
    didParseCell(dataCell) {
      if (dataCell.section === "body" && dataCell.column.index === 2) {
        const text = String(dataCell.cell.raw);
        if (text === "PRESENT") {
          dataCell.cell.styles.textColor = [5, 150, 105];
          dataCell.cell.styles.fillColor = [236, 253, 245];
        } else if (text === "ABSENT") {
          dataCell.cell.styles.textColor = [220, 38, 38];
          dataCell.cell.styles.fillColor = [254, 242, 242];
        } else if (text === "EXCUSED") {
          dataCell.cell.styles.textColor = [2, 132, 199];
          dataCell.cell.styles.fillColor = [240, 249, 255];
        } else if (text === "WITH CONFLICT" || text === "CONFLICT") {
          dataCell.cell.styles.textColor = [126, 34, 206];
          dataCell.cell.styles.fillColor = [250, 245, 255];
        } else {
          dataCell.cell.styles.textColor = [100, 116, 139];
          dataCell.cell.styles.fillColor = [248, 250, 252];
        }
      }
    },
  });

  // Check if we have space for the signature box on the last page; if not, add a page
  let finalY = tableFinalY(document) + 24;
  if (finalY + 80 > pageHeight - 40) {
    document.addPage();
    finalY = 50;
  }

  // Formal Certification Sign-Off Block
  document.setFont("helvetica", "normal");
  document.setFontSize(8);
  document.setTextColor(100, 116, 139);
  document.text("Certified Correct by:", marginX, finalY);
  document.text("Noted & Verified by:", marginX + 280, finalY);

  document.setDrawColor(148, 163, 184);
  document.setLineWidth(0.75);
  document.line(marginX, finalY + 32, marginX + 200, finalY + 32);
  document.line(marginX + 280, finalY + 32, marginX + 480, finalY + 32);

  document.setFont("helvetica", "bold");
  document.setFontSize(8.5);
  document.setTextColor(15, 23, 42);
  document.text("Class Secretary", marginX, finalY + 44);
  document.text(
    data.professorName ? `Prof. ${data.professorName}` : "Subject Instructor / Professor",
    marginX + 280,
    finalY + 44
  );

  document.setFont("helvetica", "normal");
  document.setFontSize(7.5);
  document.setTextColor(148, 163, 184);
  document.text(
    `Date: ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
    marginX,
    finalY + 54
  );
  document.text("Date: ________________________", marginX + 280, finalY + 54);

  // Add Page Numbers and Confidentiality Notice to all pages
  const totalPages = (document as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    document.setPage(i);
    document.setDrawColor(226, 232, 240);
    document.setLineWidth(0.5);
    document.line(marginX, pageHeight - 30, pageWidth - marginX, pageHeight - 30);

    document.setFont("helvetica", "normal");
    document.setFontSize(7.5);
    document.setTextColor(148, 163, 184);
    document.text("supersec · Official Class Attendance Record · Confidential", marginX, pageHeight - 18);
    document.text(`Page ${i} of ${totalPages}`, pageWidth - marginX - 45, pageHeight - 18);
  }

  document.save(classAttendancePdfFilename(data.subjectCode, data.startsAt));
}
