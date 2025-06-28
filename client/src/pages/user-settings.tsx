import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Header from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { deleteUser, User as FirebaseUser, reauthenticateWithCredential, EmailAuthProvider, GoogleAuthProvider, reauthenticateWithPopup } from "firebase/auth";
import { User, Mail, FileText, Trash2, AlertTriangle } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function UserSettingsPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [estimateCount, setEstimateCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await fetchEstimateCount(currentUser.uid);
      } else {
        navigate("/");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  const fetchEstimateCount = async (userId: string) => {
    try {
      const q = query(
        collection(db, "estimates"),
        where("userId", "==", userId)
      );
      const snapshot = await getDocs(q);
      setEstimateCount(snapshot.size);
    } catch (error) {
      console.error("Error fetching estimate count:", error);
      setEstimateCount(0);
    }
  };

  const isGoogleUser = user?.providerData?.some(provider => provider.providerId === 'google.com');

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    setDeleting(true);
    try {
      // Re-authenticate based on sign-in method
      if (isGoogleUser) {
        const provider = new GoogleAuthProvider();
        await reauthenticateWithPopup(user, provider);
      } else if (user.email && password) {
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
      } else {
        throw new Error("Unable to re-authenticate. Please try logging out and back in.");
      }
      
      // Delete all user's estimates first
      const q = query(
        collection(db, "estimates"),
        where("userId", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      
      const deletePromises = snapshot.docs.map(docSnapshot => 
        deleteDoc(doc(db, "estimates", docSnapshot.id))
      );
      
      await Promise.all(deletePromises);
      
      // Delete the user account
      await deleteUser(user);
      
      toast({
        title: "Account deleted",
        description: "Your account and all data have been permanently deleted.",
      });
      
      navigate("/");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      let errorMessage = "Failed to delete account. Please try again.";
      
      if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password. Please try again.";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please try again later.";
      } else if (error.code === "auth/requires-recent-login") {
        errorMessage = "Please log out and log back in, then try again.";
      } else if (error.code === "auth/popup-closed-by-user") {
        errorMessage = "Authentication cancelled. Please try again.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
      setPassword("");
    }
  };

  const handleDeleteAccountClick = () => {
    setShowDeleteDialog(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-lg text-neutral-600">Loading...</div>
        </main>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center py-8 px-4">
        <div className="w-full max-w-2xl">
          <Button 
            variant="outline" 
            className="mb-6" 
            onClick={() => navigate("/")}
          >
            ← Back to Home
          </Button>
          
          <Card className="shadow-lg">
            <CardHeader className="text-center pb-6">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
                {user.displayName
                  ? user.displayName.charAt(0).toUpperCase()
                  : user.email?.charAt(0).toUpperCase() || <User className="h-8 w-8" />}
              </div>
              <CardTitle className="text-2xl font-bold text-neutral-800">
                User Settings
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* User Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-neutral-800 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Account Information
                </h3>
                
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-neutral-500" />
                      <div>
                        <div className="font-medium text-neutral-800">Email</div>
                        <div className="text-sm text-neutral-600">{user.email}</div>
                      </div>
                    </div>
                  </div>
                  
                  {user.displayName && (
                    <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-neutral-500" />
                        <div>
                          <div className="font-medium text-neutral-800">Username</div>
                          <div className="text-sm text-neutral-600">{user.displayName}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-neutral-500" />
                      <div>
                        <div className="font-medium text-neutral-800">Estimates Created</div>
                        <div className="text-sm text-neutral-600">Total estimates generated</div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary font-semibold">
                      {estimateCount}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Account Actions */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-neutral-800 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Account Management
                </h3>
                
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-start gap-3">
                    <Trash2 className="h-5 w-5 text-red-500 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-red-800 mb-1">Delete Account</div>
                      <div className="text-sm text-red-600 mb-3">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </div>
                      
                      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            disabled={deleting}
                            onClick={handleDeleteAccountClick}
                          >
                            {deleting ? "Deleting..." : "Delete Account"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Account Deletion</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete your account
                              and remove all your data including {estimateCount} estimate{estimateCount !== 1 ? 's' : ''} from our servers.
                              {!isGoogleUser && (
                                <>
                                  <br /><br />
                                  Please enter your password to confirm:
                                </>
                              )}
                              {isGoogleUser && (
                                <>
                                  <br /><br />
                                  You will be asked to sign in with Google to confirm this action.
                                </>
                              )}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          {!isGoogleUser && (
                            <div className="py-4">
                              <Label htmlFor="password" className="text-sm font-medium">
                                Password
                              </Label>
                              <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                className="mt-2"
                                disabled={deleting}
                              />
                            </div>
                          )}
                          <AlertDialogFooter>
                            <AlertDialogCancel 
                              onClick={() => {
                                setPassword("");
                                setShowDeleteDialog(false);
                              }}
                              disabled={deleting}
                            >
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDeleteAccount}
                              className="bg-red-600 hover:bg-red-700"
                              disabled={deleting || (!isGoogleUser && !password.trim())}
                            >
                              {deleting ? "Deleting..." : "Yes, delete my account"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
} 