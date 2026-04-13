import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { supabase } from '@/integrations/supabase/client';
import { getApiBaseUrl } from '@/lib/api';
import { Copy, ExternalLink, Key, Plus, Trash2, Loader2, Crown, Zap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const API_URL = getApiBaseUrl();

const endpoints = [
  {
    name: 'Trending Videos',
    method: 'GET',
    path: '?action=trending&region=US',
    description: 'Get trending videos. Supports region codes: US, GB, DE, FR, JP, IN, BR, KR.',
  },
  {
    name: 'Search Videos',
    method: 'GET',
    path: '?action=search&q=YOUR_QUERY&filter=videos',
    description: 'Search for videos. Supports pagination via nextpage parameter.',
  },
  {
    name: 'Video Stream',
    method: 'GET',
    path: '?action=stream&videoId=VIDEO_ID',
    description: 'Get video stream data including direct URLs, related videos, and metadata.',
  },
  {
    name: 'Search Suggestions',
    method: 'GET',
    path: '?action=suggestions&q=YOUR_QUERY',
    description: 'Get search autocomplete suggestions.',
  },
];

interface ApiKey {
  id: string;
  name: string;
  key: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

interface Subscription {
  id: string;
  plan: string;
  status: string;
  started_at: string;
  expires_at: string;
  amount: number | null;
}

export default function Developers() {
  const [user, setUser] = useState<any>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        await loadData(user.id);
      }
      setLoading(false);
    };
    checkAuth();

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
      if (session?.user) loadData(session.user.id);
    });
    return () => authSub.unsubscribe();
  }, []);

  const loadData = async (userId: string) => {
    const [keysRes, subRes] = await Promise.all([
      supabase.from('api_keys').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (keysRes.data) setApiKeys(keysRes.data);

    if (subRes.data) {
      setSubscription(subRes.data);
    } else {
      // Create trial subscription for new users
      const { data: newSub } = await supabase.from('subscriptions').insert({
        user_id: userId,
        plan: 'trial',
        status: 'active',
        amount: 0,
      }).select().single();
      if (newSub) setSubscription(newSub);
    }
  };

  const createApiKey = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const { data: keyVal } = await supabase.rpc('generate_api_key');
      const { data, error } = await supabase.from('api_keys').insert({
        user_id: user.id,
        name: newKeyName || 'Default',
        key: keyVal,
      }).select().single();
      if (error) throw error;
      if (data) {
        setApiKeys((prev) => [data, ...prev]);
        setNewKeyName('');
        toast.success('API key created!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create key');
    } finally {
      setCreating(false);
    }
  };

  const deleteKey = async (id: string) => {
    await supabase.from('api_keys').delete().eq('id', id);
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
    toast.success('Key deleted');
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied!');
  };

  const handlePayment = async (plan: 'monthly' | 'annual') => {
    if (!user) return;
    setPaymentLoading(plan);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/pesapal?action=submit-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            plan,
            callback_url: `${window.location.origin}/developers`,
          }),
        }
      );
      const data = await res.json();
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        toast.error(data.error || 'Payment initiation failed');
      }
    } catch {
      toast.error('Failed to initiate payment');
    } finally {
      setPaymentLoading('');
    }
  };

  const isTrialExpired = subscription?.plan === 'trial' &&
    new Date(subscription.expires_at) < new Date();
  const isActive = subscription?.status === 'active' && !isTrialExpired;
  const daysLeft = subscription?.expires_at
    ? Math.max(0, Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16 px-4 max-w-2xl mx-auto py-16 text-center">
          <Key className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground mb-2">Developer Portal</h1>
          <p className="text-muted-foreground mb-6">
            Sign up to get API access with a 2-day free trial. Create API keys to integrate video data into your apps.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate('/auth')} size="lg">Sign Up / Sign In</Button>
          </div>

          {/* Public API docs */}
          <div className="mt-12 text-left">
            <h2 className="text-xl font-semibold text-foreground mb-4">API Endpoints</h2>
            <div className="space-y-3">
              {endpoints.map((ep) => (
                <div key={ep.name} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/20 text-primary">{ep.method}</span>
                    <h3 className="font-semibold text-foreground text-sm">{ep.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{ep.description}</p>
                </div>
              ))}
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-8">
      <Header />
      <main className="pt-16 px-4 sm:px-6 max-w-4xl mx-auto pb-8">
        <div className="py-6">
          <h1 className="text-2xl font-bold text-foreground mb-6">Developer Portal</h1>

          {/* Subscription Status */}
          <div className="bg-card border border-border rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                Subscription
              </h2>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {isActive ? 'Active' : 'Expired'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              Plan: <span className="text-foreground font-medium capitalize">{subscription?.plan || 'None'}</span>
              {subscription?.plan === 'trial' && isActive && (
                <span className="ml-2 text-primary">({daysLeft} day{daysLeft !== 1 ? 's' : ''} left)</span>
              )}
            </p>
            {(!isActive || subscription?.plan === 'trial') && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-secondary rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-foreground">Monthly</h3>
                  </div>
                  <p className="text-2xl font-bold text-foreground">KES 500<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                  <Button
                    onClick={() => handlePayment('monthly')}
                    className="w-full mt-3"
                    size="sm"
                    disabled={!!paymentLoading}
                  >
                    {paymentLoading === 'monthly' ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Subscribe Monthly
                  </Button>
                </div>
                <div className="bg-secondary rounded-xl p-4 border-2 border-primary/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-foreground">Annual</h3>
                    <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">Save 33%</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">KES 4,000<span className="text-sm font-normal text-muted-foreground">/yr</span></p>
                  <Button
                    onClick={() => handlePayment('annual')}
                    className="w-full mt-3"
                    size="sm"
                    disabled={!!paymentLoading}
                  >
                    {paymentLoading === 'annual' ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Subscribe Annually
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* API Keys */}
          <div className="bg-card border border-border rounded-xl p-5 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              API Keys
            </h2>

            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Key name (e.g. My App)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="flex-1"
              />
              <Button onClick={createApiKey} disabled={creating || !isActive} size="sm" className="gap-1">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create
              </Button>
            </div>
            {!isActive && (
              <p className="text-xs text-red-400 mb-3">Subscribe to create API keys</p>
            )}

            <div className="space-y-2">
              {apiKeys.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No API keys yet. Create one above.</p>
              )}
              {apiKeys.map((k) => (
                <div key={k.id} className="flex items-center gap-2 bg-secondary rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{k.name}</p>
                    <code className="text-xs text-muted-foreground font-mono block truncate">{k.key}</code>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => copyText(k.key)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteKey(k.id)} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* API Base URL */}
          <div className="bg-card border border-border rounded-xl p-5 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-2">API Base URL</h2>
            <div className="flex items-center gap-2 bg-secondary rounded-lg p-3">
              <code className="text-sm text-foreground flex-1 break-all font-mono">{API_URL}</code>
              <Button variant="ghost" size="icon" onClick={() => copyText(API_URL)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Endpoints */}
          <h2 className="text-xl font-semibold text-foreground mb-4">Endpoints</h2>
          <div className="space-y-3">
            {endpoints.map((ep) => (
              <div key={ep.name} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/20 text-primary">{ep.method}</span>
                      <h3 className="font-semibold text-foreground text-sm">{ep.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{ep.description}</p>
                    <code className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded break-all block font-mono">
                      {API_URL}{ep.path}
                    </code>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => copyText(`${API_URL}${ep.path}`)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => window.open(`${API_URL}${ep.path}`, '_blank')}>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Example */}
          <div className="bg-card border border-border rounded-xl p-5 mt-6">
            <h2 className="text-lg font-semibold text-foreground mb-2">Quick Example</h2>
            <pre className="bg-secondary rounded-lg p-4 overflow-x-auto text-sm text-foreground font-mono">
{`// Fetch trending videos
const response = await fetch(
  '${API_URL}?action=trending&region=US',
  {
    headers: {
      'x-api-key': 'YOUR_API_KEY'
    }
  }
);
const videos = await response.json();`}
            </pre>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
