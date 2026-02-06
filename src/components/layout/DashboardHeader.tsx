'use client';

import React from 'react';
import { Bell, Settings, User, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

import { useSession } from '@/contexts/SessionContext';
import { Save, RefreshCw } from 'lucide-react';

export function DashboardHeader({ title, description, actions }: DashboardHeaderProps) {
  const { saveSession, resetSession, isSaving } = useSession();

  return (
    <header className="bg-white border-b-2 border-gray-200 px-8 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Title + Search */}
        <div className="flex items-center gap-6">
          {/* Page Title */}
          <div>
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            {description && <p className="text-sm text-gray-500">{description}</p>}
          </div>
          {/* Search Bar */}
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="search"
              placeholder="Search"
              className="w-full pl-10 pr-4 py-2 text-base bg-gray-100 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              aria-label="Search"
            />
          </div>
        </div>

        {/* Right: Actions + Icons + User */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 mr-2">
            <Button variant="outline" size="sm" onClick={resetSession} className="text-red-500 border-red-200 hover:bg-red-50" title="Clear current session data">
              <RefreshCw className="w-4 h-4 mr-2" /> Reset
            </Button>
            <Button size="sm" onClick={saveSession} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white" title="Commit session data to database">
              <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Saving...' : 'Save Stats'}
            </Button>
          </div>
          {actions}

          {/* Notification Bell */}
          <div className="relative">
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell className="w-5 h-5 text-gray-600" />
            </Button>
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true"></span>
          </div>

          {/* Settings */}
          <Button variant="ghost" size="icon" aria-label="Settings">
            <Settings className="w-5 h-5 text-gray-600" />
          </Button>

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-4 border-l-2 border-gray-200">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
