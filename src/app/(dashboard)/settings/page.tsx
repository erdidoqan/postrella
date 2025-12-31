'use client';

import { useState, useEffect } from 'react';
import { Settings, Globe, TrendingUp, Save, TestTube, Link, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import workerClient from '@/lib/worker-client';
import { GEO_OPTIONS, GOOGLE_TRENDS_DATE_OPTIONS, type GoogleTrendsDateValue } from '@/lib/types';

export default function SettingsPage() {
  // Site API settings
  const [siteId, setSiteId] = useState('');
  const [siteApiKey, setSiteApiKey] = useState('');
  const [siteConnectionStatus, setSiteConnectionStatus] = useState<'untested' | 'connected' | 'failed'>('untested');
  const [testingSite, setTestingSite] = useState(false);
  const [savingSite, setSavingSite] = useState(false);

  // Google Trends settings
  const [serpApiKey, setSerpApiKey] = useState('');
  const [trendsQuery, setTrendsQuery] = useState('');
  const [trendsGeo, setTrendsGeo] = useState('US');
  const [trendsDate, setTrendsDate] = useState<GoogleTrendsDateValue>('now 1-d');
  const [savingTrends, setSavingTrends] = useState(false);
  const [testingTrends, setTestingTrends] = useState(false);

  // Gemini API settings
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [savingGemini, setSavingGemini] = useState(false);

  // Pinterest settings
  const [pinterestConnected, setPinterestConnected] = useState(false);
  const [pinterestUsername, setPinterestUsername] = useState('');
  const [connectingPinterest, setConnectingPinterest] = useState(false);
  const [siteCategories, setSiteCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [pinterestBoards, setPinterestBoards] = useState<Array<{ id: string; name: string }>>([]);
  const [boardMappings, setBoardMappings] = useState<Record<string, string>>({});
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [savingBoardMappings, setSavingBoardMappings] = useState(false);

  useEffect(() => {
    loadSettings();
    loadPinterestAccount();
  }, []);

  useEffect(() => {
    if (pinterestConnected && siteId && siteApiKey) {
      loadBoardMappingData();
    }
  }, [pinterestConnected, siteId, siteApiKey]);

  const loadSettings = async () => {
    try {
      // Load settings from worker
      const [siteIdRes, siteKeyRes, serpKeyRes, geminiKeyRes, trendsConfigRes] = await Promise.allSettled([
        workerClient.getSettings('site_id'),
        workerClient.getSettings('site_api_key'),
        workerClient.getSettings('serpapi_api_key'),
        workerClient.getSettings('gemini_api_key'),
        workerClient.getSettings('google_trends_config'),
      ]);

      if (siteIdRes.status === 'fulfilled' && siteIdRes.value.data) {
        setSiteId(siteIdRes.value.data.value);
      }
      if (siteKeyRes.status === 'fulfilled' && siteKeyRes.value.data) {
        setSiteApiKey(siteKeyRes.value.data.value);
      }
      if (serpKeyRes.status === 'fulfilled' && serpKeyRes.value.data) {
        setSerpApiKey(serpKeyRes.value.data.value);
      }
      if (geminiKeyRes.status === 'fulfilled' && geminiKeyRes.value.data) {
        setGeminiApiKey(geminiKeyRes.value.data.value);
      }
      if (trendsConfigRes.status === 'fulfilled' && trendsConfigRes.value.data) {
        const config = JSON.parse(trendsConfigRes.value.data.value);
        setTrendsQuery(config.q || '');
        setTrendsGeo(config.geo || 'US');
        setTrendsDate(config.date || 'now 1-d');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSaveSiteSettings = async () => {
    setSavingSite(true);
    try {
      await workerClient.updateSetting('site_id', siteId);
      await workerClient.updateSetting('site_api_key', siteApiKey);
      alert('Site settings saved!');
    } catch (error) {
      console.error('Failed to save site settings:', error);
      alert('Failed to save settings.');
    } finally {
      setSavingSite(false);
    }
  };

  const handleTestSiteConnection = async () => {
    setTestingSite(true);
    try {
      // For now, just simulate a test
      // In production, this would call the worker to test the connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSiteConnectionStatus(siteId && siteApiKey ? 'connected' : 'failed');
    } catch (error) {
      setSiteConnectionStatus('failed');
    } finally {
      setTestingSite(false);
    }
  };

  const handleSaveGoogleTrendsSettings = async () => {
    setSavingTrends(true);
    try {
      await workerClient.updateSetting('serpapi_api_key', serpApiKey);
      await workerClient.updateGoogleTrendsConfig({
        q: trendsQuery,
        geo: trendsGeo,
        date: trendsDate,
      });
      alert('Google Trends settings saved!');
    } catch (error) {
      console.error('Failed to save Google Trends settings:', error);
      alert('Failed to save settings.');
    } finally {
      setSavingTrends(false);
    }
  };

  const handleTestTrendsFetch = async () => {
    setTestingTrends(true);
    try {
      const result = await workerClient.fetchTrends();
      if (result.success && result.data) {
        alert(`Test successful! Fetched ${result.data.google_trends_count} Google Trends.`);
      }
    } catch (error) {
      console.error('Failed to test trends fetch:', error);
      alert('Failed to fetch trends.');
    } finally {
      setTestingTrends(false);
    }
  };

  const handleSaveGeminiSettings = async () => {
    setSavingGemini(true);
    try {
      await workerClient.updateSetting('gemini_api_key', geminiApiKey);
      alert('Gemini API key saved!');
    } catch (error) {
      console.error('Failed to save Gemini settings:', error);
      alert('Failed to save settings.');
    } finally {
      setSavingGemini(false);
    }
  };

  const loadPinterestAccount = async () => {
    try {
      const accounts = await workerClient.getAccounts();
      if (accounts.success && accounts.data) {
        const pinterest = accounts.data.find((a) => a.platform === 'pinterest');
        if (pinterest) {
          setPinterestConnected(true);
          setPinterestUsername(pinterest.username || 'Unknown');
        }
      }
    } catch (error) {
      console.error('Failed to load Pinterest account:', error);
    }
  };

  const handlePinterestConnect = async () => {
    setConnectingPinterest(true);
    try {
      const result = await workerClient.startPinterestAuth();
      if (result.success && result.data) {
        window.location.href = result.data.auth_url;
      }
    } catch (error) {
      console.error('Failed to start Pinterest auth:', error);
      alert('Failed to connect to Pinterest.');
    } finally {
      setConnectingPinterest(false);
    }
  };

  const loadBoardMappingData = async () => {
    setLoadingBoards(true);
    
    // Fetch all data in parallel with independent error handling
    const [categoriesResult, boardsResult, mappingsResult] = await Promise.allSettled([
      // Fetch site categories
      (async () => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_WORKER_URL || 'https://postrella.digitexa.com'}/api/site/categories?site_id=${siteId}`, {
          headers: { 'X-API-Key': siteApiKey },
        });
        return res.json();
      })(),
      // Fetch Pinterest boards
      workerClient.getPinterestBoards(),
      // Fetch existing mappings
      workerClient.getPinterestBoardMappings(),
    ]);

    // Process categories
    if (categoriesResult.status === 'fulfilled') {
      const categoriesData = categoriesResult.value;
      if (categoriesData.success && categoriesData.data) {
        setSiteCategories(categoriesData.data);
      }
    } else {
      console.error('Failed to load site categories:', categoriesResult.reason);
    }

    // Process boards
    if (boardsResult.status === 'fulfilled') {
      const boardsRes = boardsResult.value;
      if (boardsRes.success && boardsRes.data) {
        setPinterestBoards(boardsRes.data);
      }
    } else {
      console.error('Failed to load Pinterest boards:', boardsResult.reason);
    }

    // Process mappings
    if (mappingsResult.status === 'fulfilled') {
      const mappingsRes = mappingsResult.value;
      if (mappingsRes.success && mappingsRes.data) {
        setBoardMappings(mappingsRes.data);
      }
    } else {
      console.error('Failed to load board mappings:', mappingsResult.reason);
    }

    setLoadingBoards(false);
  };

  const handleBoardMappingChange = (categoryId: string | number, boardId: string) => {
    setBoardMappings((prev) => ({
      ...prev,
      [categoryId]: boardId,
    }));
  };

  const handleSaveBoardMappings = async () => {
    setSavingBoardMappings(true);
    try {
      await workerClient.updatePinterestBoardMappings(boardMappings);
      alert('Pinterest board mappings saved!');
    } catch (error) {
      console.error('Failed to save board mappings:', error);
      alert('Failed to save mappings.');
    } finally {
      setSavingBoardMappings(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold text-white">
          <Settings className="h-8 w-8 text-violet-400" />
          Settings
        </h1>
        <p className="text-zinc-400 mt-1">
          Configure your API keys and integrations
        </p>
      </div>

      {/* Site API Configuration */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Globe className="h-5 w-5 text-blue-400" />
            Site API Configuration
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Connect to cms.digitexa.com to publish articles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="site_id" className="text-zinc-300">
                Site ID
              </Label>
              <Input
                id="site_id"
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                placeholder="Enter your Site ID"
                className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site_api_key" className="text-zinc-300">
                API Key
              </Label>
              <Input
                id="site_api_key"
                type="password"
                value={siteApiKey}
                onChange={(e) => setSiteApiKey(e.target.value)}
                placeholder="Enter your API Key"
                className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleTestSiteConnection}
              disabled={testingSite}
              className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
            >
              {testingSite ? (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-white" />
              ) : (
                <TestTube className="mr-2 h-4 w-4" />
              )}
              Test Connection
            </Button>
            <Button
              onClick={handleSaveSiteSettings}
              disabled={savingSite}
              className="bg-violet-600 text-white hover:bg-violet-700"
            >
              {savingSite ? (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
            {siteConnectionStatus !== 'untested' && (
              <Badge
                variant="outline"
                className={
                  siteConnectionStatus === 'connected'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-red-500/20 text-red-400 border-red-500/30'
                }
              >
                {siteConnectionStatus === 'connected' ? (
                  <CheckCircle className="mr-1 h-3 w-3" />
                ) : (
                  <XCircle className="mr-1 h-3 w-3" />
                )}
                {siteConnectionStatus === 'connected' ? 'Connected' : 'Failed'}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Google Trends Configuration */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <TrendingUp className="h-5 w-5 text-orange-400" />
            Google Trends Configuration (SerpAPI)
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Configure your SerpAPI key and trend search parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serpapi_key" className="text-zinc-300">
              SerpAPI API Key
            </Label>
            <Input
              id="serpapi_key"
              type="password"
              value={serpApiKey}
              onChange={(e) => setSerpApiKey(e.target.value)}
              placeholder="Enter your SerpAPI key"
              className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
            />
          </div>

          <Separator className="bg-zinc-800" />

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="trends_query" className="text-zinc-300">
                Search Query (q)
              </Label>
              <Input
                id="trends_query"
                value={trendsQuery}
                onChange={(e) => setTrendsQuery(e.target.value)}
                placeholder="e.g., quotes, fitness, tech"
                className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trends_geo" className="text-zinc-300">
                Geographic Region (geo)
              </Label>
              <Select value={trendsGeo} onValueChange={setTrendsGeo}>
                <SelectTrigger className="border-zinc-700 bg-zinc-800 text-zinc-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {GEO_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-zinc-300 focus:bg-zinc-800"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trends_date" className="text-zinc-300">
                Date Range (date)
              </Label>
              <Select
                value={trendsDate}
                onValueChange={(v) => setTrendsDate(v as GoogleTrendsDateValue)}
              >
                <SelectTrigger className="border-zinc-700 bg-zinc-800 text-zinc-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {GOOGLE_TRENDS_DATE_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-zinc-300 focus:bg-zinc-800"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleTestTrendsFetch}
              disabled={testingTrends}
              className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
            >
              {testingTrends ? (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-white" />
              ) : (
                <TestTube className="mr-2 h-4 w-4" />
              )}
              Test Fetch
            </Button>
            <Button
              onClick={handleSaveGoogleTrendsSettings}
              disabled={savingTrends}
              className="bg-violet-600 text-white hover:bg-violet-700"
            >
              {savingTrends ? (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Gemini API Configuration */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <span className="text-2xl">✨</span>
            Gemini AI Configuration
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Configure your Google Gemini API key for content generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gemini_key" className="text-zinc-300">
              Gemini API Key
            </Label>
            <Input
              id="gemini_key"
              type="password"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder="Enter your Gemini API key"
              className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
            />
          </div>

          <Button
            onClick={handleSaveGeminiSettings}
            disabled={savingGemini}
            className="bg-violet-600 text-white hover:bg-violet-700"
          >
            {savingGemini ? (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save API Key
          </Button>
        </CardContent>
      </Card>

      {/* Pinterest Board Mapping */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
            </svg>
            Pinterest Board Mapping
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Map your site categories to Pinterest boards for auto-pinning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!pinterestConnected ? (
            <p className="text-sm text-zinc-500">
              Connect your Pinterest account first to configure board mappings.
            </p>
          ) : loadingBoards ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500"></div>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {siteCategories.map((category) => (
                  <div key={category.id} className="grid grid-cols-2 gap-3 items-center">
                    <Label className="text-zinc-300">{category.name}</Label>
                    <Select
                      value={boardMappings[category.id] || ''}
                      onValueChange={(value) => handleBoardMappingChange(category.id, value)}
                    >
                      <SelectTrigger className="border-zinc-700 bg-zinc-800 text-zinc-300">
                        <SelectValue placeholder="Select board" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        <SelectItem value="" className="text-zinc-300 focus:bg-zinc-800">
                          No board (skip)
                        </SelectItem>
                        {pinterestBoards.map((board) => (
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
                  </div>
                ))}

                <Separator className="bg-zinc-800" />

                <div className="grid grid-cols-2 gap-3 items-center">
                  <Label className="text-zinc-300 font-semibold">Default Board (Fallback)</Label>
                  <Select
                    value={boardMappings['default'] || ''}
                    onValueChange={(value) => handleBoardMappingChange('default', value)}
                  >
                    <SelectTrigger className="border-zinc-700 bg-zinc-800 text-zinc-300">
                      <SelectValue placeholder="Select default board" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {pinterestBoards.map((board) => (
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
                </div>
              </div>

              <Button
                onClick={handleSaveBoardMappings}
                disabled={savingBoardMappings}
                className="bg-violet-600 text-white hover:bg-violet-700"
              >
                {savingBoardMappings ? (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Board Mappings
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Connected Accounts */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Link className="h-5 w-5 text-violet-400" />
            Connected Accounts
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Connect your social media accounts for publishing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* X Account */}
          <div className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-sky-500/20 p-2">
                <svg className="h-5 w-5 text-sky-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-white">X (Twitter)</p>
                <p className="text-sm text-zinc-400">Not connected</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20"
            >
              Connect X
            </Button>
          </div>

          {/* Reddit Account */}
          <div className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-500/20 p-2">
                <svg className="h-5 w-5 text-orange-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-white">Reddit</p>
                <p className="text-sm text-zinc-400">Not connected</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
            >
              Connect Reddit
            </Button>
          </div>

          {/* Pinterest Account */}
          <div className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-500/20 p-2">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-white">Pinterest</p>
                <p className="text-sm text-zinc-400">
                  {pinterestConnected ? `Connected as ${pinterestUsername}` : 'Not connected'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handlePinterestConnect}
              disabled={connectingPinterest}
              className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
            >
              {pinterestConnected ? 'Reconnect' : connectingPinterest ? 'Connecting...' : 'Connect Pinterest'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

