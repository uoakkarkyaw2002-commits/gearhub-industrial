(() => {
  const panel = document.getElementById('shops-view');
  if (!panel) return;
  const list = document.getElementById('shops-feed-list'), status = document.getElementById('shops-feed-status'), more = document.getElementById('shops-feed-more');
  const dialog = document.getElementById('shops-photo-dialog'), photo = document.getElementById('shops-photo-image');
  const words = {
    en:{product:'Product',kicker:'FROM EVERY SHOP',intro:'A little discovery. A new favourite. Products from every shop, together.',loading:'Finding products…',more:'Load more',retry:'Try again',empty:'A fresh start. Products will appear here when shops add them.',failed:'Products could not load. Please try again.',done:'You’re all caught up.',visit:'Visit shop',read:'See more',less:'See less',noPhoto:'No photo yet',soldOut:'Out of stock',photos:'View photos',close:'Close photos',prev:'Previous photo',next:'Next photo'},
    my:{product:'ပစ္စည်း',kicker:'ဆိုင်အသီးသီးမှ ပစ္စည်းများ',intro:'ဆိုင်အသီးသီးက ပစ္စည်းတွေကို တစ်နေရာတည်းမှာ ကြည့်ရှုပါ။',loading:'ပစ္စည်းများ ရှာဖွေနေပါသည်…',more:'ထပ်ကြည့်ရန်',retry:'ပြန်စမ်းရန်',empty:'ဆိုင်တွေ ပစ္စည်းတင်တဲ့အခါ ဒီနေရာမှာ ပြပေးပါမယ်။',failed:'ပစ္စည်းများ မရနိုင်သေးပါ။ ပြန်စမ်းကြည့်ပါ။',done:'ပစ္စည်းအားလုံး ကြည့်ပြီးပါပြီ။',visit:'ဆိုင်သို့သွားရန်',read:'ဆက်ဖတ်ရန်',less:'လျှော့ပြရန်',noPhoto:'ဓာတ်ပုံ မတင်ရသေးပါ',soldOut:'ပစ္စည်းကုန်နေပါသည်',photos:'ဓာတ်ပုံများ ကြည့်ရန်',close:'ဓာတ်ပုံ ပိတ်ရန်',prev:'ရှေ့ပုံ',next:'နောက်ပုံ'}
  };
  const t = key => words[document.documentElement.lang === 'my' ? 'my' : 'en'][key];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = value => new Intl.NumberFormat('en-US').format(value) + ' Ks';
  const title = item => document.documentElement.lang === 'my' && item.nameMy ? item.nameMy : item.name;
  let active = false, loading = false, initialized = false, nextBefore = null, items = [], lastLoaded = 0, failed = false;
  let gallery = null, photoIndex = 0;
  function post(item) {
    const images = item.images || [], text = item.description || '', long = text.length > 180 || text.split('\n').length > 4;
    const initials = [...item.shop.name.trim()].slice(0, 1).join('') || 'S';
    const avatar = item.shop.logo ? '<img src="' + esc(item.shop.logo) + '" alt="" loading="lazy" decoding="async">' : esc(initials);
    const pictures = images.length ? '<div class="shops-post-photos photos-' + Math.min(images.length, 4) + '">' + images.slice(0, 4).map((url, index) =>
      '<button type="button" data-feed-photo="' + item.id + '" data-photo-index="' + index + '" aria-label="' + esc(t('photos') + ' · ' + (index + 1) + ' / ' + images.length) + '"><img src="' + esc(url) + '" alt="' + esc(title(item)) + '" loading="lazy" decoding="async">' + (index === 3 && images.length > 4 ? '<span class="shops-photo-extra">+' + (images.length - 4) + '</span>' : '') + '</button>').join('') + '</div>' :
      '<div class="shops-post-no-photo"><svg viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="10" width="32" height="28" rx="5"/><circle cx="18" cy="20" r="3"/><path d="m10 34 9-8 7 6 6-5 7 7"/></svg><span>' + esc(t('noPhoto')) + '</span></div>';
    return '<article class="shops-post" data-feed-id="' + item.id + '" aria-labelledby="shops-post-title-' + item.id + '">' +
      '<header class="shops-post-header"><a class="shops-post-avatar" href="' + esc(item.shop.url) + '" tabindex="-1" aria-hidden="true">' + avatar + '</a><div><a class="shops-post-shop" href="' + esc(item.shop.url) + '">' + esc(item.shop.name) + '</a><span class="shops-post-subtitle">' + esc(item.category || t('product')) + '</span></div><a class="shops-post-go" href="' + esc(item.shop.url) + '" aria-label="' + esc(t('visit') + ' · ' + item.shop.name) + '">↗</a></header>' +
      '<div class="shops-post-caption"><h2 id="shops-post-title-' + item.id + '">' + esc(title(item)) + '</h2>' +
      (text ? '<p class="shops-post-description' + (long ? ' is-clamped' : '') + '" id="shops-description-' + item.id + '">' + esc(text) + '</p>' + (long ? '<button type="button" class="shops-read-more" data-feed-expand="' + item.id + '" aria-controls="shops-description-' + item.id + '" aria-expanded="false">' + esc(t('read')) + '</button>' : '') : '') +
      (item.price === null && item.stock !== 0 ? '' : '<div class="shops-post-price">' + (item.price === null ? '' : '<span>' + money(item.price) + '</span>' + (item.originalPrice !== null ? '<del>' + money(item.originalPrice) + '</del>' : '')) + (item.stock === 0 ? '<small>' + esc(t('soldOut')) + '</small>' : '') + '</div>') + '</div>' + pictures +
      '<footer class="shops-post-footer"><a href="' + esc(item.shop.url) + '">' + esc(t('visit')) + '<span aria-hidden="true">→</span></a></footer></article>';
  }
  function labels() {
    document.getElementById('shops-feed-kicker').textContent = t('kicker');
    document.getElementById('shops-feed-intro').textContent = t('intro');
    more.textContent = t(loading ? 'loading' : failed ? 'retry' : 'more');
    more.disabled = loading;
    more.hidden = loading ? !items.length : !failed && nextBefore === null;
    list.setAttribute('aria-busy', String(loading));
    status.textContent = failed ? t('failed') : loading ? t('loading') : initialized ? t(items.length ? 'done' : 'empty') : '';
    if (items.length && nextBefore !== null && !loading && !failed) status.textContent = '';
    for (const [id, key] of [['shops-photo-close','close'],['shops-photo-prev','prev'],['shops-photo-next','next']]) document.getElementById(id).setAttribute('aria-label',t(key));
  }
  async function load(reset = false) {
    if (loading || (!reset && initialized && nextBefore === null)) return;
    loading = true; failed = false;
    if (!initialized) list.innerHTML = '<div class="shops-feed-skeleton" aria-hidden="true"><i></i><b></b><span></span></div><div class="shops-feed-skeleton" aria-hidden="true"><i></i><b></b><span></span></div>';
    labels();
    const stop = new AbortController(), timer = setTimeout(() => stop.abort(), 12000);
    try {
      const response = await fetch('/api/platform/feed' + (!reset && nextBefore ? '?before=' + encodeURIComponent(nextBefore) : ''), {cache:'no-store',signal:stop.signal});
      if (!response.ok) throw Error('Feed unavailable');
      const result = await response.json();
      const incoming = Array.isArray(result.items) ? result.items : [];
      if (reset || !initialized) { items = []; list.innerHTML = ''; }
      const seen = new Set(items.map(item => item.id));
      const fresh = incoming.filter(item => !seen.has(item.id));
      items.push(...fresh);
      list.insertAdjacentHTML('beforeend', fresh.map(post).join(''));
      nextBefore = result.nextBefore || null;
      initialized = true; lastLoaded = Date.now();
    } catch {
      failed = true;
      if (!initialized) list.innerHTML = '';
    } finally { clearTimeout(timer); loading = false; labels(); }
  }
  function showPhoto() {
    photo.src = gallery.images[photoIndex]; photo.alt = title(gallery);
    document.getElementById('shops-photo-title').textContent = gallery.shop.name + ' · ' + title(gallery);
    document.getElementById('shops-photo-count').textContent = (photoIndex + 1) + ' / ' + gallery.images.length;
    document.getElementById('shops-photo-prev').disabled = photoIndex === 0;
    document.getElementById('shops-photo-next').disabled = photoIndex === gallery.images.length - 1;
  }
  list.addEventListener('click', event => {
    const expand = event.target.closest('[data-feed-expand]');
    if (expand) {
      const expanded = expand.getAttribute('aria-expanded') !== 'true';
      document.getElementById('shops-description-' + expand.dataset.feedExpand).classList.toggle('is-clamped', !expanded);
      expand.setAttribute('aria-expanded', String(expanded)); expand.textContent = t(expanded ? 'less' : 'read');
    }
    const button = event.target.closest('[data-feed-photo]');
    if (!button) return;
    gallery = items.find(item => item.id === Number(button.dataset.feedPhoto));
    if (!gallery?.images?.length) return;
    photoIndex = Number(button.dataset.photoIndex) || 0; showPhoto();
    dialog.classList.add('open'); dialog.showModal();
  });
  document.getElementById('shops-photo-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { dialog.classList.remove('open'); photo.removeAttribute('src'); window.GearHubBackNav?.record(); });
  function move(delta) { if (gallery && photoIndex + delta >= 0 && photoIndex + delta < gallery.images.length) { photoIndex += delta; showPhoto(); } }
  document.getElementById('shops-photo-prev').addEventListener('click', () => move(-1));
  document.getElementById('shops-photo-next').addEventListener('click', () => move(1));
  dialog.addEventListener('keydown', event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1); } });
  more.addEventListener('click', () => load(!initialized || nextBefore === null));
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => { if (active && !failed && nextBefore && entries.some(entry => entry.isIntersecting)) load(); }, {rootMargin:'300px'}).observe(more);
  new MutationObserver(() => { if (initialized) list.innerHTML = items.map(post).join(''); labels(); }).observe(document.documentElement, {attributes:true,attributeFilter:['lang']});
  window.GearHubShops = {setActive(value) { active = value; if (active && (!initialized || Date.now() - lastLoaded > 60000)) load(true); }};
  labels();
})();
