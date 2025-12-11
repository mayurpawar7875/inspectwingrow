import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { SettingsProvider, useSettings } from '@/contexts/SettingsContext';
import { GeneralTab } from '@/components/admin/settings/GeneralTab';
import { MarketsTab } from '@/components/admin/settings/MarketsTab';
import { TimeWindowsTab } from '@/components/admin/settings/TimeWindowsTab';
import { AttendanceTab } from '@/components/admin/settings/AttendanceTab';
import { NotificationsTab } from '@/components/admin/settings/NotificationsTab';
import { FarmersTab } from '@/components/admin/settings/FarmersTab';
import { RolesTab } from '@/components/admin/settings/RolesTab';
import { DataTab } from '@/components/admin/settings/DataTab';
import { SecurityTab } from '@/components/admin/settings/SecurityTab';
import { PWATab } from '@/components/admin/settings/PWATab';
import { AuditTab } from '@/components/admin/settings/AuditTab';

function SettingsContent() {
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const handleDiscard = () => {
    window.location.reload();
  };

  const handleSave = async () => {
    // Save handled by individual tabs through context
    setHasChanges(false);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-3xl font-bold">Settings</h1>
        <p className="text-xs md:text-sm text-muted-foreground">Manage your application configuration</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 md:space-y-4">
        <TabsList className="grid w-full grid-cols-4 sm:grid-cols-5 lg:grid-cols-11 h-auto">
          <TabsTrigger value="general" className="text-[10px] md:text-sm px-1 md:px-3 py-1.5">General</TabsTrigger>
          <TabsTrigger value="markets" className="text-[10px] md:text-sm px-1 md:px-3 py-1.5">Markets</TabsTrigger>
          <TabsTrigger value="farmers" className="text-[10px] md:text-sm px-1 md:px-3 py-1.5">Farmers</TabsTrigger>
          <TabsTrigger value="time" className="text-[10px] md:text-sm px-1 md:px-3 py-1.5">Time</TabsTrigger>
          <TabsTrigger value="attendance" className="text-[10px] md:text-sm px-1 md:px-3 py-1.5">Attend</TabsTrigger>
          <TabsTrigger value="notifications" className="text-[10px] md:text-sm px-1 md:px-3 py-1.5">Notifs</TabsTrigger>
          <TabsTrigger value="roles" className="text-[10px] md:text-sm px-1 md:px-3 py-1.5">Roles</TabsTrigger>
          <TabsTrigger value="data" className="text-[10px] md:text-sm px-1 md:px-3 py-1.5">Data</TabsTrigger>
          <TabsTrigger value="security" className="text-[10px] md:text-sm px-1 md:px-3 py-1.5">Security</TabsTrigger>
          <TabsTrigger value="pwa" className="text-[10px] md:text-sm px-1 md:px-3 py-1.5">PWA</TabsTrigger>
          <TabsTrigger value="audit" className="text-[10px] md:text-sm px-1 md:px-3 py-1.5">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab onChangeMade={() => setHasChanges(true)} />
        </TabsContent>

        <TabsContent value="markets">
          <MarketsTab onChangeMade={() => setHasChanges(true)} />
        </TabsContent>

        <TabsContent value="farmers">
          <FarmersTab onChangeMade={() => setHasChanges(true)} />
        </TabsContent>

        <TabsContent value="time">
          <TimeWindowsTab onChangeMade={() => setHasChanges(true)} />
        </TabsContent>

        <TabsContent value="attendance">
          <AttendanceTab onChangeMade={() => setHasChanges(true)} />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationsTab onChangeMade={() => setHasChanges(true)} />
        </TabsContent>

        <TabsContent value="roles">
          <RolesTab onChangeMade={() => setHasChanges(true)} />
        </TabsContent>

        <TabsContent value="data">
          <DataTab onChangeMade={() => setHasChanges(true)} />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab onChangeMade={() => setHasChanges(true)} />
        </TabsContent>

        <TabsContent value="pwa">
          <PWATab onChangeMade={() => setHasChanges(true)} />
        </TabsContent>

        <TabsContent value="audit">
          <AuditTab />
        </TabsContent>
      </Tabs>

      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-3 md:p-4 flex justify-end gap-2 md:gap-3 shadow-lg z-50">
          <Button variant="outline" size="sm" className="text-xs md:text-sm" onClick={handleDiscard}>
            Discard
          </Button>
          <Button size="sm" className="text-xs md:text-sm" onClick={handleSave}>Save</Button>
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  return (
    <AdminLayout>
      <SettingsProvider>
        <SettingsContent />
      </SettingsProvider>
    </AdminLayout>
  );
}
