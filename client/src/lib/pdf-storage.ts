import { db, auth } from "./firebase";
import { collection, query, where, orderBy, getDocs, doc, getDoc } from "firebase/firestore";

// Get all reports for current user by email
export async function getUserPDFs() {
  const user = auth.currentUser;
  if (!user || !user.email) return [];
  
  try {
    console.log('=== PDF STORAGE: Fetching User Reports ===');
    console.log('User email:', user.email);
    
    const q = query(
      collection(db, "reports"),
      where("userEmail", "==", user.email)
      // Removed orderBy to avoid index requirement - will sort in JavaScript
    );
    
    const querySnapshot = await getDocs(q);
    const reports = querySnapshot.docs.map(doc => {
      const data = doc.data();
      console.log('Found report:', doc.id, data);
      return {
      id: doc.id,
        ...data,
        // For compatibility with existing UI, map report fields to expected PDF fields
        fileName: `Report_${doc.id}.pdf`,
        timestamp: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        projectData: data.projectData,
        geminiResponse: data.geminiResponse,
        pdfRef: data.pdfRef
      };
    });
    
    // Sort by createdAt in JavaScript (newest first)
    reports.sort((a, b) => {
      const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
      const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
    
    console.log('=== PDF STORAGE: Found Reports ===');
    console.log('Total reports found:', reports.length);
    
    return reports;
  } catch (error) {
    console.error("Error fetching user reports:", error);
    return [];
  }
}

// Get all reports for current user (alias for getUserPDFs for clarity)
export async function getUserReports() {
  return getUserPDFs();
}

// Get specific report by ID from reports collection
export async function getReportById(reportId: string) {
  try {
    console.log('=== PDF STORAGE: Fetching Report by ID ===');
    console.log('Report ID:', reportId);
    
    const docRef = doc(db, "reports", reportId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('Found report data:', data);
      
      return { 
        id: docSnap.id, 
        ...data,
        // For compatibility, map fields
        fileName: `Report_${docSnap.id}.pdf`,
        timestamp: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
      };
    } else {
      console.log("No such report document!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching report:", error);
    return null;
  }
}

// Get specific PDF by ID (legacy support - now fetches from reports)
export async function getPDFById(pdfId: string) {
  return getReportById(pdfId);
}

// Get PDF from report's pdfRef and download it
export async function downloadReportPDF(report: any, viewMode: boolean = false) {
  try {
    console.log('=== PDF STORAGE: Downloading Report PDF ===');
    console.log('Full report object:', JSON.stringify(report, null, 2));
    console.log('Report pdfRef:', report.pdfRef);
    console.log('Report pdfRef type:', typeof report.pdfRef);
    console.log('Report has pdfRef:', !!report.pdfRef);
    
    // If the report has a pdfRef, try to get the actual PDF from pdfs collection
    if (report.pdfRef) {
      console.log('=== PDF STORAGE: Attempting to fetch PDF document ===');
      console.log('Fetching PDF from pdfRef:', report.pdfRef);
      
      const pdfDocRef = doc(db, "pdfs", report.pdfRef);
      console.log('PDF document reference created for collection "pdfs", id:', report.pdfRef);
      
      const pdfDocSnap = await getDoc(pdfDocRef);
      console.log('PDF document snapshot retrieved');
      console.log('PDF document exists:', pdfDocSnap.exists());
      
      if (pdfDocSnap.exists()) {
        const pdfData = pdfDocSnap.data();
        console.log('=== PDF STORAGE: PDF Document Data Found ===');
        console.log('PDF data keys:', Object.keys(pdfData));
        console.log('PDF data structure:', JSON.stringify(pdfData, null, 2));
        
        // Check for pdfBase64 in different possible locations
        let base64Data = null;
        let fileName = null;
        
        if (pdfData.pdfBase64) {
          // Direct field (current structure)
          base64Data = pdfData.pdfBase64;
          fileName = pdfData.fileName;
          console.log('Found pdfBase64 as direct field');
        } else if (pdfData.pdf?.pdfBase64) {
          // Nested under pdf object (alternative structure)
          base64Data = pdfData.pdf.pdfBase64;
          fileName = pdfData.pdf.fileName;
          console.log('Found pdfBase64 under pdf object');
        }
        
        console.log('Base64 data found:', !!base64Data);
        console.log('Base64 data length:', base64Data?.length || 0);
        console.log('File name:', fileName);
        
        if (base64Data) {
          console.log('=== PDF STORAGE: Initiating PDF', viewMode ? 'view' : 'download', '===');
          if (viewMode) {
            // Open PDF in new tab
            const blob = base64ToBlob(base64Data);
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
          } else {
            downloadPDFFromBase64(base64Data, fileName || `Report_${report.id}.pdf`);
          }
          return;
        } else {
          console.log('=== PDF STORAGE: No pdfBase64 found in PDF document ===');
          console.log('Available data in pdfData:', Object.keys(pdfData));
          console.log('Looking for: pdfBase64 (direct) or pdf.pdfBase64 (nested)');
        }
      } else {
        console.log('=== PDF STORAGE: PDF document does not exist ===');
        console.log('Searched for document ID:', report.pdfRef);
        console.log('In collection: pdfs');
      }
    } else {
      console.log('=== PDF STORAGE: No pdfRef found in report ===');
      console.log('Report keys:', Object.keys(report));
    }
    
    // Fallback: if no pdfRef or PDF not found, indicate unavailable
    console.log('=== PDF STORAGE: PDF not available for download ===');
    alert('PDF not available for download. This report may not have an associated PDF file.');
    
  } catch (error) {
    console.error('=== PDF STORAGE: Error downloading report PDF ===');
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Full error:', error);
    alert('Error downloading PDF. Please try again.');
  }
}

// Convert base64 to blob
function base64ToBlob(base64Data: string): Blob {
  // Remove data URL prefix if present
  const base64String = base64Data.startsWith('data:') ? base64Data.split(',')[1] : base64Data;
  const byteCharacters = atob(base64String);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: 'application/pdf' });
}

// Download PDF from base64 data
export function downloadPDFFromBase64(base64Data: string, fileName: string) {
  try {
    console.log('=== PDF STORAGE: Downloading PDF from Base64 ===');
    console.log('File name:', fileName);
    console.log('Base64 data length:', base64Data.length);
    
    // Create a link element and trigger download
    const link = document.createElement('a');
    link.href = base64Data;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('PDF download initiated');
  } catch (error) {
    console.error("Error downloading PDF:", error);
  }
}

// Get file size in human readable format
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 