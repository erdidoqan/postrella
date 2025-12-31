'use client';

import { useState } from 'react';
import { Sparkles, Globe, Twitter, MessageSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { Topic } from '@/lib/types';

interface GenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic: Topic | null;
  onGenerate: (targets: string[]) => Promise<void>;
}

const targets = [
  { id: 'site', label: 'Site Article', icon: Globe, description: 'SEO-optimized blog post' },
  { id: 'x', label: 'X Post', icon: Twitter, description: 'Short tweet with hashtags' },
  { id: 'reddit', label: 'Reddit Post', icon: MessageSquare, description: 'Value-focused discussion post' },
];

export function GenerateDialog({
  open,
  onOpenChange,
  topic,
  onGenerate,
}: GenerateDialogProps) {
  const [selectedTargets, setSelectedTargets] = useState<string[]>(['site', 'x', 'reddit']);
  const [loading, setLoading] = useState(false);

  const handleTargetChange = (targetId: string, checked: boolean) => {
    if (checked) {
      setSelectedTargets([...selectedTargets, targetId]);
    } else {
      setSelectedTargets(selectedTargets.filter((t) => t !== targetId));
    }
  };

  const handleGenerate = async () => {
    if (selectedTargets.length === 0) return;

    setLoading(true);
    try {
      await onGenerate(selectedTargets);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-400" />
            Generate Content
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Generate AI content for{' '}
            <span className="text-violet-400 font-medium">
              &ldquo;{topic?.keyword}&rdquo;
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-zinc-400">Select content types to generate:</p>
          
          <div className="space-y-3">
            {targets.map((target) => {
              const Icon = target.icon;
              return (
                <div
                  key={target.id}
                  className="flex items-center gap-4 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 transition-colors hover:border-zinc-600"
                >
                  <Checkbox
                    id={target.id}
                    checked={selectedTargets.includes(target.id)}
                    onCheckedChange={(checked) =>
                      handleTargetChange(target.id, checked as boolean)
                    }
                  />
                  <div className="rounded-lg bg-violet-600/20 p-2">
                    <Icon className="h-5 w-5 text-violet-400" />
                  </div>
                  <Label
                    htmlFor={target.id}
                    className="flex-1 cursor-pointer"
                  >
                    <p className="font-medium text-white">{target.label}</p>
                    <p className="text-sm text-zinc-400">{target.description}</p>
                  </Label>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={selectedTargets.length === 0 || loading}
            className="bg-violet-600 text-white hover:bg-violet-700"
          >
            {loading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate ({selectedTargets.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

