'use client';

import { useState } from 'react';
import { Save, Eye, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ContentOutput, ContentMetadata, UpdateOutputRequest } from '@/lib/types';
import { OutputPreview } from './OutputPreview';

interface OutputEditorProps {
  output: ContentOutput;
  onSave: (data: UpdateOutputRequest) => Promise<void>;
}

export function OutputEditor({ output, onSave }: OutputEditorProps) {
  const [title, setTitle] = useState(output.title || '');
  const [body, setBody] = useState(output.body);
  const [metadata, setMetadata] = useState<ContentMetadata>(
    (output.metadata as ContentMetadata) || {}
  );
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('edit');

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        title,
        body,
        metadata,
        status: 'ready',
      });
    } finally {
      setSaving(false);
    }
  };

  const previewOutput: ContentOutput = {
    ...output,
    title,
    body,
    metadata,
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList className="bg-zinc-800 border-zinc-700">
            <TabsTrigger
              value="edit"
              className="data-[state=active]:bg-violet-600 data-[state=active]:text-white"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className="data-[state=active]:bg-violet-600 data-[state=active]:text-white"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-violet-600 text-white hover:bg-violet-700"
          >
            {saving ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        <TabsContent value="edit" className="mt-6">
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader>
              <CardTitle className="text-white">Edit Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-zinc-300">
                  Title
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter title..."
                  className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
                />
              </div>

              {/* Body */}
              <div className="space-y-2">
                <Label htmlFor="body" className="text-zinc-300">
                  Content (Markdown)
                </Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Enter content..."
                  className="min-h-[400px] border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 font-mono text-sm"
                />
              </div>

              {/* SEO Metadata (for site target) */}
              {output.target === 'site' && (
                <div className="space-y-4 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
                  <h4 className="font-medium text-white">SEO Metadata</h4>

                  <div className="space-y-2">
                    <Label htmlFor="seo_title" className="text-zinc-400 text-sm">
                      SEO Title (max 60 chars)
                    </Label>
                    <Input
                      id="seo_title"
                      value={metadata.seo_title || ''}
                      onChange={(e) =>
                        setMetadata({ ...metadata, seo_title: e.target.value })
                      }
                      maxLength={60}
                      className="border-zinc-600 bg-zinc-700 text-white"
                    />
                    <p className="text-xs text-zinc-500">
                      {(metadata.seo_title || '').length} / 60
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="seo_description"
                      className="text-zinc-400 text-sm"
                    >
                      Meta Description (max 160 chars)
                    </Label>
                    <Textarea
                      id="seo_description"
                      value={metadata.seo_description || ''}
                      onChange={(e) =>
                        setMetadata({
                          ...metadata,
                          seo_description: e.target.value,
                        })
                      }
                      maxLength={160}
                      className="border-zinc-600 bg-zinc-700 text-white h-20"
                    />
                    <p className="text-xs text-zinc-500">
                      {(metadata.seo_description || '').length} / 160
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="seo_keywords"
                      className="text-zinc-400 text-sm"
                    >
                      Keywords (comma-separated)
                    </Label>
                    <Input
                      id="seo_keywords"
                      value={metadata.seo_keywords || ''}
                      onChange={(e) =>
                        setMetadata({ ...metadata, seo_keywords: e.target.value })
                      }
                      placeholder="keyword1, keyword2, keyword3"
                      className="border-zinc-600 bg-zinc-700 text-white"
                    />
                  </div>
                </div>
              )}

              {/* Hashtags (for X target) */}
              {output.target === 'x' && (
                <div className="space-y-2">
                  <Label htmlFor="hashtags" className="text-zinc-300">
                    Hashtags
                  </Label>
                  <Input
                    id="hashtags"
                    value={metadata.hashtags?.join(', ') || ''}
                    onChange={(e) =>
                      setMetadata({
                        ...metadata,
                        hashtags: e.target.value.split(',').map((h) => h.trim()),
                      })
                    }
                    placeholder="#hashtag1, #hashtag2"
                    className="border-zinc-700 bg-zinc-800 text-white"
                  />
                </div>
              )}

              {/* Subreddit (for Reddit target) */}
              {output.target === 'reddit' && (
                <div className="space-y-2">
                  <Label htmlFor="subreddit" className="text-zinc-300">
                    Subreddit
                  </Label>
                  <Input
                    id="subreddit"
                    value={metadata.subreddit || ''}
                    onChange={(e) =>
                      setMetadata({ ...metadata, subreddit: e.target.value })
                    }
                    placeholder="subreddit_name"
                    className="border-zinc-700 bg-zinc-800 text-white"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          <OutputPreview output={previewOutput} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

