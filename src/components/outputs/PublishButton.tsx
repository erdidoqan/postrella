'use client';

import { useState } from 'react';
import { Send, Calendar, Clock, Globe, Twitter, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { ContentOutput } from '@/lib/types';

interface PublishButtonProps {
  output: ContentOutput;
  onPublish: (platform: string, scheduledAt?: number) => Promise<void>;
}

const platforms = [
  { id: 'site', label: 'Site', icon: Globe, color: 'bg-blue-500/20 text-blue-400' },
  { id: 'x', label: 'X/Twitter', icon: Twitter, color: 'bg-sky-500/20 text-sky-400' },
  { id: 'reddit', label: 'Reddit', icon: MessageSquare, color: 'bg-orange-500/20 text-orange-400' },
];

export function PublishButton({ output, onPublish }: PublishButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'site' | 'x' | 'reddit'>(output.target);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [publishing, setPublishing] = useState(false);

  const handlePublish = async (immediate: boolean) => {
    setPublishing(true);
    try {
      let scheduledAt: number | undefined;
      if (!immediate && scheduleDate && scheduleTime) {
        scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).getTime() / 1000;
      }
      await onPublish(selectedPlatform, scheduledAt);
      setOpen(false);
    } finally {
      setPublishing(false);
    }
  };

  const currentPlatform = platforms.find((p) => p.id === output.target);
  const PlatformIcon = currentPlatform?.icon || Globe;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-violet-600 text-white hover:bg-violet-700">
          <Send className="mr-2 h-4 w-4" />
          Publish
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-violet-400" />
            Publish Content
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Publish this content to your connected platforms
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Output Info */}
          <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${currentPlatform?.color}`}>
                <PlatformIcon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">
                  {output.title || 'Untitled'}
                </p>
                <p className="text-sm text-zinc-400">
                  {output.target.toUpperCase()} • {output.status}
                </p>
              </div>
            </div>
          </div>

          {/* Platform Selection */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Target Platform</Label>
            <div className="flex gap-2">
              {platforms.map((platform) => {
                const Icon = platform.icon;
                const isSelected = selectedPlatform === platform.id;
                const isOutputPlatform = output.target === platform.id;

                return (
                  <Button
                    key={platform.id}
                    variant="outline"
                    onClick={() => setSelectedPlatform(platform.id as 'site' | 'x' | 'reddit')}
                    disabled={!isOutputPlatform}
                    className={`flex-1 gap-2 ${
                      isSelected
                        ? 'border-violet-500 bg-violet-500/10 text-violet-400'
                        : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                    } ${!isOutputPlatform ? 'opacity-50' : ''}`}
                  >
                    <Icon className="h-4 w-4" />
                    {platform.label}
                    {isOutputPlatform && (
                      <Badge className="bg-zinc-700 text-xs">Match</Badge>
                    )}
                  </Button>
                );
              })}
            </div>
            <p className="text-xs text-zinc-500">
              Content can only be published to its target platform
            </p>
          </div>

          {/* Schedule Option */}
          <div className="space-y-2">
            <Label className="text-zinc-300 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule (optional)
            </Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="border-zinc-700 bg-zinc-800 text-white"
              />
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="border-zinc-700 bg-zinc-800 text-white"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
          >
            Cancel
          </Button>
          {scheduleDate && scheduleTime ? (
            <Button
              onClick={() => handlePublish(false)}
              disabled={publishing}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {publishing ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  Schedule
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => handlePublish(true)}
              disabled={publishing}
              className="bg-violet-600 text-white hover:bg-violet-700"
            >
              {publishing ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Publish Now
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

