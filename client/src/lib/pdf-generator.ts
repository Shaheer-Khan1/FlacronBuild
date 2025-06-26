import jsPDF from 'jspdf';

export function generatePDFReport(project: any, estimate: any) {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.text('FlacronBuild Cost Estimate Report', 20, 30);
  
  // Project Details
  doc.setFontSize(16);
  doc.text('Project Details', 20, 50);
  
  doc.setFontSize(12);
  doc.text(`Project Name: ${project.name}`, 20, 65);
  doc.text(`Project Type: ${project.type}`, 20, 75);
  doc.text(`Location: ${project.location}`, 20, 85);
  doc.text(`Area: ${project.area.toLocaleString()} ${project.unit}`, 20, 95);
  doc.text(`Material Tier: ${project.materialTier}`, 20, 105);
  doc.text(`Timeline: ${project.timeline || 'Standard'}`, 20, 115);
  
  // Cost Breakdown
  doc.setFontSize(16);
  doc.text('Cost Breakdown', 20, 135);
  
  doc.setFontSize(12);
  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };
  
  doc.text(`Materials: ${formatCurrency(estimate.materialsCost)}`, 20, 150);
  doc.text(`Labor: ${formatCurrency(estimate.laborCost)}`, 20, 160);
  doc.text(`Permits & Fees: ${formatCurrency(estimate.permitsCost)}`, 20, 170);
  doc.text(`Contingency (7%): ${formatCurrency(estimate.contingencyCost)}`, 20, 180);
  
  // Total
  doc.setFontSize(16);
  doc.text(`Total Estimated Cost: ${formatCurrency(estimate.totalCost)}`, 20, 200);
  
  // Regional Information
  doc.setFontSize(16);
  doc.text('Regional Information', 20, 220);
  
  doc.setFontSize(12);
  doc.text(`Region Multiplier: ${parseFloat(estimate.regionMultiplier).toFixed(2)}x`, 20, 235);
  const laborVariation = Math.round((parseFloat(estimate.regionMultiplier) - 1) * 100);
  doc.text(`Labor Cost: ${laborVariation > 0 ? '+' : ''}${laborVariation}% vs national average`, 20, 245);
  
  // Disclaimer
  doc.setFontSize(10);
  doc.text('Disclaimer: This estimate is for planning purposes only. Actual costs may vary.', 20, 270);
  doc.text('Accuracy range: ±15%. Please consult with local contractors for detailed quotes.', 20, 280);
  
  // Save the PDF
  doc.save(`${project.name.replace(/\s+/g, '_')}_cost_estimate.pdf`);
}
