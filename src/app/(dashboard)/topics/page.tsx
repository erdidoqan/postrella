'use client';

import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { TopicsTable } from '@/components/topics/TopicsTable';
import { TopicFilters } from '@/components/topics/TopicFilters';
import { Button } from '@/components/ui/button';
import workerClient from '@/lib/worker-client';
import type { Topic, Source } from '@/lib/types';

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    source: '',
    status: '',
    minScore: '',
  });

  const loadTopics = useCallback(async () => {
    setLoading(true);
    try {
      const response = await workerClient.getTopics({
        source: filters.source || undefined,
        status: filters.status || undefined,
        minScore: filters.minScore ? parseFloat(filters.minScore) : undefined,
        page,
        limit: 20,
      });

      if (response.success && response.data) {
        setTopics(response.data);
        if (response.meta) {
          setTotalPages(response.meta.totalPages);
        }
      }
    } catch (error) {
      console.error('Failed to load topics:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  const loadSources = async () => {
    try {
      const response = await workerClient.getSources();
      if (response.success && response.data) {
        setSources(response.data);
      }
    } catch (error) {
      console.error('Failed to load sources:', error);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  };

  const handleGenerate = async (topicId: number, targets: string[]) => {
    try {
      const response = await workerClient.generateContent(topicId, { targets: targets as ('site' | 'x' | 'reddit')[] });
      if (response.success) {
        alert(`Job created! ID: ${response.data?.job_id}`);
        loadTopics(); // Refresh the list
      }
    } catch (error) {
      console.error('Failed to generate content:', error);
      alert('Failed to create job. Check console for details.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-white">
            <TrendingUp className="h-8 w-8 text-violet-400" />
            Topics
          </h1>
          <p className="text-zinc-400 mt-1">
            Manage and generate content from trending topics
          </p>
        </div>
      </div>

      {/* Filters */}
      <TopicFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        sources={sources}
      />

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
        </div>
      ) : (
        <TopicsTable topics={topics} onGenerate={handleGenerate} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
          <p className="text-sm text-zinc-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

