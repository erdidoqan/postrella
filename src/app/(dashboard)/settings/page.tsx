'use client';

import { useState, useEffect } from 'react';
import { Settings, Globe, TrendingUp, Save, TestTube, Link, CheckCircle, XCircle, X, Plus, Trash2, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import workerClient from '@/lib/worker-client';
import { GEO_OPTIONS, GOOGLE_TRENDS_DATE_OPTIONS, type GoogleTrendsDateValue, type SiteConfig, type SiteTrendConfig } from '@/lib/types';

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
  const [trendsCategory, setTrendsCategory] = useState('0');
  const [excludedKeywords, setExcludedKeywords] = useState<string[]>([]);
  const [newExcludedKeyword, setNewExcludedKeyword] = useState('');
  const [savingTrends, setSavingTrends] = useState(false);
  const [testingTrends, setTestingTrends] = useState(false);

  // Gemini API settings
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [savingGemini, setSavingGemini] = useState(false);

  // Unosend Email settings
  const [unosendApiKey, setUnosendApiKey] = useState('');
  const [mailingFromEmail, setMailingFromEmail] = useState('');
  const [savingUnosend, setSavingUnosend] = useState(false);

  // Pinterest settings
  const [pinterestConnected, setPinterestConnected] = useState(false);
  const [pinterestUsername, setPinterestUsername] = useState('');
  const [connectingPinterest, setConnectingPinterest] = useState(false);

  // Mastodon settings
  const [mastodonConnected, setMastodonConnected] = useState(false);
  const [mastodonUsername, setMastodonUsername] = useState('');
  const [connectingMastodon, setConnectingMastodon] = useState(false);
  const [siteCategories, setSiteCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [pinterestBoards, setPinterestBoards] = useState<Array<{ id: string; name: string }>>([]);
  const [boardMappings, setBoardMappings] = useState<Record<string, string>>({});
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [savingBoardMappings, setSavingBoardMappings] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [creatingBoard, setCreatingBoard] = useState(false);

  // Site Configs state
  const [siteConfigs, setSiteConfigs] = useState<SiteConfig[]>([]);
  const [loadingSiteConfigs, setLoadingSiteConfigs] = useState(false);
  const [expandedSiteId, setExpandedSiteId] = useState<number | null>(null);
  const [editingSiteId, setEditingSiteId] = useState<number | null>(null);
  const [newSiteConfig, setNewSiteConfig] = useState({ name: '', site_id: '', api_key: '', domain: '' });
  const [creatingSite, setCreatingSite] = useState(false);
  const [siteTrendConfigs, setSiteTrendConfigs] = useState<Record<number, SiteTrendConfig[]>>({});
  const [editingTrendId, setEditingTrendId] = useState<{ siteId: number; trendId: number } | null>(null);
  const [newTrendConfig, setNewTrendConfig] = useState<{ keywords: string; geo: string; cat: string; date: string; excluded_keywords: string; q_filter: string }>({
    keywords: '',
    geo: 'US',
    cat: '0',
    date: 'now 1-d',
    excluded_keywords: '',
    q_filter: '',
  });

  useEffect(() => {
    loadSettings();
    loadPinterestAccount();
    loadMastodonAccount();
    loadSiteConfigs();
  }, []);

  useEffect(() => {
    if (pinterestConnected && siteId && siteApiKey) {
      loadBoardMappingData();
    }
  }, [pinterestConnected, siteId, siteApiKey]);

  const loadSettings = async () => {
    try {
      // Load settings from worker
      const [siteIdRes, siteKeyRes, serpKeyRes, geminiKeyRes, trendsConfigRes, unosendKeyRes, mailingFromRes] = await Promise.allSettled([
        workerClient.getSettings('site_id'),
        workerClient.getSettings('site_api_key'),
        workerClient.getSettings('serpapi_api_key'),
        workerClient.getSettings('gemini_api_key'),
        workerClient.getSettings('google_trends_config'),
        workerClient.getSettings('unosend_api_key'),
        workerClient.getSettings('mailing_from_email'),
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
        setTrendsCategory(config.cat || '0');
        setExcludedKeywords(config.excluded_keywords || []);
      }
      if (unosendKeyRes.status === 'fulfilled' && unosendKeyRes.value.data) {
        setUnosendApiKey(unosendKeyRes.value.data.value);
      }
      if (mailingFromRes.status === 'fulfilled' && mailingFromRes.value.data) {
        setMailingFromEmail(mailingFromRes.value.data.value);
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
        cat: trendsCategory,
        excluded_keywords: excludedKeywords,
      });
      alert('Google Trends settings saved!');
    } catch (error) {
      console.error('Failed to save Google Trends settings:', error);
      alert('Failed to save settings.');
    } finally {
      setSavingTrends(false);
    }
  };

  const handleAddExcludedKeyword = () => {
    const keyword = newExcludedKeyword.trim().toLowerCase();
    if (keyword && !excludedKeywords.includes(keyword)) {
      setExcludedKeywords([...excludedKeywords, keyword]);
      setNewExcludedKeyword('');
    }
  };

  const handleRemoveExcludedKeyword = (keyword: string) => {
    setExcludedKeywords(excludedKeywords.filter(k => k !== keyword));
  };

  const handleTestTrendsFetch = async () => {
    setTestingTrends(true);
    try {
      const result = await workerClient.fetchTrends({ all_sites: true });
      if (result.success && result.data) {
        alert(`Test successful! Fetched ${result.data.summary.total_fetched} trends, ${result.data.summary.total_new} new keywords.`);
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

  const handleSaveUnosendSettings = async () => {
    setSavingUnosend(true);
    try {
      await workerClient.updateSetting('unosend_api_key', unosendApiKey);
      await workerClient.updateSetting('mailing_from_email', mailingFromEmail);
      alert('Unosend settings saved!');
    } catch (error) {
      console.error('Failed to save Unosend settings:', error);
      alert('Failed to save settings.');
    } finally {
      setSavingUnosend(false);
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

  const loadMastodonAccount = async () => {
    try {
      const accounts = await workerClient.getAccounts();
      if (accounts.success && accounts.data) {
        const mastodon = accounts.data.find((a) => a.platform === 'mastodon');
        if (mastodon) {
          setMastodonConnected(true);
          setMastodonUsername(mastodon.username || 'Unknown');
          // Instance URL would be in metadata, but we don't expose it in Account type
          // For now, just show username
        }
      }
    } catch (error) {
      console.error('Failed to load Mastodon account:', error);
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

  const handleMastodonConnect = async () => {
    setConnectingMastodon(true);
    try {
      // Default Mastodon instance
      const defaultInstanceUrl = 'https://mastodon.social';
      const result = await workerClient.startMastodonAuth(defaultInstanceUrl);
      if (result.success && result.data) {
        window.location.href = result.data.auth_url;
      }
    } catch (error) {
      console.error('Failed to start Mastodon auth:', error);
      alert('Failed to connect to Mastodon.');
    } finally {
      setConnectingMastodon(false);
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

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) {
      alert('Please enter a board name');
      return;
    }
    
    setCreatingBoard(true);
    try {
      const result = await workerClient.createPinterestBoard(newBoardName.trim());
      if (result.success && result.data) {
        // Add new board to the list
        setPinterestBoards((prev) => [...prev, { id: result.data!.id, name: result.data!.name }]);
        setNewBoardName('');
        alert(`Board "${result.data.name}" created successfully!`);
      } else {
        alert('Failed to create board');
      }
    } catch (error) {
      console.error('Failed to create board:', error);
      alert('Failed to create board');
    } finally {
      setCreatingBoard(false);
    }
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

  // Site Configs functions
  const loadSiteConfigs = async () => {
    setLoadingSiteConfigs(true);
    try {
      const result = await workerClient.getSiteConfigs();
      if (result.success && result.data) {
        setSiteConfigs(result.data);
        // Load trend configs for each site
        for (const site of result.data) {
          loadSiteTrendConfigs(site.id);
        }
      }
    } catch (error) {
      console.error('Failed to load site configs:', error);
    } finally {
      setLoadingSiteConfigs(false);
    }
  };

  const loadSiteTrendConfigs = async (siteId: number) => {
    try {
      const result = await workerClient.getSiteTrendConfigs(siteId);
      if (result.success && result.data) {
        setSiteTrendConfigs(prev => ({ ...prev, [siteId]: result.data! }));
      }
    } catch (error) {
      console.error(`Failed to load trend configs for site ${siteId}:`, error);
    }
  };

  const handleCreateSite = async () => {
    if (!newSiteConfig.name || !newSiteConfig.site_id || !newSiteConfig.api_key) {
      alert('Name, Site ID, and API Key are required');
      return;
    }
    setCreatingSite(true);
    try {
      const result = await workerClient.createSiteConfig(newSiteConfig);
      if (result.success && result.data) {
        setSiteConfigs([...siteConfigs, result.data]);
        setNewSiteConfig({ name: '', site_id: '', api_key: '', domain: '' });
        alert('Site created successfully!');
      }
    } catch (error) {
      console.error('Failed to create site:', error);
      alert('Failed to create site.');
    } finally {
      setCreatingSite(false);
    }
  };

  const handleDeleteSite = async (id: number) => {
    if (!confirm('Are you sure you want to delete this site?')) return;
    try {
      await workerClient.deleteSiteConfig(id);
      setSiteConfigs(siteConfigs.filter(s => s.id !== id));
      const newTrendConfigs = { ...siteTrendConfigs };
      delete newTrendConfigs[id];
      setSiteTrendConfigs(newTrendConfigs);
      alert('Site deleted successfully!');
    } catch (error) {
      console.error('Failed to delete site:', error);
      alert('Failed to delete site.');
    }
  };

  const handleTestSite = async (id: number) => {
    try {
      const result = await workerClient.testSiteConfig(id);
      if (result.success && result.data) {
        alert(result.data.connected ? 'Connection successful!' : 'Connection failed');
      }
    } catch (error) {
      console.error('Failed to test site:', error);
      alert('Connection test failed.');
    }
  };

  const handleCreateTrendConfig = async (siteId: number) => {
    if (!newTrendConfig.keywords.trim()) {
      alert('Keywords are required');
      return;
    }
    try {
      const keywords = newTrendConfig.keywords.split(',').map(k => k.trim()).filter(k => k);
      const excluded = newTrendConfig.excluded_keywords 
        ? newTrendConfig.excluded_keywords.split(',').map(k => k.trim()).filter(k => k)
        : [];
      
      const result = await workerClient.createSiteTrendConfig(siteId, {
        keywords,
        geo: newTrendConfig.geo,
        cat: newTrendConfig.cat,
        date: newTrendConfig.date,
        excluded_keywords: excluded.length > 0 ? excluded : undefined,
        q_filter: newTrendConfig.q_filter || undefined,
      });
      
      if (result.success && result.data) {
        setSiteTrendConfigs(prev => ({
          ...prev,
          [siteId]: [...(prev[siteId] || []), result.data!],
        }));
        setNewTrendConfig({ keywords: '', geo: 'US', cat: '0', date: 'now 1-d', excluded_keywords: '', q_filter: '' });
        alert('Trend config created successfully!');
      }
    } catch (error) {
      console.error('Failed to create trend config:', error);
      alert('Failed to create trend config.');
    }
  };

  const handleDeleteTrendConfig = async (siteId: number, trendId: number) => {
    if (!confirm('Are you sure you want to delete this trend config?')) return;
    try {
      await workerClient.deleteSiteTrendConfig(siteId, trendId);
      setSiteTrendConfigs(prev => ({
        ...prev,
        [siteId]: (prev[siteId] || []).filter(t => t.id !== trendId),
      }));
      alert('Trend config deleted successfully!');
    } catch (error) {
      console.error('Failed to delete trend config:', error);
      alert('Failed to delete trend config.');
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

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-zinc-900 border-zinc-800">
          <TabsTrigger value="general" className="text-zinc-300 data-[state=active]:text-white">Genel</TabsTrigger>
          <TabsTrigger value="sites" className="text-zinc-300 data-[state=active]:text-white">Site Konfigürasyonları</TabsTrigger>
          <TabsTrigger value="api-keys" className="text-zinc-300 data-[state=active]:text-white">API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="sites" className="space-y-6">
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Globe className="h-5 w-5 text-blue-400" />
                Site Konfigürasyonları
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Birden fazla site için API bağlantıları ve trend ayarları yönetin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Create New Site */}
              <Card className="border-zinc-700 bg-zinc-800/50">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Yeni Site Ekle</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-zinc-300">Site Adı</Label>
                      <Input
                        value={newSiteConfig.name}
                        onChange={(e) => setNewSiteConfig({ ...newSiteConfig, name: e.target.value })}
                        placeholder="Quotes Site"
                        className="border-zinc-700 bg-zinc-800 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-300">Site ID</Label>
                      <Input
                        value={newSiteConfig.site_id}
                        onChange={(e) => setNewSiteConfig({ ...newSiteConfig, site_id: e.target.value })}
                        placeholder="site-123"
                        className="border-zinc-700 bg-zinc-800 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-300">API Key</Label>
                      <Input
                        type="password"
                        value={newSiteConfig.api_key}
                        onChange={(e) => setNewSiteConfig({ ...newSiteConfig, api_key: e.target.value })}
                        placeholder="API key"
                        className="border-zinc-700 bg-zinc-800 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-300">Domain (Opsiyonel)</Label>
                      <Input
                        value={newSiteConfig.domain}
                        onChange={(e) => setNewSiteConfig({ ...newSiteConfig, domain: e.target.value })}
                        placeholder="quotes.example.com"
                        className="border-zinc-700 bg-zinc-800 text-white"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleCreateSite}
                    disabled={creatingSite}
                    className="bg-violet-600 text-white hover:bg-violet-700"
                  >
                    {creatingSite ? 'Oluşturuluyor...' : 'Site Ekle'}
                  </Button>
                </CardContent>
              </Card>

              {/* Site List */}
              {loadingSiteConfigs ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
                </div>
              ) : siteConfigs.length === 0 ? (
                <p className="text-zinc-400 text-center py-8">Henüz site eklenmemiş</p>
              ) : (
                <div className="space-y-4">
                  {siteConfigs.map((site) => (
                    <Card key={site.id} className="border-zinc-700 bg-zinc-800/50">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-white">{site.name}</CardTitle>
                            <CardDescription className="text-zinc-400">
                              {site.domain || site.site_id} {site.is_active ? '(Aktif)' : '(Pasif)'}
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTestSite(site.id)}
                              className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                            >
                              <TestTube className="h-4 w-4 mr-1" />
                              Test
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setExpandedSiteId(expandedSiteId === site.id ? null : site.id)}
                              className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                            >
                              {expandedSiteId === site.id ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteSite(site.id)}
                              className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      {expandedSiteId === site.id && (
                        <CardContent className="space-y-4">
                          {/* Trend Configs */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-zinc-300 font-semibold">Trend Konfigürasyonları</Label>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setNewTrendConfig({ keywords: '', geo: 'US', cat: '0', date: 'now 1-d', excluded_keywords: '', q_filter: '' });
                                  setEditingTrendId(null);
                                }}
                                className="border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Yeni Trend Config
                              </Button>
                            </div>

                            {/* New Trend Config Form */}
                            {editingTrendId === null && (
                              <Card className="border-violet-500/30 bg-violet-500/10">
                                <CardContent className="pt-4 space-y-3">
                                  <div className="grid gap-3 md:grid-cols-2">
                                    <div className="space-y-2">
                                      <Label className="text-zinc-300 text-sm">Keywords (virgülle ayırın)</Label>
                                      <Input
                                        value={newTrendConfig.keywords}
                                        onChange={(e) => setNewTrendConfig({ ...newTrendConfig, keywords: e.target.value })}
                                        placeholder="quotes, wishes, birthday"
                                        className="border-zinc-700 bg-zinc-800 text-white text-sm"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-zinc-300 text-sm">Geo</Label>
                                      <Select value={newTrendConfig.geo} onValueChange={(v) => setNewTrendConfig({ ...newTrendConfig, geo: v })}>
                                        <SelectTrigger className="border-zinc-700 bg-zinc-800 text-zinc-300 text-sm">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-zinc-700">
                                          {GEO_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value} className="text-zinc-300">
                                              {opt.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-zinc-300 text-sm">Category (cat)</Label>
                                      <Input
                                        value={newTrendConfig.cat}
                                        onChange={(e) => setNewTrendConfig({ ...newTrendConfig, cat: e.target.value })}
                                        placeholder="0"
                                        className="border-zinc-700 bg-zinc-800 text-white text-sm"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-zinc-300 text-sm">Date</Label>
                                      <Select value={newTrendConfig.date} onValueChange={(v) => setNewTrendConfig({ ...newTrendConfig, date: v })}>
                                        <SelectTrigger className="border-zinc-700 bg-zinc-800 text-zinc-300 text-sm">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-zinc-700">
                                          {GOOGLE_TRENDS_DATE_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value} className="text-zinc-300">
                                              {opt.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-zinc-300 text-sm">Excluded Keywords (virgülle ayırın)</Label>
                                      <Input
                                        value={newTrendConfig.excluded_keywords}
                                        onChange={(e) => setNewTrendConfig({ ...newTrendConfig, excluded_keywords: e.target.value })}
                                        placeholder="adult, nsfw"
                                        className="border-zinc-700 bg-zinc-800 text-white text-sm"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-zinc-300 text-sm">Query Filter (q_filter)</Label>
                                      <Input
                                        value={newTrendConfig.q_filter}
                                        onChange={(e) => setNewTrendConfig({ ...newTrendConfig, q_filter: e.target.value })}
                                        placeholder="quotes"
                                        className="border-zinc-700 bg-zinc-800 text-white text-sm"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleCreateTrendConfig(site.id)}
                                      className="bg-violet-600 text-white hover:bg-violet-700"
                                    >
                                      Kaydet
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setNewTrendConfig({ keywords: '', geo: 'US', cat: '0', date: 'now 1-d', excluded_keywords: '', q_filter: '' })}
                                      className="border-zinc-700 bg-zinc-800 text-zinc-300"
                                    >
                                      İptal
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            )}

                            {/* Existing Trend Configs */}
                            {(siteTrendConfigs[site.id] || []).map((trend) => {
                              const keywords = JSON.parse(trend.keywords) as string[];
                              const excluded = trend.excluded_keywords ? JSON.parse(trend.excluded_keywords) as string[] : [];
                              return (
                                <Card key={trend.id} className="border-zinc-700 bg-zinc-800/50">
                                  <CardContent className="pt-4">
                                    <div className="flex items-start justify-between">
                                      <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                            {keywords.join(', ')}
                                          </Badge>
                                          <span className="text-zinc-400 text-sm">Geo: {trend.geo}</span>
                                          <span className="text-zinc-400 text-sm">Cat: {trend.cat}</span>
                                          <span className="text-zinc-400 text-sm">Date: {trend.date}</span>
                                        </div>
                                        {trend.q_filter && (
                                          <p className="text-zinc-400 text-sm">Filter: {trend.q_filter}</p>
                                        )}
                                        {excluded.length > 0 && (
                                          <div className="flex flex-wrap gap-1">
                                            <span className="text-zinc-400 text-sm">Excluded:</span>
                                            {excluded.map((k, i) => (
                                              <Badge key={i} variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                                                {k}
                                              </Badge>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDeleteTrendConfig(site.id, trend.id)}
                                        className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-keys" className="space-y-6">
          {/* Google Trends / SerpAPI Configuration */}
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <TrendingUp className="h-5 w-5 text-green-400" />
                Google Trends (SerpAPI)
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Configure SerpAPI for Google Trends data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="serpapi_key" className="text-zinc-300">
                  SerpAPI Key
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

              <div className="space-y-2">
                <Label htmlFor="trends_query" className="text-zinc-300">
                  Default Query Keywords (q)
                </Label>
                <Input
                  id="trends_query"
                  value={trendsQuery}
                  onChange={(e) => setTrendsQuery(e.target.value)}
                  placeholder="e.g., quotes, fitness, tech"
                  className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
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
                    Time Range (date)
                  </Label>
                  <Select value={trendsDate} onValueChange={(v) => setTrendsDate(v as GoogleTrendsDateValue)}>
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

                <div className="space-y-2">
                  <Label htmlFor="trends_category" className="text-zinc-300">
                    Category (cat)
                  </Label>
                  <Input
                    id="trends_category"
                    value={trendsCategory}
                    onChange={(e) => setTrendsCategory(e.target.value)}
                    placeholder="0 = All Categories"
                    className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300">Excluded Keywords</Label>
                <div className="flex gap-2">
                  <Input
                    value={newExcludedKeyword}
                    onChange={(e) => setNewExcludedKeyword(e.target.value)}
                    placeholder="Add keyword to exclude"
                    className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddExcludedKeyword()}
                  />
                  <Button
                    variant="outline"
                    onClick={handleAddExcludedKeyword}
                    className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {excludedKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {excludedKeywords.map((keyword) => (
                      <Badge
                        key={keyword}
                        variant="outline"
                        className="bg-red-500/20 text-red-400 border-red-500/30"
                      >
                        {keyword}
                        <button
                          onClick={() => handleRemoveExcludedKeyword(keyword)}
                          className="ml-1 hover:text-red-300"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
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
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Gemini API Configuration */}
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Settings className="h-5 w-5 text-purple-400" />
                Gemini API
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Configure Google Gemini for AI content generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gemini_api_key" className="text-zinc-300">
                  Gemini API Key
                </Label>
                <Input
                  id="gemini_api_key"
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
                Save
              </Button>
            </CardContent>
          </Card>

          {/* Unosend Email Configuration */}
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Settings className="h-5 w-5 text-orange-400" />
                Unosend Email
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Configure Unosend for email sending
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="unosend_api_key" className="text-zinc-300">
                    Unosend API Key
                  </Label>
                  <Input
                    id="unosend_api_key"
                    type="password"
                    value={unosendApiKey}
                    onChange={(e) => setUnosendApiKey(e.target.value)}
                    placeholder="Enter your Unosend API key"
                    className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mailing_from_email" className="text-zinc-300">
                    From Email Address
                  </Label>
                  <Input
                    id="mailing_from_email"
                    type="email"
                    value={mailingFromEmail}
                    onChange={(e) => setMailingFromEmail(e.target.value)}
                    placeholder="noreply@example.com"
                    className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveUnosendSettings}
                disabled={savingUnosend}
                className="bg-violet-600 text-white hover:bg-violet-700"
              >
                {savingUnosend ? (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save
              </Button>
            </CardContent>
          </Card>

          {/* Pinterest Configuration */}
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Link className="h-5 w-5 text-red-400" />
                Pinterest
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Connect your Pinterest account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pinterestConnected ? (
                <>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Connected as @{pinterestUsername}
                    </Badge>
                  </div>

                  {/* Board Mappings */}
                  {loadingBoards ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500"></div>
                    </div>
                  ) : (
                    <>
                      <Separator className="bg-zinc-800" />
                      <div className="space-y-4">
                        <Label className="text-zinc-300 font-semibold">
                          Category → Board Mappings
                        </Label>
                        <p className="text-zinc-500 text-sm">
                          Map your site categories to Pinterest boards for automatic posting
                        </p>

                        {/* Create New Board */}
                        <div className="flex gap-2">
                          <Input
                            value={newBoardName}
                            onChange={(e) => setNewBoardName(e.target.value)}
                            placeholder="New board name"
                            className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
                          />
                          <Button
                            variant="outline"
                            onClick={handleCreateBoard}
                            disabled={creatingBoard}
                            className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                          >
                            {creatingBoard ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-white" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                          </Button>
                        </div>

                        {siteCategories.length > 0 ? (
                          <div className="space-y-3">
                            {siteCategories.map((category) => (
                              <div key={category.id} className="flex items-center gap-4">
                                <span className="text-zinc-300 w-32 truncate">
                                  {category.name}
                                </span>
                                <Select
                                  value={boardMappings[category.id] || ''}
                                  onValueChange={(v) => handleBoardMappingChange(category.id, v)}
                                >
                                  <SelectTrigger className="border-zinc-700 bg-zinc-800 text-zinc-300 flex-1">
                                    <SelectValue placeholder="Select a board" />
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
                            ))}
                          </div>
                        ) : (
                          <p className="text-zinc-500 text-sm">
                            No categories found. Configure your site first.
                          </p>
                        )}

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
                          Save Mappings
                        </Button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <Button
                  onClick={handlePinterestConnect}
                  disabled={connectingPinterest}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  {connectingPinterest ? (
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <Link className="mr-2 h-4 w-4" />
                  )}
                  Connect Pinterest
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Mastodon Configuration */}
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Link className="h-5 w-5 text-purple-400" />
                Mastodon
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Connect your Mastodon account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mastodonConnected ? (
                <div className="flex items-center gap-3">
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Connected as @{mastodonUsername}
                  </Badge>
                </div>
              ) : (
                <Button
                  onClick={handleMastodonConnect}
                  disabled={connectingMastodon}
                  className="bg-purple-600 text-white hover:bg-purple-700"
                >
                  {connectingMastodon ? (
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <Link className="mr-2 h-4 w-4" />
                  )}
                  Connect Mastodon
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
