'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  Database,
  Settings2,
  Info,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronRight,
  Sparkles,
  Server,
  FileSpreadsheet,
  Shield,
  Bell,
  Palette,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface ConnectionStatus {
  name: string;
  status: 'connected' | 'disconnected' | 'checking';
  message?: string;
}

// ============================================================================
// SETTINGS SECTIONS
// ============================================================================

const settingsSections = [
  {
    id: 'data-management',
    title: 'Data Management',
    description: 'Upload Excel files and manage your rejection data',
    icon: <FileSpreadsheet className="w-8 h-8" />,
    href: '/settings/upload',
    color: 'bg-primary/10 text-primary',
    actions: ['Upload Files', 'View History', 'Manage Data'],
  },
  {
    id: 'integrations',
    title: 'Integrations',
    description: 'Connect external systems and APIs',
    icon: <Server className="w-8 h-8" />,
    href: null, // Coming soon
    color: 'bg-secondary/10 text-secondary',
    actions: ['Supabase', 'Gemini AI', 'Export APIs'],
    comingSoon: true,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Configure alerts and notification preferences',
    icon: <Bell className="w-8 h-8" />,
    href: null,
    color: 'bg-warning/10 text-warning',
    actions: ['Email Alerts', 'Risk Thresholds', 'Daily Digest'],
    comingSoon: true,
  },
  {
    id: 'appearance',
    title: 'Appearance',
    description: 'Customize the dashboard look and feel',
    icon: <Palette className="w-8 h-8" />,
    href: null,
    color: 'bg-purple-100 text-purple-600',
    actions: ['Theme', 'Font Size', 'Contrast'],
    comingSoon: true,
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function SettingsPage() {
  const [connections, setConnections] = useState<ConnectionStatus[]>([
    { name: 'Supabase Database', status: 'checking' },
    { name: 'Gemini AI', status: 'checking' },
  ]);

  // Check connections on mount
  useEffect(() => {
    const checkConnections = async () => {
      // Check Supabase
      try {
        const response = await fetch('/api/analytics/overview?period=7d');
        const supabaseStatus: ConnectionStatus = response.ok
          ? { name: 'Supabase Database', status: 'connected', message: 'Connected' }
          : { name: 'Supabase Database', status: 'disconnected', message: 'Connection failed' };

        setConnections((prev) =>
          prev.map((c) => (c.name === 'Supabase Database' ? supabaseStatus : c))
        );
      } catch {
        setConnections((prev) =>
          prev.map((c) =>
            c.name === 'Supabase Database'
              ? { ...c, status: 'disconnected', message: 'Connection error' }
              : c
          )
        );
      }

      // Check Gemini (via AI endpoint)
      try {
        const response = await fetch('/api/ai/summarize');
        const geminiStatus: ConnectionStatus = response.ok
          ? { name: 'Gemini AI', status: 'connected', message: 'API key configured' }
          : { name: 'Gemini AI', status: 'disconnected', message: 'Check API key' };

        setConnections((prev) =>
          prev.map((c) => (c.name === 'Gemini AI' ? geminiStatus : c))
        );
      } catch {
        setConnections((prev) =>
          prev.map((c) =>
            c.name === 'Gemini AI'
              ? { ...c, status: 'disconnected', message: 'Connection error' }
              : c
          )
        );
      }
    };

    checkConnections();
  }, []);

  const getStatusIcon = (status: ConnectionStatus['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'disconnected':
        return <XCircle className="w-5 h-5 text-danger" />;
      case 'checking':
        return <Loader2 className="w-5 h-5 text-text-secondary animate-spin" />;
    }
  };

  return (
    <>
      <DashboardHeader
        title="Settings"
        description="Configure your dashboard and manage system preferences"
      />

      <div className="flex-1 p-8 overflow-auto bg-bg-secondary">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Quick Navigation Cards */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">Quick Access</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {settingsSections.map((section) => (
                <Card
                  key={section.id}
                  className={`transition-all duration-200 ${
                    section.href
                      ? 'hover:shadow-lg hover:border-primary cursor-pointer'
                      : 'opacity-75'
                  }`}
                >
                  {section.href ? (
                    <Link href={section.href} className="block">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl ${section.color}`}>
                            {section.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-xl font-semibold text-text-primary">
                                {section.title}
                              </h3>
                              <ChevronRight className="w-5 h-5 text-text-secondary" />
                            </div>
                            <p className="text-lg text-text-secondary mt-1">
                              {section.description}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-3">
                              {section.actions.map((action) => (
                                <Badge key={action} variant="outline">
                                  {action}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Link>
                  ) : (
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${section.color}`}>
                          {section.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-semibold text-text-primary">
                              {section.title}
                            </h3>
                            {section.comingSoon && (
                              <Badge variant="secondary">Coming Soon</Badge>
                            )}
                          </div>
                          <p className="text-lg text-text-secondary mt-1">
                            {section.description}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {section.actions.map((action) => (
                              <Badge key={action} variant="outline">
                                {action}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </section>

          {/* System Status */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">System Status</h2>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-6 h-6" />
                  Connection Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {connections.map((connection) => (
                    <div
                      key={connection.name}
                      className="flex items-center justify-between p-4 bg-bg-secondary rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(connection.status)}
                        <div>
                          <p className="text-lg font-medium text-text-primary">
                            {connection.name}
                          </p>
                          {connection.message && (
                            <p className="text-base text-text-secondary">{connection.message}</p>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={
                          connection.status === 'connected'
                            ? 'success'
                            : connection.status === 'checking'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {connection.status === 'checking'
                          ? 'Checking...'
                          : connection.status === 'connected'
                          ? 'Online'
                          : 'Offline'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* About Section */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">About</h2>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-6 h-6" />
                  RAIS Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg text-text-secondary">Version</span>
                      <span className="text-lg font-medium text-text-primary">2.0.0</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-lg text-text-secondary">Last Updated</span>
                      <span className="text-lg font-medium text-text-primary">
                        February 2026
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-lg text-text-secondary">Framework</span>
                      <span className="text-lg font-medium text-text-primary">
                        Next.js 16 + React 19
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg text-text-secondary">Database</span>
                      <span className="text-lg font-medium text-text-primary">Supabase</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-lg text-text-secondary">AI Model</span>
                      <span className="text-lg font-medium text-text-primary flex items-center gap-1">
                        <Sparkles className="w-4 h-4" /> Gemini 2.5 Flash
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-lg text-text-secondary">Accessibility</span>
                      <span className="text-lg font-medium text-text-primary flex items-center gap-1">
                        <Shield className="w-4 h-4" /> WCAG AAA
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-bg-tertiary">
                  <p className="text-lg text-text-secondary">
                    RAIS (Rejection Analysis & Intelligence System) is a manufacturing quality
                    dashboard designed for executives with accessibility in mind. It provides
                    real-time insights, AI-powered analysis, and actionable recommendations.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Quick Actions */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-4">
              <Link href="/settings/upload">
                <Button size="lg" className="text-lg">
                  <Upload className="w-5 h-5 mr-2" />
                  Upload Data
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-lg" disabled>
                <Settings2 className="w-5 h-5 mr-2" />
                Advanced Settings
              </Button>
              <Button size="lg" variant="outline" className="text-lg" disabled>
                <Database className="w-5 h-5 mr-2" />
                Database Tools
              </Button>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
