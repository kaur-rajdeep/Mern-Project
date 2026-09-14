const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

async function generateTestCasesExcel() {
  const candidatePaths = [
    path.resolve(__dirname, '../COMPREHENSIVE_SYSTEM_TEST_CASES.md'),
    path.resolve(__dirname, '../../COMPREHENSIVE_SYSTEM_TEST_CASES.md'),
    path.resolve(__dirname, '../../../COMPREHENSIVE_SYSTEM_TEST_CASES.md'),
    path.resolve('c:/xampp/htdocs/public_html2/COMPREHENSIVE_SYSTEM_TEST_CASES.md')
  ];

  let mdPath = candidatePaths.find(p => fs.existsSync(p));
  if (!mdPath) {
    throw new Error('COMPREHENSIVE_SYSTEM_TEST_CASES.md not found in candidate paths');
  }

  const mdContent = fs.readFileSync(mdPath, 'utf8');

  // Parse Markdown Tables
  const lines = mdContent.split('\n');
  let currentModule = '';
  let currentModuleNum = 0;
  const testCases = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Match module header: ## Module 1: Authentication, Authorization & RBAC
    const modMatch = line.match(/^##\s+Module\s+(\d+):\s+(.+)$/i);
    if (modMatch) {
      currentModuleNum = parseInt(modMatch[1], 10);
      currentModule = modMatch[2].trim();
      continue;
    }

    // Match table row: | **AUTH-01** | Super Admin Login | Pre-conditions | Test Steps | Expected Result | Severity |
    if (line.startsWith('|') && !line.includes('Test Case ID') && !line.includes('---')) {
      const cols = line.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
      if (cols.length >= 6) {
        const testId = cols[0].replace(/\*\*/g, '').trim();
        const scenario = cols[1].replace(/\*\*/g, '').trim();
        const preconditions = cols[2].replace(/<br>/g, '\n').replace(/\*\*/g, '').trim();
        const steps = cols[3].replace(/<br>/g, '\n').replace(/\*\*/g, '').trim();
        const expected = cols[4].replace(/<br>/g, '\n').replace(/\*\*/g, '').trim();
        const severity = cols[5].replace(/\*\*/g, '').trim();

        if (testId && scenario) {
          testCases.push({
            moduleNum: currentModuleNum,
            moduleName: currentModule,
            testId,
            scenario,
            preconditions,
            steps,
            expected,
            severity,
            status: 'Pending',
            testerNotes: ''
          });
        }
      }
    }
  }

  console.log(`Parsed ${testCases.length} test cases.`);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Panacea Infosec QA Engineering';
  workbook.created = new Date();
  workbook.modified = new Date();

  // -------------------------------------------------------------
  // Sheet 1: Dashboard & Sign-Off Matrix
  // -------------------------------------------------------------
  const summarySheet = workbook.addWorksheet('Summary & Sign-Off', {
    views: [{ showGridLines: true }]
  });

  // Title block
  summarySheet.mergeCells('A1:G1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = 'Panacea Infosec Compliance Platform — Quality Assurance Test Suite';
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getRow(1).height = 40;

  summarySheet.mergeCells('A2:G2');
  const subtitleCell = summarySheet.getCell('A2');
  subtitleCell.value = `Comprehensive Verification Plan • Total Test Cases: ${testCases.length} • Generated: ${new Date().toLocaleDateString()}`;
  subtitleCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FFCBD5E1' } };
  subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getRow(2).height = 24;

  // Module Breakdown Header
  summarySheet.getCell('A4').value = 'Module Breakdown & Test Distribution';
  summarySheet.getCell('A4').font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF0F172A' } };

  const modHeaderRow = summarySheet.getRow(5);
  modHeaderRow.values = ['Module #', 'Module Name', 'Test Count', 'Critical', 'High', 'Medium', 'Status'];
  modHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  modHeaderRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });
  summarySheet.getRow(5).height = 26;

  // Aggregate by module
  const modulesMap = {};
  testCases.forEach(tc => {
    if (!modulesMap[tc.moduleNum]) {
      modulesMap[tc.moduleNum] = { name: tc.moduleName, count: 0, critical: 0, high: 0, medium: 0 };
    }
    modulesMap[tc.moduleNum].count++;
    const sev = tc.severity.toLowerCase();
    if (sev.includes('critical') || sev.includes('blocker')) modulesMap[tc.moduleNum].critical++;
    else if (sev.includes('high')) modulesMap[tc.moduleNum].high++;
    else modulesMap[tc.moduleNum].medium++;
  });

  let rIdx = 6;
  for (const [mNum, data] of Object.entries(modulesMap)) {
    const row = summarySheet.getRow(rIdx);
    row.values = [
      `Module ${mNum}`,
      data.name,
      data.count,
      data.critical,
      data.high,
      data.medium,
      'Ready for QA'
    ];
    row.font = { name: 'Calibri', size: 10 };
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };

    row.eachCell((cell) => {
      cell.border = { top: { style: 'thin', color: { argb: 'FFE2E8F0' } }, bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }, left: { style: 'thin', color: { argb: 'FFE2E8F0' } }, right: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
    });
    rIdx++;
  }

  // Sign-Off Matrix
  rIdx += 2;
  summarySheet.getCell(`A${rIdx}`).value = 'Role-Based QA Execution Sign-Off Matrix';
  summarySheet.getCell(`A${rIdx}`).font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF0F172A' } };

  rIdx++;
  const signHeaderRow = summarySheet.getRow(rIdx);
  signHeaderRow.values = ['Role / Stakeholder', 'Tester Name', 'Execution Date', 'Status (Pass/Fail)', 'Sign-Off Signature', 'Key Observations'];
  signHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  signHeaderRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });
  summarySheet.getRow(rIdx).height = 26;

  const roles = [
    'Super Administrator',
    'Customer / Client POC',
    'QSA Security Assessor',
    'QA Reviewer / Auditor',
    'Compliance Consultant',
    'Lead Security QA Architect'
  ];

  roles.forEach(role => {
    rIdx++;
    const row = summarySheet.getRow(rIdx);
    row.values = [role, '', '', 'PENDING', '', ''];
    row.font = { name: 'Calibri', size: 10 };
    row.height = 24;
    row.eachCell((cell) => {
      cell.border = { top: { style: 'thin', color: { argb: 'FFE2E8F0' } }, bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }, left: { style: 'thin', color: { argb: 'FFE2E8F0' } }, right: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
    });
  });

  summarySheet.columns = [
    { width: 22 },
    { width: 45 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 22 }
  ];

  // -------------------------------------------------------------
  // Sheet 2: Master Test Suite (All 56 Test Cases)
  // -------------------------------------------------------------
  const masterSheet = workbook.addWorksheet('Master Test Cases', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1, showGridLines: true }]
  });

  const headers = [
    'Module #',
    'Module Category',
    'Test Case ID',
    'Test Scenario',
    'Pre-conditions',
    'Step-by-Step Test Instructions',
    'Expected Result',
    'Severity',
    'Status',
    'Actual Result / Tester Notes'
  ];

  const mHeaderRow = masterSheet.getRow(1);
  mHeaderRow.values = headers;
  mHeaderRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  mHeaderRow.height = 30;

  mHeaderRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });

  testCases.forEach((tc, idx) => {
    const row = masterSheet.addRow([
      `Module ${tc.moduleNum}`,
      tc.moduleName,
      tc.testId,
      tc.scenario,
      tc.preconditions,
      tc.steps,
      tc.expected,
      tc.severity,
      tc.status,
      tc.testerNotes
    ]);

    row.font = { name: 'Calibri', size: 10 };
    row.alignment = { vertical: 'top', wrapText: true };

    // Styling test id
    row.getCell(3).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF3B82F6' } };
    row.getCell(3).alignment = { vertical: 'top', horizontal: 'center' };

    // Severity coloring
    const sevCell = row.getCell(8);
    sevCell.alignment = { vertical: 'top', horizontal: 'center' };
    const sevText = tc.severity.toLowerCase();
    if (sevText.includes('critical') || sevText.includes('blocker')) {
      sevCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      sevCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF991B1B' } };
    } else if (sevText.includes('high')) {
      sevCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEDD5' } };
      sevCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF9A3412' } };
    } else {
      sevCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
      sevCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0369A1' } };
    }

    // Status styling
    const stCell = row.getCell(9);
    stCell.alignment = { vertical: 'top', horizontal: 'center' };
    stCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF64748B' } };

    // Borders & zebra striping
    if (idx % 2 === 1) {
      row.eachCell((cell, colNum) => {
        if (colNum !== 8) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });
    } else {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });
    }
  });

  masterSheet.columns = [
    { width: 13 }, // Module #
    { width: 28 }, // Module Category
    { width: 14 }, // Test Case ID
    { width: 30 }, // Scenario
    { width: 26 }, // Pre-conditions
    { width: 45 }, // Test Steps
    { width: 45 }, // Expected Result
    { width: 15 }, // Severity
    { width: 13 }, // Status
    { width: 28 }  // Notes
  ];

  // -------------------------------------------------------------
  // Sheet 3: Filtered Role Sheets
  // -------------------------------------------------------------
  function createFilteredSheet(sheetName, moduleNums, headerColor) {
    const sheet = workbook.addWorksheet(sheetName, {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1, showGridLines: true }]
    });

    const hRow = sheet.getRow(1);
    hRow.values = headers;
    hRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    hRow.height = 30;

    hRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });

    const filtered = testCases.filter(tc => moduleNums.includes(tc.moduleNum));
    filtered.forEach((tc, idx) => {
      const row = sheet.addRow([
        `Module ${tc.moduleNum}`,
        tc.moduleName,
        tc.testId,
        tc.scenario,
        tc.preconditions,
        tc.steps,
        tc.expected,
        tc.severity,
        tc.status,
        tc.testerNotes
      ]);

      row.font = { name: 'Calibri', size: 10 };
      row.alignment = { vertical: 'top', wrapText: true };
      row.getCell(3).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF3B82F6' } };
      row.getCell(3).alignment = { vertical: 'top', horizontal: 'center' };

      const sevCell = row.getCell(8);
      sevCell.alignment = { vertical: 'top', horizontal: 'center' };
      const sevText = tc.severity.toLowerCase();
      if (sevText.includes('critical') || sevText.includes('blocker')) {
        sevCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        sevCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF991B1B' } };
      } else if (sevText.includes('high')) {
        sevCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEDD5' } };
        sevCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF9A3412' } };
      } else {
        sevCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
        sevCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0369A1' } };
      }

      row.getCell(9).alignment = { vertical: 'top', horizontal: 'center' };
      row.getCell(9).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF64748B' } };

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });
    });

    sheet.columns = [
      { width: 13 },
      { width: 28 },
      { width: 14 },
      { width: 30 },
      { width: 26 },
      { width: 45 },
      { width: 45 },
      { width: 15 },
      { width: 13 },
      { width: 28 }
    ];
  }

  // Create role sheets
  createFilteredSheet('Admin Tests', [1, 2, 3, 4, 5], 'FF1E40AF'); // Navy Blue
  createFilteredSheet('Customer POC Tests', [6], 'FF0284C7'); // Sky Blue
  createFilteredSheet('QSA Assessor Tests', [7], 'FF15803D'); // Emerald Green
  createFilteredSheet('QA Auditor Tests', [8], 'FF6366F1'); // Indigo
  createFilteredSheet('Consultant Tests', [9], 'FFD97706'); // Amber
  createFilteredSheet('Filter & Security Tests', [10, 11], 'FF475569'); // Slate

  // Save Excel file
  const excelOutPath = path.resolve(__dirname, '../../PANACEA_COMPLIANCE_SYSTEM_TEST_CASES.xlsx');
  await workbook.xlsx.writeFile(excelOutPath);
  console.log(`Excel file created successfully at: ${excelOutPath}`);

  // Also create clean CSV
  const csvHeaders = ['"Module Number"','"Module Category"','"Test Case ID"','"Test Scenario"','"Preconditions"','"Test Steps"','"Expected Result"','"Severity"','"Status"','"Tester Notes"'];
  const csvRows = testCases.map(tc => [
    `"Module ${tc.moduleNum}"`,
    `"${tc.moduleName.replace(/"/g, '""')}"`,
    `"${tc.testId}"`,
    `"${tc.scenario.replace(/"/g, '""')}"`,
    `"${tc.preconditions.replace(/"/g, '""')}"`,
    `"${tc.steps.replace(/"/g, '""')}"`,
    `"${tc.expected.replace(/"/g, '""')}"`,
    `"${tc.severity.replace(/"/g, '""')}"`,
    `"${tc.status}"`,
    `"${tc.testerNotes}"`
  ].join(','));

  const csvContent = [csvHeaders.join(','), ...csvRows].join('\r\n');
  const csvOutPath = path.resolve(__dirname, '../../PANACEA_COMPLIANCE_SYSTEM_TEST_CASES.csv');
  fs.writeFileSync(csvOutPath, csvContent, 'utf8');
  console.log(`CSV file created successfully at: ${csvOutPath}`);
}

generateTestCasesExcel().catch(err => {
  console.error('Error creating excel file:', err);
  process.exit(1);
});
