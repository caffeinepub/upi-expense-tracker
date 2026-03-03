import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Shield, Lock, Eye, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LandingPage() {
  const { login, isLoggingIn } = useInternetIdentity();

  const handleLogin = async () => {
    try {
      await login();
    } catch (error: any) {
      if (error?.message !== 'User is already authenticated') {
        toast.error('Login failed. Please try again.');
      }
    }
  };

  const features = [
    {
      icon: <Shield className="w-5 h-5 text-mint" />,
      title: 'Your Data, Your Control',
      desc: 'All transaction data is stored exclusively in your personal on-chain canister. No one else can access it.',
    },
    {
      icon: <Lock className="w-5 h-5 text-mint" />,
      title: 'Zero External Sharing',
      desc: 'Your financial data never leaves your canister. No third-party analytics, no data brokers, ever.',
    },
    {
      icon: <Eye className="w-5 h-5 text-mint" />,
      title: 'Client-Side Processing',
      desc: 'File parsing and categorization happen entirely in your browser. Raw data is never transmitted.',
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <img
            src="/assets/generated/logo-mark.dim_128x128.png"
            alt="UPI Tracker"
            className="w-9 h-9 rounded-xl"
          />
          <span className="font-bold text-xl text-foreground tracking-tight">
            UPI<span className="text-mint">Tracker</span>
          </span>
        </div>
        <Button
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="bg-mint text-charcoal hover:bg-mint/90 font-semibold gap-2"
        >
          {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Login
        </Button>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col">
        <section className="max-w-7xl mx-auto w-full px-6 pt-12 pb-16 flex flex-col lg:flex-row items-center gap-12">
          {/* Left: Copy */}
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-mint/10 border border-mint/20 text-mint text-xs font-medium">
              <Shield className="w-3.5 h-3.5" />
              Privacy-First Finance Tracker
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight tracking-tight">
              Know where your{' '}
              <span className="text-mint">money goes</span>
              <br />
              every month
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
              Upload your UPI transaction export and instantly see your spending broken down by category — food, travel, entertainment, and more. All data stays private, on-chain, and under your control.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleLogin}
                disabled={isLoggingIn}
                size="lg"
                className="bg-mint text-charcoal hover:bg-mint/90 font-bold text-base gap-2 px-8"
              >
                {isLoggingIn ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
                {isLoggingIn ? 'Connecting...' : 'Get Started — It\'s Free'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Secured by Internet Identity · No passwords · No email required
            </p>
          </div>

          {/* Right: Hero image */}
          <div className="flex-1 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-lg">
              <div className="absolute inset-0 bg-mint/10 rounded-3xl blur-3xl" />
              <img
                src="/assets/generated/hero-illustration.dim_1200x600.png"
                alt="Expense visualization"
                className="relative rounded-2xl border border-border shadow-2xl w-full object-cover"
              />
            </div>
          </div>
        </section>

        {/* Privacy features */}
        <section className="bg-surface border-t border-border py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-foreground">Built for privacy, by design</h2>
              <p className="text-muted-foreground mt-2">Your financial data is yours alone</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map((f, i) => (
                <div
                  key={i}
                  className="bg-surface-elevated border border-border rounded-xl p-6 space-y-3 hover:border-mint/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-mint/10 flex items-center justify-center">
                    {f.icon}
                  </div>
                  <h3 className="font-semibold text-foreground">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 max-w-7xl mx-auto px-6 w-full">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-foreground">How it works</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Export from UPI app', desc: 'Download your transaction history as CSV from GPay, PhonePe, or Paytm.' },
              { step: '02', title: 'Upload & auto-categorize', desc: 'We parse the file in your browser and classify each transaction automatically.' },
              { step: '03', title: 'View your insights', desc: 'See monthly totals, category breakdowns, and individual transactions — all private.' },
            ].map((s) => (
              <div key={s.step} className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-mint/10 border border-mint/20 flex items-center justify-center">
                  <span className="text-mint font-bold text-sm">{s.step}</span>
                </div>
                <h3 className="font-semibold text-foreground">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-6 text-center text-xs text-muted-foreground">
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
    </div>
  );
}
