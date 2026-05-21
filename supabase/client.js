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
    savedSkus: new Set()
  };

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  async function refreshSession() {
    const { data } = await supabase.auth.getSession();
    state.session = data.session || null;
    state.user = state.session?.user || null;
    emit('ta:auth-state', { user: state.user, session: state.session });
    return state.session;
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
    const { data, error } = await supabase
      .from('saved_tools')
      .select('sku, created_at')
      .eq('user_id', state.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const skus = (data || []).map((r) => r.sku);
    state.savedSkus = new Set(skus);
    emit('ta:saved-tools-updated', { skus });
    return data || [];
  }

  async function saveTool(sku) {
    if (!state.user) throw new Error('AUTH_REQUIRED');
    const { error } = await supabase.from('saved_tools').insert({
      user_id: state.user.id,
      sku
    });
    if (error && error.code !== '23505') throw error;
    state.savedSkus.add(sku);
    emit('ta:saved-tools-updated', { skus: [...state.savedSkus] });
  }

  async function unsaveTool(sku) {
    if (!state.user) throw new Error('AUTH_REQUIRED');
    const { error } = await supabase
      .from('saved_tools')
      .delete()
      .eq('user_id', state.user.id)
      .eq('sku', sku);
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
      await fetchSavedTools().catch(() => {});
    } else {
      state.savedSkus = new Set();
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
    getUser
  };

  refreshSession().then(() => {
    if (state.user) fetchSavedTools().catch(() => {});
  });
})();