import { useEffect, useState } from 'react';
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
import { useNavigate, useParams } from 'react-router-dom';

function SettingsContent() {
  const [hasChanges, setHasChanges] = useState(false);
  const navigate = useNavigate();
  const { section } = useParams();
  const [activeTab, setActiveTab] = useState(section ?? 'general');
  const titles: Record<string, string> = {
    general: 'General',
    markets: 'Markets',
    farmers: 'Farmers',
    time: 'Time',
    attendance: 'Attendance',
    notifications: 'Notifications',
    roles: 'Roles',
    data: 'Data',
    security: 'Security',
    pwa: 'PWA',
    audit: 'Audit',
  };

  useEffect(() => {
    setActiveTab(section ?? 'general');
  }, [section]);

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-11">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="markets">Markets</TabsTrigger>
          <TabsTrigger value="farmers">Farmers</TabsTrigger>
          <TabsTrigger value="time">Time</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="pwa">PWA</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>
        )

        {section && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">{titles[section] ?? 'Settings'}</h2>
              </div>
              <Button variant="outline" onClick={() => navigate('/admin/settings')}>Back</Button>
            </div>
            <TabsContent value="general">
              {section === 'general' && <GeneralTab onChangeMade={() => setHasChanges(true)} />}
            </TabsContent>
            <TabsContent value="markets">
              {section === 'markets' && <MarketsTab onChangeMade={() => setHasChanges(true)} />}
            </TabsContent>
            <TabsContent value="farmers">
              {section === 'farmers' && <FarmersTab onChangeMade={() => setHasChanges(true)} />}
            </TabsContent>
            <TabsContent value="time">
              {section === 'time' && <TimeWindowsTab onChangeMade={() => setHasChanges(true)} />}
            </TabsContent>
            <TabsContent value="attendance">
              {section === 'attendance' && <AttendanceTab onChangeMade={() => setHasChanges(true)} />}
            </TabsContent>
            <TabsContent value="notifications">
              {section === 'notifications' && <NotificationsTab onChangeMade={() => setHasChanges(true)} />}
            </TabsContent>
            <TabsContent value="roles">
              {section === 'roles' && <RolesTab onChangeMade={() => setHasChanges(true)} />}
            </TabsContent>
            <TabsContent value="data">
              {section === 'data' && <DataTab onChangeMade={() => setHasChanges(true)} />}
            </TabsContent>
            <TabsContent value="security">
              {section === 'security' && <SecurityTab onChangeMade={() => setHasChanges(true)} />}
            </TabsContent>
            <TabsContent value="pwa">
              {section === 'pwa' && <PWATab onChangeMade={() => setHasChanges(true)} />}
            </TabsContent>
            <TabsContent value="audit">
              {section === 'audit' && <AuditTab />}
            </TabsContent>
          </div>
        )}
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
