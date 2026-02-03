'use client';

import React from 'react';
import { Bell, HelpCircle, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function DashboardHeader({ title, description, actions }: DashboardHeaderProps) {
  return (
    <header className="bg-white border-b-2 border-bg-tertiary px-8 py-6">
      <div className="flex items-center justify-between">
        {/* Page Title */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
          {description && (
            <p className="text-lg text-text-secondary mt-1">{description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {actions}

          {/* Notification Bell */}
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="w-6 h-6 text-text-secondary" />
          </Button>

          {/* Help */}
          <Button variant="ghost" size="icon" aria-label="Help">
            <HelpCircle className="w-6 h-6 text-text-secondary" />
          </Button>

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-4 border-l-2 border-bg-tertiary">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="hidden md:block">
              <p className="text-base font-semibold text-text-primary">General Manager</p>
              <p className="text-sm text-text-secondary">Admin</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
