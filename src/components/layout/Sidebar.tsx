'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  TrendingUp,
  Search,
  AlertTriangle,
  Building2,
  FileText,
  Upload,
  Settings,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  description?: string;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: <LayoutDashboard className="w-6 h-6" />,
    description: 'Overview & KPIs',
  },
  {
    label: 'Trends',
    href: '/trends',
    icon: <TrendingUp className="w-6 h-6" />,
    description: 'Rejection trends',
  },
  {
    label: 'Defect Analysis',
    href: '/analysis',
    icon: <Search className="w-6 h-6" />,
    description: 'Root cause analysis',
  },
  {
    label: 'Batch Risk',
    href: '/batch-risk',
    icon: <AlertTriangle className="w-6 h-6" />,
    description: 'High-risk batches',
  },
  {
    label: 'Suppliers',
    href: '/supplier',
    icon: <Building2 className="w-6 h-6" />,
    description: 'Supplier quality',
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: <FileText className="w-6 h-6" />,
    description: 'Generate reports',
  },
];

const secondaryNavItems: NavItem[] = [
  {
    label: 'Upload Data',
    href: '/settings/upload',
    icon: <Upload className="w-6 h-6" />,
    description: 'Import Excel files',
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: <Settings className="w-6 h-6" />,
    description: 'Configuration',
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-72 bg-white border-r-2 border-bg-tertiary flex flex-col h-screen sticky top-0"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="p-6 border-b-2 border-bg-tertiary">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-2xl">R</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">RAIS</h1>
            <p className="text-sm text-text-secondary">Quality Dashboard</p>
          </div>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-2">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} isActive={pathname === item.href} />
          ))}
        </div>

        {/* Divider */}
        <div className="my-6 border-t-2 border-bg-tertiary" />

        {/* Secondary Navigation */}
        <div className="space-y-2">
          {secondaryNavItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
            />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t-2 border-bg-tertiary">
        <div className="text-sm text-text-tertiary text-center">
          <p>Manufacturing Quality System</p>
          <p className="mt-1">v2.0.0</p>
        </div>
      </div>
    </aside>
  );
}

interface NavLinkProps {
  item: NavItem;
  isActive: boolean;
}

function NavLink({ item, isActive }: NavLinkProps) {
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-4 px-4 py-4 rounded-xl text-lg font-medium transition-all',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        isActive
          ? 'bg-primary text-white shadow-md'
          : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className={cn(isActive ? 'text-white' : 'text-text-tertiary')}>
        {item.icon}
      </span>
      <span>{item.label}</span>
    </Link>
  );
}
