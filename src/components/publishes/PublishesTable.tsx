'use client';

import { formatDistanceToNow } from 'date-fns';
import { 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ExternalLink,
  Globe,
  Twitter,
  MessageSquare
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Publish } from '@/lib/types';

interface PublishesTableProps {
  publishes: Publish[];
}

const statusConfig: Record<string, { icon: React.ElementType; color: string }> = {
  pending: { icon: Clock, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  published: { icon: CheckCircle, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  failed: { icon: XCircle, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

const platformIcons: Record<string, React.ElementType> = {
  site: Globe,
  x: Twitter,
  reddit: MessageSquare,
};

const platformColors: Record<string, string> = {
  site: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  x: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  reddit: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

export function PublishesTable({ publishes }: PublishesTableProps) {
  if (publishes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-zinc-800 p-4 mb-4">
          <Send className="h-8 w-8 text-zinc-500" />
        </div>
        <h3 className="text-lg font-medium text-white mb-1">No publishes yet</h3>
        <p className="text-sm text-zinc-500">
          Publish content from the Outputs page to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
            <TableHead className="text-zinc-400">Output</TableHead>
            <TableHead className="text-zinc-400">Platform</TableHead>
            <TableHead className="text-zinc-400">Status</TableHead>
            <TableHead className="text-zinc-400">URL</TableHead>
            <TableHead className="text-zinc-400">Published</TableHead>
            <TableHead className="text-zinc-400">Error</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {publishes.map((publish) => {
            const statusInfo = statusConfig[publish.status] || statusConfig.pending;
            const StatusIcon = statusInfo.icon;
            const PlatformIcon = platformIcons[publish.platform] || Globe;

            return (
              <TableRow
                key={publish.id}
                className="border-zinc-800 hover:bg-zinc-900/50"
              >
                <TableCell className="font-medium text-white">
                  {(publish as Publish & { output_title?: string }).output_title || `Output #${publish.output_id}`}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`gap-1 ${platformColors[publish.platform] || platformColors.site}`}
                  >
                    <PlatformIcon className="h-3 w-3" />
                    {publish.platform.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`gap-1 ${statusInfo.color}`}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {publish.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {publish.url ? (
                    <a
                      href={publish.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-violet-400 hover:text-violet-300"
                    >
                      <span className="truncate max-w-xs">{publish.url}</span>
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  ) : (
                    <span className="text-zinc-500">-</span>
                  )}
                </TableCell>
                <TableCell className="text-zinc-400 text-sm">
                  {publish.published_at
                    ? formatDistanceToNow(new Date(publish.published_at * 1000), {
                        addSuffix: true,
                      })
                    : publish.scheduled_at
                    ? `Scheduled: ${new Date(publish.scheduled_at * 1000).toLocaleString()}`
                    : '-'}
                </TableCell>
                <TableCell>
                  {publish.error ? (
                    <span className="text-red-400 text-sm truncate max-w-xs block">
                      {publish.error}
                    </span>
                  ) : (
                    <span className="text-zinc-500">-</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

