// Only the GearHub owner on GearHub's Settings can release a build to sellers.
(() => {
  if (/^\/shops\//.test(location.pathname)) return;
  const panel = document.getElementById('shop-release-control');
  if (!panel) return;
  const detail = document.getElementById('shop-release-detail');
  const feedback = document.getElementById('shop-release-feedback');
  const button = document.getElementById('shop-release-confirm');
  let state, busy = false;
  // 1.1.313 owner: beside Confirm update, a time (12-hour, AM / PM, Myanmar time) when shops update by themselves.
  const auto = document.createElement('div');
  auto.className = 'release-auto';
  const opts = (from, to, step, pad) => { let h = ''; for (let n = from; n <= to; n += step) h += '<option value="' + n + '">' + (pad ? String(n).padStart(2, '0') : n) + '</option>'; return h; };
  auto.innerHTML = '<label class="release-auto-switch"><input type="checkbox" id="release-auto-on"><span aria-hidden="true"></span><b>Auto update</b></label>' +
    '<span class="release-auto-time"><select id="release-auto-hour" aria-label="Hour">' + opts(1, 12, 1) + '</select><b>:</b><select id="release-auto-minute" aria-label="Minute">' + opts(0, 55, 5, true) + '</select>' +
    '<select id="release-auto-ampm" aria-label="AM or PM"><option>AM</option><option>PM</option></select></span><small id="release-auto-note"></small>';
  button.after(auto);
  const on = auto.querySelector('#release-auto-on'), hour = auto.querySelector('#release-auto-hour'), minute = auto.querySelector('#release-auto-minute'), ampm = auto.querySelector('#release-auto-ampm'), note = auto.querySelector('#release-auto-note');
  const to24 = () => { let h = Number(hour.value) % 12; if (ampm.value === 'PM') h += 12; return String(h).padStart(2, '0') + ':' + String(minute.value).padStart(2, '0'); };
  const label12 = t => { const [h, m] = t.split(':').map(Number); return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + ' ' + (h < 12 ? 'AM' : 'PM'); };
  function showAuto() {
    const t = state?.autoTime || '';
    on.checked = Boolean(t);
    if (t) { const [h, m] = t.split(':').map(Number); hour.value = String(h % 12 || 12); minute.value = String(m - m % 5); ampm.value = h < 12 ? 'AM' : 'PM'; }
    else if (!hour.dataset.set) { hour.value = '2'; minute.value = '0'; ampm.value = 'AM'; }
    hour.dataset.set = '1';
    auto.querySelectorAll('select').forEach(el => { el.disabled = !on.checked; });
    note.textContent = t ? 'နေ့တိုင်း ' + label12(t) + ' (မြန်မာစံတော်ချိန်) မှာ update ရှိရင် ဆိုင်တွေကို အလိုလို တင်ပါမယ်။' : 'Auto update ပိတ်ထားပါတယ်။';
  }
  async function saveAuto() {
    auto.querySelectorAll('select').forEach(el => { el.disabled = !on.checked; });
    try {
      const {csrfToken} = await (await fetch('/api/admin/csrf', {cache:'no-store'})).json();
      const response = await fetch('/api/admin/app-release/auto', {method:'PUT', headers:{'Content-Type':'application/json','X-CSRF-Token':csrfToken}, body:JSON.stringify({time:on.checked ? to24() : ''})});
      const result = await response.json();
      if (!response.ok) throw Error(result.error || 'Could not save.');
      state = result; showAuto();
    } catch (error) { note.textContent = error.message; }
  }
  on.addEventListener('change', saveAuto);
  [hour, minute, ampm].forEach(el => el.addEventListener('change', saveAuto));
  function render() {
    detail.textContent = 'GearHub ' + state.deployedVersion + ' · Shops ' + state.sellerVersion;
    button.disabled = busy || !state.pending;
    button.textContent = busy ? 'Updating…' : state.pending ? 'Confirm update' : 'All shops up to date';
    if (!busy) feedback.textContent = state.pending ? 'ဆိုင်အားလုံးကို ပြောင်းရန် Confirm update နှိပ်ပါ။' : 'ဆိုင်အားလုံးအတွက် အတည်ပြုပြီးပါပြီ။';
    panel.hidden = false;
    showAuto();
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
