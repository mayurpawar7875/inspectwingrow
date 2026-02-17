import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Package, Wallet, Calendar, BoxSelect } from 'lucide-react';
import { BMSAttendanceTab } from '@/components/bms/BMSAttendanceTab';
import { BMSAssetInspectionTab } from '@/components/bms/BMSAssetInspectionTab';
import { BMSAdvanceRequestTab } from '@/components/bms/BMSAdvanceRequestTab';
import { BMSLeaveApplicationTab } from '@/components/bms/BMSLeaveApplicationTab';
import { BMSAssetRequestTab } from '@/components/bms/BMSAssetRequestTab';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import wingrowLogo from '@/assets/wingrow-logo-optimized.png';

export default function BMSExecutiveDashboard() {
  const { user, currentRole, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('attendance');

  useEffect(() => {
    if (currentRole && currentRole !== 'bms_executive' && currentRole !== 'admin') {
      navigate('/dashboard');
    }
  }, [currentRole, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <img src={wingrowLogo} alt="Wingrow" className="h-8 w-auto" />
            <span className="font-semibold text-sm">{t('bms.title')}</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="ghost" />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              {t('common.logout')}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="attendance" className="text-xs sm:text-sm flex flex-col sm:flex-row items-center gap-1 px-1">
              <ClipboardCheck className="h-4 w-4" />
              <span className="hidden sm:inline">{t('bms.attendance')}</span>
            </TabsTrigger>
            <TabsTrigger value="inspection" className="text-xs sm:text-sm flex flex-col sm:flex-row items-center gap-1 px-1">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">{t('bms.inspection')}</span>
            </TabsTrigger>
            <TabsTrigger value="asset-request" className="text-xs sm:text-sm flex flex-col sm:flex-row items-center gap-1 px-1">
              <BoxSelect className="h-4 w-4" />
              <span className="hidden sm:inline">{t('bms.assetRequest')}</span>
            </TabsTrigger>
            <TabsTrigger value="advance" className="text-xs sm:text-sm flex flex-col sm:flex-row items-center gap-1 px-1">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">{t('bms.advance')}</span>
            </TabsTrigger>
            <TabsTrigger value="leave" className="text-xs sm:text-sm flex flex-col sm:flex-row items-center gap-1 px-1">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">{t('bms.leave')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attendance" className="mt-0">
            <BMSAttendanceTab />
          </TabsContent>

          <TabsContent value="inspection" className="mt-0">
            <BMSAssetInspectionTab />
          </TabsContent>

          <TabsContent value="asset-request" className="mt-0">
            <BMSAssetRequestTab />
          </TabsContent>

          <TabsContent value="advance" className="mt-0">
            <BMSAdvanceRequestTab />
          </TabsContent>

          <TabsContent value="leave" className="mt-0">
            <BMSLeaveApplicationTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
