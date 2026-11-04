// Only the GearHub owner on GearHub's Settings can release a build to sellers.
(() => {
  if (/^\/shops\//.test(location.pathname)) return;
  const panel = document.getElementById('shop-release-control');
  if (!panel) return;
  const detail = document.getElementById('shop-release-detail');
  const feedback = document.getElementById('shop-release-feedback');
  const button = document.getElementById('shop-release-confirm');
  let state, busy = false;
  function render() {
    detail.textContent = 'GearHub ' + state.deployedVersion + ' · Shops ' + state.sellerVersion;
    button.disabled = busy || !state.pending;
    button.textContent = busy ? 'Updating…' : state.pending ? 'Confirm update' : 'All shops up to date';
    if (!busy) feedback.textContent = state.pending ? 'ဆိုင်အားလုံးကို ပြောင်းရန် Confirm update နှိပ်ပါ။' : 'ဆိုင်အားလုံးအတွက် အတည်ပြုပြီးပါပြီ။';
    panel.hidden = false;
  }
  async function refresh() {
    try {
      const response = await fetch('/api/admin/app-release', {cache:'no-store'});
      if (!response.ok) { panel.hidden = true; return; }
      state = await response.json();
      render();
    } catch { /* Keep the last known state during a deploy restart. */ }
  }
  button.addEventListener('click', async () => {
    if (busy || !state?.pending) return;
    busy = true;
    render();
    try {
      const tokenResponse = await fetch('/api/admin/csrf', {cache:'no-store'});
      if (!tokenResponse.ok) throw Error('Sign in again. / ပြန်ဝင်ပေးပါ။');
      const {csrfToken} = await tokenResponse.json();
      const response = await fetch('/api/admin/app-release', {method:'POST', headers:{'Content-Type':'application/json','X-CSRF-Token':csrfToken}, body:JSON.stringify({version:state.deployedVersion})});
      const result = await response.json();
      if (!response.ok) throw Error(result.error || 'Update failed. Try again.');
      state = result;
      busy = false;
      render();
    } catch (error) {
      busy = false;
      render();
      feedback.textContent = error.message;
    }
  });
  refresh();
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !busy) refresh(); });
})();
