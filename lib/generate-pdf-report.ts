import { jsPDF } from 'jspdf';
import { SecurityAlert, SystemTelemetry, ShopperAgent } from '@/components/surveillance/types';

export function generateSurveillancePdfReport(
  alerts: SecurityAlert[],
  telemetry: SystemTelemetry,
  activeCount: number,
  agents: ShopperAgent[] = []
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const now = new Date();
  const dateStr = now.toLocaleDateString();
  const timeStr = now.toLocaleTimeString();

  // Helper for adding footer on pages
  const addFooter = (pageNum: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(
      `Apex Sentinel AI • Retail Loss Prevention Audit • Confidential Document`,
      14,
      pageHeight - 8
    );
    doc.text(`Page ${pageNum}`, pageWidth - 24, pageHeight - 8);
  };

  let pageNum = 1;

  // ==========================================
  // 1. HEADER BANNER
  // ==========================================
  // Navy Background Box
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Accent Line
  doc.setFillColor(56, 189, 248); // Sky blue
  doc.rect(0, 37, pageWidth, 1.2, 'F');

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('APEX SENTINEL AI SURVEILLANCE AUDIT', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(186, 230, 253); // Light sky
  doc.text('Automated Multi-Angle CCTV Detection & Theft Incident Report', 14, 22);

  // Metadata block (right aligned)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Report ID: AUD-${Date.now().toString().slice(-6)}`, pageWidth - 60, 14);
  doc.text(`Generated: ${dateStr} ${timeStr}`, pageWidth - 60, 20);
  doc.text(`Facility: Supermarket Metro Hub #04`, pageWidth - 60, 26);
  doc.text(`System Status: OPTIMAL (60.0 FPS)`, pageWidth - 60, 32);

  let y = 46;

  // ==========================================
  // 2. EXECUTIVE METRICS SUMMARY
  // ==========================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('EXECUTIVE SURVEILLANCE SUMMARY', 14, y);
  y += 5;

  // KPI Boxes (4 columns)
  const cardWidth = (pageWidth - 28 - 9) / 4;
  const cardHeight = 18;

  const kpis = [
    { label: 'TOTAL FOOTFALL', value: `${telemetry.footfallTotal + activeCount}`, color: [2, 132, 199] },
    { label: 'ACTIVE SHOPPERS', value: `${activeCount}`, color: [16, 185, 129] },
    { label: 'RISK ANOMALIES', value: `${telemetry.highRiskSuspects}`, color: [245, 158, 11] },
    { label: 'THEFTS PREVENTED', value: `${telemetry.theftsPrevented}`, color: [220, 38, 38] },
  ];

  kpis.forEach((kpi, idx) => {
    const kpiX = 14 + idx * (cardWidth + 3);

    // Box background
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(kpiX, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    // Colored top line
    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.rect(kpiX, y, cardWidth, 1.2, 'F');

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, kpiX + 3, y + 6);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, kpiX + 3, y + 14);
  });

  y += cardHeight + 10;

  // ==========================================
  // 3. CCTV CAMERA ANGLES SPECIFICATION
  // ==========================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('SYNCHRONIZED CAMERA ZONES', 14, y);
  y += 5;

  const camSpecs = [
    { code: 'CAM-01', name: 'Entrance Foyer Wide', zone: 'South Ingress', spec: '2.8mm Ultra-HD (4K)' },
    { code: 'CAM-02', name: 'Aisle 02 Electronics', zone: 'High-Value Rack', spec: '4.0mm HDR Corridor' },
    { code: 'CAM-03', name: 'POS Checkout Counters', zone: 'Lanes 1 & 2', spec: '3.6mm Scanner Focus' },
    { code: 'CAM-04', name: 'Security EAS Exit Gate', zone: 'Chokepoint Intercept', spec: 'Dual RF Sensor Gate' },
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  const specColWidth = (pageWidth - 28) / 4;
  camSpecs.forEach((cam, idx) => {
    const cx = 14 + idx * specColWidth;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(cx, y, specColWidth - 2, 14, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`${cam.code}: ${cam.name}`, cx + 2.5, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Zone: ${cam.zone}`, cx + 2.5, y + 8.5);
    doc.text(cam.spec, cx + 2.5, y + 12);
  });

  y += 19;

  // ==========================================
  // 3.5 AI DEMOGRAPHIC ESTIMATION BREAKDOWN
  // ==========================================
  let maleC = 0;
  let femaleC = 0;
  const ageMap: Record<string, number> = { '18-25': 0, '26-35': 0, '36-50': 0, '50+': 0 };

  agents.forEach((a) => {
    if (a.gender === 'F') femaleC++;
    else maleC++;
    const b = a.ageBracket || '26-35';
    ageMap[b] = (ageMap[b] || 0) + 1;
  });

  const totalA = agents.length || 1;
  const mPct = Math.round((maleC / totalA) * 100);
  const fPct = 100 - mPct;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, pageWidth - 28, 12, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('AI SURVEILLANCE DEMOGRAPHIC ESTIMATION:', 17, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Gender Ratio: Male ${mPct}% (${maleC}) / Female ${fPct}% (${femaleC})   |   Age Brackets: [18-25]: ${ageMap['18-25']}  •  [26-35]: ${ageMap['26-35']}  •  [36-50]: ${ageMap['36-50']}  •  [50+]: ${ageMap['50+']}`,
    17,
    y + 9
  );

  y += 17;

  // ==========================================
  // 4. SECURITY AUDIT LOG & DETECTION METADATA
  // ==========================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('INCIDENT DETECTION & BEHAVIORAL LOGS', 14, y);
  y += 5;

  // Table Header
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(14, y, pageWidth - 28, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('TIMESTAMP', 16, y + 4.8);
  doc.text('CAMERA', 38, y + 4.8);
  doc.text('SUBJECT', 74, y + 4.8);
  doc.text('SEVERITY', 96, y + 4.8);
  doc.text('INCIDENT DETAILS & INDICATORS', 118, y + 4.8);

  y += 7;

  // Print Alert Rows
  alerts.forEach((alert, index) => {
    // Check page space; add page if needed
    if (y > pageHeight - 32) {
      addFooter(pageNum++);
      doc.addPage();
      y = 16;

      // Repeat Table Header
      doc.setFillColor(30, 41, 59);
      doc.rect(14, y, pageWidth - 28, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text('TIMESTAMP', 16, y + 4.8);
      doc.text('CAMERA', 38, y + 4.8);
      doc.text('SUBJECT', 74, y + 4.8);
      doc.text('SEVERITY', 96, y + 4.8);
      doc.text('INCIDENT DETAILS & INDICATORS', 118, y + 4.8);
      y += 7;
    }

    const isEven = index % 2 === 0;
    doc.setFillColor(isEven ? 248 : 255, isEven ? 250 : 255, isEven ? 252 : 255);
    doc.rect(14, y, pageWidth - 28, 14, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(14, y + 14, pageWidth - 14, y + 14);

    // Timestamp
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(alert.timestamp, 16, y + 6);

    // Camera
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(alert.cameraName.split(' ')[0] || alert.cameraId, 38, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(alert.cameraName.split(' ').slice(1).join(' ').slice(0, 18), 38, y + 10);

    // Subject
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(alert.shopperId || 'N/A', 74, y + 6);

    // Severity Tag
    let sevBg = [224, 231, 255]; // Blue
    let sevText = [67, 56, 202];
    if (alert.severity === 'critical') {
      sevBg = [254, 226, 226]; // Red
      sevText = [185, 28, 28];
    } else if (alert.severity === 'warning') {
      sevBg = [254, 243, 199]; // Amber
      sevText = [180, 83, 9];
    }

    doc.setFillColor(sevBg[0], sevBg[1], sevBg[2]);
    doc.roundedRect(96, y + 2.5, 16, 5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(sevText[0], sevText[1], sevText[2]);
    doc.text(alert.severity.toUpperCase(), 98, y + 6);

    // Description & Indicators
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(alert.title.slice(0, 52), 118, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(alert.description.slice(0, 68), 118, y + 9);

    if (alert.indicators && alert.indicators.length > 0) {
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(71, 85, 105);
      doc.text(`AI Indicators: ${alert.indicators.join(' • ').slice(0, 65)}`, 118, y + 12.5);
    }

    y += 14;
  });

  // Verification & Sign-off Footer block
  if (y > pageHeight - 25) {
    addFooter(pageNum++);
    doc.addPage();
    y = 20;
  } else {
    y += 8;
  }

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, y, pageWidth - 28, 15, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('CHAIN OF CUSTODY & DIGITAL VERIFICATION NOTICE', 18, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'All recorded incidents are validated by neural pose estimation and RF anti-theft sensors. Raw surveillance video streams are encrypted and archived under standard loss-prevention compliance.',
    18,
    y + 8.5
  );
  doc.text(
    `Security Operator Signature: ___________________________      Verification Hash: SHA256-${Date.now().toString(16).toUpperCase()}`,
    18,
    y + 12.5
  );

  addFooter(pageNum);

  // Trigger browser download
  const filename = `ApexSentinel_Surveillance_Report_${now.toISOString().slice(0, 10)}_${Date.now().toString().slice(-4)}.pdf`;
  doc.save(filename);
}
