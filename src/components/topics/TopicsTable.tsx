'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Sparkles, ExternalLink, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Topic } from '@/lib/types';
import { GenerateDialog } from './GenerateDialog';

interface TopicsTableProps {
  topics: Topic[];
  onGenerate: (topicId: number, targets: string[]) => Promise<void>;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  published: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export function TopicsTable({ topics, onGenerate }: TopicsTableProps) {
  const [selectedTopics, setSelectedTopics] = useState<number[]>([]);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedTopicForGenerate, setSelectedTopicForGenerate] = useState<Topic | null>(null);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTopics(topics.map((t) => t.id));
    } else {
      setSelectedTopics([]);
    }
  };

  const handleSelect = (topicId: number, checked: boolean) => {
    if (checked) {
      setSelectedTopics([...selectedTopics, topicId]);
    } else {
      setSelectedTopics(selectedTopics.filter((id) => id !== topicId));
    }
  };

  const openGenerateDialog = (topic: Topic) => {
    setSelectedTopicForGenerate(topic);
    setGenerateDialogOpen(true);
  };

  const handleGenerate = async (targets: string[]) => {
    if (selectedTopicForGenerate) {
      await onGenerate(selectedTopicForGenerate.id, targets);
      setGenerateDialogOpen(false);
      setSelectedTopicForGenerate(null);
    }
  };

  if (topics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-zinc-800 p-4 mb-4">
          <Sparkles className="h-8 w-8 text-zinc-500" />
        </div>
        <h3 className="text-lg font-medium text-white mb-1">No topics yet</h3>
        <p className="text-sm text-zinc-500">
          Click "Fetch Trends" in the header to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedTopics.length === topics.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="text-zinc-400">Keyword</TableHead>
              <TableHead className="text-zinc-400">Source</TableHead>
              <TableHead className="text-zinc-400">Score</TableHead>
              <TableHead className="text-zinc-400">Status</TableHead>
              <TableHead className="text-zinc-400">Fetched</TableHead>
              <TableHead className="text-zinc-400 w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topics.map((topic) => (
              <TableRow
                key={topic.id}
                className="border-zinc-800 hover:bg-zinc-900/50"
              >
                <TableCell>
                  <Checkbox
                    checked={selectedTopics.includes(topic.id)}
                    onCheckedChange={(checked) =>
                      handleSelect(topic.id, checked as boolean)
                    }
                  />
                </TableCell>
                <TableCell className="font-medium text-white">
                  {topic.keyword}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className="bg-zinc-800/50 text-zinc-300 border-zinc-700"
                  >
                    {topic.source_name || 'Unknown'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                        style={{ width: `${Math.min(topic.score, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm text-zinc-400">
                      {topic.score.toFixed(0)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={statusColors[topic.status] || statusColors.pending}
                  >
                    {topic.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-zinc-400 text-sm">
                  {formatDistanceToNow(new Date(topic.fetched_at * 1000), {
                    addSuffix: true,
                  })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openGenerateDialog(topic)}
                      disabled={topic.status === 'completed'}
                      className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-zinc-900 border-zinc-700"
                      >
                        <Link href={`/topics/${topic.id}`}>
                          <DropdownMenuItem className="text-zinc-300 focus:bg-zinc-800 focus:text-white cursor-pointer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                        </Link>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <GenerateDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        topic={selectedTopicForGenerate}
        onGenerate={handleGenerate}
      />
    </>
  );
}

