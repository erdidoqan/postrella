'use client';

import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TopicFiltersProps {
  filters: {
    source: string;
    status: string;
    minScore: string;
  };
  onFiltersChange: (filters: { source: string; status: string; minScore: string }) => void;
  sources: { name: string }[];
}

export function TopicFilters({ filters, onFiltersChange, sources }: TopicFiltersProps) {
  const handleClear = () => {
    onFiltersChange({ source: '', status: '', minScore: '' });
  };

  const hasFilters = filters.source || filters.status || filters.minScore;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 text-zinc-400">
        <Filter className="h-4 w-4" />
        <span className="text-sm font-medium">Filters</span>
      </div>

      <Select
        value={filters.source}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, source: value === 'all' ? '' : value })
        }
      >
        <SelectTrigger className="w-40 border-zinc-700 bg-zinc-800 text-zinc-300">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-700">
          <SelectItem value="all" className="text-zinc-300 focus:bg-zinc-800 focus:text-white">
            All Sources
          </SelectItem>
          {sources.map((source) => (
            <SelectItem
              key={source.name}
              value={source.name}
              className="text-zinc-300 focus:bg-zinc-800 focus:text-white"
            >
              {source.name.replace('_', ' ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.status}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, status: value === 'all' ? '' : value })
        }
      >
        <SelectTrigger className="w-36 border-zinc-700 bg-zinc-800 text-zinc-300">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-700">
          <SelectItem value="all" className="text-zinc-300 focus:bg-zinc-800 focus:text-white">
            All Status
          </SelectItem>
          <SelectItem value="pending" className="text-zinc-300 focus:bg-zinc-800 focus:text-white">
            Pending
          </SelectItem>
          <SelectItem value="processing" className="text-zinc-300 focus:bg-zinc-800 focus:text-white">
            Processing
          </SelectItem>
          <SelectItem value="completed" className="text-zinc-300 focus:bg-zinc-800 focus:text-white">
            Completed
          </SelectItem>
          <SelectItem value="failed" className="text-zinc-300 focus:bg-zinc-800 focus:text-white">
            Failed
          </SelectItem>
        </SelectContent>
      </Select>

      <Input
        type="number"
        placeholder="Min Score"
        value={filters.minScore}
        onChange={(e) => onFiltersChange({ ...filters, minScore: e.target.value })}
        className="w-28 border-zinc-700 bg-zinc-800 text-zinc-300 placeholder:text-zinc-500"
      />

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}

