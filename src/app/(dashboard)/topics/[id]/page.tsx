'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OutputsTable } from '@/components/outputs/OutputsTable';
import { PublishesTable } from '@/components/publishes/PublishesTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import workerClient from '@/lib/worker-client';
import type { Topic, ContentOutput, Publish } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

export default function TopicDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const [topic, setTopic] = useState<Topic | null>(null);
  const [outputs, setOutputs] = useState<ContentOutput[]>([]);
  const [publishes, setPublishes] = useState<Publish[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Load topic
        const topicResponse = await workerClient.getTopic(id);
        if (topicResponse.success && topicResponse.data) {
          setTopic(topicResponse.data);
        }

        // Load outputs for this topic
        const outputsResponse = await workerClient.getOutputs({ topicId: id });
        if (outputsResponse.success && outputsResponse.data) {
          setOutputs(outputsResponse.data);

          // Load publishes for these outputs
          if (outputsResponse.data.length > 0) {
            const outputIds = outputsResponse.data.map(o => o.id);
            const publishesResponse = await workerClient.getPublishes();
            if (publishesResponse.success && publishesResponse.data) {
              const filteredPublishes = publishesResponse.data.filter(p => 
                outputIds.includes(p.output_id)
              );
              setPublishes(filteredPublishes);
            }
          } else {
            setPublishes([]);
          }
        }
      } catch (error) {
        console.error('Failed to load topic data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">Topic not found</p>
        <Link href="/topics">
          <Button variant="link" className="text-violet-400">
            Back to Topics
          </Button>
        </Link>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    published: 'bg-green-500/20 text-green-400 border-green-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/topics">
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
              <TrendingUp className="h-6 w-6 text-violet-400" />
              <h1 className="text-2xl font-bold text-white">
                {topic.keyword}
              </h1>
              <Badge
                variant="outline"
                className={statusColors[topic.status] || statusColors.pending}
              >
                {topic.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-zinc-400">
              <span>Source: {topic.source_name || 'Unknown'}</span>
              <span>•</span>
              <span>Score: {topic.score.toFixed(0)}</span>
              <span>•</span>
              <span>
                Fetched: {formatDistanceToNow(new Date(topic.fetched_at * 1000), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="outputs" className="space-y-4">
        <TabsList className="bg-zinc-900 border-zinc-800">
          <TabsTrigger 
            value="outputs" 
            className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
          >
            Outputs ({outputs.length})
          </TabsTrigger>
          <TabsTrigger 
            value="publishes"
            className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
          >
            Publishes ({publishes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="outputs" className="space-y-4">
          <OutputsTable outputs={outputs} />
        </TabsContent>

        <TabsContent value="publishes" className="space-y-4">
          <PublishesTable publishes={publishes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

