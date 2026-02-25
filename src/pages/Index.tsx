import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Download } from "lucide-react";
import wingrowLogo from "@/assets/wingrow-logo-optimized.png";

const Index = () => {
  const { user, currentRole, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user && currentRole) {
      if (currentRole === "admin") navigate("/admin");
      else if (currentRole === "market_manager") navigate("/manager-dashboard");
      else if (currentRole === "bdo") navigate("/bdo-dashboard");
      else navigate("/dashboard");
    }
  }, [user, currentRole, loading, navigate]);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setIsInstalled(true);
      setDeferredPrompt(null);
    } else {
      navigate('/install');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="text-center space-y-4 sm:space-y-6">
        <div className="flex justify-center">
          <div className="p-3 sm:p-4">
            <img
              src={wingrowLogo}
              alt="Wingrow Market"
              className="h-24 w-24 sm:h-32 sm:w-32 object-contain"
              width="128"
              height="128"
              fetchPriority="high"
              decoding="async"
            />
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">{t('app.name')}</h1>
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-md px-4">
          {t('app.tagline')}
        </p>
        <div className="flex flex-col gap-3 items-center">
          <Button size="lg" onClick={() => navigate("/auth")}>
            {t('landing.getStarted')}
          </Button>
          {!isInstalled && (
            <Button variant="outline" size="sm" onClick={handleInstall} className="gap-2">
              <Download className="h-4 w-4" />
              Install App
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
