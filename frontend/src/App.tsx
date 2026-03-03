import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile } from './hooks/useQueries';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import ImportPage from './pages/ImportPage';
import SettingsPage from './pages/SettingsPage';
import Navigation from './components/Navigation';
import ProfileSetupModal from './components/ProfileSetupModal';
import { Toaster } from '@/components/ui/sonner';
import { useState } from 'react';

type Page = 'dashboard' | 'import' | 'settings';

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  const { data: userProfile, isLoading: profileLoading, isFetched: profileFetched } = useGetCallerUserProfile();

  const showProfileSetup = isAuthenticated && !profileLoading && profileFetched && userProfile === null;

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-mint border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LandingPage />
        <Toaster />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="flex-1">
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'import' && <ImportPage />}
        {currentPage === 'settings' && <SettingsPage />}
      </main>
      <footer className="border-t border-border py-4 px-6 text-center text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} UPI Expense Tracker — </span>
        <span>Built with ❤️ using </span>
        <a
          href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname || 'upi-expense-tracker')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-mint hover:underline"
        >
          caffeine.ai
        </a>
      </footer>
      {showProfileSetup && <ProfileSetupModal />}
      <Toaster />
    </div>
  );
}
