'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { FileText, Eye, Edit, Send, Globe, Twitter, MessageSquare } from 'lucide-react';
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
import type { ContentOutput } from '@/lib/types';

interface OutputsTableProps {
  outputs: ContentOutput[];
}

const statusColors: Record<string, string> = {
  draft: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  ready: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  published: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

const targetIcons: Record<string, React.ElementType> = {
  site: Globe,
  x: Twitter,
  reddit: MessageSquare,
};

const targetColors: Record<string, string> = {
  site: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  x: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  reddit: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

export function OutputsTable({ outputs }: OutputsTableProps) {
  if (outputs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-zinc-800 p-4 mb-4">
          <FileText className="h-8 w-8 text-zinc-500" />
        </div>
        <h3 className="text-lg font-medium text-white mb-1">No outputs yet</h3>
        <p className="text-sm text-zinc-500">
          Generate content from topics to see outputs here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
            <TableHead className="text-zinc-400">Topic</TableHead>
            <TableHead className="text-zinc-400">Target</TableHead>
            <TableHead className="text-zinc-400">Title</TableHead>
            <TableHead className="text-zinc-400">Status</TableHead>
            <TableHead className="text-zinc-400">Created</TableHead>
            <TableHead className="text-zinc-400 w-32">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {outputs.map((output) => {
            const TargetIcon = targetIcons[output.target] || FileText;
            return (
              <TableRow
                key={output.id}
                className="border-zinc-800 hover:bg-zinc-900/50"
              >
                <TableCell className="font-medium text-white">
                  {(output as ContentOutput & { topic_keyword?: string }).topic_keyword || `Topic #${output.topic_id}`}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`gap-1 ${targetColors[output.target] || targetColors.site}`}
                  >
                    <TargetIcon className="h-3 w-3" />
                    {output.target.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-zinc-300 max-w-xs truncate">
                  {output.title || output.body.substring(0, 50) + '...'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={statusColors[output.status] || statusColors.draft}
                  >
                    {output.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-zinc-400 text-sm">
                  {formatDistanceToNow(new Date(output.created_at * 1000), {
                    addSuffix: true,
                  })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Link href={`/outputs/${output.id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/outputs/${output.id}?edit=true`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    {output.status !== 'published' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

