import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Download, RefreshCw, Trash2 } from 'lucide-react';
import { APP_VERSION } from '@/config/version';
import { useServiceWorkerUpdate } from '@/hooks/useServiceWorkerUpdate';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

interface PWATabProps {
  onChangeMade: () => void;
}

export function PWATab({ onChangeMade }: PWATabProps) {
  const { isUpdateAvailable, isUpdating, applyUpdate } = useServiceWorkerUpdate();
  const [lastUpdated, setLastUpdated] = useState<string>('Unknown');
  const [cacheSize, setCacheSize] = useState<string>('Calculating...');

  useEffect(() => {
    // Calculate cache size
    const calculateCacheSize = async () => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          const usedMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(2);
          setCacheSize(`${usedMB} MB`);
        } catch {
          setCacheSize('Unknown');
        }
      }
    };

    // Get last updated time from service worker
    const getLastUpdated = async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration?.active) {
          // Use current time as approximation
          const now = new Date();
          setLastUpdated(now.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }));
        }
      }
    };

    calculateCacheSize();
    getLastUpdated();
  }, []);

  const handleClearCache = async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        toast.success('App cache cleared successfully');
        // Recalculate cache size
        setCacheSize('0 MB');
      }
    } catch (error) {
      toast.error('Failed to clear cache');
    }
  };

  const handleUpdateServiceWorker = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          toast.success('Checked for updates');
        }
      }
    } catch (error) {
      toast.error('Failed to check for updates');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progressive Web App</CardTitle>
        <CardDescription>Configure PWA settings and installation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5" />
            <div>
              <p className="font-medium">PWA Status</p>
              <p className="text-sm text-muted-foreground">App is installable</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isUpdateAvailable && (
              <Badge variant="default" className="bg-blue-500">Update Available</Badge>
            )}
            <Badge variant="outline" className="bg-green-50 dark:bg-green-950">Active</Badge>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">App Information</h4>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">Wingrow Reporting</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Version</dt>
              <dd className="font-medium font-mono">{APP_VERSION}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last Updated</dt>
              <dd className="font-medium">{lastUpdated}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Cache Size</dt>
              <dd className="font-medium">{cacheSize}</dd>
            </div>
          </dl>
        </div>

        {isUpdateAvailable && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              A new version is available!
            </p>
            <Button 
              onClick={applyUpdate} 
              disabled={isUpdating}
              size="sm"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
              {isUpdating ? 'Updating...' : 'Update Now'}
            </Button>
          </div>
        )}

        <div className="pt-4 space-y-2">
          <Button variant="outline" className="w-full" onClick={handleUpdateServiceWorker}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Check for Updates
          </Button>
          <Button variant="outline" className="w-full" onClick={handleClearCache}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear App Cache
          </Button>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.open('/install', '_blank')}
          >
            <Download className="mr-2 h-4 w-4" />
            Installation Instructions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
