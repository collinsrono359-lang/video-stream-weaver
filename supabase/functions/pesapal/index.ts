import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PESAPAL_BASE = 'https://pay.pesapal.com/v3';

async function getAuthToken(): Promise<string> {
  const key = Deno.env.get('PESAPAL_CONSUMER_KEY');
  const secret = Deno.env.get('PESAPAL_CONSUMER_SECRET');
  if (!key || !secret) throw new Error('PesaPal credentials not configured');

  const res = await fetch(`${PESAPAL_BASE}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ consumer_key: key, consumer_secret: secret }),
  });
  const data = await res.json();
  if (!data.token) throw new Error('Failed to get PesaPal token');
  return data.token;
}

async function registerIPN(token: string, callbackUrl: string): Promise<string> {
  const res = await fetch(`${PESAPAL_BASE}/api/URLSetup/RegisterIPN`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      url: callbackUrl,
      ipn_notification_type: 'GET',
    }),
  });
  const data = await res.json();
  return data.ipn_id;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'submit-order') {
      const body = await req.json();
      const { plan, callback_url } = body;

      const amount = plan === 'monthly' ? 500 : 4000;
      const description = plan === 'monthly' ? 'MediaFusion Monthly - KES 500' : 'MediaFusion Annual - KES 4,000';

      const token = await getAuthToken();
      const ipnId = await registerIPN(token, `${Deno.env.get('SUPABASE_URL')}/functions/v1/pesapal?action=ipn`);

      const orderRes = await fetch(`${PESAPAL_BASE}/api/Transactions/SubmitOrderRequest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          currency: 'KES',
          amount,
          description,
          callback_url,
          notification_id: ipnId,
          billing_address: {
            email_address: user.email,
            first_name: user.user_metadata?.display_name || '',
          },
        }),
      });

      const orderData = await orderRes.json();

      if (orderData.order_tracking_id) {
        // Create pending subscription
        await supabase.from('subscriptions').insert({
          user_id: user.id,
          plan,
          status: 'pending',
          amount,
          pesapal_tracking_id: orderData.order_tracking_id,
          expires_at: plan === 'monthly'
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      return new Response(JSON.stringify(orderData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'ipn') {
      // IPN callback from PesaPal
      const trackingId = url.searchParams.get('OrderTrackingId');
      const merchantRef = url.searchParams.get('OrderMerchantReference');

      if (trackingId) {
        const token = await getAuthToken();
        const statusRes = await fetch(`${PESAPAL_BASE}/api/Transactions/GetTransactionStatus?orderTrackingId=${trackingId}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        });
        const statusData = await statusRes.json();

        if (statusData.payment_status_description === 'Completed') {
          const adminClient = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
          );
          await adminClient.from('subscriptions')
            .update({ status: 'active' })
            .eq('pesapal_tracking_id', trackingId);
        }
      }

      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'status') {
      // Check user's subscription status
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return new Response(JSON.stringify({ subscription: sub }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('PesaPal error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
