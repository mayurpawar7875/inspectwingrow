import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EmployeeTimelineProps {
  marketId?: string;
}

export default function EmployeeTimeline({ marketId }: EmployeeTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground py-8">
          Timeline feature temporarily disabled for maintenance
        </div>
      </CardContent>
    </Card>
  );
}
