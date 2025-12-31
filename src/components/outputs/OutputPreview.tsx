'use client';

import { Globe, Twitter, MessageSquare, Hash, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { ContentOutput, ContentMetadata } from '@/lib/types';

interface OutputPreviewProps {
  output: ContentOutput;
}

export function OutputPreview({ output }: OutputPreviewProps) {
  const metadata = output.metadata as ContentMetadata | null;

  return (
    <div className="space-y-6">
      {/* Site Preview */}
      {output.target === 'site' && (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-white">
              <Globe className="h-5 w-5 text-blue-400" />
              Site Article Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title */}
            <div>
              <h2 className="text-2xl font-bold text-white">{output.title}</h2>
            </div>

            {/* SEO Metadata */}
            {metadata && (metadata.seo_title || metadata.seo_description) && (
              <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 space-y-2">
                <p className="text-xs font-medium text-zinc-400">SEO Preview</p>
                {metadata.seo_title && (
                  <p className="text-blue-400 text-lg">{metadata.seo_title}</p>
                )}
                {metadata.seo_description && (
                  <p className="text-sm text-zinc-400 line-clamp-2">
                    {metadata.seo_description}
                  </p>
                )}
                {metadata.seo_keywords && (
                  <div className="flex flex-wrap gap-1 pt-2">
                    {metadata.seo_keywords.split(',').map((keyword, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="bg-zinc-700/50 text-zinc-300 border-zinc-600 text-xs"
                      >
                        {keyword.trim()}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Separator className="bg-zinc-800" />

            {/* Body */}
            <div className="prose prose-invert max-w-none">
              <div
                className="text-zinc-300 whitespace-pre-wrap"
                dangerouslySetInnerHTML={{
                  __html: output.body
                    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-white mt-6 mb-4">$1</h1>')
                    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-white mt-5 mb-3">$1</h2>')
                    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-medium text-white mt-4 mb-2">$1</h3>')
                    .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-white">$1</strong>')
                    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
                    .replace(/\n/gim, '<br />')
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* X Preview */}
      {output.target === 'x' && (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-white">
              <Twitter className="h-5 w-5 text-sky-400" />
              X/Twitter Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 max-w-lg">
              {/* Tweet Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500" />
                <div>
                  <p className="font-bold text-white">Your Account</p>
                  <p className="text-sm text-zinc-500">@youraccount</p>
                </div>
              </div>

              {/* Tweet Body */}
              <p className="text-white text-lg leading-relaxed whitespace-pre-wrap">
                {output.body}
              </p>

              {/* Character Count */}
              <div className="mt-4 flex items-center justify-between text-sm">
                <span
                  className={`${
                    output.body.length > 280 ? 'text-red-400' : 'text-zinc-500'
                  }`}
                >
                  {output.body.length} / 280 characters
                </span>
                {metadata?.hashtags && (
                  <div className="flex items-center gap-1 text-sky-400">
                    <Hash className="h-4 w-4" />
                    {metadata.hashtags}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reddit Preview */}
      {output.target === 'reddit' && (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-white">
              <MessageSquare className="h-5 w-5 text-orange-400" />
              Reddit Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden">
              {/* Reddit Post Header */}
              <div className="bg-zinc-800/50 p-4 border-b border-zinc-700">
                <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
                  <span className="text-orange-400 font-medium">
                    r/{metadata?.subreddit || 'subreddit'}
                  </span>
                  <span>•</span>
                  <span>Posted by u/yourusername</span>
                </div>
                <h3 className="text-xl font-medium text-white">
                  {output.title}
                </h3>
              </div>

              {/* Reddit Post Body */}
              <div className="p-4">
                <div className="text-zinc-300 whitespace-pre-wrap">
                  {output.body}
                </div>
              </div>

              {/* Word Count */}
              <div className="border-t border-zinc-700 p-4 text-sm text-zinc-500">
                {output.body.split(/\s+/).length} words
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

