;(function () {
  const cfg = window.TA_SUPABASE_CONFIG;
  if (!cfg || !cfg.url || !cfg.publishableKey) {
    console.error('Supabase config missing');
    return;
  }

  const supabaseLib = window.supabase;
  if (!supabaseLib || !supabaseLib.createClient) {
    console.error('Supabase client library missing');
    return;
  }

  const supabase = supabaseLib.createClient(cfg.url, cfg.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  const state = {
    session: null,
    user: null,
    savedSkus: new Set(),
    currentOrgId: null,
    memberships: []
  };

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function getActiveMembership() {
    return state.memberships.find((entry) => entry.org_id === state.currentOrgId) || null;
  }

  function getSavedContextOrgId() {
    const activeMembership = getActiveMembership();
    if (!activeMembership || activeMembership.organizations?.type === 'personal') {
      return null;
    }
    return activeMembership.org_id;
  }

  async function refreshSession() {
    const { data } = await supabase.auth.getSession();
    state.session = data.session || null;
    state.user = state.session?.user || null;
    emit('ta:auth-state', { user: state.user, session: state.session });
    if (state.user) {
      await refreshCurrentOrg().catch(() => {});
    } else {
      state.currentOrgId = null;
      state.memberships = [];
    }
    return state.session;
  }

  async function getProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('brand', { ascending: true })
      .order('sku', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function getProduct(sku) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('sku', sku)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function refreshCurrentOrg() {
    if (!state.user) {
      state.currentOrgId = null;
      state.memberships = [];
      return null;
    }
    const { data, error } = await supabase
      .from('memberships')
      .select('org_id, role, organizations(id, name, type, plan, parent_org_id, created_at)')
      .eq('user_id', state.user.id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    state.memberships = data || [];
    const storedOrgId = window.localStorage.getItem('ta:current-org-id');
    const matched = state.memberships.find((entry) => entry.org_id === storedOrgId);
    const personal = state.memberships.find((entry) => entry.organizations?.type === 'personal');
    const selected = matched || personal || state.memberships[0] || null;
    state.currentOrgId = selected?.org_id || null;
    if (state.currentOrgId) {
      window.localStorage.setItem('ta:current-org-id', state.currentOrgId);
    } else {
      window.localStorage.removeItem('ta:current-org-id');
    }
    emit('ta:org-changed', { orgId: state.currentOrgId, memberships: state.memberships });
    return selected;
  }

  async function getCurrentOrg() {
    if (!state.user) return null;
    if (!state.currentOrgId || !state.memberships.length) {
      await refreshCurrentOrg();
    }
    return state.memberships.find((entry) => entry.org_id === state.currentOrgId) || null;
  }

  async function switchOrg(orgId) {
    if (!state.user) throw new Error('AUTH_REQUIRED');
    if (!orgId) throw new Error('ORG_REQUIRED');
    const match = state.memberships.find((entry) => entry.org_id === orgId) || await refreshCurrentOrg().then(() => state.memberships.find((entry) => entry.org_id === orgId));
    if (!match) throw new Error('ORG_NOT_FOUND');
    state.currentOrgId = orgId;
    window.localStorage.setItem('ta:current-org-id', orgId);
    emit('ta:org-changed', { orgId: state.currentOrgId, memberships: state.memberships });
    return match;
  }

  async function getAiQuota() {
    if (!state.user) return null;
    const currentMonth = new Date();
    const month = new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth(), 1)).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('ai_quota')
      .select('user_id, month, count')
      .eq('user_id', state.user.id)
      .eq('month', month)
      .maybeSingle();
    if (error) throw error;
    return data || { user_id: state.user.id, month, count: 0 };
  }

  async function sendMagicLink(email) {
    return supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    });
  }

  async function signOut() {
    const res = await supabase.auth.signOut();
    state.savedSkus = new Set();
    emit('ta:saved-tools-updated', { skus: [] });
    return res;
  }

  async function fetchSavedTools() {
    if (!state.user) return [];
    if (!state.memberships.length) {
      await refreshCurrentOrg().catch(() => {});
    }
    const activeOrgId = getSavedContextOrgId();
    let query = supabase
      .from('saved_tools')
      .select('sku, created_at')
      .order('created_at', { ascending: false });
    if (activeOrgId) {
      query = query.eq('org_id', activeOrgId);
    } else {
      query = query.eq('user_id', state.user.id).is('org_id', null);
    }
    const { data, error } = await query;
    if (error) throw error;
    const skus = [...new Set((data || []).map((r) => r.sku))];
    state.savedSkus = new Set(skus);
    emit('ta:saved-tools-updated', { skus });
    return data || [];
  }

  async function saveTool(sku) {
    if (!state.user) throw new Error('AUTH_REQUIRED');
    if (!state.memberships.length) {
      await refreshCurrentOrg().catch(() => {});
    }
    const activeOrgId = getSavedContextOrgId();
    const { error } = await supabase.from('saved_tools').insert({
      user_id: state.user.id,
      org_id: activeOrgId,
      sku
    });
    if (error && error.code !== '23505') throw error;
    state.savedSkus.add(sku);
    emit('ta:saved-tools-updated', { skus: [...state.savedSkus] });
  }

  async function unsaveTool(sku) {
    if (!state.user) throw new Error('AUTH_REQUIRED');
    const activeOrgId = getSavedContextOrgId();
    let query = supabase
      .from('saved_tools')
      .delete()
      .eq('user_id', state.user.id)
      .eq('sku', sku);
    if (activeOrgId) {
      query = query.eq('org_id', activeOrgId);
    } else {
      query = query.is('org_id', null);
    }
    const { error } = await query;
    if (error) throw error;
    state.savedSkus.delete(sku);
    emit('ta:saved-tools-updated', { skus: [...state.savedSkus] });
  }

  function isSaved(sku) {
    return state.savedSkus.has(sku);
  }

  function getUser() {
    return state.user;
  }

  supabase.auth.onAuthStateChange(async (_event, session) => {
    state.session = session || null;
    state.user = state.session?.user || null;
    emit('ta:auth-state', { user: state.user, session: state.session });
    if (state.user) {
      await refreshCurrentOrg().catch(() => {});
      await fetchSavedTools().catch(() => {});
    } else {
      state.savedSkus = new Set();
      state.currentOrgId = null;
      state.memberships = [];
      emit('ta:saved-tools-updated', { skus: [] });
    }
  });

  window.taSupabase = {
    client: supabase,
    sendMagicLink,
    signOut,
    refreshSession,
    fetchSavedTools,
    saveTool,
    unsaveTool,
    isSaved,
    getUser,
    getProducts,
    getProduct,
    getCurrentOrg,
    switchOrg,
    getAiQuota
  };

  refreshSession().then(() => {
    if (state.user) fetchSavedTools().catch(() => {});
  });
})();