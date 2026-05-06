'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/features/auth/components/ProtectedRoute';
import UserMenu from '@/components/layout/UserMenu';
import ThemeToggle from '@/components/common/ThemeToggle';
import BranchBadge from '@/features/branches/components/BranchBadge';
import FirstLoginModal from '@/features/auth/components/FirstLoginModal';
import OnboardingTour from '@/components/onboarding/OnboardingTour';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { 
  Menu, 
  X, 
  Users, 
  FileText, 
  UserCheck, 
  DollarSign, 
  BarChart3, 
  Trash2, 
  Settings,
  Calendar,
  Globe,
  Building2,
  UserPlus
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, refreshUser } = useAuth();
  const pathname = usePathname();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showFirstLogin, setShowFirstLogin] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  // Check if user needs first login or onboarding (only once)
  useEffect(() => {
    console.log('Dashboard Layout: User changed:', {
      user: user ? {
        id: user.id,
        email: user.email,
        is_first_login: user.is_first_login,
        onboarding_completed: user.onboarding_completed
      } : null,
      onboardingChecked
    });

    if (user && !onboardingChecked) {
      if (user.is_first_login) {
        console.log('Dashboard Layout: Showing first login modal');
        setShowFirstLogin(true);
        setOnboardingChecked(true);
      } else if (!user.onboarding_completed) {
        console.log('Dashboard Layout: Showing onboarding tour');
        setShowOnboarding(true);
        setOnboardingChecked(true);
      } else {
        console.log('Dashboard Layout: User has completed onboarding');
        setOnboardingChecked(true);
      }
    }
  }, [user, onboardingChecked]);

  const handleFirstLoginComplete = async () => {
    setShowFirstLogin(false);
    await refreshUser();
    // After first login, show onboarding
    setShowOnboarding(true);
  };

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    await refreshUser();
    // Don't show again
    setOnboardingChecked(true);
  };

  const navigation = [
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Agents', href: '/dashboard/agents', icon: Users },
    { name: 'Agent Applications', href: '/dashboard/agent-applications', icon: UserPlus },
    { name: 'Portal', href: '/dashboard/portal', icon: Globe },
    { name: 'Applications', href: '/dashboard/applications', icon: FileText },
    { name: 'Subscribers', href: '/dashboard/subscribers', icon: UserCheck },
    { name: 'Commissions', href: '/dashboard/commissions', icon: DollarSign },
    { name: 'Events', href: '/dashboard/events', icon: Calendar },
  ];

  const adminNavigation = user?.role === 'superadmin' || user?.role === 'system_administrator' ? [
    { name: 'Referrers', href: '/dashboard/referrers', icon: Users },
    { name: 'Branches', href: '/dashboard/branches', icon: Building2 },
    { name: 'Purge Logs', href: '/dashboard/purge-logs', icon: Trash2 },
    { name: 'Users', href: '/dashboard/users', icon: Settings },
  ] : [];

  const isActive = (href: string) => pathname === href;

  return (
    <ProtectedRoute>
      {/* First Login Modal */}
      {showFirstLogin && <FirstLoginModal onComplete={handleFirstLoginComplete} />}

      {/* Onboarding Tour */}
      {showOnboarding && !showFirstLogin && (
        <OnboardingTour 
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingComplete}
        />
      )}

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex transition-colors duration-300">
        {/* Sidebar - Desktop */}
        <aside 
          className={`hidden lg:flex flex-col bg-[#00A191] dark:bg-[#008c7a] text-white transition-all duration-300 fixed left-0 top-0 h-screen ${sidebarExpanded ? 'w-64' : 'w-20'}`}
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
        >
          {/* Logo */}
          <div className="h-16 flex items-center justify-center px-4 border-b border-white/10">
            {sidebarExpanded ? (
              <Link href="/dashboard/analytics" className="flex items-center gap-2">
                <Image
                  src="/lobosw.png"
                  alt="NetHub"
                  width={40}
                  height={40}
                  className="object-contain"
                />
                <h1 className="text-xl font-bold whitespace-nowrap">NetHub</h1>
              </Link>
            ) : (
              <Link href="/dashboard/analytics" className="flex items-center justify-center">
                <Image
                  src="/lobosw.png"
                  alt="NetHub"
                  width={40}
                  height={40}
                  className="object-contain"
                />
              </Link>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {[...navigation, ...adminNavigation].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-[#00A191] text-white'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  } ${sidebarExpanded ? '' : 'justify-center'}`}
                  title={!sidebarExpanded ? item.name : ''}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  {sidebarExpanded && <span className="font-medium whitespace-nowrap">{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content - with left margin to account for fixed sidebar */}
        <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarExpanded ? 'lg:ml-64' : 'lg:ml-20'}`}>
          {/* Top Bar - Fixed/Sticky */}
          <header className="sticky top-0 z-40 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 lg:px-6 transition-colors duration-300 shadow-sm">
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-gray-600 dark:text-gray-300 hover:text-[#00A191] dark:hover:text-[#00A191] transition-colors"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>

              {/* Mobile Logo */}
              <Link href="/dashboard/analytics" className="lg:hidden flex items-center gap-2">
                <Image
                  src="/lobosw.png"
                  alt="NetHub"
                  width={32}
                  height={32}
                  className="object-contain"
                />
                <h1 className="text-xl font-bold text-[#00A191] dark:text-[#00A191]">NetHub</h1>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              {/* Branch Badge */}
              <BranchBadge 
                primaryBranchName={user?.primary_branch_name || user?.branch_name}
                branches={user?.branches}
              />
              <ThemeToggle variant="subtle" />
              <UserMenu />
            </div>
          </header>

          {/* Mobile Sidebar */}
          {mobileMenuOpen && (
            <div className="lg:hidden fixed inset-0 z-50 bg-gray-900/50 dark:bg-black/70" onClick={() => setMobileMenuOpen(false)}>
              <aside className="w-64 h-full bg-[#00A191] dark:bg-[#008c7a] text-white" onClick={(e) => e.stopPropagation()}>
                {/* Logo */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
                  <Link href="/dashboard/analytics" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                    <Image
                      src="/lobosw.png"
                      alt="NetHub"
                      width={32}
                      height={32}
                      className="object-contain"
                    />
                    <h1 className="text-xl font-bold">NetHub</h1>
                  </Link>
                  <button onClick={() => setMobileMenuOpen(false)} className="text-white/80 hover:text-white">
                    <X size={24} />
                  </button>
                </div>

                {/* Navigation */}
                <nav className="px-3 py-4 space-y-1">
                  {[...navigation, ...adminNavigation].map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                          isActive(item.href)
                            ? 'bg-[#00A191] text-white'
                            : 'text-white/80 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Icon size={20} />
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    );
                  })}
                </nav>
              </aside>
            </div>
          )}

          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

