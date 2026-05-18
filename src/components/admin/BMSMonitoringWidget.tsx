import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, History } from 'lucide-react';
import { BMSRealTimeTab } from './bms-monitoring/BMSRealTimeTab';
import { BMSHistoryTab } from './bms-monitoring/BMSHistoryTab';

export function BMSMonitoringWidget() {
  const [activeTab, setActiveTab] = useState('realtime');

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="text-base sm:text-lg">Market Service Executive Monitoring</CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="realtime" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
              Real-Time
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <History className="h-3 w-3 sm:h-4 sm:w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="realtime" className="mt-3">
            <BMSRealTimeTab />
          </TabsContent>

          <TabsContent value="history" className="mt-3">
            <BMSHistoryTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
