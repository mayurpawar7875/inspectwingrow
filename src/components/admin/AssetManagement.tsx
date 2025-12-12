import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PendingRequestsTab } from './asset-management/PendingRequestsTab';
import { ApprovedRequestsTab } from './asset-management/ApprovedRequestsTab';
import { PaymentVerificationTab } from './asset-management/PaymentVerificationTab';
import { ReturnedAssetsTab } from './asset-management/ReturnedAssetsTab';
import { AssetInventoryTab } from './asset-management/AssetInventoryTab';

export function AssetManagement() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-3xl font-bold mb-1 md:mb-2">Asset Management</h1>
        <p className="text-xs md:text-base text-muted-foreground">Manage asset requests, payments, and inventory</p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="pending" className="text-[10px] md:text-sm px-1 md:px-3">Pending</TabsTrigger>
          <TabsTrigger value="approved" className="text-[10px] md:text-sm px-1 md:px-3">Approved</TabsTrigger>
          <TabsTrigger value="payments" className="text-[10px] md:text-sm px-1 md:px-3">Payments</TabsTrigger>
          <TabsTrigger value="returned" className="text-[10px] md:text-sm px-1 md:px-3">Returned</TabsTrigger>
          <TabsTrigger value="inventory" className="text-[10px] md:text-sm px-1 md:px-3">Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <PendingRequestsTab />
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          <ApprovedRequestsTab />
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <PaymentVerificationTab />
        </TabsContent>

        <TabsContent value="returned" className="mt-6">
          <ReturnedAssetsTab />
        </TabsContent>

        <TabsContent value="inventory" className="mt-6">
          <AssetInventoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}