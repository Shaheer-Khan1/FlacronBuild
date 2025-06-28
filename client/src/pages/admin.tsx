import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, deleteDoc, doc, where } from "firebase/firestore";
import { Shield, Users, Activity, AlertTriangle, Trash2, Eye, Calendar, Mail, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface User {
  id: string;
  email: string;
  displayName?: string;
  createdAt: any;
  estimateCount: number;
}

interface Estimate {
  id: string;
  userId: string;
  userEmail?: string;
  projectName?: string;
  totalCost?: number;
  createdAt: any;
}

interface ActivityLog {
  id: string;
  type: string;
  userId?: string;
  userEmail?: string;
  action: string;
  timestamp: any;
  details?: any;
}

interface PDF {
  id: string;
  userId: string;
  fileName: string;
  pdfBase64: string;
  projectName: string;
  totalCost: number;
  createdAt: any;
  size: number;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEstimates: 0
  });
  const { toast } = useToast();

  // Hardcoded admin credentials
  const ADMIN_USERNAME = "adminlogin";
  const ADMIN_PASSWORD = "pass123word";

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      loadAdminData();
    } else {
      setLoginError("Invalid username or password");
    }
  };

  const loadAdminData = async () => {
    setLoading(true);
    try {
      // Load PDFs to get total estimates count (each PDF = one estimate)
      const pdfsSnapshot = await getDocs(
        query(collection(db, "pdfs"), orderBy("createdAt", "desc"))
      );
      const totalEstimates = pdfsSnapshot.size;
      
      const pdfsData = pdfsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PDF[];
      
      setPdfs(pdfsData);
      
      // Load estimates for user management and activity logs
      const estimatesSnapshot = await getDocs(
        query(collection(db, "estimates"), orderBy("createdAt", "desc"))
      );
      
      const estimatesData = estimatesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        userEmail: doc.data().userEmail || "Unknown"
      })) as Estimate[];
      
      setEstimates(estimatesData);

      // Group by user to get user list
      const userMap = new Map<string, User>();
      estimatesData.forEach(estimate => {
        const userId = estimate.userId;
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            id: userId,
            email: estimate.userEmail || "Unknown",
            displayName: estimate.userEmail?.split("@")[0] || "Unknown",
            createdAt: estimate.createdAt,
            estimateCount: 0
          });
        }
        userMap.get(userId)!.estimateCount++;
      });
      
      setUsers(Array.from(userMap.values()));



      setStats({
        totalUsers: userMap.size,
        totalEstimates: totalEstimates // Use PDF count as the true estimate count
      });

    } catch (error) {
      console.error("Error loading admin data:", error);
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    try {
      // Delete all user's estimates
      const userEstimatesQuery = query(
        collection(db, "estimates"),
        where("userId", "==", userId)
      );
      const userEstimatesSnapshot = await getDocs(userEstimatesQuery);
      
      const deleteEstimatesPromises = userEstimatesSnapshot.docs.map(doc =>
        deleteDoc(doc.ref)
      );
      
      // Delete all user's PDFs
      const userPDFsQuery = query(
        collection(db, "pdfs"),
        where("userId", "==", userId)
      );
      const userPDFsSnapshot = await getDocs(userPDFsQuery);
      
      const deletePDFsPromises = userPDFsSnapshot.docs.map(doc =>
        deleteDoc(doc.ref)
      );
      
      await Promise.all([...deleteEstimatesPromises, ...deletePDFsPromises]);
      
      toast({
        title: "User deleted",
        description: `User ${userEmail} and all their data have been deleted.`
      });
      
      // Reload data
      loadAdminData();
      
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      });
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Unknown";
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleString();
    }
    return new Date(timestamp).toLocaleString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const openPDFInNewTab = (pdfBase64: string, fileName: string) => {
    try {
      // Create a blob from the base64 data
      const byteCharacters = atob(pdfBase64.split(',')[1] || pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      // Create object URL and open in new tab
      const url = URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank');
      
      if (newWindow) {
        newWindow.document.title = fileName;
        // Clean up the URL after a delay
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) {
      console.error('Error opening PDF:', error);
      toast({
        title: "Error",
        description: "Failed to open PDF",
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle className="text-2xl">Admin Access</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>
              {loginError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full">
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-neutral-800">Admin Dashboard</h1>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setIsAuthenticated(false)}
          >
            Logout
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-neutral-600">Total Users</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-neutral-600">Total Estimates</p>
                  <p className="text-2xl font-bold">{stats.totalEstimates}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Eye className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-sm text-neutral-600">Total Reports</p>
                  <p className="text-2xl font-bold">{stats.totalEstimates}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="submissions">User Submissions</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading users...</div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
                    <p className="text-lg font-medium mb-2">No users found</p>
                    <p className="text-sm">Users will appear here after they create their first estimate.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                            {user.email?.charAt(0).toUpperCase() || "U"}
                          </div>
                          <div>
                            <div className="font-medium">{user.email}</div>
                            <div className="text-sm text-neutral-600">
                              {user.estimateCount} estimates • Joined {formatDate(user.createdAt)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {user.estimateCount} estimates
                          </Badge>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete user {user.email}? This will permanently delete their account and all associated data including {user.estimateCount} estimates.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user.id, user.email)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete User
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>



          <TabsContent value="submissions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  User Submissions (PDF Reports)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading submissions...</div>
                ) : pdfs.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
                    <p className="text-lg font-medium mb-2">No submissions found</p>
                    <p className="text-sm">PDF reports will appear here after users generate estimates.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pdfs.slice(0, 20).map((pdf) => {
                      // Get user email from users list
                      const user = users.find(u => u.id === pdf.userId);
                      const userEmail = user?.email || "Unknown User";
                      
                      return (
                        <div key={pdf.id} className="flex items-center justify-between p-3 border rounded hover:bg-neutral-50">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openPDFInNewTab(pdf.pdfBase64, pdf.fileName)}
                                className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                title="Click to open PDF in new tab"
                              >
                                {pdf.fileName}
                              </button>
                              <Badge variant="outline" className="text-xs">
                                {formatFileSize(pdf.size)}
                              </Badge>
                            </div>
                            <div className="text-sm text-neutral-600 mt-1">
                              <span className="font-medium">{pdf.projectName}</span> • {userEmail} • {formatDate(pdf.createdAt)}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            {pdf.totalCost && (
                              <div className="font-semibold text-green-600">
                                {formatCurrency(pdf.totalCost)}
                              </div>
                            )}
                            <div className="text-xs text-neutral-500 mt-1">
                              <Eye className="h-3 w-3 inline mr-1" />
                              Click to view
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 