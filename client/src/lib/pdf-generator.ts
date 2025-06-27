import jsPDF from 'jspdf';

function capitalizeWords(str: string) {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

export function generatePDFReport(project: any, estimate: any, options?: { openInNewTab?: boolean; username?: string }) {
  const doc = new jsPDF();
  // Add diagonal watermark
  doc.saveGraphicsState && doc.saveGraphicsState();
  let gState;
  if (doc.setGState) {
    gState = doc.GState && doc.GState({ opacity: 0.08 });
    if (gState) doc.setGState(gState);
    doc.setTextColor(33, 53, 153);
  } else {
    doc.setTextColor(200, 200, 200); // fallback: light gray
  }
  doc.setFontSize(48);
  doc.text('FlacronBuild', 105, 148, { angle: 35, align: 'center' });
  doc.restoreGraphicsState && doc.restoreGraphicsState();
  let y = 20;
  // Title
  doc.setFontSize(22);
  doc.setTextColor(33, 53, 153);
  doc.text('FlacronBuild Cost Estimate Report', 20, y);
  doc.setTextColor(0, 0, 0);
  y += 10;
  doc.setDrawColor(33, 53, 153);
  doc.setLineWidth(1);
  doc.line(20, y, 190, y);
  y += 8;
  doc.setFontSize(12);
  doc.text('Prepared for your project by FlacronBuild, your trusted partner in construction cost estimation.', 20, y);
  y += 12;

  // Executive Summary
  doc.setFontSize(15);
  doc.setTextColor(33, 53, 153);
  doc.text('Executive Summary', 20, y);
  doc.setTextColor(0, 0, 0);
  y += 8;
  doc.setFontSize(12);
  doc.text(
    `This comprehensive report provides a detailed cost estimate for your upcoming project, "${project.name}". Our analysis leverages industry data, regional multipliers, and material specifications to deliver a reliable financial outlook.`,
    20, y, { maxWidth: 170 }
  );
  y += 14;

  // Project Highlights
  y += 4;
  doc.setFontSize(15);
  doc.setTextColor(33, 53, 153);
  doc.text('Project Highlights', 20, y);
  doc.setTextColor(0, 0, 0);
  y += 8;
  doc.setFontSize(12);
  const highlights = [
    `Project Type: ${capitalizeWords(project.type)}`,
    `Location: ${project.location}`,
    `Area: ${project.area.toLocaleString()} ${project.unit}`,
    `Material Tier: ${capitalizeWords(project.materialTier)}`,
    `Timeline: ${capitalizeWords(project.timeline || 'standard')}`
  ];
  highlights.forEach((line, i) => {
    doc.text(`• ${line}`, 28, y + i * 7);
  });
  y += highlights.length * 7 + 6;

  // Cost Analysis
  doc.setFontSize(15);
  doc.setTextColor(33, 53, 153);
  doc.text('Cost Analysis', 20, y);
  doc.setTextColor(0, 0, 0);
  y += 8;
  doc.setFontSize(12);
  doc.text(
    `Our estimate is based on current market rates, regional factors, and your project specifications. Below is a breakdown of the anticipated costs:`,
    20, y, { maxWidth: 170 }
  );
  y += 14;
  const tableX = 35;
  const tableW = 100;
  const amountX = tableX + tableW;
  doc.setFont('helvetica', 'bold');
  doc.text('Category', tableX, y);
  doc.text('Amount', amountX, y, { align: 'right', maxWidth: 40 });
  doc.setFont('helvetica', 'normal');
  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(tableX, y, amountX + 25, y);
  y += 5;
  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };
  const costRows = [
    ['Materials', formatCurrency(estimate.materialsCost)],
    ['Labor', formatCurrency(estimate.laborCost)],
    ['Permits & Fees', formatCurrency(estimate.permitsCost)],
    ['Contingency (7%)', formatCurrency(estimate.contingencyCost)],
    ['Total Estimated Cost', formatCurrency(estimate.totalCost)],
  ];
  costRows.forEach(([label, value], i) => {
    if (label === 'Total Estimated Cost') {
      doc.setFont('helvetica', 'bold');
    }
    doc.text(label, tableX, y + i * 8);
    doc.text(value, amountX, y + i * 8, { align: 'right', maxWidth: 40 });
    if (label === 'Total Estimated Cost') {
      doc.setFont('helvetica', 'normal');
    }
  });
  y += costRows.length * 8 + 8;

  // Regional Insights
  doc.setFontSize(15);
  doc.setTextColor(33, 53, 153);
  doc.text('Regional Insights', 20, y);
  doc.setTextColor(0, 0, 0);
  y += 8;
  doc.setFontSize(12);
  doc.text(
    `A regional multiplier was applied for ${project.location}. `,
    20, y, { maxWidth: 170 }
  );
  y += 8;

  // Recommendations
  doc.setFontSize(15);
  doc.setTextColor(33, 53, 153);
  doc.text('Recommendations', 20, y);
  doc.setTextColor(0, 0, 0);
  y += 8;
  doc.setFontSize(12);
  const recs = [
    'Review this estimate with your project stakeholders.',
    'Consult local contractors for up-to-date quotes.',
    'Consider material and labor market volatility.',
    'Use this report as a baseline for budgeting and planning.'
  ];
  recs.forEach((line, i) => {
    doc.text(`• ${line}`, 28, y + i * 7);
  });
  y += recs.length * 7 + 6;

  // Closing Statement
  doc.setFontSize(12);
  doc.setTextColor(33, 53, 153);
  doc.text('Thank you for choosing FlacronBuild. We are committed to supporting your project every step of the way.', 20, y, { maxWidth: 170 });
  doc.setTextColor(0, 0, 0);
  y += 10;
  
  // Disclaimer
  doc.setFontSize(10);
  doc.text('This report is intended for planning purposes only. Actual costs may vary depending on market conditions, contractor rates, and project specifics.', 20, y, { maxWidth: 170 });
  y += 8;
  
  y += 16;
  // Copyright footer
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text('© FlacronBuild', 105, 295, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  
  // Save or open the PDF
  const safeProject = project.name.replace(/\s+/g, '_');
  const safeUser = options?.username ? options.username.replace(/\s+/g, '_') : '';
  const fileName = safeUser ? `${safeUser}_${safeProject}_FlacronBuild.pdf` : `${safeProject}_FlacronBuild.pdf`;
  if (options && options.openInNewTab) {
    doc.output('dataurlnewwindow');
  } else {
    doc.save(fileName);
  }
}
