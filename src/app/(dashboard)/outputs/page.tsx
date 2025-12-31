'use client';

import { useEffect, useState, useCallback } from 'react';
import { FileText, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { OutputsTable } from '@/components/outputs/OutputsTable';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import workerClient from '@/lib/worker-client';
import type { ContentOutput } from '@/lib/types';

export default function OutputsPage() {
  const [outputs, setOutputs] = useState<ContentOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    target: '',
    status: '',
  });

  const loadOutputs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await workerClient.getOutputs({
        target: filters.target as 'site' | 'x' | 'reddit' | undefined,
        status: filters.status as 'draft' | 'ready' | 'published' | undefined,
        page,
        limit: 20,
      });

      if (response.success && response.data) {
        setOutputs(response.data);
        if (response.meta) {
          setTotalPages(response.meta.totalPages);
        }
      }
    } catch (error) {
      console.error('Failed to load outputs:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    loadOutputs();
  }, [loadOutputs]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value === 'all' ? '' : value }));
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-white">
            <FileText className="h-8 w-8 text-violet-400" />
            Outputs
          </h1>
          <p className="text-zinc-400 mt-1">
            View and manage generated content
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-zinc-400">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filters</span>
        </div>

        <Select
          value={filters.target || 'all'}
          onValueChange={(value) => handleFilterChange('target', value)}
        >
          <SelectTrigger className="w-32 border-zinc-700 bg-zinc-800 text-zinc-300">
            <SelectValue placeholder="Target" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="all" className="text-zinc-300 focus:bg-zinc-800">
              All Targets
            </SelectItem>
            <SelectItem value="site" className="text-zinc-300 focus:bg-zinc-800">
              Site
            </SelectItem>
            <SelectItem value="x" className="text-zinc-300 focus:bg-zinc-800">
              X
            </SelectItem>
            <SelectItem value="reddit" className="text-zinc-300 focus:bg-zinc-800">
              Reddit
            </SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.status || 'all'}
          onValueChange={(value) => handleFilterChange('status', value)}
        >
          <SelectTrigger className="w-32 border-zinc-700 bg-zinc-800 text-zinc-300">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="all" className="text-zinc-300 focus:bg-zinc-800">
              All Status
            </SelectItem>
            <SelectItem value="draft" className="text-zinc-300 focus:bg-zinc-800">
              Draft
            </SelectItem>
            <SelectItem value="ready" className="text-zinc-300 focus:bg-zinc-800">
              Ready
            </SelectItem>
            <SelectItem value="published" className="text-zinc-300 focus:bg-zinc-800">
              Published
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
        </div>
      ) : (
        <OutputsTable outputs={outputs} />
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

