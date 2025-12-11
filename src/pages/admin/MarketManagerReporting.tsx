import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmployeeAllocationsTab } from '@/components/admin/market-manager/EmployeeAllocationsTab';
import { PunchRecordsTab } from '@/components/admin/market-manager/PunchRecordsTab';
import { LandSearchTab } from '@/components/admin/market-manager/LandSearchTab';
import { StallSearchTab } from '@/components/admin/market-manager/StallSearchTab';
import { AssetsTab } from '@/components/admin/market-manager/AssetsTab';
import { FeedbacksTab } from '@/components/admin/market-manager/FeedbacksTab';
import { InspectionsTab } from '@/components/admin/market-manager/InspectionsTab';

export default function MarketManagerReporting() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div>
          <h2 className="text-3xl font-bold">Market Manager Real-Time Reporting</h2>
          <p className="text-muted-foreground">Monitor live market operations and activities</p>
        </div>
      </div>

      <Tabs defaultValue="allocations" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
          <TabsTrigger value="allocations">Allocations</TabsTrigger>
          <TabsTrigger value="punch">Punch Records</TabsTrigger>
          <TabsTrigger value="land">Land Search</TabsTrigger>
          <TabsTrigger value="stalls">Stall Search</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="inspections">Inspections</TabsTrigger>
        </TabsList>

        <TabsContent value="allocations">
          <EmployeeAllocationsTab />
        </TabsContent>

        <TabsContent value="punch">
          <PunchRecordsTab />
        </TabsContent>

        <TabsContent value="land">
          <LandSearchTab />
        </TabsContent>

        <TabsContent value="stalls">
          <StallSearchTab />
        </TabsContent>

        <TabsContent value="assets">
          <AssetsTab />
        </TabsContent>

        <TabsContent value="feedback">
          <FeedbacksTab />
        </TabsContent>

        <TabsContent value="inspections">
          <InspectionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
