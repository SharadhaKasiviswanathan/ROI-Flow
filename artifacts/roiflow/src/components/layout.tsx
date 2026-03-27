import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  PlusCircle, 
  Activity,
  Menu,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/submit", label: "Submit Task", icon: PlusCircle },
  ];

  const SidebarContent = () => (
    <>
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
          <Activity size={18} strokeWidth={2.5} />
        </div>
        <span className="font-display font-bold text-xl tracking-wide text-sidebar-foreground">
          ROIFlow
        </span>
      </div>

      <div className="px-4 py-2">
        <div className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-4 px-2">
          Menu
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                  ${isActive 
                    ? "bg-sidebar-primary/10 text-sidebar-primary font-medium" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  }
                `}
              >
                <item.icon 
                  size={18} 
                  className={`
                    transition-colors duration-200 
                    ${isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"}
                  `} 
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      
      <div className="mt-auto p-6">
        <div className="bg-sidebar-accent rounded-xl p-4">
          <h4 className="text-sm font-medium text-sidebar-foreground mb-1">Automation OS</h4>
          <p className="text-xs text-sidebar-foreground/50 leading-relaxed">
            Prioritize and automate operations safely and efficiently.
          </p>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-sidebar text-sidebar-foreground border-b border-sidebar-border shadow-sm z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <Activity size={18} strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold text-lg">ROIFlow</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-md bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80 transition-colors"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-sidebar flex flex-col md:hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
              <span className="font-display font-bold text-lg text-sidebar-foreground">Menu</span>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-md bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <SidebarContent />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 flex-col bg-sidebar border-r border-sidebar-border shadow-xl z-10 shrink-0">
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden relative flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-10 custom-scrollbar">
          <div className="mx-auto max-w-6xl w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
