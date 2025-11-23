import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AuditTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Log</CardTitle>
        <CardDescription>Track all settings changes and modifications</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground py-8">
          Audit log feature coming soon
        </div>
      </CardContent>
    </Card>
  );
}
