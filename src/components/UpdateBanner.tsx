import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useServiceWorkerUpdate } from '@/hooks/useServiceWorkerUpdate';

export function UpdateBanner() {
  const { isUpdateAvailable, isUpdating, applyUpdate, dismissUpdate } = useServiceWorkerUpdate();

  if (!isUpdateAvailable) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-primary text-primary-foreground px-4 py-3 shadow-lg animate-in slide-in-from-top duration-300">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <RefreshCw className={`h-5 w-5 ${isUpdating ? 'animate-spin' : ''}`} />
          <p className="text-sm font-medium">
            {isUpdating ? 'Updating...' : 'New update available. Tap Refresh to update.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={applyUpdate}
            disabled={isUpdating}
            className="h-8 px-3 text-xs font-medium"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isUpdating ? 'animate-spin' : ''}`} />
            {isUpdating ? 'Updating' : 'Refresh'}
          </Button>
          {!isUpdating && (
            <Button
              size="sm"
              variant="ghost"
              onClick={dismissUpdate}
              className="h-8 w-8 p-0 hover:bg-primary-foreground/20"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
