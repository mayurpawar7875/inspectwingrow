import { Sparkles, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useVersionCheck } from '@/hooks/useVersionCheck';

export function WhatsNewDialog() {
  const { isNewVersion, currentVersion, releaseNotes, acknowledgeVersion } = useVersionCheck();

  if (!isNewVersion || !releaseNotes) {
    return null;
  }

  return (
    <Dialog open={isNewVersion} onOpenChange={(open) => !open && acknowledgeVersion()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">What's New in v{currentVersion}</DialogTitle>
              <DialogDescription className="mt-0.5">{releaseNotes.title}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <ul className="space-y-3">
            {releaseNotes.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end">
          <Button onClick={acknowledgeVersion} className="w-full sm:w-auto">
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
