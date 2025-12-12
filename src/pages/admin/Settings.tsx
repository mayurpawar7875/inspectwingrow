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
        {!section && (
        <TabsList className="grid w-full gap-3 grid-cols-3 lg:grid-cols-5 bg-transparent p-0 h-auto">
          <TabsTrigger
            value="general"
            onClick={() => navigate('/admin/settings/general')}
            className="group flex flex-col items-center gap-2 bg-transparent p-0 data-[state=active]:bg-transparent"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border bg-card shadow-sm flex items-center justify-center transition group-data-[state=active]:border-primary group-data-[state=active]:ring-2 group-data-[state=active]:ring-primary/20">
              <span className="text-lg font-semibold">G</span>
            </div>
            <span className="text-sm max-w-[6rem] text-center truncate">General</span>
          </TabsTrigger>
          <TabsTrigger
            value="markets"
            onClick={() => navigate('/admin/settings/markets')}
            className="group flex flex-col items-center gap-2 bg-transparent p-0 data-[state=active]:bg-transparent"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border bg-card shadow-sm flex items-center justify-center transition group-data-[state=active]:border-primary group-data-[state=active]:ring-2 group-data-[state=active]:ring-primary/20">
              <span className="text-lg font-semibold">M</span>
            </div>
            <span className="text-sm max-w-[6rem] text-center truncate">Markets</span>
          </TabsTrigger>
          <TabsTrigger
            value="farmers"
            onClick={() => navigate('/admin/settings/farmers')}
            className="group flex flex-col items-center gap-2 bg-transparent p-0 data-[state=active]:bg-transparent"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border bg-card shadow-sm flex items-center justify-center transition group-data-[state=active]:border-primary group-data-[state=active]:ring-2 group-data-[state=active]:ring-primary/20">
              <span className="text-lg font-semibold">F</span>
            </div>
            <span className="text-sm max-w-[6rem] text-center truncate">Farmers</span>
          </TabsTrigger>
          <TabsTrigger
            value="time"
            onClick={() => navigate('/admin/settings/time')}
            className="group flex flex-col items-center gap-2 bg-transparent p-0 data-[state=active]:bg-transparent"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border bg-card shadow-sm flex items-center justify-center transition group-data-[state=active]:border-primary group-data-[state=active]:ring-2 group-data-[state=active]:ring-primary/20">
              <span className="text-lg font-semibold">T</span>
            </div>
            <span className="text-sm max-w-[6rem] text-center truncate">Time</span>
          </TabsTrigger>
          <TabsTrigger
            value="attendance"
            onClick={() => navigate('/admin/settings/attendance')}
            className="group flex flex-col items-center gap-2 bg-transparent p-0 data-[state=active]:bg-transparent"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border bg-card shadow-sm flex items-center justify-center transition group-data-[state=active]:border-primary group-data-[state=active]:ring-2 group-data-[state=active]:ring-primary/20">
              <span className="text-lg font-semibold">A</span>
            </div>
            <span className="text-sm max-w-[6rem] text-center truncate">Attendance</span>
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            onClick={() => navigate('/admin/settings/notifications')}
            className="group flex flex-col items-center gap-2 bg-transparent p-0 data-[state=active]:bg-transparent"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border bg-card shadow-sm flex items-center justify-center transition group-data-[state=active]:border-primary group-data-[state=active]:ring-2 group-data-[state=active]:ring-primary/20">
              <span className="text-lg font-semibold">N</span>
            </div>
            <span className="text-sm max-w-[6rem] text-center truncate">Notifications</span>
          </TabsTrigger>
          <TabsTrigger
            value="roles"
            onClick={() => navigate('/admin/settings/roles')}
            className="group flex flex-col items-center gap-2 bg-transparent p-0 data-[state=active]:bg-transparent"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border bg-card shadow-sm flex items-center justify-center transition group-data-[state=active]:border-primary group-data-[state=active]:ring-2 group-data-[state=active]:ring-primary/20">
              <span className="text-lg font-semibold">R</span>
            </div>
            <span className="text-sm max-w-[6rem] text-center truncate">Roles</span>
          </TabsTrigger>
          <TabsTrigger
            value="data"
            onClick={() => navigate('/admin/settings/data')}
            className="group flex flex-col items-center gap-2 bg-transparent p-0 data-[state=active]:bg-transparent"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border bg-card shadow-sm flex items-center justify-center transition group-data-[state=active]:border-primary group-data-[state=active]:ring-2 group-data-[state=active]:ring-primary/20">
              <span className="text-lg font-semibold">D</span>
            </div>
            <span className="text-sm max-w-[6rem] text-center truncate">Data</span>
          </TabsTrigger>
          <TabsTrigger
            value="security"
            onClick={() => navigate('/admin/settings/security')}
            className="group flex flex-col items-center gap-2 bg-transparent p-0 data-[state=active]:bg-transparent"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border bg-card shadow-sm flex items-center justify-center transition group-data-[state=active]:border-primary group-data-[state=active]:ring-2 group-data-[state=active]:ring-primary/20">
              <span className="text-lg font-semibold">S</span>
            </div>
            <span className="text-sm max-w-[6rem] text-center truncate">Security</span>
          </TabsTrigger>
          <TabsTrigger
            value="pwa"
            onClick={() => navigate('/admin/settings/pwa')}
            className="group flex flex-col items-center gap-2 bg-transparent p-0 data-[state=active]:bg-transparent"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border bg-card shadow-sm flex items-center justify-center transition group-data-[state=active]:border-primary group-data-[state=active]:ring-2 group-data-[state=active]:ring-primary/20">
              <span className="text-lg font-semibold">P</span>
            </div>
            <span className="text-sm max-w-[6rem] text-center truncate">PWA</span>
          </TabsTrigger>
          <TabsTrigger
            value="audit"
            onClick={() => navigate('/admin/settings/audit')}
            className="group flex flex-col items-center gap-2 bg-transparent p-0 data-[state=active]:bg-transparent"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border bg-card shadow-sm flex items-center justify-center transition group-data-[state=active]:border-primary group-data-[state=active]:ring-2 group-data-[state=active]:ring-primary/20">
              <span className="text-lg font-semibold">A</span>
            </div>
            <span className="text-sm max-w-[6rem] text-center truncate">Audit</span>
          </TabsTrigger>
        </TabsList>
        )}

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
