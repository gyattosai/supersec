export interface OgParams {
  type?: "subject" | "attendance" | "announcement" | "resource" | "question" | "proof" | "excuse" | "report" | string;
  title?: string;
  subjectCode?: string;
  subtitle?: string;
  professorName?: string;
  version?: string | number;
  date?: string;
  present?: string | number;
  absent?: string | number;
  excused?: string | number;
  notSet?: string | number;
  totalStudents?: string | number;
  tag?: string;
  category?: string;
  sourceDomain?: string;
  format?: string;
  isOfficial?: boolean;
  coverUrl?: string;
}

export function escapeXml(unsafe: string): string {
  return (unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function wrapText(text: string, maxCharsPerLine: number = 32, maxLines: number = 2): string[] {
  if (!text) return [];
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + " " + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + " " + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
      if (lines.length >= maxLines) break;
    }
  }
  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }
  if (lines.length > 0 && words.length > 0) {
    const totalChars = lines.join(" ").length;
    if (totalChars < text.length && lines.length === maxLines) {
      lines[lines.length - 1] = lines[lines.length - 1].replace(/[.,!?;:]*$/, "") + "…";
    }
  }
  return lines;
}

export function generateOgSvg(params: OgParams): string {
  const rawType = (params.type || "subject").toLowerCase();
  let rawTitle = params.title || "supersec Class Management";
  const subjectCode = params.subjectCode ? params.subjectCode.toUpperCase() : "";

  // Clean title to prevent repeating [CODE] or - v1 if subjectCode is already featured
  let cleanTitle = rawTitle;
  if (subjectCode && cleanTitle.startsWith(`[${subjectCode}]`)) {
    cleanTitle = cleanTitle.replace(`[${subjectCode}]`, "").trim();
  }
  if (cleanTitle.match(/\s*-\s*v\d+$/i)) {
    cleanTitle = cleanTitle.replace(/\s*-\s*v\d+$/i, "").trim();
  }

  const titleLines = wrapText(cleanTitle, 30, 2);
  const subtitle = params.subtitle ? escapeXml(params.subtitle) : "";
  const professor = params.professorName ? escapeXml(params.professorName) : "";
  const version = params.version !== undefined && params.version !== "" ? `v${params.version}` : "v1.0";
  const date = params.date ? escapeXml(params.date) : "";
  const category = params.category ? escapeXml(params.category.toUpperCase()) : "";
  const sourceDomain = params.sourceDomain ? escapeXml(params.sourceDomain) : "supersec.mjbalubar.tech";
  const isOfficial = params.isOfficial !== false;

  const present = params.present !== undefined && params.present !== "" ? String(params.present) : "";
  const absent = params.absent !== undefined && params.absent !== "" ? String(params.absent) : "";
  const excused = params.excused !== undefined && params.excused !== "" ? String(params.excused) : "";

  // Color Theme & Badge configuration per type
  let primaryColor = "#f97316"; // supersec orange
  let secondaryColor = "#ea580c";
  let typeLabel = "STUDENT PORTAL";
  let typePillBg = "#2a1508";
  let typePillText = "#fb923c";
  let typePillBorder = "#ea580c";

  if (rawType === "attendance") {
    primaryColor = "#10b981"; // Emerald
    secondaryColor = "#059669";
    typeLabel = "LIVE ATTENDANCE";
    typePillBg = "#063323";
    typePillText = "#34d399";
    typePillBorder = "#10b981";
  } else if (rawType === "announcement" || rawType === "a") {
    primaryColor = "#f59e0b"; // Amber
    secondaryColor = "#d97706";
    typeLabel = "ANNOUNCEMENT";
    typePillBg = "#362006";
    typePillText = "#fbbf24";
    typePillBorder = "#f59e0b";
  } else if (rawType === "resource" || rawType === "r") {
    primaryColor = "#0ea5e9"; // Sky blue
    secondaryColor = "#0284c7";
    typeLabel = category ? `RESOURCE · ${category}` : "RESOURCE";
    typePillBg = "#07283d";
    typePillText = "#38bdf8";
    typePillBorder = "#0ea5e9";
  } else if (rawType === "question" || rawType === "q") {
    primaryColor = "#a855f7"; // Violet
    secondaryColor = "#7c3aed";
    typeLabel = isOfficial ? "OFFICIAL Q&A" : "CLASS FAQ";
    typePillBg = "#2b0f4a";
    typePillText = "#c084fc";
    typePillBorder = "#a855f7";
  } else if (rawType === "proof") {
    primaryColor = "#06b6d4"; // Cyan
    secondaryColor = "#0891b2";
    typeLabel = "ZOOM AI PROOF";
    typePillBg = "#082e3d";
    typePillText = "#22d3ee";
    typePillBorder = "#06b6d4";
  } else if (rawType === "excuse") {
    primaryColor = "#f43f5e"; // Rose
    secondaryColor = "#e11d48";
    typeLabel = "EXCUSE LETTER";
    typePillBg = "#380819";
    typePillText = "#fb7185";
    typePillBorder = "#f43f5e";
  } else if (rawType === "report") {
    primaryColor = "#6366f1"; // Indigo
    secondaryColor = "#4f46e5";
    typeLabel = "SUMMARY REPORT";
    typePillBg = "#1c1847";
    typePillText = "#818cf8";
    typePillBorder = "#6366f1";
  }

  // Render Title SVG lines with proper baseline y=44 and y=102
  const titleSvg = titleLines
    .map(
      (line, index) =>
        `<text x="0" y="${44 + index * 56}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="46" font-weight="900" fill="#ffffff" letter-spacing="-1.2">${escapeXml(line)}</text>`
    )
    .join("\n      ");

  const titleBlockHeight = Math.max(1, titleLines.length) * 56;

  // Metadata Subtitle / Date / Professor info
  let metaItems: string[] = [];
  if (date) metaItems.push(`📅 ${date}`);
  if (professor) metaItems.push(`Prof. ${professor}`);
  if (subtitle && !professor) metaItems.push(subtitle);
  const metaText = metaItems.join("   ·   ");

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Canvas Deep Cosmic Gradient -->
    <linearGradient id="bg-canvas" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#060911"/>
      <stop offset="50%" stop-color="#0a0e1c"/>
      <stop offset="100%" stop-color="#030508"/>
    </linearGradient>

    <!-- Supersec Fire Gradient -->
    <linearGradient id="brand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#ea580c"/>
    </linearGradient>

    <!-- Accent Linear Gradient -->
    <linearGradient id="accent-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>

    <!-- Card Border Stroke Gradient -->
    <linearGradient id="card-border" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#334155" stop-opacity="0.9"/>
      <stop offset="25%" stop-color="${primaryColor}" stop-opacity="0.7"/>
      <stop offset="75%" stop-color="#1e293b" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0.9"/>
    </linearGradient>

    <!-- Ambient Radial Glows -->
    <radialGradient id="glow-top-left" cx="20%" cy="15%" r="60%">
      <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.32"/>
      <stop offset="50%" stop-color="${primaryColor}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow-bottom-right" cx="80%" cy="85%" r="55%">
      <stop offset="0%" stop-color="#6366f1" stop-opacity="0.22"/>
      <stop offset="50%" stop-color="#6366f1" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#6366f1" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow-brand-top" cx="85%" cy="15%" r="45%">
      <stop offset="0%" stop-color="#f97316" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="#f97316" stop-opacity="0"/>
    </radialGradient>

    <!-- Drop Shadow Filter for Glass Card -->
    <filter id="card-shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="24" stdDeviation="32" flood-color="#000000" flood-opacity="0.8"/>
    </filter>

    <!-- Subtle Tech Grid Pattern -->
    <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
      <path d="M 44 0 L 0 0 0 44" fill="none" stroke="#1e293b" stroke-width="0.75" stroke-opacity="0.3"/>
      <circle cx="44" cy="44" r="1.2" fill="#334155" fill-opacity="0.35"/>
    </pattern>
  </defs>

  <!-- Deep Canvas Background -->
  <rect width="1200" height="630" fill="url(#bg-canvas)"/>
  
  <!-- Grid Overlay -->
  <rect width="1200" height="630" fill="url(#grid)"/>

  <!-- Ambient Glows -->
  <circle cx="200" cy="120" r="450" fill="url(#glow-top-left)"/>
  <circle cx="1020" cy="500" r="420" fill="url(#glow-bottom-right)"/>
  <circle cx="980" cy="140" r="320" fill="url(#glow-brand-top)"/>

  <!-- Main Glass Card Container -->
  <rect x="44" y="44" width="1112" height="542" rx="32" fill="#0d121f" fill-opacity="0.90" filter="url(#card-shadow)"/>
  <rect x="44" y="44" width="1112" height="542" rx="32" fill="none" stroke="url(#card-border)" stroke-width="1.75"/>
  <rect x="90" y="44" width="1020" height="3.5" rx="1.75" fill="url(#accent-grad)"/>

  <!-- ================= TOP HEADER BAR ================= -->
  <g transform="translate(84, 84)">
    <!-- Brand Icon -->
    <rect width="48" height="48" rx="14" fill="url(#brand-grad)"/>
    <text x="24" y="32" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="21" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="-1">SS</text>
    
    <!-- Brand Name & Tagline -->
    <text x="64" y="27" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="900" fill="#ffffff" letter-spacing="-0.6">supersec</text>
    <text x="64" y="44" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10.5" font-weight="800" fill="#94a3b8" letter-spacing="2.5">CLASS SECRETARY SYSTEM</text>

    <!-- Header Badges -->
    <!-- Type Pill Badge -->
    <g transform="translate(685, 4)">
      <rect width="215" height="40" rx="20" fill="${typePillBg}" stroke="${typePillBorder}" stroke-width="1.5"/>
      <circle cx="22" cy="20" r="4.5" fill="${primaryColor}"/>
      <text x="120" y="25" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="900" fill="${typePillText}" text-anchor="middle" letter-spacing="1">${escapeXml(typeLabel)}</text>
    </g>

    <!-- Version Badge -->
    <g transform="translate(915, 4)">
      <rect width="90" height="40" rx="20" fill="#1e293b" fill-opacity="0.8" stroke="#334155" stroke-width="1.5"/>
      <text x="45" y="25" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" fill="#e2e8f0" text-anchor="middle">${version.toUpperCase()}</text>
    </g>
  </g>

  <!-- Divider Line -->
  <line x1="84" y1="154" x2="1116" y2="154" stroke="#1e293b" stroke-width="1.25" stroke-opacity="0.8"/>

  <!-- ================= HERO CONTENT SECTION ================= -->
  <g transform="translate(84, 184)">
    <!-- Subject Code Chip -->
    ${
      subjectCode
        ? `<g transform="translate(0, 0)">
      <rect width="${Math.max(115, subjectCode.length * 13 + 38)}" height="34" rx="10" fill="${primaryColor}" fill-opacity="0.16" stroke="${primaryColor}" stroke-opacity="0.6" stroke-width="1.5"/>
      <circle cx="18" cy="17" r="4" fill="${primaryColor}"/>
      <text x="${Math.max(57, (subjectCode.length * 13 + 38) / 2 + 7)}" y="22" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="0.5">${subjectCode}</text>
    </g>`
        : ""
    }

    <!-- Main Title with 24px vertical clearance below chip -->
    <g transform="translate(0, ${subjectCode ? 46 : 8})">
      ${titleSvg}
    </g>

    <!-- Subtitle Line with 20px clearance below title -->
    ${
      metaText
        ? `<g transform="translate(0, ${subjectCode ? 58 + titleBlockHeight : 20 + titleBlockHeight})">
      <text x="0" y="20" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="600" fill="#94a3b8" letter-spacing="-0.2">${metaText}</text>
    </g>`
        : ""
    }
  </g>

  <!-- ================= BOTTOM STATS & FEATURE DASHBOARD ================= -->
  <g transform="translate(84, 460)">
    ${
      rawType === "attendance" && present !== ""
        ? `<!-- Attendance 3-Tile Metrics Dashboard -->
    <g transform="translate(0, 0)">
      <!-- Present Card -->
      <g transform="translate(0, 0)">
        <rect width="215" height="74" rx="18" fill="#064e3b" fill-opacity="0.65" stroke="#10b981" stroke-width="1.75"/>
        <text x="24" y="50" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="38" font-weight="900" fill="#34d399">${present}</text>
        <text x="86" y="36" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="900" fill="#6ee7b7" letter-spacing="1">PRESENT</text>
        <text x="86" y="53" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#a7f3d0">Verified In-Class</text>
      </g>

      <!-- Absent Card -->
      <g transform="translate(235, 0)">
        <rect width="215" height="74" rx="18" fill="#450a0a" fill-opacity="0.65" stroke="#ef4444" stroke-width="1.75"/>
        <text x="24" y="50" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="38" font-weight="900" fill="#f87171">${absent}</text>
        <text x="86" y="36" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="900" fill="#fca5a5" letter-spacing="1">ABSENT</text>
        <text x="86" y="53" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#fecaca">Unexcused</text>
      </g>

      <!-- Excused Card -->
      <g transform="translate(470, 0)">
        <rect width="215" height="74" rx="18" fill="#082f49" fill-opacity="0.65" stroke="#0ea5e9" stroke-width="1.75"/>
        <text x="24" y="50" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="38" font-weight="900" fill="#38bdf8">${excused}</text>
        <text x="78" y="36" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="900" fill="#7dd3fc" letter-spacing="1">EXCUSED</text>
        <text x="78" y="53" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#bae6fd">Letter Filed</text>
      </g>

      <!-- Right Side Status Badge -->
      <g transform="translate(735, 12)">
        <rect width="295" height="50" rx="15" fill="#1e293b" fill-opacity="0.75" stroke="#334155" stroke-width="1.5"/>
        <circle cx="24" cy="25" r="5" fill="#10b981"/>
        <text x="42" y="30" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13.5" font-weight="800" fill="#cbd5e1">Official Roll Call Completed</text>
      </g>
    </g>`
        : rawType === "subject"
        ? `<!-- Subject Portal 4-Feature Cards -->
    <g transform="translate(0, 8)">
      <g transform="translate(0, 0)">
        <rect width="230" height="60" rx="16" fill="#1e293b" fill-opacity="0.75" stroke="#f97316" stroke-opacity="0.6" stroke-width="1.5"/>
        <text x="20" y="37" font-size="20">📢</text>
        <text x="52" y="29" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" fill="#f8fafc">Announcements</text>
        <text x="52" y="46" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#94a3b8">Instant class updates</text>
      </g>

      <g transform="translate(250, 0)">
        <rect width="230" height="60" rx="16" fill="#1e293b" fill-opacity="0.75" stroke="#0ea5e9" stroke-opacity="0.6" stroke-width="1.5"/>
        <text x="20" y="37" font-size="20">📁</text>
        <text x="52" y="29" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" fill="#f8fafc">Course Files</text>
        <text x="52" y="46" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#94a3b8">Lecture PDFs &amp; Slides</text>
      </g>

      <g transform="translate(500, 0)">
        <rect width="230" height="60" rx="16" fill="#1e293b" fill-opacity="0.75" stroke="#10b981" stroke-opacity="0.6" stroke-width="1.5"/>
        <text x="20" y="37" font-size="20">📋</text>
        <text x="52" y="29" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" fill="#f8fafc">Attendance Logs</text>
        <text x="52" y="46" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#94a3b8">Live roll call sessions</text>
      </g>

      <g transform="translate(750, 0)">
        <rect width="280" height="60" rx="16" fill="#1e293b" fill-opacity="0.75" stroke="#a855f7" stroke-opacity="0.6" stroke-width="1.5"/>
        <text x="20" y="37" font-size="20">💡</text>
        <text x="52" y="29" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" fill="#f8fafc">Q&amp;A Knowledgebase</text>
        <text x="52" y="46" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#94a3b8">Search verified FAQs</text>
      </g>
    </g>`
        : rawType === "question"
        ? `<!-- Q&A Feature Bar -->
    <g transform="translate(0, 8)">
      <rect width="640" height="60" rx="16" fill="#2b0f4a" fill-opacity="0.65" stroke="#a855f7" stroke-width="1.75"/>
      <text x="24" y="38" font-size="22">🔍</text>
      <text x="58" y="29" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="900" fill="#e9d5ff">Search Verified Subject Questions &amp; Official Answers</text>
      <text x="58" y="48" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11.5" font-weight="700" fill="#c084fc">Peer and Professor verified class guidance</text>

      <g transform="translate(660, 0)">
        <rect width="370" height="60" rx="16" fill="#1e293b" fill-opacity="0.75" stroke="#334155" stroke-width="1.5"/>
        <text x="24" y="37" font-size="20">✓</text>
        <text x="54" y="36" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13.5" font-weight="800" fill="#cbd5e1">Secretary Approved Knowledge</text>
      </g>
    </g>`
        : rawType === "proof"
        ? `<!-- Proof Feature Bar -->
    <g transform="translate(0, 8)">
      <rect width="520" height="60" rx="16" fill="#082e3d" fill-opacity="0.65" stroke="#06b6d4" stroke-width="1.75"/>
      <text x="24" y="38" font-size="22">⚡</text>
      <text x="58" y="29" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="900" fill="#cffafe">Instant AI Zoom Screenshot Verification</text>
      <text x="58" y="48" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11.5" font-weight="700" fill="#67e8f9">Computer Vision Roster Matching</text>

      <g transform="translate(540, 0)">
        <rect width="490" height="60" rx="16" fill="#1e293b" fill-opacity="0.75" stroke="#334155" stroke-width="1.5"/>
        <text x="24" y="37" font-size="20">🛡️</text>
        <text x="54" y="36" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13.5" font-weight="800" fill="#cbd5e1">Auto-Updates Attendance to Present</text>
      </g>
    </g>`
        : rawType === "excuse"
        ? `<!-- Excuse Feature Bar -->
    <g transform="translate(0, 8)">
      <rect width="520" height="60" rx="16" fill="#380819" fill-opacity="0.65" stroke="#f43f5e" stroke-width="1.75"/>
      <text x="24" y="38" font-size="22">✉️</text>
      <text x="58" y="29" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="900" fill="#ffe4e6">Official Absence Excuse Intake</text>
      <text x="58" y="48" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11.5" font-weight="700" fill="#fda4af">Upload letters &amp; medical certificates</text>

      <g transform="translate(540, 0)">
        <rect width="490" height="60" rx="16" fill="#1e293b" fill-opacity="0.75" stroke="#334155" stroke-width="1.5"/>
        <text x="24" y="37" font-size="20">⏳</text>
        <text x="54" y="36" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13.5" font-weight="800" fill="#cbd5e1">Secretary Review &amp; Excused Status</text>
      </g>
    </g>`
        : `<!-- General Official Verification Banner -->
    <g transform="translate(0, 12)">
      <rect width="520" height="52" rx="15" fill="#1e293b" fill-opacity="0.75" stroke="#334155" stroke-width="1.5"/>
      <circle cx="24" cy="26" r="5" fill="#10b981"/>
      <text x="42" y="31" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13.5" font-weight="800" fill="#e2e8f0">Official &amp; Verified Class Secretary Portal</text>

      <g transform="translate(540, 0)">
        <rect width="490" height="52" rx="15" fill="#1e293b" fill-opacity="0.5" stroke="#1e293b" stroke-width="1.5"/>
        <text x="24" y="31" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" fill="#64748b">Direct Student Access · Instant Live Sync</text>
      </g>
    </g>`
    }
  </g>

  <!-- Bottom Brand Watermark -->
  <text x="1100" y="562" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#475569" text-anchor="end" letter-spacing="1">supersec.mjbalubar.tech</text>
</svg>`;
}

export function generateOgDataUrl(params: OgParams): string {
  const svg = generateOgSvg(params);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
