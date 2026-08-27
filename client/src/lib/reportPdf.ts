import { classAttendancePdfFilename, compiledAttendancePdfFilename, subjectAttendancePdfFilename, type ClassAttendancePdfData, type SubjectAttendancePdfData } from "@shared/reportPdf";

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

function summaryRows(data: { present: number; absent: number; excused: number; notSet: number }) { return [["Present", String(data.present)], ["Absent", String(data.absent)], ["Excused", String(data.excused)], ["Not set", String(data.notSet)]]; }
function generatedAt() { return `Prepared ${new Date().toLocaleString()} · supersec`; }
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
  drawHeader(document, "Private class attendance", data.subjectName, `${data.subjectCode} · ${Number.isNaN(sessionDate.getTime()) ? "Class session" : sessionDate.toLocaleString()} · ${generatedAt()}`);
  autoTable(document, { startY: 136, head: [["Official status", "Total"]], body: summaryRows(data), theme: "grid", headStyles: { fillColor: [207, 90, 22], textColor: [22, 8, 4] }, styles: { fontSize: 10, cellPadding: 8 } });
  autoTable(document, { startY: tableFinalY(document) + 32, head: [["Student", "Official status"]], body: data.students.map(student => [student.canonicalName, student.status.replace("_", " ")]), theme: "striped", headStyles: { fillColor: [15, 16, 17], textColor: [255, 255, 255] }, styles: { fontSize: 9, cellPadding: 7 } });
  document.setTextColor(74, 80, 87);
  document.setFontSize(9);
  document.text("Private secretary export. Do not post this roster document to public or anonymous links.", 42, tableFinalY(document) + 28, { maxWidth: 510 });
  document.save(classAttendancePdfFilename(data.subjectCode, data.startsAt));
}
