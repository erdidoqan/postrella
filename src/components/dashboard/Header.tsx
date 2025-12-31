'use client';

import { Bell, User, RefreshCw, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useState } from 'react';
import workerClient from '@/lib/worker-client';

export function Header() {
  const [isFetching, setIsFetching] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const handleFetchTrends = async () => {
    setIsFetching(true);
    try {
      const result = await workerClient.fetchTrends();
      if (result.success && result.data) {
        alert(`Fetched ${result.data.pinterest_count} Pinterest + ${result.data.google_trends_count} Google trends!`);
      }
    } catch (error) {
      console.error('Failed to fetch trends:', error);
      alert('Failed to fetch trends. Check console for details.');
    } finally {
      setIsFetching(false);
    }
  };

  const handleRunJobs = async () => {
    setIsRunning(true);
    try {
      const result = await workerClient.runJobs();
      if (result.success && result.data) {
        alert(`Processed ${result.data.processed} jobs, ${result.data.failed} failed.`);
      }
    } catch (error) {
      console.error('Failed to run jobs:', error);
      alert('Failed to run jobs. Check console for details.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6">
      {/* Left side - Quick actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleFetchTrends}
          disabled={isFetching}
          className="gap-2 border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Fetch Trends
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRunJobs}
          disabled={isRunning}
          className="gap-2 border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"
        >
          <Play className={`h-4 w-4 ${isRunning ? 'animate-pulse' : ''}`} />
          Run Jobs
        </Button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <Bell className="h-5 w-5" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-violet-600/20 text-violet-400">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">Admin</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 bg-zinc-900 border-zinc-700"
          >
            <DropdownMenuLabel className="text-zinc-400">
              My Account
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-700" />
            <DropdownMenuItem className="text-zinc-300 focus:bg-zinc-800 focus:text-white cursor-pointer">
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="text-zinc-300 focus:bg-zinc-800 focus:text-white cursor-pointer">
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-700" />
            <DropdownMenuItem className="text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

