import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, History } from 'lucide-react';
import { BMSRealTimeTab } from './bms-monitoring/BMSRealTimeTab';
import { BMSHistoryTab } from './bms-monitoring/BMSHistoryTab';

export function BMSMonitoringWidget() {
  const [activeTab, setActiveTab] = useState('realtime');

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">BMS Executive Monitoring</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="realtime" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Real-Time
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="realtime" className="mt-4">
            <BMSRealTimeTab />
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <BMSHistoryTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
