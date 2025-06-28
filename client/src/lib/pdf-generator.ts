import jsPDF from 'jspdf';

function capitalizeWords(str: string) {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

export async function generatePDFReport(project: any, estimate: any, options?: { openInNewTab?: boolean; username?: string }) {
  const doc = new jsPDF();
  
  // Get images from localStorage
  const storedFiles = localStorage.getItem("estimation-upload");
  const uploadedFiles = storedFiles ? JSON.parse(storedFiles) : [];
  
  // PAGE 1: BRANDING PAGE
  addBrandingPage(doc);
  
  // PAGE 2: ESTIMATE SUMMARY
  doc.addPage();
  addEstimatePage(doc, project, estimate);
  
  // PAGE 3+: IMAGES (1 per page)
  if (estimate.imageAnalysis && estimate.imageAnalysis.length > 0) {
    addImagePages(doc, estimate.imageAnalysis, uploadedFiles);
  }
  
  // FINAL PAGES: DETAILED REPORT (if available)
  const hasReportData = estimate.executiveSummary || estimate.projectAnalysis || estimate.marketConditions || 
      estimate.riskAssessment || estimate.timelineScheduling || estimate.recommendations || estimate.report ||
      estimate.breakdown?.executiveSummary || estimate.breakdown?.projectAnalysis || estimate.breakdown?.marketConditions ||
      estimate.breakdown?.riskAssessment || estimate.breakdown?.timelineScheduling || estimate.breakdown?.recommendations || estimate.breakdown?.report ||
      (estimate.breakdown && Object.keys(estimate.breakdown).length > 0);
      
  if (hasReportData) {
    doc.addPage();
    addDetailedReport(doc, estimate);
  }
  
  // LAST PAGE: BRANDING PAGE (duplicate of first page)
  doc.addPage();
  addBrandingPage(doc);
  
  // Save or open the PDF
  const safeProject = project.name.replace(/\s+/g, '_');
  const safeUser = options?.username ? options.username.replace(/\s+/g, '_') : '';
  const fileName = safeUser ? `${safeUser}_${safeProject}_FlacronBuild.pdf` : `${safeProject}_FlacronBuild.pdf`;
  
  if (options && options.openInNewTab) {
    doc.output('dataurlnewwindow');
  } else {
    doc.save(fileName);
  }
  
  // Return PDF data for Firestore storage
  return {
    pdfBase64: doc.output('datauristring'), // Base64 data URI for Firestore
    fileName: fileName,
    size: doc.output('blob').size // Size in bytes for validation
  };
}

function addBrandingPage(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // Professional gradient background effect
  doc.setFillColor(20, 33, 61);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Top accent bar
  doc.setFillColor(33, 53, 153);
  doc.rect(0, 0, pageWidth, 20, 'F');
  
  // Bottom accent bar  
  doc.setFillColor(41, 65, 185);
  doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
  
  // Add diagonal watermark
  doc.saveGraphicsState && doc.saveGraphicsState();
  let gState;
  if (doc.setGState) {
    gState = doc.GState && doc.GState({ opacity: 0.08 });
    if (gState) doc.setGState(gState);
    doc.setTextColor(255, 255, 255);
  } else {
    doc.setTextColor(255, 255, 255);
  }
  doc.setFontSize(48);
  doc.text('FlacronBuild', pageWidth/2, pageHeight/2, { angle: 35, align: 'center' });
  doc.restoreGraphicsState && doc.restoreGraphicsState();
  
  // Premium white content area
  const contentX = 20;
  const contentY = 35;
  const contentW = pageWidth - 40;
  const contentH = pageHeight - 70;
  
  doc.setFillColor(255, 255, 255);
  doc.rect(contentX, contentY, contentW, contentH, 'F');
  
  // Company logo/name - premium typography
  doc.setTextColor(20, 33, 61);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.text('FLACRONBUILD', pageWidth/2, 75, { align: 'center' });
  
  // Elegant separator line
  doc.setDrawColor(33, 53, 153);
  doc.setLineWidth(1.5);
  doc.line(pageWidth/2 - 35, 85, pageWidth/2 + 35, 85);
  
  // Professional subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(33, 53, 153);
  doc.text('CONSTRUCTION COST INTELLIGENCE', pageWidth/2, 100, { align: 'center' });
  
  // Premium tagline
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Advanced Analytics • Market Intelligence • Precision Estimates', pageWidth/2, 115, { align: 'center' });
  
  // Professional services section
  const servicesY = 140;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 33, 61);
  doc.text('OUR CORE SERVICES', pageWidth/2, servicesY, { align: 'center' });
  
  // Services list - clean professional layout, centered
  const services = [
    'Real-Time Cost Analysis & Market Data Integration',
    'AI-Powered Estimation with Machine Learning',
    'Comprehensive Project Documentation & Reports', 
    'Advanced Image Analysis & Visual Assessment'
  ];
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  
  services.forEach((service, i) => {
    const serviceY = servicesY + 12 + (i * 15); // Reduced spacing from 20 to 12
    doc.text(service, pageWidth/2, serviceY, { align: 'center' }); // Centered, no bullets
  });
  
  // Value proposition section - moved down to avoid overlap
  const valueY = 210; // Moved down from 190 to give more space
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(33, 53, 153);
  doc.text('TRUSTED BY INDUSTRY LEADERS', pageWidth/2, valueY, { align: 'center' });
  
  // Key metrics in clean rows
  const metrics = [
    { value: '95%', label: 'Accuracy Rate' },
    { value: '10,000+', label: 'Projects Analyzed' },
    { value: '$2B+', label: 'Total Project Value' },
    { value: '500+', label: 'Partner Contractors' }
  ];
  
  // Two rows of metrics - properly centered
  const row1Y = valueY + 15;
  const row2Y = valueY + 35;
  
  // First row - center two metrics with better spacing
  const spacing = 80; // Increase spacing between metrics
  const row1StartX = pageWidth/2 - spacing/2;
  
  for (let i = 0; i < 2; i++) {
    const metric = metrics[i];
    const x = row1StartX + (i * spacing);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(33, 53, 153);
    doc.text(metric.value, x, row1Y, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(metric.label, x, row1Y + 8, { align: 'center' });
  }
  
  // Second row - center two metrics with same spacing
  const row2StartX = pageWidth/2 - spacing/2;
  
  for (let i = 2; i < 4; i++) {
    const metric = metrics[i];
    const x = row2StartX + ((i-2) * spacing);
    
    doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
    doc.setTextColor(33, 53, 153);
    doc.text(metric.value, x, row2Y, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(metric.label, x, row2Y + 8, { align: 'center' });
  }
  
  // Simple copyright footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('© FlacronBuild', pageWidth/2, pageHeight - 8, { align: 'center' });
}

function addEstimatePage(doc: jsPDF, project: any, estimate: any) {
  // Add diagonal watermark
  doc.saveGraphicsState && doc.saveGraphicsState();
  let gState;
  if (doc.setGState) {
    gState = doc.GState && doc.GState({ opacity: 0.08 });
    if (gState) doc.setGState(gState);
    doc.setTextColor(33, 53, 153);
  } else {
    doc.setTextColor(200, 200, 200);
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
    `A regional multiplier was applied for ${project.location}.`,
    20, y, { maxWidth: 170 }
  );
  y += 15;

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
}

function addDetailedReport(doc: jsPDF, estimate: any) {
  // Add diagonal watermark
  doc.saveGraphicsState && doc.saveGraphicsState();
  let gState;
  if (doc.setGState) {
    gState = doc.GState && doc.GState({ opacity: 0.08 });
    if (gState) doc.setGState(gState);
    doc.setTextColor(33, 53, 153);
  } else {
    doc.setTextColor(200, 200, 200);
  }
  doc.setFontSize(48);
  doc.text('FlacronBuild', 105, 148, { angle: 35, align: 'center' });
  doc.restoreGraphicsState && doc.restoreGraphicsState();
  
  let y = 20;
  
  // Title
  doc.setFontSize(18);
  doc.setTextColor(33, 53, 153);
  doc.text('Detailed Project Analysis Report', 20, y);
  doc.setTextColor(0, 0, 0);
  y += 10;
  doc.setDrawColor(33, 53, 153);
  doc.setLineWidth(1);
  doc.line(20, y, 190, y);
  y += 15;
  
  doc.setFontSize(11);
  
  // Helper function to add a section with heading
  const addSection = (title: string, content: string) => {
    console.log(`📄 PDF Debug - Adding section: "${title}"`);
    console.log(`📏 Content length: ${content?.length || 0}`);
    if (content && content.length > 0) {
      console.log(`📝 Content preview: ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}`);
      
      // Check if this content contains imageAnalysis data
      if (content.includes('imageAnalysis') || content.includes('"label":') || content.includes('Status:')) {
        console.log('⚠️ WARNING: This section contains imageAnalysis data!');
      }
    }
    
    if (!content) {
      console.log(`❌ Skipping section "${title}" - no content`);
      return;
    }
    
    // Check if we need a new page for the section title
    if (y > 270) {
      doc.addPage();
      // Add diagonal watermark to new page
      doc.saveGraphicsState && doc.saveGraphicsState();
      let gState;
      if (doc.setGState) {
        gState = doc.GState && doc.GState({ opacity: 0.08 });
        if (gState) doc.setGState(gState);
        doc.setTextColor(33, 53, 153);
      } else {
        doc.setTextColor(200, 200, 200);
      }
      doc.setFontSize(48);
      doc.text('FlacronBuild', 105, 148, { angle: 35, align: 'center' });
      doc.restoreGraphicsState && doc.restoreGraphicsState();
      y = 20;
    }
    
    // Section heading
    doc.setFontSize(14);
    doc.setTextColor(33, 53, 153);
    doc.text(title, 20, y);
    doc.setTextColor(0, 0, 0);
    y += 8;
    
    // Underline for section
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(20, y, 190, y);
    y += 8;
    
    // Parse and format content with basic Markdown support
    const parseMarkdownContent = (text: string) => {
      const lines = text.split('\n');
      
      for (let line of lines) {
        line = line.trim();
        if (!line) {
          y += 3; // Empty line spacing
          continue;
        }
        
        // Handle bold headings **text**
        if (line.startsWith('**') && line.endsWith('**')) {
          const headingText = line.slice(2, -2);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(33, 53, 153);
          
          // Check if we need a new page
          if (y > 275) {
            doc.addPage();
            // Add diagonal watermark to new page
            doc.saveGraphicsState && doc.saveGraphicsState();
            let gState;
            if (doc.setGState) {
              gState = doc.GState && doc.GState({ opacity: 0.08 });
              if (gState) doc.setGState(gState);
              doc.setTextColor(33, 53, 153);
            } else {
              doc.setTextColor(200, 200, 200);
            }
            doc.setFontSize(48);
            doc.text('FlacronBuild', 105, 148, { angle: 35, align: 'center' });
            doc.restoreGraphicsState && doc.restoreGraphicsState();
            y = 20;
          }
          
          const headingLines = doc.splitTextToSize(headingText, 170);
          headingLines.forEach((headingLine: string) => {
            doc.text(headingLine, 20, y);
            y += 6;
          });
          y += 2; // Extra space after heading
          
          // Reset formatting
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(11);
          continue;
        }
        
        // Handle bullet points * text with inline bold support
        if (line.startsWith('* ')) {
          const bulletText = line.slice(2);
          doc.setFontSize(11);
          
          // Check if we need a new page
          if (y > 275) {
            doc.addPage();
            // Add diagonal watermark to new page
            doc.saveGraphicsState && doc.saveGraphicsState();
            let gState;
            if (doc.setGState) {
              gState = doc.GState && doc.GState({ opacity: 0.08 });
              if (gState) doc.setGState(gState);
              doc.setTextColor(33, 53, 153);
            } else {
              doc.setTextColor(200, 200, 200);
            }
            doc.setFontSize(48);
            doc.text('FlacronBuild', 105, 148, { angle: 35, align: 'center' });
            doc.restoreGraphicsState && doc.restoreGraphicsState();
            y = 20;
          }
          
          // Enhanced bullet rendering with proper bold support
          const renderBulletWithFormatting = (text: string) => {
            const bulletPrefix = '• ';
            const maxWidth = 165;
            const indentX = 25;
            const bulletX = indentX;
            const textX = bulletX + doc.getTextWidth(bulletPrefix);
            
            // Split text by bold markers while preserving them
            const parts = text.split(/(\*\*[^*]+\*\*)/);
            let currentLine = '';
            let currentBoldState = false;
            let lines: Array<{text: string, bold: boolean}[]> = [];
            let currentLineSegments: Array<{text: string, bold: boolean}> = [];
            
            for (let part of parts) {
              if (part.startsWith('**') && part.endsWith('**')) {
                // Bold text
                const boldText = part.slice(2, -2);
                if (currentLine.length + boldText.length > 80) { // Rough character limit
                  // Start new line
                  if (currentLineSegments.length > 0) {
                    lines.push([...currentLineSegments]);
                    currentLineSegments = [];
                  }
                  currentLine = boldText;
                } else {
                  currentLine += boldText;
                }
                currentLineSegments.push({text: boldText, bold: true});
              } else if (part.trim()) {
                // Regular text
                const words = part.split(' ');
                for (let word of words) {
                  if (word.trim()) {
                    if (currentLine.length + word.length + 1 > 80) {
                      // Start new line
                      if (currentLineSegments.length > 0) {
                        lines.push([...currentLineSegments]);
                        currentLineSegments = [];
                      }
                      currentLine = word;
                      currentLineSegments.push({text: word + ' ', bold: false});
                    } else {
                      currentLine += (currentLine ? ' ' : '') + word;
                      currentLineSegments.push({text: (currentLine.length > word.length ? ' ' : '') + word, bold: false});
                    }
                  }
                }
              }
            }
            
            // Add remaining segments
            if (currentLineSegments.length > 0) {
              lines.push(currentLineSegments);
            }
            
            // Render the lines
            for (let i = 0; i < lines.length; i++) {
              let currentX = i === 0 ? textX : indentX + 8; // Indent continuation lines
              
              // Add bullet prefix for first line
              if (i === 0) {
                doc.setFont('helvetica', 'normal');
                doc.text(bulletPrefix, bulletX, y);
              }
              
              // Render each segment with appropriate formatting
              for (let segment of lines[i]) {
                if (segment.text.trim()) {
                  doc.setFont('helvetica', segment.bold ? 'bold' : 'normal');
                  doc.text(segment.text, currentX, y);
                  currentX += doc.getTextWidth(segment.text);
                }
              }
              
              y += 5;
            }
            
            // Reset font
            doc.setFont('helvetica', 'normal');
          };
          
          renderBulletWithFormatting(bulletText);
          y += 2; // Space after bullet
          continue;
        }
        
        // Handle regular text with inline bold support
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        
        // Check if we need a new page
        if (y > 275) {
          doc.addPage();
          // Add diagonal watermark to new page
          doc.saveGraphicsState && doc.saveGraphicsState();
          let gState;
          if (doc.setGState) {
            gState = doc.GState && doc.GState({ opacity: 0.08 });
            if (gState) doc.setGState(gState);
            doc.setTextColor(33, 53, 153);
          } else {
            doc.setTextColor(200, 200, 200);
          }
          doc.setFontSize(48);
          doc.text('FlacronBuild', 105, 148, { angle: 35, align: 'center' });
          doc.restoreGraphicsState && doc.restoreGraphicsState();
          y = 20;
        }
        
        // Check if line contains inline bold formatting
        if (line.includes('**')) {
          // Enhanced text rendering with proper bold support
          const renderTextWithFormatting = (text: string) => {
            const maxWidth = 170;
            const textX = 20;
            
            // Split text by bold markers while preserving them
            const parts = text.split(/(\*\*[^*]+\*\*)/);
            let currentLine = '';
            let lines: Array<{text: string, bold: boolean}[]> = [];
            let currentLineSegments: Array<{text: string, bold: boolean}> = [];
            
            for (let part of parts) {
              if (part.startsWith('**') && part.endsWith('**')) {
                // Bold text
                const boldText = part.slice(2, -2);
                if (currentLine.length + boldText.length > 85) { // Rough character limit
                  // Start new line
                  if (currentLineSegments.length > 0) {
                    lines.push([...currentLineSegments]);
                    currentLineSegments = [];
                  }
                  currentLine = boldText;
                } else {
                  currentLine += boldText;
                }
                currentLineSegments.push({text: boldText, bold: true});
              } else if (part.trim()) {
                // Regular text
                const words = part.split(' ');
                for (let word of words) {
                  if (word.trim()) {
                    if (currentLine.length + word.length + 1 > 85) {
                      // Start new line
                      if (currentLineSegments.length > 0) {
                        lines.push([...currentLineSegments]);
                        currentLineSegments = [];
                      }
                      currentLine = word;
                      currentLineSegments.push({text: word + ' ', bold: false});
                    } else {
                      currentLine += (currentLine ? ' ' : '') + word;
                      currentLineSegments.push({text: (currentLine.length > word.length ? ' ' : '') + word, bold: false});
                    }
                  }
                }
              }
            }
            
            // Add remaining segments
            if (currentLineSegments.length > 0) {
              lines.push(currentLineSegments);
            }
            
            // Render the lines
            for (let i = 0; i < lines.length; i++) {
              let currentX = textX;
              
              // Render each segment with appropriate formatting
              for (let segment of lines[i]) {
                if (segment.text.trim()) {
                  doc.setFont('helvetica', segment.bold ? 'bold' : 'normal');
                  doc.text(segment.text, currentX, y);
                  currentX += doc.getTextWidth(segment.text);
                }
              }
              
              y += 5;
            }
            
            // Reset font
            doc.setFont('helvetica', 'normal');
          };
          
          renderTextWithFormatting(line);
        } else {
          // Regular text without bold formatting
          const textLines = doc.splitTextToSize(line, 170);
          textLines.forEach((textLine: string) => {
            doc.text(textLine, 20, y);
            y += 5;
          });
        }
        y += 3; // Space between paragraphs
      }
    };
    
    parseMarkdownContent(content);
    y += 8; // Extra space between sections
  };
  
  // Add each section if it exists - check both direct properties and breakdown object
  console.log('📋 PDF Debug - Adding structured sections...');
  
  const executiveSummary = estimate.executiveSummary || estimate.breakdown?.executiveSummary;
  const projectAnalysis = estimate.projectAnalysis || estimate.breakdown?.projectAnalysis;
  const marketConditions = estimate.marketConditions || estimate.breakdown?.marketConditions;
  const riskAssessment = estimate.riskAssessment || estimate.breakdown?.riskAssessment;
  const timelineScheduling = estimate.timelineScheduling || estimate.breakdown?.timelineScheduling;
  const recommendations = estimate.recommendations || estimate.breakdown?.recommendations;
  
  console.log('📊 Section lengths:');
  console.log('  Executive Summary:', executiveSummary?.length || 0);
  console.log('  Project Analysis:', projectAnalysis?.length || 0);
  console.log('  Market Conditions:', marketConditions?.length || 0);
  console.log('  Risk Assessment:', riskAssessment?.length || 0);
  console.log('  Timeline Scheduling:', timelineScheduling?.length || 0);
  console.log('  Recommendations:', recommendations?.length || 0);
  
  addSection('Executive Summary', executiveSummary);
  addSection('Project Analysis', projectAnalysis);
  addSection('Market Conditions & Cost Analysis', marketConditions);
  addSection('Risk Assessment & Mitigation', riskAssessment);
  addSection('Timeline & Scheduling', timelineScheduling);
  
  console.log('🚨 PDF DEBUG - REACHED RECOMMENDATIONS FILTERING SECTION!');
  
  // Apply special filtering to Recommendations section to remove imageAnalysis data
  console.log('🔧 PDF Debug - About to filter Recommendations section...');
  console.log('📏 Recommendations exists:', !!recommendations);
  console.log('📏 Recommendations length:', recommendations?.length || 0);
  
  let filteredRecommendations = recommendations;
  if (filteredRecommendations && filteredRecommendations.length > 0) {
    console.log('🔧 PDF Debug - Filtering Recommendations section for imageAnalysis data...');
    console.log('📏 Original Recommendations length:', filteredRecommendations.length);
    
    // Apply the same filtering logic as we use for raw Gemini report
    console.log('🔍 PDF Debug - Looking for Project Management Best Practices section in Recommendations...');
    
    // Find the "Project Management Best Practices" section and truncate after it
    const projectMgmtMatch = filteredRecommendations.match(/(7\.\s*Project Management Best Practices:[\s\S]*?)(?=\n\n[^•\s]|\n[^•\s\n]|$)/gi);
    console.log('🎯 Project Management section found in Recommendations:', !!projectMgmtMatch);
    
    if (projectMgmtMatch) {
      // Find the section content
      const section = projectMgmtMatch[0];
      console.log('📝 Project Management section content preview:', section.substring(0, 200) + '...');
      
      // First try to find bullet points in this section
      const bulletMatches = section.match(/•[\s\S]*?(?=•|$)/gi);
      console.log('🎯 Number of bullet points found:', bulletMatches?.length || 0);
      
      if (bulletMatches && bulletMatches.length > 0) {
        // Handle bullet-point format
        const lastBullet = bulletMatches[bulletMatches.length - 1].trim();
        console.log('🔍 PDF Debug - Last bullet point found:', lastBullet);
        
        // Get everything up to and including the last bullet point
        const lastBulletEnd = section.lastIndexOf(bulletMatches[bulletMatches.length - 1]) + bulletMatches[bulletMatches.length - 1].length;
        const sectionStart = filteredRecommendations.indexOf(section);
        if (sectionStart !== -1) {
          const dataAfterLastBullet = filteredRecommendations.substring(sectionStart + lastBulletEnd);
          if (dataAfterLastBullet.trim()) {
            console.log('✂️ PDF Debug - Data after last bullet is being truncated:');
            console.log('--- START OF TRUNCATED DATA ---');
            console.log(dataAfterLastBullet.substring(0, 500) + (dataAfterLastBullet.length > 500 ? '...' : ''));
            console.log('--- END OF TRUNCATED DATA ---');
            console.log(`📊 Total truncated characters: ${dataAfterLastBullet.length}`);
          }
          
          filteredRecommendations = filteredRecommendations.substring(0, sectionStart + lastBulletEnd);
          console.log('📏 Filtered Recommendations length after bullet truncation:', filteredRecommendations.length);
        }
      } else {
        // Handle paragraph format - truncate after the entire section
        console.log('📝 PDF Debug - No bullet points found, treating as paragraph format');
        const sectionStart = filteredRecommendations.indexOf(section);
        const sectionEnd = sectionStart + section.length;
        
        if (sectionStart !== -1) {
          const dataAfterSection = filteredRecommendations.substring(sectionEnd);
          if (dataAfterSection.trim()) {
            console.log('✂️ PDF Debug - Data after Project Management section is being truncated:');
            console.log('--- START OF TRUNCATED DATA ---');
            console.log(dataAfterSection.substring(0, 500) + (dataAfterSection.length > 500 ? '...' : ''));
            console.log('--- END OF TRUNCATED DATA ---');
            console.log(`📊 Total truncated characters: ${dataAfterSection.length}`);
          }
          
          // Truncate everything after the Project Management Best Practices section
          filteredRecommendations = filteredRecommendations.substring(0, sectionEnd);
          console.log('📏 Filtered Recommendations length after section truncation:', filteredRecommendations.length);
        }
      }
    } else {
      console.log('⚠️ PDF Debug - Project Management Best Practices section not found in Recommendations');
    }
  } else {
    console.log('❌ PDF Debug - Skipping Recommendations filtering - no content or empty');
  }
  
  addSection('Recommendations & Next Steps', filteredRecommendations);
  
  // Add Image Analysis Summary if images were analyzed
  if (estimate.imageAnalysis && estimate.imageAnalysis.length > 0) {
    let imageAnalysisSummary = `Our AI-powered image analysis has reviewed ${estimate.imageAnalysis.length} uploaded images to provide insights into your project. This analysis helps identify renovation opportunities, potential challenges, and cost implications based on the visual evidence provided.\n\n`;
    
    estimate.imageAnalysis.forEach((analysis: any, index: number) => {
      const relevantStatus = analysis.relevant ? 'Relevant' : 'Not Directly Relevant';
      imageAnalysisSummary += `Image ${index + 1}: ${analysis.label}\n`;
      imageAnalysisSummary += `Status: ${relevantStatus}\n`;
      imageAnalysisSummary += `Analysis: ${analysis.description}\n\n`;
    });
    
    imageAnalysisSummary += `Detailed visual documentation of each analyzed image was provided in the previous pages with full-size images and comprehensive descriptions.`;
    
    addSection('Image Analysis Summary', imageAnalysisSummary);
  }
  
  // Add raw Gemini report if it exists and contains additional content (excluding image analysis)
  const rawGeminiReport = estimate.breakdown?.report;
  console.log('🚀 PDF Debug - Starting raw Gemini report processing');
  console.log('📝 Raw report exists:', !!rawGeminiReport);
  console.log('📏 Raw report length:', rawGeminiReport?.length || 0);
  
  if (rawGeminiReport && rawGeminiReport.trim()) {
    console.log('✅ PDF Debug - Processing raw Gemini report');
    // Comprehensive filtering to remove ALL image analysis content
    let filteredReport = rawGeminiReport;
    
    // PRIMARY FILTERS - Remove from these keywords to the end of the document
    const truncationPatterns = [
      /imageAnalysis\s*=[\s\S]*$/gi,
      /Image Analysis Summary[\s\S]*$/gi,
      /Our AI-powered image analysis[\s\S]*$/gi,
      /Image \d+:[\s\S]*$/gi,
      /Detailed visual documentation[\s\S]*$/gi,
      // Additional patterns based on your example
      /```json[\s\S]*$/gi,  // Remove any JSON code blocks
      /\{\s*"label"[\s\S]*$/gi,  // Remove JSON objects starting with "label"
      /Status:\s*[✓⚠'][\s\S]*$/gi,  // Remove status lines with checkmarks/quotes
      /Analysis:\s*The image[\s\S]*$/gi,  // Remove analysis starting with "The image"
      // Enhanced patterns for the specific format you're seeing
      /imageAnalysis\s*=\s*\[[\s\S]*$/gi,  // Match "imageAnalysis = [" and everything after
      /\[\s*\{\s*"label"[\s\S]*$/gi,  // Match array of objects starting with "label"
      /FlacronBuild\s*Image \d+:[\s\S]*$/gi,  // Match sections starting with "FlacronBuild Image X:"
      /Status:\s*(Relevant|Not Directly Relevant)[\s\S]*$/gi,  // Match status lines and everything after
    ];
    
    console.log('🔍 PDF Debug - Looking for Project Management Best Practices section...');
    console.log('📄 Filtered report length before Project Mgmt check:', filteredReport.length);
    
    // SPECIAL FILTER - Cut everything after Project Management Best Practices section
    // Find the "Project Management Best Practices" section and truncate after it
    const projectMgmtMatch = filteredReport.match(/(7\.\s*Project Management Best Practices:[\s\S]*?)(?=\n\n[^•\s]|\n[^•\s\n]|$)/gi);
    console.log('🎯 Project Management section found:', !!projectMgmtMatch);
    
    if (projectMgmtMatch) {
      // Find the section content
      const section = projectMgmtMatch[0];
      console.log('📝 Project Management section content preview:', section.substring(0, 200) + '...');
      
      // First try to find bullet points in this section
      const bulletMatches = section.match(/•[\s\S]*?(?=•|$)/gi);
      console.log('🎯 Number of bullet points found:', bulletMatches?.length || 0);
      
      if (bulletMatches && bulletMatches.length > 0) {
        // Handle bullet-point format
        const lastBullet = bulletMatches[bulletMatches.length - 1].trim();
        console.log('🔍 PDF Debug - Last bullet point found:', lastBullet);
        
        // Get everything up to and including the last bullet point
        const lastBulletEnd = section.lastIndexOf(bulletMatches[bulletMatches.length - 1]) + bulletMatches[bulletMatches.length - 1].length;
        const sectionStart = filteredReport.indexOf(section);
        if (sectionStart !== -1) {
          const dataAfterLastBullet = filteredReport.substring(sectionStart + lastBulletEnd);
          if (dataAfterLastBullet.trim()) {
            console.log('✂️ PDF Debug - Data after last bullet is being truncated:');
            console.log('--- START OF TRUNCATED DATA ---');
            console.log(dataAfterLastBullet.substring(0, 500) + (dataAfterLastBullet.length > 500 ? '...' : ''));
            console.log('--- END OF TRUNCATED DATA ---');
            console.log(`📊 Total truncated characters: ${dataAfterLastBullet.length}`);
          }
          
          filteredReport = filteredReport.substring(0, sectionStart + lastBulletEnd);
        }
      } else {
        // Handle paragraph format - truncate after the entire section
        console.log('📝 PDF Debug - No bullet points found, treating as paragraph format');
        const sectionStart = filteredReport.indexOf(section);
        const sectionEnd = sectionStart + section.length;
        
        if (sectionStart !== -1) {
          const dataAfterSection = filteredReport.substring(sectionEnd);
          if (dataAfterSection.trim()) {
            console.log('✂️ PDF Debug - Data after Project Management section is being truncated:');
            console.log('--- START OF TRUNCATED DATA ---');
            console.log(dataAfterSection.substring(0, 500) + (dataAfterSection.length > 500 ? '...' : ''));
            console.log('--- END OF TRUNCATED DATA ---');
            console.log(`📊 Total truncated characters: ${dataAfterSection.length}`);
          }
          
          // Truncate everything after the Project Management Best Practices section
          filteredReport = filteredReport.substring(0, sectionEnd);
          console.log('📏 Filtered report length after section truncation:', filteredReport.length);
        }
      }
    } else {
      console.log('⚠️ PDF Debug - Project Management Best Practices section not found');
    }
    
    // Apply truncation patterns
    console.log('🔧 PDF Debug - Applying truncation patterns...');
    const originalLength = filteredReport.length;
    for (const pattern of truncationPatterns) {
      const beforeLength = filteredReport.length;
      filteredReport = filteredReport.replace(pattern, '');
      const afterLength = filteredReport.length;
      if (beforeLength !== afterLength) {
        console.log(`✂️ Truncation pattern matched, removed ${beforeLength - afterLength} characters`);
      }
    }
    console.log(`📊 Total characters removed by truncation: ${originalLength - filteredReport.length}`);
    
    // SECONDARY FILTERS - Remove specific content blocks
    const contentPatterns = [
      // Remove JSON-like structures
      /\[\s*\{[\s\S]*?\}\s*\]/gi,
      // Remove image labels and descriptions
      /"label":\s*"[^"]*"/gi,
      /"relevant":\s*(true|false)/gi,  
      /"description":\s*"[^"]*"/gi,
      // Remove renovation descriptions with cost estimates
      /renovation\s+possibilities\s+include[\s\S]*?\$\d+\)/gi,
      /potential\s+renovations\s+include[\s\S]*?\$\d+\)/gi,
      /renovations\s+could\s+include[\s\S]*?\$\d+\)/gi,
      /estimated\s+cost\s+\$[\d,-]+/gi,
      // Remove common renovation terms that appear in image analysis
      /repainting\s+the\s+(walls|exterior)[\s\S]*?\$[\d,-]+/gi,
      /replacing\s+the\s+(flooring|cabinets|windows)[\s\S]*?\$[\d,-]+/gi,
      /updating\s+the\s+(countertops|backsplash)[\s\S]*?\$[\d,-]+/gi,
      // Enhanced patterns for specific content you're seeing
      /"[^"]*"\s*,\s*$/gm,  // Remove JSON property lines ending with comma
      /\}\s*,?\s*$/gm,  // Remove closing braces with optional comma
      /\]\s*$/gm,  // Remove closing array brackets
      // Remove specific renovation cost ranges
      /\(\$\d+[-–]\$\d+\)/gi,  // Remove cost ranges in parentheses
      /\$\d+[-–]\$\d+\s+per\s+window/gi,  // Remove per-window costs
      /costs?\s+(would\s+)?include[\s\S]*?\(\$\d+[-–]\$\d+\)/gi,  // Remove "costs include" sections
    ];
    
    // Apply content removal patterns
    for (const pattern of contentPatterns) {
      filteredReport = filteredReport.replace(pattern, '');
    }
    
    // LOCATION-SPECIFIC FILTERS - Remove based on your actual data
    const locationPatterns = [
      /Living\s+(Area|Room)\s+Renovation/gi,
      /Kitchen\s+Renovation/gi,
      /House\s+Exterior/gi,
      /Exterior\s+Shot/gi,
      /mini-split\s+AC\s+unit/gi,
      /window\s+treatments/gi,
      /small\s+deck/gi,
    ];
    
    // Apply location-specific filters
    for (const pattern of locationPatterns) {
      filteredReport = filteredReport.replace(pattern, '');
    }
    
    // FINAL CLEANUP
    // Remove lines that are mostly empty or contain only fragments
    filteredReport = filteredReport
      .split('\n')
      .filter((line: string) => {
        const trimmed = line.trim();
        return trimmed.length > 10 && // Must have substantial content
               !trimmed.match(/^[,.\s]*$/) && // Not just punctuation
               !trimmed.match(/^\$[\d,-]+\)?\s*$/) && // Not just cost figures
               !trimmed.match(/^Status:\s*['✓⚠]/) && // Not status lines
               !trimmed.includes('estimated cost') && // No cost estimates
               !trimmed.includes('The image shows') && // No image descriptions
               !trimmed.includes('The image displays') && // No image descriptions
               // Enhanced filters for your specific content
               !trimmed.match(/^Status:\s*(Relevant|Not Directly Relevant)/) && // Not status lines
               !trimmed.match(/^Image \d+:/) && // Not image number lines
               !trimmed.match(/^Analysis:/) && // Not analysis lines
               !trimmed.includes('"label":') && // No JSON properties
               !trimmed.includes('"relevant":') && // No JSON properties
               !trimmed.includes('"description":') && // No JSON properties
               !trimmed.match(/^\{/) && // Not opening braces
               !trimmed.match(/^\}/) && // Not closing braces
               !trimmed.match(/^\[/) && // Not opening brackets
               !trimmed.match(/^\]/) && // Not closing brackets
               !trimmed.includes('Damaged House') && // Specific to your data
               !trimmed.includes('Broken Window') && // Specific to your data
               !trimmed.includes('Water Damage') && // Specific to your data
               !trimmed.includes('Cracked Wall') && // Specific to your data
               !trimmed.includes('roof replacement') && // Renovation terms
               !trimmed.includes('window replacement') && // Renovation terms
               !trimmed.includes('water damage remediation') && // Renovation terms
               !trimmed.includes('mold removal') && // Renovation terms
               !trimmed.includes('structural work'); // Renovation terms
      })
      .join('\n');
    
    // Remove excessive whitespace
    filteredReport = filteredReport.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
    
    // QUALITY CHECK - Only add if there's meaningful non-image content
    const hasImageContent = 
      filteredReport.includes('Image') ||
      filteredReport.includes('imageAnalysis') ||
      filteredReport.includes('Status:') ||
      filteredReport.includes('Analysis:') ||
      filteredReport.includes('renovation') ||
      filteredReport.includes('estimated cost') ||
      filteredReport.includes('Living') ||
      filteredReport.includes('Kitchen') ||
      filteredReport.includes('Exterior');
    
    console.log('🔍 PDF Debug - Final quality check:');
    console.log('📏 Final filtered report length:', filteredReport.length);
    console.log('🚫 Has image content:', hasImageContent);
    console.log('✅ Passes length check (>200):', filteredReport.length > 200);
    
    if (filteredReport && 
        filteredReport.length > 200 && 
        !hasImageContent) {
      console.log('📄 PDF Debug - Adding "Additional AI Analysis" section to PDF');
      addSection('Additional AI Analysis', filteredReport);
    } else {
      console.log('❌ PDF Debug - Filtered report rejected - not adding to PDF');
      if (filteredReport.length <= 200) console.log('   Reason: Too short (≤200 chars)');
      if (hasImageContent) console.log('   Reason: Contains image content');
    }
  }
  
  // Legacy support - if old single report field exists and no new sections
  const legacyReport = estimate.report || estimate.breakdown?.report;
  if (legacyReport && !estimate.executiveSummary && !estimate.breakdown?.executiveSummary && !estimate.projectAnalysis && !estimate.breakdown?.projectAnalysis) {
    addSection('Detailed Report', legacyReport);
  }
}

function addImagePages(doc: jsPDF, imageAnalysis: any[], uploadedFiles: any[]) {
  for (let i = 0; i < imageAnalysis.length; i++) {
    doc.addPage();
    
    // Add diagonal watermark
    doc.saveGraphicsState && doc.saveGraphicsState();
    let gState;
    if (doc.setGState) {
      gState = doc.GState && doc.GState({ opacity: 0.08 });
      if (gState) doc.setGState(gState);
      doc.setTextColor(33, 53, 153);
    } else {
      doc.setTextColor(200, 200, 200);
    }
    doc.setFontSize(48);
    doc.text('FlacronBuild', 105, 148, { angle: 35, align: 'center' });
    doc.restoreGraphicsState && doc.restoreGraphicsState();
    
    // Page title
    let y = 20;
    doc.setFontSize(18);
    doc.setTextColor(33, 53, 153);
    doc.text('Project Images Analysis', 20, y);
    doc.setTextColor(0, 0, 0);
    y += 10;
    doc.setDrawColor(33, 53, 153);
    doc.setLineWidth(1);
    doc.line(20, y, 190, y);
    y += 15;
    
    // Single image per page
    if (imageAnalysis[i]) {
      const imageFile = uploadedFiles[i] || null;
      addImageToPage(doc, imageAnalysis[i], imageFile, 20, y, 170, 150);
    }
  }
}

function addImageToPage(doc: jsPDF, imageInfo: any, imageFile: any, x: number, y: number, maxWidth: number, maxHeight: number) {
  // Image label
  doc.setFontSize(14);
  doc.setTextColor(33, 53, 153);
  doc.text(imageInfo.label || 'Project Image', x, y);
  y += 8;
  
  // Relevant indicator
  doc.setFontSize(10);
  doc.setTextColor(imageInfo.relevant ? 0 : 150, imageInfo.relevant ? 150 : 0, imageInfo.relevant ? 0 : 0);
  doc.text(imageInfo.relevant ? '✓ Relevant to project' : '✗ Not directly relevant', x, y);
  doc.setTextColor(0, 0, 0);
  y += 8;
  
  // Image description
  doc.setFontSize(11);
  if (imageInfo.description) {
    const descLines = doc.splitTextToSize(imageInfo.description, maxWidth - 10);
    descLines.forEach((line: string) => {
      doc.text(line, x, y);
      y += 5;
    });
    y += 8;
  }
  
  // Add actual image if available
  if (imageFile && imageFile.data) {
    try {
      // Calculate image dimensions to fit within the available space - larger now
      const imgWidth = Math.min(maxWidth, 160);
      const imgHeight = Math.min(maxHeight, 120);
      
      doc.addImage(imageFile.data, 'JPEG', x, y, imgWidth, imgHeight);
    } catch (error) {
      console.error('Error adding image to PDF:', error);
      // Fallback to placeholder if image fails to load
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(1);
      doc.rect(x, y, maxWidth, 80);
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('[Image could not be loaded]', x + 5, y + 45);
      doc.setTextColor(0, 0, 0);
    }
  } else {
    // Placeholder if no image file
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(1);
    doc.rect(x, y, maxWidth, 80);
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('[No image available]', x + 5, y + 45);
    doc.setTextColor(0, 0, 0);
  }
}
