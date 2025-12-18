import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Users, Clock, MapPin, Store, Package, MessageSquare, ClipboardCheck } from 'lucide-react';
import { EmployeeAllocationsTab } from '@/components/admin/market-manager/EmployeeAllocationsTab';
import { PunchRecordsTab } from '@/components/admin/market-manager/PunchRecordsTab';
import { LandSearchTab } from '@/components/admin/market-manager/LandSearchTab';
import { StallSearchTab } from '@/components/admin/market-manager/StallSearchTab';
import { AssetsTab } from '@/components/admin/market-manager/AssetsTab';
import { FeedbacksTab } from '@/components/admin/market-manager/FeedbacksTab';
import { InspectionsTab } from '@/components/admin/market-manager/InspectionsTab';

const menuItems = [
  { id: 'allocations', label: 'Allocations', icon: Users, color: 'bg-blue-500/10 text-blue-500' },
  { id: 'punch', label: 'Punch Records', icon: Clock, color: 'bg-green-500/10 text-green-500' },
  { id: 'land', label: 'Land Search', icon: MapPin, color: 'bg-orange-500/10 text-orange-500' },
  { id: 'stalls', label: 'Stall Search', icon: Store, color: 'bg-purple-500/10 text-purple-500' },
  { id: 'assets', label: 'Assets', icon: Package, color: 'bg-cyan-500/10 text-cyan-500' },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare, color: 'bg-pink-500/10 text-pink-500' },
  { id: 'inspections', label: 'Inspections', icon: ClipboardCheck, color: 'bg-amber-500/10 text-amber-500' },
];

export default function MarketManagerReporting() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('allocations');

  const renderContent = () => {
    switch (activeTab) {
      case 'allocations':
        return <EmployeeAllocationsTab />;
      case 'punch':
        return <PunchRecordsTab />;
      case 'land':
        return <LandSearchTab />;
      case 'stalls':
        return <StallSearchTab />;
      case 'assets':
        return <AssetsTab />;
      case 'feedback':
        return <FeedbacksTab />;
      case 'inspections':
        return <InspectionsTab />;
      default:
        return <EmployeeAllocationsTab />;
    }
  };

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

      {/* Rounded Tiles Navigation */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <Card
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`cursor-pointer p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-200 hover:scale-105 ${
                isActive 
                  ? 'ring-2 ring-primary bg-primary/10 shadow-lg' 
                  : 'hover:shadow-md hover:bg-accent/50'
              }`}
            >
              <div className={`p-2 rounded-full ${item.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={`text-xs font-medium text-center ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {item.label}
              </span>
            </Card>
          );
        })}
      </div>

      {/* Content Section */}
      <div className="animate-fade-in">
        {renderContent()}
      </div>
    </div>
  );
}
