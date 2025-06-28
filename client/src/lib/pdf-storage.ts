import { db, auth } from "./firebase";
import { collection, query, where, orderBy, getDocs, doc, getDoc } from "firebase/firestore";

// Get all PDFs for current user
export async function getUserPDFs() {
  const user = auth.currentUser;
  if (!user) return [];
  
  try {
    const q = query(
      collection(db, "pdfs"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching user PDFs:", error);
    return [];
  }
}

// Get specific PDF by ID
export async function getPDFById(pdfId: string) {
  try {
    const docRef = doc(db, "pdfs", pdfId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.log("No such PDF document!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching PDF:", error);
    return null;
  }
}

// Download PDF from base64 data
export function downloadPDFFromBase64(base64Data: string, fileName: string) {
  try {
    // Create a link element and trigger download
    const link = document.createElement('a');
    link.href = base64Data;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Error downloading PDF:", error);
  }
}

// Get PDF size in human readable format
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 