import { Bell, User, Hammer, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
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
import FlacronBuildLogo from "../FlacronBuildLogo.webp";

const navLinks = [
  { name: "Home", href: "/" },
  { name: "Compare", href: "/compare" },
  { name: "My Estimates", href: "/my-estimates" },
];

export default function Header() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loginMessage, setLoginMessage] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u: FirebaseUser | null) => setUser(u));
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : "/";
  
  const handleNavClick = (link: typeof navLinks[0], e: React.MouseEvent) => {
    setMobileMenuOpen(false);
    
    if (link.href === '/') {
      navigate('/');
      return;
    }
    
    if (!user) {
      e.preventDefault();
      if (link.href === '/compare') {
        setLoginMessage('Please login to compare your estimates');
      } else if (link.href === '/my-estimates') {
        setLoginMessage('Please login to view your estimates');
      } else {
        setLoginMessage('You need to login first');
      }
      setLoginOpen(true);
    } else {
      navigate(link.href);
    }
  };

  return (
    <>
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} message={loginMessage} />
      <header className="w-full bg-white border-b border-neutral-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <div className="flex items-center">
          <div style={{ height: 56, width: 180, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img 
              src={FlacronBuildLogo} 
              alt="FlacronBuild Logo" 
              style={{ height: 130, width: 'auto', objectFit: 'cover', objectPosition: 'center' }} 
            />
          </div>
          </div>
          
          {/* Desktop Navigation */}
          <div className="flex-1 flex justify-center mr-20">
          <nav className="hidden md:flex space-x-6">
            {navLinks.map(link => (
              <button
                key={link.href}
                  onClick={e => handleNavClick(link, e)}
                className={
                  `text-neutral-600 hover:text-primary transition-colors px-2 py-1 rounded-md border-none bg-transparent` +
                  (currentPath === link.href ? " border border-primary text-primary bg-transparent" : "")
                }
                  style={{ cursor: link.href === '/' || user ? 'pointer' : 'not-allowed' }}
              >
                {link.name}
              </button>
            ))}
          </nav>
          </div>
          
          <div className="flex items-center space-x-4 flex-shrink-0">
            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-md text-neutral-600 hover:text-primary hover:bg-neutral-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
            
            {/* Profile button */}
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
                  <DropdownMenuItem onClick={() => navigate("/user-settings")} className="py-4 px-2 cursor-pointer">
                    User Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-600 py-4 px-2 cursor-pointer">
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button 
                className="w-8 h-8 bg-primary rounded-full flex items-center justify-center" 
                onClick={() => {
                  setLoginMessage('Please login to access your profile');
                  setLoginOpen(true);
                }}
              >
                <User className="text-white h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        
        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-neutral-200 bg-white">
            <nav className="px-2 pt-2 pb-4 space-y-1">
              {navLinks.map(link => (
                <button
                  key={link.href}
                  onClick={e => handleNavClick(link, e)}
                  className={
                    `block px-3 py-2 rounded-md text-base font-medium transition-colors w-full text-left border-none bg-transparent` +
                    (currentPath === link.href 
                      ? " bg-primary/10 text-primary border-l-4 border-primary" 
                      : " text-neutral-600 hover:text-primary hover:bg-neutral-50")
                  }
                  style={{ cursor: link.href === '/' || user ? 'pointer' : 'not-allowed' }}
                >
                  {link.name}
                </button>
              ))}
            </nav>
          </div>
        )}
    </header>
    </>
  );
}
