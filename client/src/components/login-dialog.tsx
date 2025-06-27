import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message?: string;
}

const provider = new GoogleAuthProvider();

export default function LoginDialog({ open, onOpenChange, message }: LoginDialogProps) {
  const [isSignup, setIsSignup] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
      onOpenChange(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onOpenChange(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs w-full">
        <DialogHeader>
          <DialogTitle>{isSignup ? "Sign Up" : "Login"}</DialogTitle>
          <DialogDescription>
            {isSignup ? "Create a new account" : "Sign in to your account"}
          </DialogDescription>
        </DialogHeader>
        {message && <div className="text-center text-red-500 font-medium mb-2">{message}</div>}
        <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <Button type="submit" disabled={loading} className="w-full">
            {isSignup ? "Sign Up" : "Login"}
          </Button>
        </form>
        <div className="flex items-center my-2">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="mx-2 text-xs text-gray-400">OR</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        <Button onClick={handleGoogle} disabled={loading} variant="outline" className="w-full">
          Continue with Google
        </Button>
        <div className="text-center mt-2">
          <button
            type="button"
            className="text-primary underline text-xs"
            onClick={() => setIsSignup(s => !s)}
          >
            {isSignup ? "Already have an account? Login" : "Don't have an account? Sign Up"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 