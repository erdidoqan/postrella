'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Eye, Edit } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OutputPreview } from '@/components/outputs/OutputPreview';
import { OutputEditor } from '@/components/outputs/OutputEditor';
import { PublishButton } from '@/components/outputs/PublishButton';
import { PinterestPublishButton } from '@/components/outputs/PinterestPublishButton';
import { MastodonPublishButton } from '@/components/outputs/MastodonPublishButton';
import workerClient from '@/lib/worker-client';
import type { ContentOutput, UpdateOutputRequest } from '@/lib/types';

export default function OutputDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = Number(params.id);
  const isEditMode = searchParams.get('edit') === 'true';

  const [output, setOutput] = useState<ContentOutput | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOutput() {
      try {
        const response = await workerClient.getOutput(id);
        if (response.success && response.data) {
          setOutput(response.data);
        }
      } catch (error) {
        console.error('Failed to load output:', error);
      } finally {
        setLoading(false);
      }
    }

    loadOutput();
  }, [id]);

  const handleSave = async (data: UpdateOutputRequest) => {
    try {
      const response = await workerClient.updateOutput(id, data);
      if (response.success && response.data) {
        setOutput(response.data);
        alert('Changes saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save output:', error);
      alert('Failed to save changes.');
    }
  };

  const handlePublish = async (platform: string, scheduledAt?: number) => {
    try {
      const response = await workerClient.publish({
        output_id: id,
        platform: platform as 'site' | 'x' | 'reddit',
        scheduled_at: scheduledAt,
      });
      if (response.success) {
        alert(scheduledAt ? 'Content scheduled!' : 'Content published!');
        // Reload output to get updated status
        const updatedResponse = await workerClient.getOutput(id);
        if (updatedResponse.success && updatedResponse.data) {
          setOutput(updatedResponse.data);
        }
      }
    } catch (error) {
      console.error('Failed to publish:', error);
      alert('Failed to publish content.');
    }
  };

  const handlePinterestPublish = async (boardId?: string, imageUrl?: string, linkUrl?: string) => {
    try {
      const response = await workerClient.publishToPinterest(id, boardId, imageUrl, linkUrl);
      if (response.success) {
        alert('Pin published to Pinterest!');
        // Reload output to get updated status
        const updatedResponse = await workerClient.getOutput(id);
        if (updatedResponse.success && updatedResponse.data) {
          setOutput(updatedResponse.data);
        }
      } else {
        alert(`Failed to publish to Pinterest: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to publish to Pinterest:', error);
      alert('Failed to publish to Pinterest.');
    }
  };

  const handleMastodonPublish = async (visibility?: 'public' | 'unlisted' | 'private' | 'direct', spoilerText?: string, imageUrl?: string) => {
    try {
      const response = await workerClient.publishToMastodon(id, visibility, spoilerText, imageUrl);
      if (response.success) {
        alert('Status published to Mastodon!');
        // Reload output to get updated status
        const updatedResponse = await workerClient.getOutput(id);
        if (updatedResponse.success && updatedResponse.data) {
          setOutput(updatedResponse.data);
        }
      } else {
        alert(`Failed to publish to Mastodon: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to publish to Mastodon:', error);
      alert('Failed to publish to Mastodon.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  if (!output) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">Output not found</p>
        <Link href="/outputs">
          <Button variant="link" className="text-violet-400">
            Back to Outputs
          </Button>
        </Link>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    ready: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    published: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/outputs">
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">
                {output.title || 'Untitled Output'}
              </h1>
              <Badge
                variant="outline"
                className={statusColors[output.status] || statusColors.draft}
              >
                {output.status}
              </Badge>
            </div>
            <p className="text-zinc-400 text-sm">
              {output.target.toUpperCase()} • Output #{output.id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEditMode ? (
            <Button
              variant="outline"
              onClick={() => router.push(`/outputs/${id}?edit=true`)}
              className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => router.push(`/outputs/${id}`)}
              className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          )}
          {output.status !== 'published' && (
            <PublishButton output={output} onPublish={handlePublish} />
          )}
          <PinterestPublishButton output={output} onPublish={handlePinterestPublish} />
          <MastodonPublishButton output={output} onPublish={handleMastodonPublish} />
        </div>
      </div>

      {/* Content */}
      {isEditMode ? (
        <OutputEditor output={output} onSave={handleSave} />
      ) : (
        <OutputPreview output={output} />
      )}
    </div>
  );
}

