import { Bell, User, Hammer } from "lucide-react";
import { useState, useEffect } from "react";
import LoginDialog from "./login-dialog";
import { auth, writeHiTest } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { name: "Home", href: "/" },
  { name: "Compare", href: "/compare" },
  { name: "My Estimates", href: "/my-estimates" },
];

export default function Header() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loginMessage, setLoginMessage] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u: FirebaseUser | null) => setUser(u));
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : "/";
  return (
    <header className="bg-white shadow-sm border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 w-full">
          <div className="flex items-center flex-shrink-0">
            <Hammer className="text-primary text-2xl mr-3" />
            <h1 className="text-xl font-bold text-neutral-800">FlacronBuild</h1>
          </div>
          <div className="flex-1 flex justify-center mr-20">
            <nav className="hidden md:flex space-x-6">
              {navLinks.map(link => (
                <a
                  key={link.href}
                  href={link.href === '/' ? '/' : undefined}
                  onClick={e => {
                    if (link.href === '/') return;
                    if (!user) {
                      e.preventDefault();
                      setLoginMessage('You need to login first');
                      setLoginOpen(true);
                    } else {
                      window.location.href = link.href;
                    }
                  }}
                  className={
                    `text-neutral-600 hover:text-primary transition-colors px-2 py-1 rounded-md` +
                    (currentPath === link.href ? " border border-primary text-primary bg-transparent" : "")
                  }
                  style={{ cursor: link.href === '/' || user ? 'pointer' : 'not-allowed' }}
                >
                  {link.name}
                </a>
              ))}
            </nav>
          </div>
          <div className="flex items-center space-x-4 flex-shrink-0">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-semibold text-lg uppercase">
                    {user.displayName
                      ? user.displayName.charAt(0)
                      : user.email?.charAt(0) || <User className="text-white h-4 w-4" />}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[150px] border-2 border-primary shadow-lg p-2">
                  <DropdownMenuLabel className="text-base font-normal pb-4 pt-2 px-2">
                    Hi {user.displayName ? user.displayName.split(" ")[0] : user.email?.split("@")[0]}!
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => {
                       console.log('Current user:', auth.currentUser);
                    try {
                      await writeHiTest();
                      alert('Wrote hi to Firestore!');
                    } catch (e) {
                      alert('Failed to write hi: ' + e);
                    }
                  }} className="py-4 px-2 cursor-pointer">
                    User Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-600 py-4 px-2 cursor-pointer">
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button className="w-8 h-8 bg-primary rounded-full flex items-center justify-center" onClick={() => setLoginOpen(true)}>
                <User className="text-white h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} message={loginMessage} />
    </header>
  );
}
