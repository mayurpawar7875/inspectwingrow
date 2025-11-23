import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export function AuditTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Log</CardTitle>
        <CardDescription>Track all settings changes and modifications</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Audit Logging Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Settings audit logging will be available in a future update. All changes to system settings will be tracked and displayed here.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
