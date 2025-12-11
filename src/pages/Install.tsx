import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, CheckCircle, Smartphone, ArrowLeft, Share, Plus, MoreVertical } from 'lucide-react';

export default function Install() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(iOS);
    
    // Detect Safari
    const safari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    setIsSafari(safari);
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-primary/10 rounded-full">
                {isInstalled ? (
                  <CheckCircle className="h-12 w-12 text-success" />
                ) : (
                  <Smartphone className="h-12 w-12 text-primary" />
                )}
              </div>
            </div>
            <CardTitle className="text-2xl">
              {isInstalled ? 'App Installed!' : 'Install StallSnap'}
            </CardTitle>
            <CardDescription>
              {isInstalled 
                ? 'You can now use the app from your home screen' 
                : 'Add this app to your home screen for quick access'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isInstalled ? (
              <div className="bg-success/10 text-success-foreground p-4 rounded-lg text-center">
                <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                <p className="font-medium">Successfully installed!</p>
                <p className="text-sm mt-1">You can find the app on your home screen</p>
              </div>
            ) : (
              <>
                {isInstallable ? (
                  <Button 
                    onClick={handleInstallClick} 
                    size="lg" 
                    className="w-full"
                  >
                    <Download className="mr-2 h-5 w-5" />
                    Install App
                  </Button>
                ) : (
                  <div className="space-y-4">
                    {isIOS ? (
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-5 rounded-xl border border-blue-200 dark:border-blue-800">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                          <Smartphone className="h-5 w-5" />
                          Install on iPhone/iPad
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {isSafari 
                            ? "Follow these steps to install:" 
                            : "⚠️ Please open this page in Safari to install the app."}
                        </p>
                        <div className="space-y-4">
                          <div className="flex items-start gap-3 bg-white/60 dark:bg-black/20 p-3 rounded-lg">
                            <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">1</div>
                            <div className="flex-1">
                              <p className="font-medium">Tap the Share button</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Look for the <Share className="inline h-4 w-4 mx-1" /> icon at the bottom of Safari
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 bg-white/60 dark:bg-black/20 p-3 rounded-lg">
                            <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">2</div>
                            <div className="flex-1">
                              <p className="font-medium">Tap "Add to Home Screen"</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Scroll down in the share sheet and look for <Plus className="inline h-4 w-4 mx-1" /> Add to Home Screen
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 bg-white/60 dark:bg-black/20 p-3 rounded-lg">
                            <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">3</div>
                            <div className="flex-1">
                              <p className="font-medium">Tap "Add"</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Confirm by tapping Add in the top right corner
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-muted p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">Install Instructions</h3>
                        <div className="space-y-3 text-sm">
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              <MoreVertical className="h-4 w-4" /> On Android:
                            </p>
                            <ol className="list-decimal ml-4 mt-1 space-y-1">
                              <li>Tap the menu (⋮) in your browser</li>
                              <li>Tap "Add to Home screen" or "Install app"</li>
                              <li>Follow the prompts to install</li>
                            </ol>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <h3 className="font-semibold">Benefits of Installing:</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 mt-0.5 text-success flex-shrink-0" />
                      <span>Quick access from your home screen</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 mt-0.5 text-success flex-shrink-0" />
                      <span>Works offline with cached data</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 mt-0.5 text-success flex-shrink-0" />
                      <span>Faster loading times</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 mt-0.5 text-success flex-shrink-0" />
                      <span>Full-screen experience</span>
                    </li>
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
