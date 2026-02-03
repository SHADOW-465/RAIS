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
      className="w-64 bg-gray-50 border-r-2 border-gray-200 flex flex-col h-screen sticky top-0"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="p-6 border-b-2 border-gray-200 bg-white">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-2xl">R</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-black">RAIS</h1>
            <p className="text-sm text-gray-600">Quality Dashboard</p>
          </div>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} isActive={pathname === item.href} />
          ))}
        </div>

        {/* Divider */}
        <div className="my-6 border-t-2 border-gray-200" />

        {/* Secondary Navigation */}
        <div className="space-y-1">
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
      <div className="p-4 border-t-2 border-gray-200">
        <div className="text-sm text-gray-500 text-center">
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
        'flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        isActive
          ? 'bg-primary text-white shadow-sm'
          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className={cn(isActive ? 'text-white' : 'text-gray-500')}>
        {item.icon}
      </span>
      <span>{item.label}</span>
    </Link>
  );
}
