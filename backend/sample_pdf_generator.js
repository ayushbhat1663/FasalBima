const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const outputPath = path.join(__dirname, 'sample_claim_report.pdf');
const doc = new PDFDocument({ autoFirstPage: false, size: 'A4', margin: 50 });
const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

// ═══════════════════════════════════════════════════════════════
// DIAGNOSTIC LOGGING SYSTEM
// ═══════════════════════════════════════════════════════════════
const diagnostics = [];
const diagnosticsPath = path.join(__dirname, 'pdf_diagnostics.log');

// Clear previous log file
try { fs.unlinkSync(diagnosticsPath); } catch (e) {}

function logDiagnostic(event, details) {
  const log = {
    timestamp: new Date().toISOString(),
    event,
    page: doc.page ? doc.page.number : 'N/A',
    y: doc.page ? doc.y : 'N/A',
    pageHeight: doc.page ? doc.page.height : 'N/A',
    details
  };
  diagnostics.push(log);
  
  // Write immediately to file
  try {
    const pageStr = String(log.page).padEnd(3);
    const eventStr = event.padEnd(30);
    const yStr = (typeof log.y === 'number' ? log.y.toFixed(2) : String(log.y)).padEnd(10);
    const line = `[${pageStr}] ${eventStr} Y: ${yStr} | ${details}\n`;
    fs.appendFileSync(diagnosticsPath, line, 'utf8');
  } catch (e) {
    // Silent fail
  }
  
  // Log to console
  console.log(`[${log.page}] ${event.padEnd(25)} Y: ${(typeof log.y === 'number' ? log.y.toFixed(2) : String(log.y)).padEnd(8)} | ${details}`);
}

function logMoveDownCall(amount, caller) {
  logDiagnostic('MOVEDOWN', `Amount: ${amount}`);
}

function logPageBreak(reason) {
  logDiagnostic('PAGE_BREAK', `Reason: ${reason}`);
}

function logYModification(oldY, newY, reason) {
  logDiagnostic('Y_MODIFICATION', `${oldY.toFixed(2)} → ${newY.toFixed(2)}, Reason: ${reason}`);
}

// Override moveDown to track calls
const originalMoveDown = doc.moveDown.bind(doc);
doc.moveDown = function(amount = 1) {
  if (amount >= 3) {
    logMoveDownCall(amount, new Error().stack.split('\n')[2]);
  }
  return originalMoveDown(amount);
};

// Override addPage to track calls
const originalAddPage = doc.addPage.bind(doc);
doc.addPage = function(options) {
  logPageBreak('addPage() called');
  return originalAddPage(options);
};

const data = {
  claim_id: 'FB-2026-0142',
  verification_code: 'A1B2C3D4',
  claim_status: 'Pending Verification',
  verification: 'Verified',
  risk_level: 'Moderate',
  inspection_status: 'Pending Verification',
  damage_percent: '45',
  fraud_status: 'Low Risk',
  claim_type: 'Crop Damage Insurance',
  damage_cause: 'Heat Stress',
  damage_severity: 'Moderate',
  estimated_damage: '45',
  ai_confidence: '85%',
  crop_name: 'Wheat',
  farmer_name: 'Rajesh Kumar',
  father_name: 'Suresh Kumar',
  contact_number: '+91 98765 43210',
  address: 'Village Kisanpur, Block B',
  district: 'Ludhiana',
  state: 'Punjab',
  aadhaar_id: '1234-5678-9012',
  farm_area: '2.5 acres',
  registration_date: '22 May 2026',
  analysis_summary: 'The uploaded crop evidence was processed through the FasalBima AI Verification Engine. The system identified visible environmental stress indicators associated with crop dehydration, discoloration, and moderate agricultural damage patterns.',
  weather_match: 'Positive',
  flood_evidence: 'Not Detected',
  crop_condition: 'Partially Damaged',
  disease: 'General Crop Stress',
  gps_verified: true,
  image_metadata_verified: true,
  capture_timestamp_verified: true,
  device_authenticated: true,
  weather_validated: true,
};

const reportSubtitle = 'AI-Powered Agricultural Insurance Verification System';

function drawHeader(pageTitle) {
  logDiagnostic('SECTION_START', `drawHeader - "${pageTitle || 'no title'}"`);
  const yBefore = doc.y;
  
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#1f4f2c').text('🌾 FASALBIMA', 50, 45, { continued: true });
  doc.font('Helvetica').fontSize(9).fillColor('#4f5d48').text(`  ${reportSubtitle}`, { continued: false });
  doc.font('Helvetica').fontSize(8).fillColor('#444').text(`Claim ID: ${data.claim_id}`, 400, 45, { align: 'right' });
  doc.text(`Generated Date: ${data.registration_date}`, 400, 58, { align: 'right' });
  doc.text(`Verification Code: ${data.verification_code}`, 400, 71, { align: 'right' });
  if (pageTitle) {
    doc.moveDown(1.3);
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#1f4f2c').text(pageTitle, 50, 95);
  }
  doc.moveTo(50, 108).lineTo(545, 108).stroke('#d1d5c4');
  doc.moveDown(2);
  
  logDiagnostic('SECTION_END', `drawHeader - Y moved from ${yBefore.toFixed(2)} to ${doc.y.toFixed(2)}`);
}

function drawFooter() {
  const bottom = doc.page.height - 40;
  doc.font('Helvetica').fontSize(8).fillColor('#6e6e6e').text('FasalBima AI Verification System', 50, bottom, { width: 300 });
  doc.text(`Page ${doc.page.number}`, 50, bottom, { align: 'right', width: 495 });
  doc.fontSize(7).fillColor('#7a7a7a').text('“Protecting Farmers Through Intelligent Insurance Verification”', 50, bottom + 10, { width: 495, align: 'center' });
}

function addWatermark() {
  doc.save();
  doc.fillColor('#d3d3d3').opacity(0.12).font('Helvetica-Bold').fontSize(60);
  doc.translate(doc.page.width / 2 - 120, doc.page.height / 2);
  doc.rotate(-45);
  doc.text('FASALBIMA VERIFIED', 0, 0, { align: 'center' });
  doc.restore();
  doc.opacity(1);
}

function startPage(title, subtitle) {
  logDiagnostic('PAGE_START', `Title: "${title}"`);
  doc.addPage();
  logDiagnostic('PAGE_ADDED', `New page: ${doc.page.number}, Y: ${doc.y.toFixed(2)}`);
  
  drawHeader(title);
  addWatermark();
  
  if (subtitle) {
    logDiagnostic('SUBTITLE_START', `"${subtitle}"`);
    doc.font('Helvetica').fontSize(9).fillColor('#5a5a5a').text(subtitle);
    doc.moveDown(1);
    logDiagnostic('SUBTITLE_END', `Y: ${doc.y.toFixed(2)}`);
  }
  
  logDiagnostic('PAGE_START_END', `Page ${doc.page.number} initialized, Y: ${doc.y.toFixed(2)}`);
}

function renderTable(rows, yStart) {
  logDiagnostic('TABLE_START', `Table with ${rows.length} rows at Y: ${yStart.toFixed(2)}`);
  
  const x = 50;
  const tableWidth = 495;
  const col1 = 180;
  const col2 = tableWidth - col1;
  let y = yStart;
  const rowHeight = 22;

  rows.forEach((row, idx) => {
    const fill = idx === 0 ? '#f2f0e7' : null;
    if (fill) {
      doc.rect(x, y, tableWidth, rowHeight).fill(fill);
    }
    doc.lineWidth(0.5).strokeColor('#c7c7c7').rect(x, y, tableWidth, rowHeight).stroke();
    doc.fillColor(idx === 0 ? '#1f4f2c' : '#333').font(idx === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(10);
    doc.text(row[0], x + 10, y + 6, { width: col1 - 16 });
    doc.text(row[1], x + col1 + 10, y + 6, { width: col2 - 16 });
    y += rowHeight;
  });
  
  const finalY = y + 4;
  logDiagnostic('TABLE_END', `Table finished at Y: ${finalY.toFixed(2)} (added +4 gap)`);
  return finalY;
}

function sectionTitle(text) {
  logDiagnostic('SECTION_TITLE_START', `"${text}"`);
  const yBefore = doc.y;
  
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#1f4f2c').text(text);
  doc.moveDown(0.3);
  doc.lineWidth(1).strokeColor('#d1d5c4').moveTo(doc.x, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(1);
  
  logDiagnostic('SECTION_TITLE_END', `Y moved from ${yBefore.toFixed(2)} to ${doc.y.toFixed(2)}`);
}

function sectionBox(title, lines) {
  logDiagnostic('SECTION_BOX_START', `"${title}" with ${lines.length} lines`);
  const yStart = doc.y;
  const boxHeight = 16 + lines.length * 18;
  
  doc.roundedRect(48, yStart - 4, 499, boxHeight, 6).stroke('#c7c7c7');
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1f4f2c').text(title, 55, yStart);
  doc.moveDown(0.7);
  doc.font('Helvetica').fontSize(10).fillColor('#333');
  lines.forEach((line, idx) => {
    logDiagnostic('BOX_LINE', `Line ${idx + 1}: "${line}"`);
    doc.text(`• ${line}`, { indent: 10, lineGap: 3 });
  });
  doc.moveDown(1.2);
  
  logDiagnostic('SECTION_BOX_END', `Box height: ${boxHeight}, Y now: ${doc.y.toFixed(2)}`);
}

// Page 1 — COVER PAGE DESIGN
logDiagnostic('PAGE_1_START', 'COVER PAGE');
startPage('AGRICULTURAL CROP DAMAGE CLAIM ASSESSMENT REPORT', 'Official AI-Assisted Field Verification & Insurance Inspection Document');
doc.moveDown(0.5);
doc.font('Helvetica-Bold').fontSize(11).fillColor('#1f4f2c').text('Prepared By:', { continued: true });
doc.font('Helvetica').fontSize(11).fillColor('#333').text(' FasalBima Smart Insurance Platform');
doc.moveDown(0.8);
doc.font('Helvetica-Bold').fontSize(10).fillColor('#4f5d48').text('Claim Classification:', { continued: true });
doc.font('Helvetica').fontSize(10).fillColor('#333').text(' CONFIDENTIAL FIELD INSPECTION DOCUMENT');
doc.roundedRect(350, 150, 195, 150, 8).fill('#f7f3e8').stroke('#d1d5c4');
doc.fillColor('#1f4f2c').font('Helvetica-Bold').fontSize(10).text('Claim ID:', 360, 166);
doc.font('Helvetica').fontSize(10).fillColor('#333').text(data.claim_id, 460, 166);
doc.font('Helvetica-Bold').fontSize(10).fillColor('#1f4f2c').text('Generated Date:', 360, 184);
doc.font('Helvetica').fontSize(10).fillColor('#333').text(data.registration_date, 460, 184);
doc.font('Helvetica-Bold').fontSize(10).fillColor('#1f4f2c').text('Verification Code:', 360, 202);
doc.font('Helvetica').fontSize(10).fillColor('#333').text(data.verification_code, 460, 202);
doc.font('Helvetica-Bold').fontSize(10).fillColor('#1f4f2c').text('Risk Level:', 360, 220);
doc.font('Helvetica').fontSize(10).fillColor('#333').text(data.risk_level, 460, 220);
doc.font('Helvetica-Bold').fontSize(10).fillColor('#1f4f2c').text('Inspection Status:', 360, 238);
doc.font('Helvetica').fontSize(10).fillColor('#333').text(data.inspection_status, 460, 238);
doc.font('Helvetica').fontSize(11).fillColor('#333').text('This document has been automatically generated by the FasalBima AI-Assisted Agricultural Insurance Verification System for field-level crop damage assessment and insurance inspection purposes.', 50, 190, { width: 280, align: 'justify', lineGap: 4 });

logDiagnostic('PAGE_1_BEFORE_MOVEDOWN_3', `Y: ${doc.y.toFixed(2)} - About to call moveDown(3)`);
doc.moveDown(0.8);
logDiagnostic('PAGE_1_AFTER_MOVEDOWN_3', `Y: ${doc.y.toFixed(2)}`);

sectionBox('This report contains:', [
  'AI Damage Assessment',
  'Metadata Validation',
  'GPS Verification',
  'Weather Cross-Validation',
  'Fraud Detection Review',
  'Field Inspection Guidelines',
  'Farmer Declaration',
  'Insurance Terms & Conditions'
]);

logDiagnostic('PAGE_1_BEFORE_CONFIDENTIAL_BOX', `Y: ${doc.y.toFixed(2)}`);
doc.roundedRect(50, doc.y, 495, 110, 8).fill('#fff3df').stroke('#e4d7b3');
doc.fillColor('#b55d00').font('Helvetica-Bold').fontSize(11).text('⚠ CONFIDENTIAL NOTICE', 55, doc.y + 10);
doc.font('Helvetica').fontSize(9).fillColor('#333').text('This document is intended only for authorized agricultural insurance officers, verification agents, and regulatory authorities associated with FasalBima Crop Insurance Services.', 55, doc.y + 32, { width: 470, align: 'justify', lineGap: 4 });

logDiagnostic('PAGE_1_BEFORE_MOVEDOWN_4.5', `Y: ${doc.y.toFixed(2)} - About to call moveDown(4.5) [CRITICAL]`);
doc.moveDown(1);
logDiagnostic('PAGE_1_AFTER_MOVEDOWN_4.5', `Y: ${doc.y.toFixed(2)} [CRITICAL CHECKPOINT]`);

doc.font('Helvetica').fontSize(9).fillColor('#333').text('Unauthorized distribution, tampering, duplication, or misuse of this document may result in legal and administrative action.', { width: 470, align: 'justify', lineGap: 4 });
drawFooter();
logDiagnostic('PAGE_1_END', `Y: ${doc.y.toFixed(2)}`);

doc.addPage();
logDiagnostic('CONTINUOUS_FLOW', 'Starting continuous document flow after cover page');

// Page 2 — FARMER & CLAIM DETAILS
logDiagnostic('PAGE_2_START', 'FARMER REGISTRATION & CLAIM INFORMATION');
const farmerRows = [
  ['FIELD', 'INFORMATION'],
  ['Farmer Name', data.farmer_name],
  ['Father/Guardian Name', data.father_name],
  ['Contact Number', data.contact_number],
  ['Address', data.address],
  ['District', data.district],
  ['State', data.state],
  ['Aadhaar/ID Reference', data.aadhaar_id],
  ['Registered Crop', data.crop_name],
  ['Farm Area', data.farm_area],
  ['Registration Date', data.registration_date]
];

logDiagnostic('PAGE_2_FARMER_TABLE_START', `Y before: ${doc.y.toFixed(2)}`);
doc.y = renderTable(farmerRows, doc.y);
logDiagnostic('PAGE_2_FARMER_TABLE_END', `Y after: ${doc.y.toFixed(2)}`);

const claimRows = [
  ['CLAIM FIELD', 'INFORMATION'],
  ['Claim ID', data.claim_id],
  ['Claim Type', data.claim_type],
  ['Reported Damage Cause', data.damage_cause],
  ['Damage Severity', data.damage_severity],
  ['Estimated Damage', `${data.estimated_damage}%`],
  ['AI Verification Status', data.verification],
  ['Fraud Detection Status', data.fraud_status],
  ['Inspection Requirement', 'Manual Field Verification']
];

logDiagnostic('PAGE_2_CLAIM_CHECK', `Before claim table: Y: ${doc.y.toFixed(2)}, Rows: ${claimRows.length}`);
logDiagnostic('PAGE_2_CLAIM_CHECK', `Space needed: ${(22 * claimRows.length).toFixed(2)} + buffer. Threshold: 780`);
logDiagnostic('PAGE_2_CLAIM_CHECK', `Calculation: ${doc.y.toFixed(2)} + ${(22 * claimRows.length).toFixed(2)} = ${(doc.y + 22 * claimRows.length).toFixed(2)}`);

if (doc.y + 22 * claimRows.length > 780) { 
  logDiagnostic('PAGE_2_CONDITIONAL_BREAK', 'TRIGGERED - Adding new page for claim table');
  doc.addPage();
} else {
  logDiagnostic('PAGE_2_CONDITIONAL_BREAK', 'Not triggered');
}

logDiagnostic('PAGE_2_CLAIM_TABLE_START', `Y before: ${doc.y.toFixed(2)}`);
doc.y = renderTable(claimRows, doc.y);
logDiagnostic('PAGE_2_CLAIM_TABLE_END', `Y after: ${doc.y.toFixed(2)}`);

const locationRows = [
  ['VERIFICATION TYPE', 'RESULT'],
  ['GPS Coordinates', 'Verified'],
  ['Image Metadata', 'Verified'],
  ['Capture Timestamp', 'Verified'],
  ['Device Authentication', 'Verified'],
  ['Weather Validation', 'Verified'],
  ['AI Confidence Score', data.ai_confidence]
];

logDiagnostic('PAGE_2_LOCATION_CHECK', `Before location table: Y: ${doc.y.toFixed(2)}, Rows: ${locationRows.length}`);
logDiagnostic('PAGE_2_LOCATION_CHECK', `Calculation: ${doc.y.toFixed(2)} + ${(22 * locationRows.length).toFixed(2)} = ${(doc.y + 22 * locationRows.length).toFixed(2)}`);

if (doc.y + 22 * locationRows.length > 780) { 
  logDiagnostic('PAGE_2_LOCATION_BREAK', 'TRIGGERED - Adding new page for location table');
  doc.addPage();
} else {
  logDiagnostic('PAGE_2_LOCATION_BREAK', 'Not triggered');
}

logDiagnostic('PAGE_2_LOCATION_TABLE_START', `Y before: ${doc.y.toFixed(2)}`);
doc.y = renderTable(locationRows, doc.y);
logDiagnostic('PAGE_2_LOCATION_TABLE_END', `Y after: ${doc.y.toFixed(2)}`);

doc.font('Helvetica-Bold').fontSize(10).fillColor('#1f4f2c').text('Evidence Label:');
doc.font('Helvetica').fontSize(10).fillColor('#333').text('Environmental Stress Indicators Detected', 140, doc.y - 13);
logDiagnostic('PAGE_2_END', `Y: ${doc.y.toFixed(2)}`);

// Page 3 — AI DAMAGE ANALYSIS REPORT
logDiagnostic('PAGE_3_START', 'AI DAMAGE ASSESSMENT & ENVIRONMENTAL ANALYSIS');
doc.font('Helvetica-Bold').fontSize(10).fillColor('#1f4f2c').text('AI ANALYSIS SUMMARY:');
doc.moveDown(0.3);
doc.font('Helvetica').fontSize(10).fillColor('#333').text(data.analysis_summary, { align: 'justify', lineGap: 4 });
doc.moveDown(0.8);
sectionBox('The analysis included:', [
  'Crop image classification',
  'Disease pattern detection',
  'Metadata verification',
  'GPS validation',
  'Weather cross-analysis',
  'Confidence-based fraud screening'
]);
const analysisRows = [
  ['ANALYSIS CATEGORY', 'RESULT'],
  ['Damage Percentage', `${data.damage_percent}%`],
  ['Severity Level', data.damage_severity],
  ['Crop Condition', data.crop_condition],
  ['Disease Detection', data.disease],
  ['Weather Match', 'Positive'],
  ['Flood Evidence', 'Not Detected'],
  ['Heat Stress Indicators', 'Detected'],
  ['Confidence Score', data.ai_confidence],
  ['Fraud Probability', data.fraud_status]
];

logDiagnostic('PAGE_3_ANALYSIS_CHECK', `Before analysis table: Y: ${doc.y.toFixed(2)}, Rows: ${analysisRows.length}`);
logDiagnostic('PAGE_3_ANALYSIS_CHECK', `Calculation: ${doc.y.toFixed(2)} + ${(22 * analysisRows.length).toFixed(2)} = ${(doc.y + 22 * analysisRows.length).toFixed(2)}, Threshold: 760`);

if (doc.y + 22 * analysisRows.length > 760) { 
  logDiagnostic('PAGE_3_ANALYSIS_BREAK', 'TRIGGERED - Adding new page for analysis table');
  doc.addPage();
} else {
  logDiagnostic('PAGE_3_ANALYSIS_BREAK', 'Not triggered');
}

logDiagnostic('PAGE_3_ANALYSIS_TABLE_START', `Y before: ${doc.y.toFixed(2)}`);
doc.y = renderTable(analysisRows, doc.y);
logDiagnostic('PAGE_3_ANALYSIS_TABLE_END', `Y after: ${doc.y.toFixed(2)}`);

doc.roundedRect(50, doc.y, 495, 90, 8).fill('#f7f7f5').stroke('#d2d2c6');
doc.fillColor('#1f4f2c').font('Helvetica-Bold').fontSize(11).text('STATUS: MANUAL FIELD REVIEW REQUIRED', 55, doc.y + 10);
doc.font('Helvetica').fontSize(10).fillColor('#333').text('Reason:', 55, doc.y + 30);
doc.font('Helvetica').fontSize(10).fillColor('#333').text('The crop exhibits moderate environmental stress indicators. Physical field verification is recommended before final claim approval.', 55, doc.y + 44, { width: 470, align: 'justify', lineGap: 3 });

logDiagnostic('PAGE_3_BEFORE_Y_OVERRIDE', `Y: ${doc.y.toFixed(2)} - About to execute: doc.y += 108 [CRITICAL]`);
doc.y += 24;
logDiagnostic('PAGE_3_AFTER_Y_OVERRIDE', `Y: ${doc.y.toFixed(2)} [MASSIVE JUMP +108 POINTS]`);

sectionTitle('AGENT OBSERVATION NOTES');
const observations = [
  'Verify physical crop condition on-site.',
  'Confirm crop ownership with farmer.',
  'Match field condition with uploaded evidence.',
  'Verify GPS location consistency.',
  'Inspect nearby environmental conditions.',
  'Record additional crop photographs if required.',
  'Verify absence of artificial damage.',
  'Cross-check farmer statement.',
  'Ensure no duplicate insurance activity exists.',
  'Submit final inspection remarks to insurance authority.'
];

logDiagnostic('PAGE_3_OBSERVATIONS_START', `Starting ${observations.length} observation items at Y: ${doc.y.toFixed(2)}`);
observations.forEach((note, idx) => { 
  logDiagnostic(`PAGE_3_OBS_${idx + 1}`, `"${note}" at Y: ${doc.y.toFixed(2)}`);
  doc.font('Helvetica').fontSize(10).fillColor('#333').text(note, { lineGap: 4 }); 
  doc.moveDown(0.2); 
});
logDiagnostic('PAGE_3_OBSERVATIONS_END', `Y after observations: ${doc.y.toFixed(2)}`);

doc.moveDown(0.8);
sectionTitle('OFFICER REMARKS SECTION');
doc.font('Helvetica').fontSize(12).fillColor('#333').text('---', 50); doc.moveDown(1.2); doc.text('---', 50); doc.moveDown(1.2); doc.text('---', 50);
logDiagnostic('PAGE_3_END', `Y: ${doc.y.toFixed(2)}`);

// Page 4 — FIELD INSPECTION FORM
logDiagnostic('PAGE_4_START', 'FIELD INSPECTION & AGENT VERIFICATION FORM');
sectionTitle('FIELD OFFICER CHECKLIST');
const inspectionItems = [
  'Farmer identity verified',
  'Crop ownership verified',
  'Field location matched',
  'Crop damage confirmed',
  'Weather conditions validated',
  'GPS coordinates verified',
  'Evidence images inspected',
  'Additional photographs collected',
  'Fraud indicators absent',
  'Verification code confirmed'
];

logDiagnostic('PAGE_4_CHECKLIST_START', `Starting ${inspectionItems.length} inspection items at Y: ${doc.y.toFixed(2)}`);
inspectionItems.forEach((item, idx) => { 
  logDiagnostic(`PAGE_4_ITEM_${idx + 1}`, `"${item}" at Y: ${doc.y.toFixed(2)}`);
  doc.font('Helvetica').fontSize(10).fillColor('#333').text(`[ ] ${item}`, { lineGap: 6, indent: 10 }); 
});
logDiagnostic('PAGE_4_CHECKLIST_END', `Y after checklist: ${doc.y.toFixed(2)}`);

doc.moveDown(1);
sectionTitle('VERIFICATION CODE CONFIRMATION');
doc.font('Helvetica').fontSize(10).fillColor('#333').text('Farmer Verification Code:'); doc.text('---', 250); doc.moveDown(0.8);
doc.text('Agent Entered Code:'); doc.text('---', 250); doc.moveDown(0.8);
doc.text('Verification Result:'); doc.text('---', 250); doc.moveDown(1.2);
sectionTitle('FIELD INSPECTION NOTES');
doc.roundedRect(50, doc.y, 495, 110, 6).stroke('#c7c7c7');

logDiagnostic('PAGE_4_BEFORE_MOVEDOWN_7.5', `Y: ${doc.y.toFixed(2)} - About to call moveDown(7.5) [LARGE GAP]`);
doc.moveDown(1.5);
logDiagnostic('PAGE_4_AFTER_MOVEDOWN_7.5', `Y: ${doc.y.toFixed(2)} [LARGE JUMP +135 POINTS]`);

doc.font('Helvetica').fontSize(10).fillColor('#1f4f2c').text('SIGNATURE SECTION', { underline: true });
doc.moveDown(0.6);
doc.font('Helvetica').fontSize(10).fillColor('#333').text('Farmer Signature:', 50); doc.text('---', 300); doc.moveDown(1);
doc.text('Inspection Officer Signature:', 50); doc.text('---', 300); doc.moveDown(1);
doc.text('Inspection Date:', 50); doc.text('---', 300); doc.moveDown(1);
doc.text('Regional Supervisor Approval:', 50); doc.text('---', 300);
logDiagnostic('PAGE_4_END', `Y: ${doc.y.toFixed(2)}`);

// Page 5 — TERMS & CONDITIONS
logDiagnostic('PAGE_5_START', 'INSURANCE TERMS, CONDITIONS & LEGAL DECLARATIONS');
const terms = [
  'The farmer agrees that all submitted information is accurate and truthful.',
  'FasalBima reserves the right to reject claims containing misleading or manipulated evidence.',
  'AI-generated assessments are preliminary and subject to physical field verification.',
  'Claims lacking valid GPS metadata may be rejected.',
  'Weather verification data shall be cross-checked using third-party environmental databases.',
  'Any attempt to reuse evidence images across multiple claims may result in permanent claim suspension.',
  'FasalBima may request additional field evidence during the inspection process.',
  'Submission of false environmental damage reports is considered insurance fraud.',
  'Farmers must cooperate fully with field verification officers.',
  'Claims submitted using edited, manipulated, or AI-generated fake evidence are strictly prohibited.',
  'Insurance approval is not guaranteed solely based on AI verification.',
  'Manual inspection findings may override automated assessment results.',
  'Verification codes must remain confidential until physical field verification.',
  'FasalBima reserves the right to archive and audit submitted evidence for future compliance checks.',
  'Any legal disputes shall fall under agricultural insurance compliance regulations.',
  'Farmers authorize temporary storage of uploaded evidence for claim verification purposes.',
  'Weather mismatch detection may automatically trigger manual review procedures.',
  'Insurance authorities may deny claims if evidence does not match real-world field conditions.',
  'GPS spoofing or metadata tampering may result in permanent blacklisting.',
  'By proceeding with this insurance request, the farmer accepts all terms, compliance rules, and verification procedures defined under the FasalBima Agricultural Claim Verification Policy.'
];
terms.slice(0, 11).forEach((term, idx) => { 
  logDiagnostic(`PAGE_5_TERM_${idx + 1}`, `Term ${idx + 1} at Y: ${doc.y.toFixed(2)}`);
  doc.font('Helvetica').fontSize(10).fillColor('#333').text(`${idx + 1}. ${term}`, { paragraphGap: 4, align: 'justify' }); 
  doc.moveDown(0.2); 
});
logDiagnostic('PAGE_5_TERMS_END', `Y after 11 terms: ${doc.y.toFixed(2)}`);
logDiagnostic('PAGE_5_END', `Y: ${doc.y.toFixed(2)}`);

// Page 6 — TERMS & CONDITIONS CONTINUED
logDiagnostic('PAGE_6_START', 'INSURANCE TERMS, CONDITIONS & LEGAL DECLARATIONS (Continued)');
logDiagnostic('PAGE_6_TERMS_START', `Starting ${terms.slice(11).length} remaining terms at Y: ${doc.y.toFixed(2)}`);
terms.slice(11).forEach((term, idx) => { 
  logDiagnostic(`PAGE_6_TERM_${idx + 12}`, `Term ${idx + 12} at Y: ${doc.y.toFixed(2)}`);
  doc.font('Helvetica').fontSize(10).fillColor('#333').text(`${idx + 12}. ${term}`, { paragraphGap: 4, align: 'justify' }); 
  doc.moveDown(0.2); 
});
logDiagnostic('PAGE_6_TERMS_END', `Y after remaining terms: ${doc.y.toFixed(2)}`);
doc.moveDown(1);
doc.font('Helvetica-Bold').fontSize(11).fillColor('#1f4f2c').text('FINAL DECLARATION', { underline: true });
doc.moveDown(0.5);
doc.font('Helvetica').fontSize(10).fillColor('#333').text('I hereby declare that the submitted information and crop evidence are true to the best of my knowledge and are provided solely for agricultural insurance verification purposes.', { align: 'justify', lineGap: 4 });
doc.moveDown(1.2);
doc.text('Farmer Signature:', 50); doc.text('---', 300); doc.moveDown(1);
doc.text('Date:', 50); doc.text('---', 300); doc.moveDown(1.5);
doc.font('Helvetica').fontSize(10).fillColor('#6e6e6e').text('🌾 FASALBIMA', { align: 'center' });
doc.font('Helvetica').fontSize(9).fillColor('#6e6e6e').text('AI-Powered Agricultural Insurance Verification System', { align: 'center' });
doc.moveDown(0.3);
doc.font('Helvetica').fontSize(9).fillColor('#333').text('“Securing Farmers Through Intelligent Verification & Transparent Insurance Processing”', { align: 'center' });
drawFooter();
logDiagnostic('PAGE_6_END', `Y: ${doc.y.toFixed(2)}`);

// FINALIZATION AND DIAGNOSTIC OUTPUT
logDiagnostic('PDF_GENERATION_COMPLETE', 'All pages rendered - Preparing diagnostics');

doc.end();

// Collect and write all diagnostics data synchronously after a delay
const writeDiagnostics = () => {
  try {
    let reportText = 'PDF DIAGNOSTIC REPORT\n';
    reportText += '═════════════════════════════════════════════════════════════\n';
    reportText += `Generated: ${new Date().toISOString()}\n`;
    reportText += `Total Events Captured: ${diagnostics.length}\n\n`;
    
    reportText += 'COMPLETE EVENT LOG:\n';
    reportText += '─────────────────────────────────────────────────────────────\n\n';
    
    diagnostics.forEach((log, idx) => {
      const pageStr = String(log.page).padEnd(3);
      const eventStr = log.event.padEnd(30);
      const yStr = (typeof log.y === 'number' ? log.y.toFixed(2) : String(log.y)).padEnd(10);
      reportText += `[${pageStr}] ${eventStr} Y: ${yStr} | ${log.details}\n`;
    });
    
    reportText += '\n═════════════════════════════════════════════════════════════\n';
    reportText += 'SUMMARY ANALYSIS:\n';
    reportText += '═════════════════════════════════════════════════════════════\n\n';
    
    const largeMoveDowns = diagnostics.filter(d => {
      if (d.event === 'MOVEDOWN') {
        const match = d.details.match(/Amount: ([\d.]+)/);
        return match && parseFloat(match[1]) >= 3;
      }
      return false;
    });
    
    reportText += `1. LARGE moveDown() CALLS (>= 3): ${largeMoveDowns.length}\n`;
    largeMoveDowns.forEach(m => {
      reportText += `   Page ${m.page}: ${m.details}\n`;
    });
    
    const yMods = diagnostics.filter(d => d.event === 'Y_MODIFICATION');
    reportText += `\n2. MANUAL Y MODIFICATIONS: ${yMods.length}\n`;
    yMods.forEach(m => {
      reportText += `   Page ${m.page}: ${m.details}\n`;
    });
    
    const pageBreaks = diagnostics.filter(d => d.event === 'PAGE_BREAK');
    reportText += `\n3. PAGE BREAKS (addPage): ${pageBreaks.length}\n`;
    
    const condBreaks = diagnostics.filter(d => d.event.includes('_BREAK'));
    const triggered = condBreaks.filter(c => c.details.includes('TRIGGERED'));
    reportText += `\n4. CONDITIONAL BREAKS CHECKED: ${condBreaks.length}\n`;
    reportText += `   TRIGGERED: ${triggered.length}\n`;
    triggered.forEach(t => {
      reportText += `   Page ${t.page}: ${t.details}\n`;
    });
    
    reportText += '\n═════════════════════════════════════════════════════════════\n';
    
    fs.writeFileSync(diagnosticsPath, reportText);
    console.log('Diagnostics written successfully to: ' + diagnosticsPath);
  } catch (e) {
    console.error('Error writing diagnostics:', e.message);
  }
};

stream.on('finish', () => {
  console.log('PDF generation finished.');
  writeDiagnostics();
});

// Keep process alive a bit longer to ensure file write completes
process.on('exit', writeDiagnostics);
stream.on('error', (err) => {
  console.error('PDF generation failed:', err);
});
