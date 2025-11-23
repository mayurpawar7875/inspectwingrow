import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface NotificationsTabProps {
  onChangeMade: () => void;
}

export function NotificationsTab({ onChangeMade }: NotificationsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Templates</CardTitle>
        <CardDescription>Manage notification templates for the system</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground py-8">
          Notification templates feature coming soon
        </div>
      </CardContent>
    </Card>
  );
}
