import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, AlertCircle } from 'lucide-react';

interface EmployeeTimelineProps {
  employeeId: string;
}

export default function EmployeeTimeline({ employeeId }: EmployeeTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Employee Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">
            Timeline feature is currently being set up
          </p>
          <p className="text-sm text-muted-foreground">
            Task events tracking will be available soon
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
