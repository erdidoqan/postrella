'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import workerClient from '@/lib/worker-client';
import type { ContentOutput } from '@/lib/types';

interface MastodonPublishButtonProps {
  output: ContentOutput;
  onPublish: (visibility?: 'public' | 'unlisted' | 'private' | 'direct', spoilerText?: string, imageUrl?: string) => Promise<void>;
}

export function MastodonPublishButton({ output, onPublish }: MastodonPublishButtonProps) {
  const [open, setOpen] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private' | 'direct'>('public');
  const [spoilerText, setSpoilerText] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [publishing, setPublishing] = useState(false);

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const finalImageUrl = customImageUrl.trim() || imageUrl || undefined;
      const finalSpoilerText = spoilerText.trim() || undefined;
      await onPublish(visibility, finalSpoilerText, finalImageUrl);
      setOpen(false);
      // Reset form
      setSpoilerText('');
      setCustomImageUrl('');
      setVisibility('public');
    } finally {
      setPublishing(false);
    }
  };

  // Get metadata from output for preview
  const metadata = output.metadata || {};
  const imageUrl = metadata.featured_image_url || metadata.featured_image;
  const hasImage = !!(customImageUrl.trim() || imageUrl);

  // Build preview text
  let previewText = '';
  if (output.title) {
    previewText += `${output.title}\n\n`;
  }
  const bodyText = output.body || '';
  previewText += bodyText.length > 200 ? bodyText.substring(0, 197) + '...' : bodyText;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline"
          className="border-violet-500/50 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 hover:text-violet-300"
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.268 5.313c-.35-1.24-1.472-2.213-2.724-2.55C19.24 2.56 12 2.56 12 2.56s-7.24 0-8.544.203C2.203 3.1 1.082 4.073.73 5.313 0 7.62 0 12.005 0 12.005s0 4.384.73 6.692c.35 1.24 1.472 2.212 2.724 2.55 1.304.203 8.544.203 8.544.203s7.24 0 8.544-.203c1.253-.338 2.375-1.31 2.724-2.55.73-2.308.73-6.692.73-6.692s0-4.384-.73-6.692zm-13.462 7.403V8.288l6.266 3.47-6.266 3.47z"/>
          </svg>
          Toot to Mastodon
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg className="h-5 w-5 text-violet-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.268 5.313c-.35-1.24-1.472-2.213-2.724-2.55C19.24 2.56 12 2.56 12 2.56s-7.24 0-8.544.203C2.203 3.1 1.082 4.073.73 5.313 0 7.62 0 12.005 0 12.005s0 4.384.73 6.692c.35 1.24 1.472 2.212 2.724 2.55 1.304.203 8.544.203 8.544.203s7.24 0 8.544-.203c1.253-.338 2.375-1.31 2.724-2.55.73-2.308.73-6.692.73-6.692s0-4.384-.73-6.692zm-13.462 7.403V8.288l6.266 3.47-6.266 3.47z"/>
            </svg>
            Toot to Mastodon
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Share this content as a status on Mastodon
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Content Preview */}
          <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
            <div className="flex gap-3">
              {(customImageUrl.trim() || imageUrl) && (
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-zinc-700 flex-shrink-0">
                  <img 
                    src={customImageUrl.trim() || imageUrl} 
                    alt="Status preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">
                  {output.title || 'Untitled'}
                </p>
                <p className="text-sm text-zinc-400 line-clamp-3">
                  {metadata.excerpt || output.body?.substring(0, 150) || 'No content'}
                </p>
              </div>
            </div>
          </div>

          {/* Visibility Selection */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Visibility</Label>
            <Select value={visibility} onValueChange={(v) => setVisibility(v as typeof visibility)}>
              <SelectTrigger className="border-zinc-700 bg-zinc-800 text-zinc-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="public" className="text-zinc-300 focus:bg-zinc-800">
                  Public - Visible to everyone
                </SelectItem>
                <SelectItem value="unlisted" className="text-zinc-300 focus:bg-zinc-800">
                  Unlisted - Visible to everyone, but not in timelines
                </SelectItem>
                <SelectItem value="private" className="text-zinc-300 focus:bg-zinc-800">
                  Followers Only - Visible to followers only
                </SelectItem>
                <SelectItem value="direct" className="text-zinc-300 focus:bg-zinc-800">
                  Direct - Visible to mentioned users only
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content Warning (Spoiler Text) */}
          <div className="space-y-2">
            <Label className="text-zinc-300">
              Content Warning <span className="text-zinc-500">(optional)</span>
            </Label>
            <Input
              value={spoilerText}
              onChange={(e) => setSpoilerText(e.target.value)}
              placeholder="e.g., Sensitive content, Spoilers, etc."
              className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
            />
            <p className="text-xs text-zinc-500">
              If provided, the status will be hidden behind a content warning
            </p>
          </div>

          {/* Image URL */}
          <div className="space-y-2">
            <Label className="text-zinc-300">
              Image URL <span className="text-zinc-500">(optional)</span>
            </Label>
            <Input
              value={customImageUrl}
              onChange={(e) => setCustomImageUrl(e.target.value)}
              placeholder={imageUrl || "Enter image URL"}
              className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
            />
            {imageUrl && (
              <p className="text-xs text-zinc-500">
                Featured image available: {imageUrl.substring(0, 50)}...
              </p>
            )}
          </div>

          {/* Status Preview */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Status Preview</Label>
            <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
              <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words">
                {previewText}
              </p>
              <p className="text-xs text-zinc-500 mt-2">
                Character count: {previewText.length} (Mastodon limit: 5000)
              </p>
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
          <Button
            onClick={handlePublish}
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
                Publish Toot
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

