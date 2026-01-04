'use client';

import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import workerClient from '@/lib/worker-client';
import type { ContentOutput } from '@/lib/types';

interface PinterestPublishButtonProps {
  output: ContentOutput;
  onPublish: (boardId?: string, imageUrl?: string, linkUrl?: string) => Promise<void>;
}

interface PinterestBoard {
  id: string;
  name: string;
}

export function PinterestPublishButton({ output, onPublish }: PinterestPublishButtonProps) {
  const [open, setOpen] = useState(false);
  const [boards, setBoards] = useState<PinterestBoard[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<string>('');
  const [publishing, setPublishing] = useState(false);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [customLinkUrl, setCustomLinkUrl] = useState('');

  useEffect(() => {
    if (open) {
      loadBoards();
    }
  }, [open]);

  const loadBoards = async () => {
    setLoadingBoards(true);
    try {
      const response = await workerClient.getPinterestBoards();
      if (response.success && response.data) {
        setBoards(response.data);
        if (response.data.length > 0) {
          setSelectedBoard(response.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load Pinterest boards:', error);
    } finally {
      setLoadingBoards(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const finalImageUrl = customImageUrl.trim() || imageUrl || undefined;
      const finalLinkUrl = customLinkUrl.trim() || undefined;
      await onPublish(selectedBoard || undefined, finalImageUrl, finalLinkUrl);
      setOpen(false);
    } finally {
      setPublishing(false);
    }
  };

  // Get metadata from output for preview
  const metadata = output.metadata || {};
  const imageUrl = metadata.featured_image_url || metadata.featured_image;
  const hasImage = !!(customImageUrl.trim() || imageUrl);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline"
          className="border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300"
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0a12 12 0 0 0-4.37 23.17c-.1-.94-.2-2.4.04-3.43l1.43-6.08s-.36-.72-.36-1.8c0-1.68.97-2.94 2.19-2.94 1.03 0 1.53.77 1.53 1.7 0 1.04-.66 2.6-1 4.04-.29 1.2.61 2.2 1.8 2.2 2.17 0 3.84-2.29 3.84-5.6 0-2.93-2.1-4.97-5.1-4.97-3.47 0-5.5 2.6-5.5 5.3 0 1.05.4 2.17.91 2.78.1.12.11.23.08.35l-.34 1.36c-.05.22-.18.27-.41.16-1.52-.71-2.47-2.93-2.47-4.72 0-3.83 2.78-7.36 8.03-7.36 4.22 0 7.5 3 7.5 7.02 0 4.19-2.64 7.56-6.31 7.56-1.23 0-2.39-.64-2.78-1.4l-.76 2.9c-.28 1.07-1.03 2.42-1.54 3.24A12 12 0 1 0 12 0z"/>
          </svg>
          Pin to Pinterest
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0a12 12 0 0 0-4.37 23.17c-.1-.94-.2-2.4.04-3.43l1.43-6.08s-.36-.72-.36-1.8c0-1.68.97-2.94 2.19-2.94 1.03 0 1.53.77 1.53 1.7 0 1.04-.66 2.6-1 4.04-.29 1.2.61 2.2 1.8 2.2 2.17 0 3.84-2.29 3.84-5.6 0-2.93-2.1-4.97-5.1-4.97-3.47 0-5.5 2.6-5.5 5.3 0 1.05.4 2.17.91 2.78.1.12.11.23.08.35l-.34 1.36c-.05.22-.18.27-.41.16-1.52-.71-2.47-2.93-2.47-4.72 0-3.83 2.78-7.36 8.03-7.36 4.22 0 7.5 3 7.5 7.02 0 4.19-2.64 7.56-6.31 7.56-1.23 0-2.39-.64-2.78-1.4l-.76 2.9c-.28 1.07-1.03 2.42-1.54 3.24A12 12 0 1 0 12 0z"/>
            </svg>
            Pin to Pinterest
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Create a pin from this content on Pinterest
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
                    alt="Pin preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">
                  {output.title || 'Untitled'}
                </p>
                <p className="text-sm text-zinc-400 line-clamp-2">
                  {metadata.excerpt || output.body?.substring(0, 100) || 'No description'}
                </p>
              </div>
            </div>
          </div>

          {/* Board Selection */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Select Board</Label>
            {loadingBoards ? (
              <div className="flex items-center gap-2 text-zinc-400">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-300" />
                Loading boards...
              </div>
            ) : boards.length > 0 ? (
              <Select value={selectedBoard} onValueChange={setSelectedBoard}>
                <SelectTrigger className="border-zinc-700 bg-zinc-800 text-zinc-300">
                  <SelectValue placeholder="Select a board" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {boards.map((board) => (
                    <SelectItem 
                      key={board.id} 
                      value={board.id}
                      className="text-zinc-300 focus:bg-zinc-800"
                    >
                      {board.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-zinc-500 text-sm">
                No boards found. Please connect your Pinterest account in Settings.
              </p>
            )}
          </div>

          {/* Image URL */}
          <div className="space-y-2">
            <Label className="text-zinc-300">
              Image URL {imageUrl && <span className="text-zinc-500">(optional - has featured image)</span>}
            </Label>
            <Input
              value={customImageUrl}
              onChange={(e) => setCustomImageUrl(e.target.value)}
              placeholder={imageUrl || "Enter image URL (required)"}
              className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
            />
          </div>

          {/* Link URL */}
          <div className="space-y-2">
            <Label className="text-zinc-300">
              Destination URL <span className="text-zinc-500">(optional - uses published URL)</span>
            </Label>
            <Input
              value={customLinkUrl}
              onChange={(e) => setCustomLinkUrl(e.target.value)}
              placeholder="Enter destination URL"
              className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
            />
          </div>

          {!hasImage && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <p className="text-amber-400 text-sm">
                ⚠️ No featured image found. Please provide an image URL above.
              </p>
            </div>
          )}
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
            disabled={publishing || boards.length === 0 || !hasImage}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {publishing ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Pinning...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Create Pin
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
