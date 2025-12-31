'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  TrendingUp,
  FileText,
  Send,
  Settings,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Topics', href: '/topics', icon: TrendingUp },
  { name: 'Outputs', href: '/outputs', icon: FileText },
  { name: 'Publishes', href: '/publishes', icon: Send },
];

const secondaryNavigation = [
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-zinc-950 border-r border-zinc-800">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b border-zinc-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
          Postrella
        </span>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full justify-start gap-3 font-medium transition-all',
                    isActive
                      ? 'bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 hover:text-violet-300'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Button>
              </Link>
            );
          })}
        </nav>

        <Separator className="my-4 bg-zinc-800" />

        <nav className="space-y-1">
          {secondaryNavigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full justify-start gap-3 font-medium transition-all',
                    isActive
                      ? 'bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 hover:text-violet-300'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-zinc-800 p-4">
        <p className="text-xs text-zinc-500 text-center">
          Trend → Content → Publish
        </p>
      </div>
    </div>
  );
}

