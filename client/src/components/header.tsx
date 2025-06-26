import { Bell, User, Hammer } from "lucide-react";

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Hammer className="text-primary text-2xl mr-3" />
            <h1 className="text-xl font-bold text-neutral-800">FlacronBuild</h1>
          </div>
          <nav className="hidden md:flex space-x-6">
            <a href="#" className="text-neutral-600 hover:text-primary transition-colors">Dashboard</a>
            <a href="#" className="text-neutral-600 hover:text-primary transition-colors">Projects</a>
            <a href="#" className="text-neutral-600 hover:text-primary transition-colors">Reports</a>
            <a href="#" className="text-neutral-600 hover:text-primary transition-colors">Settings</a>
          </nav>
          <div className="flex items-center space-x-4">
            <button className="text-neutral-600 hover:text-primary">
              <Bell className="h-5 w-5" />
            </button>
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <User className="text-white h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
