'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, FileText, Send, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import workerClient from '@/lib/worker-client';
import type { DashboardStats, Topic, Publish } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTopics, setRecentTopics] = useState<Topic[]>([]);
  const [recentPublishes, setRecentPublishes] = useState<Publish[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, topicsRes, publishesRes] = await Promise.all([
          workerClient.getDashboardStats(),
          workerClient.getRecentTopics(5),
          workerClient.getRecentPublishes(5),
        ]);

        if (statsRes.success && statsRes.data) setStats(statsRes.data);
        if (topicsRes.success && topicsRes.data) setRecentTopics(topicsRes.data);
        if (publishesRes.success && publishesRes.data) setRecentPublishes(publishesRes.data);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30',
    published: 'bg-green-500/20 text-green-400 border-green-500/30',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-zinc-400 mt-1">
          Overview of your content pipeline
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Topics"
          value={stats?.totalTopics ?? 0}
          icon={TrendingUp}
          description="Trending keywords"
        />
        <StatsCard
          title="Total Outputs"
          value={stats?.totalOutputs ?? 0}
          icon={FileText}
          description="Generated content"
        />
        <StatsCard
          title="Total Publishes"
          value={stats?.totalPublishes ?? 0}
          icon={Send}
          description="Published content"
        />
        <StatsCard
          title="Pending Jobs"
          value={stats?.pendingJobs ?? 0}
          icon={Clock}
          description="Waiting to process"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Topics */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="h-5 w-5 text-violet-400" />
              Recent Topics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentTopics.length === 0 ? (
              <p className="text-zinc-500 text-sm">No topics yet. Fetch some trends!</p>
            ) : (
              <div className="space-y-3">
                {recentTopics.map((topic) => (
                  <div
                    key={topic.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {topic.keyword}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Score: {topic.score.toFixed(1)} • {topic.source_name}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={statusColors[topic.status] || statusColors.pending}
                    >
                      {topic.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Publishes */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Send className="h-5 w-5 text-violet-400" />
              Recent Publishes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentPublishes.length === 0 ? (
              <p className="text-zinc-500 text-sm">No publishes yet. Generate and publish content!</p>
            ) : (
              <div className="space-y-3">
                {recentPublishes.map((publish) => (
                  <div
                    key={publish.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-3"
                  >
                    <div className="flex items-center gap-3">
                      {publish.status === 'published' ? (
                        <CheckCircle className="h-5 w-5 text-emerald-400" />
                      ) : publish.status === 'failed' ? (
                        <AlertCircle className="h-5 w-5 text-red-400" />
                      ) : (
                        <Clock className="h-5 w-5 text-yellow-400" />
                      )}
                      <div>
                        <p className="font-medium text-white capitalize">
                          {publish.platform}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {publish.published_at
                            ? formatDistanceToNow(new Date(publish.published_at * 1000), {
                                addSuffix: true,
                              })
                            : 'Pending'}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={statusColors[publish.status] || statusColors.pending}
                    >
                      {publish.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

