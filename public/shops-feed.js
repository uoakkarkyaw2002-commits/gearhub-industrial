(() => {
  const panel = document.getElementById('shops-view');
  if (!panel) return;
  const list = document.getElementById('shops-feed-list'), status = document.getElementById('shops-feed-status'), more = document.getElementById('shops-feed-more');
  const dialog = document.getElementById('shops-photo-dialog'), photo = document.getElementById('shops-photo-image');
  const words = {
    en:{timeUnknown:'Time unavailable',posted:'Posted',myanmarTime:'Myanmar time',product:'Product',kicker:'FROM EVERY SHOP',intro:'A little discovery. A new favourite. Products from every shop, together.',loading:'Finding products…',more:'Load more',retry:'Try again',empty:'A fresh start. Products will appear here when shops add them.',failed:'Products could not load. Please try again.',done:'You’re all caught up.',visit:'Visit shop',read:'See more',less:'See less',noPhoto:'No photo yet',soldOut:'Out of stock',photos:'View photos',close:'Close photos',prev:'Previous photo',next:'Next photo',
      verified:'Verified shop',menu:'More options',like:'Like',comment:'Comments',buy:'Buy Now',save:'Save',saved:'Saved',quantity:'Quantity',addCart:'Add to Cart',added:'Added to cart',notEnough:'Not enough stock',closeSheet:'Close',write:'Write a comment…',send:'Send',signIn:'Sign in with Google to like and comment',signInButton:'Continue with Google',noComments:'No comments yet. Be the first.',remove:'Delete',savedKicker:'ON THIS PHONE',savedTitle:'Saved',savedIntro:'Posts you saved. They stay on this phone.',savedEmpty:'Nothing saved yet. Tap the bookmark on a post to keep it here.',backToShops:'← Discover',savedRow:'Posts you saved',error:'Something went wrong. Please try again.',search:'Shop name and product',tabFeed:'Feed',tabFollowing:'Following',tabTrending:'Trending',tabNew:'New Arrivals',followEmpty:'Follow shops from the ••• menu on a post to see them here.',trendingEmpty:'No liked or commented posts yet.',noResults:'Nothing found. Try another word.',follow:'Follow',unfollow:'Following ✓',bell:'Notifications',account:'Settings'},
    my:{timeUnknown:'အချိန်မှတ်တမ်းမရှိ',posted:'တင်ထားသောအချိန်',myanmarTime:'မြန်မာစံတော်ချိန်',product:'ပစ္စည်း',kicker:'ဆိုင်အသီးသီးမှ ပစ္စည်းများ',intro:'ဆိုင်အသီးသီးက ပစ္စည်းတွေကို တစ်နေရာတည်းမှာ ကြည့်ရှုပါ။',loading:'ပစ္စည်းများ ရှာဖွေနေပါသည်…',more:'ထပ်ကြည့်ရန်',retry:'ပြန်စမ်းရန်',empty:'ဆိုင်တွေ ပစ္စည်းတင်တဲ့အခါ ဒီနေရာမှာ ပြပေးပါမယ်။',failed:'ပစ္စည်းများ မရနိုင်သေးပါ။ ပြန်စမ်းကြည့်ပါ။',done:'ပစ္စည်းအားလုံး ကြည့်ပြီးပါပြီ။',visit:'ဆိုင်သို့သွားရန်',read:'ဆက်ဖတ်ရန်',less:'လျှော့ပြရန်',noPhoto:'ဓာတ်ပုံ မတင်ရသေးပါ',soldOut:'ပစ္စည်းကုန်နေပါသည်',photos:'ဓာတ်ပုံများ ကြည့်ရန်',close:'ဓာတ်ပုံ ပိတ်ရန်',prev:'ရှေ့ပုံ',next:'နောက်ပုံ',
      verified:'အတည်ပြုထားသော ဆိုင်',menu:'နောက်ထပ်',like:'Like',comment:'မှတ်ချက်များ',buy:'ဝယ်မယ်',save:'သိမ်းမယ်',saved:'သိမ်းထားပြီး',quantity:'အရေအတွက်',addCart:'ခြင်းထဲထည့်',added:'ခြင်းထဲ ထည့်ပြီးပါပြီ',notEnough:'လက်ကျန် မလုံလောက်ပါ',closeSheet:'ပိတ်ရန်',write:'မှတ်ချက် ရေးပါ…',send:'ပို့မယ်',signIn:'Like နဲ့ မှတ်ချက်ရေးဖို့ Google နဲ့ ဝင်ပါ',signInButton:'Google နဲ့ ဝင်မယ်',noComments:'မှတ်ချက် မရှိသေးပါ။ ပထမဆုံး ရေးလိုက်ပါ။',remove:'ဖျက်မယ်',savedKicker:'ဒီဖုန်းထဲမှာ',savedTitle:'သိမ်းထားသည်များ',savedIntro:'သိမ်းထားတဲ့ post များ။ ဒီဖုန်းထဲမှာပဲ ရှိပါတယ်။',savedEmpty:'သိမ်းထားတာ မရှိသေးပါ။ Post ပေါ်က 🔖 ကို နှိပ်ပြီး သိမ်းပါ။',backToShops:'← Discover',savedRow:'သိမ်းထားတဲ့ post များ',error:'မအောင်မြင်ပါ။ ပြန်စမ်းကြည့်ပါ။',search:'ဆိုင်နာမည်နဲ့ ပစ္စည်း ရှာရန်',tabFeed:'Feed',tabFollowing:'Following',tabTrending:'Trending',tabNew:'New Arrivals',followEmpty:'Post ပေါ်က ••• ထဲမှာ Follow နှိပ်ထားတဲ့ ဆိုင်တွေ ဒီမှာ ပေါ်ပါမယ်။',trendingEmpty:'Like / မှတ်ချက် ရထားတဲ့ post မရှိသေးပါ။',noResults:'မတွေ့ပါ။ တခြားစကားလုံးနဲ့ ရှာကြည့်ပါ။',follow:'Follow',unfollow:'Following ✓',bell:'အသိပေးချက်များ',account:'Settings'}
  };
  const t = key => words[document.documentElement.lang === 'my' ? 'my' : 'en'][key];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = value => new Intl.NumberFormat('en-US').format(value) + ' Ks';
  const title = item => document.documentElement.lang === 'my' && item.nameMy ? item.nameMy : item.name;
  const count = n => n >= 1000 ? (Math.round(n / 100) / 10) + 'K' : String(n || 0);
  function postTime(value) {
    const valid = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) && Number.isFinite(Date.parse(value));
    if (!valid) return '<span class="shops-post-time">' + esc(t('timeUnknown')) + '</span>';
    const date = new Date(value), text = new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Yangon',day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(date);
    const label = t('posted') + ' ' + text + ' · ' + t('myanmarTime') + ' (UTC+06:30)';
    return '<time class="shops-post-time" datetime="' + esc(date.toISOString()) + '" title="' + esc(label) + '" aria-label="' + esc(label) + '">' + esc(text) + '</time>';
  }
  const icon = {
    verified:'<svg class="shops-verified" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 1.8 2.5 1.9 3.1-.2.9 3 2.6 1.8-1 2.9 1 2.9-2.6 1.8-.9 3-3.1-.2L12 22.2l-2.5-1.9-3.1.2-.9-3-2.6-1.8 1-2.9-1-2.9 2.6-1.8.9-3 3.1.2z"/><path d="m7.8 12.2 2.8 2.8 5.6-5.8" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    globe:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/></svg>',
    dots:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
    heart:'<svg class="shops-heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5S3 15 3 8.8A4.8 4.8 0 0 1 12 6.4a4.8 4.8 0 0 1 9 2.4C21 15 12 20.5 12 20.5z"/></svg>',
    bubble:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 4h13A2.5 2.5 0 0 1 21 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V17A2.5 2.5 0 0 1 3 14.5v-8A2.5 2.5 0 0 1 5.5 4z"/></svg>',
    cart:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 4h2.3l2.4 10.3a1.6 1.6 0 0 0 1.6 1.2h8.4a1.6 1.6 0 0 0 1.5-1.2L20.8 8H6"/><circle cx="9.5" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/></svg>',
    bookmark:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5h11a1 1 0 0 1 1 1v16l-6.5-4.6-6.5 4.6v-16a1 1 0 0 1 1-1z"/></svg>',
    layers:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 9 4.8-9 4.8-9-4.8z"/><path d="m3 12 9 4.8 9-4.8M3 16.2 12 21l9-4.8"/></svg>',
    bolt:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 2 4.5 13.5h6.5L10 22l9-11.5h-6.5z"/></svg>',
    close:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    search:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>',
    bell:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 10a6 6 0 0 1 12 0v4l2 3H4l2-3z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
    user:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5c1.2-4 4-6 7.5-6s6.3 2 7.5 6z"/></svg>',
    home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11 12 4l8.5 7"/><path d="M6 9.5V20h12V9.5M10 20v-5h4v5"/></svg>',
    people:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5z"/><path d="M15 4.8a3.3 3.3 0 0 1 0 6.4M17.5 14.6c2 .7 3.4 2.6 4 5.4"/></svg>',
    photos:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="3" width="14" height="14" rx="2.5"/><path d="M17 21H5.5A2.5 2.5 0 0 1 3 18.5V7"/></svg>'
  };
  let active = false, loading = false, initialized = false, nextBefore = null, items = [], lastLoaded = 0, failed = false, savedMode = false;
  let gallery = null, photoIndex = 0;
  // Saved posts stay on this phone (owner's choice): a copy of each post, newest first.
  const SAVED = 'gh-saved-posts';
  const savedList = () => { try { const v = JSON.parse(localStorage.getItem(SAVED) || '[]'); return Array.isArray(v) ? v.filter(item => item && Number.isSafeInteger(item.id) && item.shop) : []; } catch { return []; } };
  const isSaved = id => savedList().some(item => item.id === id);
  function toggleSaved(item) {
    const list = savedList(), at = list.findIndex(x => x.id === item.id);
    if (at >= 0) list.splice(at, 1); else list.unshift(item);
    try { localStorage.setItem(SAVED, JSON.stringify(list.slice(0, 200))); } catch {}
    return at < 0;
  }
  // Following: the shops this phone follows (kept on the phone, like Saved).
  const FOLLOW = 'gh-followed-shops';
  const slugOf = item => item.shop.slug || item.shop.url.split('/')[2];
  const followed = () => { try { const v = JSON.parse(localStorage.getItem(FOLLOW) || '[]'); return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []; } catch { return []; } };
  let tab = 'feed', query = '';
  const find = id => items.find(item => item.id === id) || savedList().find(item => item.id === id);
  function post(item) {
    const images = item.images || [], text = item.description || '', long = text.length > 110 || text.split('\n').length > 2;
    const initials = [...item.shop.name.trim()].slice(0, 1).join('') || 'S';
    const avatar = item.shop.logo ? '<img src="' + esc(item.shop.logo) + '" alt="" loading="lazy" decoding="async">' : esc(initials);
    // 1.1.298 owner: one photo per post, in the middle; more photos open with a tap (the count is on the photo).
    const pictures = images.length ? '<div class="shops-post-media"><button type="button" data-feed-photo="' + item.id + '" data-photo-index="0" aria-label="' + esc(t('photos') + ' · ' + images.length) + '"><img src="' + esc(images[0]) + '" alt="' + esc(title(item)) + '" loading="lazy" decoding="async">' +
      (images.length > 1 ? '<span class="shops-photo-count">' + icon.photos + images.length + '</span>' : '') + '</button></div>' :
      '<div class="shops-post-no-photo"><svg viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="10" width="32" height="28" rx="5"/><circle cx="18" cy="20" r="3"/><path d="m10 34 9-8 7 6 6-5 7 7"/></svg><span>' + esc(t('noPhoto')) + '</span></div>';
    const saved = isSaved(item.id);
    return '<article class="shops-post" data-feed-id="' + item.id + '" aria-labelledby="shops-post-title-' + item.id + '">' +
      '<header class="shops-post-header"><a class="shops-post-avatar" href="' + esc(item.shop.url) + '" tabindex="-1" aria-hidden="true">' + avatar + '</a><div><span class="shops-post-name"><a class="shops-post-shop" href="' + esc(item.shop.url) + '">' + esc(item.shop.name) + '</a><span title="' + esc(t('verified')) + '">' + icon.verified + '</span></span><span class="shops-post-subtitle">' + esc(item.category || t('product')) + ' · ' + icon.globe + '<span aria-hidden="true">·</span>' + postTime(item.postedAt) + '</span></div>' +
      '<div class="shops-post-menu"><button type="button" class="shops-post-more" data-feed-menu="' + item.id + '" aria-haspopup="true" aria-expanded="false" aria-label="' + esc(t('menu')) + '">' + icon.dots + '</button><div class="shops-post-menu-list" hidden><a href="' + esc(item.shop.url) + '">' + esc(t('visit')) + ' ↗</a><button type="button" data-feed-follow="' + esc(slugOf(item)) + '">' + esc(t(followed().includes(slugOf(item)) ? 'unfollow' : 'follow')) + '</button></div></div></header>' +
      '<div class="shops-post-caption"><h2 id="shops-post-title-' + item.id + '">' + esc(title(item)) + '</h2>' +
      (text ? '<p class="shops-post-description' + (long ? ' is-clamped' : '') + '" id="shops-description-' + item.id + '">' + esc(text) + '</p>' + (long ? '<button type="button" class="shops-read-more" data-feed-expand="' + item.id + '" aria-controls="shops-description-' + item.id + '" aria-expanded="false">' + esc(t('read')) + '</button>' : '') : '') +
      (item.price === null && item.stock !== 0 ? '' : '<div class="shops-post-price">' + (item.price === null ? '' : '<span>' + money(item.price) + '</span>' + (item.originalPrice !== null ? '<del>' + money(item.originalPrice) + '</del>' : '')) + (item.stock === 0 ? '<small>' + esc(t('soldOut')) + '</small>' : '') + '</div>') + '</div>' + pictures +
      '<footer class="shops-post-actions">' +
      '<button type="button" class="shops-like' + (item.liked ? ' is-on' : '') + '" data-feed-like="' + item.id + '" aria-pressed="' + Boolean(item.liked) + '" aria-label="' + esc(t('like')) + '">' + icon.heart + '<span>' + count(item.likes) + '</span></button><i class="shops-sep" aria-hidden="true"></i>' +
      '<button type="button" class="shops-comment" data-feed-comments="' + item.id + '" aria-label="' + esc(t('comment')) + '">' + icon.bubble + (item.comments ? '<span>' + count(item.comments) + '</span>' : '') + '</button><i class="shops-sep" aria-hidden="true"></i>' +
      '<button type="button" class="shops-buy" data-feed-buy="' + item.id + '">' + icon.cart + '<span>' + esc(t('buy')) + '</span></button><i class="shops-sep" aria-hidden="true"></i>' +
      '<button type="button" class="shops-save' + (saved ? ' is-on' : '') + '" data-feed-save="' + item.id + '" aria-pressed="' + saved + '" aria-label="' + esc(t(saved ? 'saved' : 'save')) + '">' + icon.bookmark + '</button></footer></article>';
  }
  function labels() {
    document.getElementById('shops-feed-kicker').textContent = t(savedMode ? 'savedKicker' : 'kicker');
    document.getElementById('shops-heading').textContent = savedMode ? t('savedTitle') : 'Discover';
    document.getElementById('shops-feed-intro').textContent = t(savedMode ? 'savedIntro' : 'intro');
    back.hidden = !savedMode; back.textContent = t('backToShops');
    heading.hidden = !savedMode; top.hidden = savedMode;
    top.querySelector('input').placeholder = t('search');
    top.querySelectorAll('[data-feed-tab]').forEach(button => { const on = button.dataset.feedTab === tab; button.classList.toggle('on', on); button.setAttribute('aria-pressed', String(on)); button.querySelector('span').textContent = t({feed:'tabFeed',following:'tabFollowing',trending:'tabTrending',new:'tabNew'}[button.dataset.feedTab]); });
    top.querySelector('.shops-top-bell').setAttribute('aria-label', t('bell')); top.querySelector('.shops-top-me').setAttribute('aria-label', t('account'));
    const row = document.querySelector('#saved-posts-action strong'), sub = document.getElementById('saved-posts-count');
    if (row) row.textContent = t('savedTitle');
    if (sub) { const n = savedList().length; sub.textContent = t('savedRow') + (n ? ' · ' + n : ''); }
    more.textContent = t(loading ? 'loading' : failed ? 'retry' : 'more');
    more.disabled = loading;
    more.hidden = savedMode || (loading ? !items.length : !failed && nextBefore === null);
    list.setAttribute('aria-busy', String(loading && !savedMode));
    status.textContent = savedMode ? (savedList().length ? '' : t('savedEmpty')) : failed ? t('failed') : loading ? t('loading') : initialized ? t(items.length ? 'done' : query ? 'noResults' : tab === 'following' ? 'followEmpty' : tab === 'trending' ? 'trendingEmpty' : 'empty') : '';
    if (!savedMode && items.length && nextBefore !== null && !loading && !failed) status.textContent = '';
    for (const [id, key] of [['shops-photo-close','close'],['shops-photo-prev','prev'],['shops-photo-next','next']]) document.getElementById(id).setAttribute('aria-label',t(key));
  }
  const back = document.createElement('button');
  back.type = 'button'; back.className = 'shops-saved-back'; back.hidden = true;
  const heading = document.querySelector('.shops-feed-heading');
  heading.prepend(back);
  // 1.1.298 owner's picture: brand, search, bell, profile, then Feed / Following / Trending / New Arrivals.
  const top = document.createElement('div');
  top.className = 'shops-top';
  top.innerHTML = '<div class="shops-top-bar"><span class="shops-top-brand"><span class="shops-top-logo"></span><span><b></b><small></small></span></span>' +
    '<label class="shops-top-search">' + icon.search + '<input type="search" enterkeyhint="search" autocomplete="off" maxlength="80"></label>' +
    '<button type="button" class="shops-top-bell" hidden>' + icon.bell + '<i hidden></i></button><button type="button" class="shops-top-me">' + icon.user + '</button></div>' +
    '<nav class="shops-tabs" aria-label="Discover">' + [['feed','home'],['following','people'],['trending',''],['new','']].map(([key, ic]) => '<button type="button" data-feed-tab="' + key + '">' + (ic ? icon[ic] : '<b aria-hidden="true">' + (key === 'trending' ? '🔥' : '✨') + '</b>') + '<span></span></button>').join('') + '</nav>';
  heading.before(top);
  function brand() {
    const name = document.querySelector('[data-site-brand-name]')?.textContent?.trim() || document.title, tagline = document.querySelector('[data-site-brand-tagline]')?.textContent?.trim() || '';
    const logo = [...document.querySelectorAll('img[data-site-logo]')].map(img => img.getAttribute('src')).find(Boolean);
    top.querySelector('.shops-top-brand b').textContent = name; top.querySelector('.shops-top-brand small').textContent = tagline;
    top.querySelector('.shops-top-logo').innerHTML = logo ? '<img src="' + esc(logo) + '" alt="">' : esc([...name][0] || 'S');
  }
  // The bell is the Notifications list of Settings (shop owner / GearHub owner); the red dot is its new-alerts count.
  function bell() {
    const row = document.querySelector('.settings-alerts-row'), count = row?.querySelector('.alerts-count'), button = top.querySelector('.shops-top-bell');
    const off = !row || row.hidden, dot = button.querySelector('i'), noDot = !count || count.hidden;
    if (button.hidden !== off) button.hidden = off; if (dot.hidden !== noDot) dot.hidden = noDot;
  }
  let meLoaded = false;
  async function account() {
    if (meLoaded) return; meLoaded = true;
    try { const me = await (await fetch('/api/platform/me', {cache:'no-store',credentials:'same-origin'})).json(); csrf = me.csrfToken || csrf;
      if (me.user?.name) { const b = top.querySelector('.shops-top-me'); b.classList.add('signed-in'); b.textContent = [...me.user.name.trim()][0] || '?'; } } catch {}
  }
  top.querySelector('.shops-top-bell').addEventListener('click', () => document.querySelector('.settings-alerts-row')?.click());
  top.querySelector('.shops-top-me').addEventListener('click', () => window.showStoreView?.('profile'));
  top.addEventListener('click', event => { const button = event.target.closest('[data-feed-tab]'); if (!button || button.dataset.feedTab === tab) return; tab = button.dataset.feedTab; load(true); });
  let typing = 0;
  top.querySelector('input').addEventListener('input', event => { clearTimeout(typing); typing = setTimeout(() => { const next = event.target.value.trim().slice(0, 80); if (next !== query) { query = next; load(true); } }, 350); });
  top.querySelector('form, label').addEventListener('submit', event => event.preventDefault());
  top.querySelector('input').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); event.target.blur(); } });
  addEventListener('gearhub:data-ready', brand); setTimeout(brand, 0);
  new MutationObserver(bell).observe(document.getElementById('profile-view') || document.body, {subtree:true, attributes:true, attributeFilter:['hidden'], childList:true});
  back.addEventListener('click', () => { savedMode = false; render(); if (!initialized) load(true); });
  function render() { list.innerHTML = (savedMode ? savedList() : items).map(post).join(''); labels(); }
  let current = null;
  async function load(reset = false) {
    if (savedMode || (!reset && (loading || (initialized && nextBefore === null)))) return;
    if (reset) { current?.abort(); initialized = false; nextBefore = null; items = []; }
    loading = true; failed = false;
    const shops = followed();
    if (tab === 'following' && !shops.length) { list.innerHTML = ''; loading = false; initialized = true; labels(); return; }
    if (!initialized) list.innerHTML = '<div class="shops-feed-skeleton" aria-hidden="true"><i></i><b></b><span></span></div><div class="shops-feed-skeleton" aria-hidden="true"><i></i><b></b><span></span></div>';
    labels();
    const stop = current = new AbortController(), timer = setTimeout(() => stop.abort(), 12000);
    const params = new URLSearchParams();
    if (!reset && nextBefore) params.set('before', nextBefore);
    if (query) params.set('q', query);
    if (tab === 'feed' || tab === 'following') params.set('mode', 'mixed');
    if (tab === 'trending') params.set('mode', 'trending');
    if (tab === 'following') params.set('shops', shops.join(','));
    try {
      const response = await fetch('/api/platform/feed' + (params.toString() ? '?' + params : ''), {cache:'no-store',credentials:'same-origin',signal:stop.signal});
      if (!response.ok) throw Error('Feed unavailable');
      const result = await response.json();
      const incoming = Array.isArray(result.items) ? result.items : [];
      if (reset || !initialized) { items = []; list.innerHTML = ''; }
      const seen = new Set(items.map(item => item.id));
      if (stop !== current) return;
      const fresh = incoming.filter(item => !seen.has(item.id));
      items.push(...fresh);
      if (!savedMode) list.insertAdjacentHTML('beforeend', fresh.map(post).join(''));
      nextBefore = result.nextBefore || null;
      initialized = true; lastLoaded = Date.now();
    } catch {
      if (stop !== current) return;
      failed = true;
      if (!initialized && !savedMode) list.innerHTML = '';
    } finally { clearTimeout(timer); if (stop === current) { loading = false; labels(); } }
  }
  function showPhoto() {
    photo.src = gallery.images[photoIndex]; photo.alt = title(gallery);
    document.getElementById('shops-photo-title').textContent = gallery.shop.name + ' · ' + title(gallery);
    document.getElementById('shops-photo-count').textContent = (photoIndex + 1) + ' / ' + gallery.images.length;
    document.getElementById('shops-photo-prev').disabled = photoIndex === 0;
    document.getElementById('shops-photo-next').disabled = photoIndex === gallery.images.length - 1;
  }
  // Likes and comments need Google sign-in; the token comes from /me like the rest of the platform.
  let csrf = '';
  async function call(url, method = 'GET', body) {
    const send = async () => fetch(url, {method, credentials:'same-origin', cache:'no-store', headers:method === 'GET' ? {} : {'Content-Type':'application/json','X-CSRF-Token':csrf}, body:body ? JSON.stringify(body) : undefined});
    if (method !== 'GET' && !csrf) csrf = (await (await fetch('/api/platform/me', {cache:'no-store',credentials:'same-origin'})).json()).csrfToken || '';
    let r = await send();
    if (r.status === 403 && method !== 'GET') { csrf = (await (await fetch('/api/platform/me', {cache:'no-store',credentials:'same-origin'})).json()).csrfToken || ''; r = await send(); }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { const e = Error(data.error || t('error')); e.status = r.status; throw e; }
    return data;
  }
  const postUrl = item => '/api/platform/feed/' + encodeURIComponent(item.shop.slug || item.shop.url.split('/')[2]) + '/' + item.id;
  const backPath = () => { const m = location.pathname.match(/^\/shops\/([a-z0-9-]{1,80})\//); return (m ? '/shops/' + m[1] + '/' : '/') + '?view=shops'; };
  function signIn() { (window.GearHubAppLogin?.start(backPath()) || Promise.resolve()).catch(error => say(error.message)); }
  // One bottom sheet for Buy Now, comments and sign-in.
  const sheet = document.createElement('dialog');
  sheet.className = 'shops-sheet'; sheet.id = 'shops-sheet';
  sheet.innerHTML = '<div class="shops-sheet-grip" aria-hidden="true"></div><header><h2 id="shops-sheet-title"></h2><button type="button" id="shops-sheet-close">' + icon.close + '</button></header><div class="shops-sheet-body" id="shops-sheet-body"></div><p class="shops-sheet-note" id="shops-sheet-note" role="status" aria-live="polite"></p>';
  sheet.setAttribute('aria-labelledby', 'shops-sheet-title');
  document.body.append(sheet);
  const sheetBody = sheet.querySelector('#shops-sheet-body'), note = sheet.querySelector('#shops-sheet-note');
  const say = text => { note.textContent = text || ''; };
  let sheetItem = null, sheetKind = '';
  function openSheet(kind, item, heading, html) {
    sheetKind = kind; sheetItem = item; say('');
    sheet.dataset.kind = kind;
    sheet.querySelector('#shops-sheet-title').innerHTML = heading;
    sheet.querySelector('#shops-sheet-close').setAttribute('aria-label', t('closeSheet'));
    sheetBody.innerHTML = html;
    if (!sheet.open) { sheet.classList.add('open'); sheet.showModal(); window.GearHubBackNav?.record(); }
  }
  document.getElementById('shops-sheet-close').addEventListener('click', () => sheet.close());
  sheet.addEventListener('click', event => { if (event.target === sheet) sheet.close(); });
  sheet.addEventListener('close', () => { sheet.classList.remove('open'); sheetItem = null; sheetKind = ''; window.GearHubBackNav?.record(); });
  function signInSheet(item) {
    openSheet('signin', item, esc(t('like')), '<p class="shops-signin-text">' + esc(t('signIn')) + '</p><button type="button" class="shops-sheet-primary" data-sheet="signin">' + esc(t('signInButton')) + '</button>');
  }
  function buySheet(item) {
    const out = item.stock === 0, image = item.images?.[0];
    openSheet('buy', item, icon.cart + '<span>' + esc(t('buy')) + '</span>',
      '<div class="shops-buy-product"><span class="shops-buy-photo">' + (image ? '<img src="' + esc(image) + '" alt="">' : '') + '</span><div><b>' + esc(title(item)) + '</b>' +
      (item.sku ? '<small>SKU: ' + esc(item.sku) + '</small>' : '') + (item.partNo ? '<small>Part No: ' + esc(item.partNo) + '</small>' : '') +
      (item.price === null ? '' : '<strong>' + money(item.price) + '</strong>') + (out ? '<em>' + esc(t('soldOut')) + '</em>' : '') + '</div></div>' +
      '<div class="shops-buy-qty"><span>' + icon.layers + esc(t('quantity')) + '</span><div class="shops-qty" role="group" aria-label="' + esc(t('quantity')) + '"><button type="button" data-sheet="qty" data-step="-1" aria-label="−"' + (out ? ' disabled' : '') + '>−</button><output id="shops-buy-qty">1</output><button type="button" data-sheet="qty" data-step="1" aria-label="+"' + (out ? ' disabled' : '') + '>+</button></div></div>' +
      '<div class="shops-buy-actions"><button type="button" class="shops-sheet-outline" data-sheet="add"' + (out ? ' disabled' : '') + '>' + icon.cart + esc(t('addCart')) + '</button><button type="button" class="shops-sheet-primary" data-sheet="buy"' + (out ? ' disabled' : '') + '>' + icon.bolt + esc(t('buy')) + '</button></div>');
  }
  // The cart of the post's own shop (the same key the shop page uses), so it is there when the shop opens.
  function addToCart(item, qty) {
    const key = 'gh-shop-cart:' + (item.shop.slug || item.shop.url.split('/')[2]);
    let cart = {}; try { cart = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch {}
    const now = Number(cart[item.id] || 0);
    if (typeof item.stock === 'number' && now + qty > item.stock) { say(t('notEnough')); return false; }
    cart[item.id] = now + qty;
    try { localStorage.setItem(key, JSON.stringify(cart)); } catch { say(t('error')); return false; }
    dispatchEvent(new Event('gearhub:cart-changed'));
    return true;
  }
  const here = item => location.pathname.startsWith(item.shop.url);
  const openCart = () => document.querySelector('.mobile-bottom-nav [data-store-action="open-cart"]')?.offsetParent ? document.querySelector('.mobile-bottom-nav [data-store-action="open-cart"]').click() : document.querySelector('[data-store-action="open-cart"]')?.click();
  const ago = iso => { const s = (Date.parse(iso) - Date.now()) / 1000, f = new Intl.RelativeTimeFormat(document.documentElement.lang === 'my' ? 'my' : 'en', {numeric:'auto'});
    for (const [unit, size] of [['year',31536e3],['month',2592e3],['day',86400],['hour',3600],['minute',60]]) if (Math.abs(s) >= size) return f.format(Math.round(s / size), unit);
    return document.documentElement.lang === 'my' ? 'ခုနကပဲ' : 'Just now'; };
  function commentsHtml(data) {
    const rows = data.comments.length ? data.comments.map(c => '<li><span class="shops-comment-avatar" aria-hidden="true">' + esc([...c.name.trim()][0] || '?') + '</span><div><p><b>' + esc(c.name) + '</b>' + esc(c.body) + '</p><small>' + esc(ago(c.at)) + (c.canDelete ? ' · <button type="button" data-sheet="delete" data-comment="' + c.id + '">' + esc(t('remove')) + '</button>' : '') + '</small></div></li>').join('') : '<li class="shops-comments-empty">' + esc(t('noComments')) + '</li>';
    return '<ul class="shops-comments-list">' + rows + '</ul>' + (data.signedIn ?
      '<form class="shops-comment-form" data-sheet-form="comment"><textarea name="body" rows="1" maxlength="1000" placeholder="' + esc(t('write')) + '" aria-label="' + esc(t('write')) + '" required></textarea><button type="submit" class="shops-sheet-primary">' + esc(t('send')) + '</button></form>' :
      '<div class="shops-comment-signin"><p>' + esc(t('signIn')) + '</p><button type="button" class="shops-sheet-primary" data-sheet="signin">' + esc(t('signInButton')) + '</button></div>');
  }
  function showComments(item, data) {
    item.comments = data.count; refreshCard(item);
    const heading = icon.bubble + '<span>' + esc(t('comment')) + (data.count ? ' · ' + data.count : '') + '</span>';
    if (sheetKind === 'comments' && sheetItem === item) { sheet.querySelector('#shops-sheet-title').innerHTML = heading; sheetBody.innerHTML = commentsHtml(data); }
    else openSheet('comments', item, heading, commentsHtml(data));
    const listEl = sheetBody.querySelector('.shops-comments-list'); if (listEl) listEl.scrollTop = listEl.scrollHeight;
  }
  async function openComments(item) {
    openSheet('comments', item, icon.bubble + '<span>' + esc(t('comment')) + '</span>', '<p class="shops-signin-text">' + esc(t('loading')) + '</p>');
    try { showComments(item, await call(postUrl(item) + '/comments')); } catch (error) { say(error.message); }
  }
  function refreshCard(item) {
    for (const copy of [items.find(x => x.id === item.id), ...savedList().filter(x => x.id === item.id)]) if (copy && copy !== item) Object.assign(copy, {likes:item.likes, liked:item.liked, comments:item.comments});
    const list2 = savedList(), at = list2.findIndex(x => x.id === item.id);
    if (at >= 0) { Object.assign(list2[at], {likes:item.likes, liked:item.liked, comments:item.comments}); try { localStorage.setItem(SAVED, JSON.stringify(list2)); } catch {} }
    const card = list.querySelector('[data-feed-id="' + item.id + '"]');
    if (!card) return;
    const like = card.querySelector('[data-feed-like]');
    like.classList.toggle('is-on', Boolean(item.liked)); like.setAttribute('aria-pressed', String(Boolean(item.liked))); like.querySelector('span').textContent = count(item.likes);
    const c = card.querySelector('[data-feed-comments]'); c.querySelector('span')?.remove(); if (item.comments) c.insertAdjacentHTML('beforeend', '<span>' + count(item.comments) + '</span>');
  }
  sheet.addEventListener('click', async event => {
    const button = event.target.closest('[data-sheet]'), item = sheetItem;
    if (!button || !item) return;
    const kind = button.dataset.sheet;
    if (kind === 'signin') return signIn();
    if (kind === 'qty') {
      const out = document.getElementById('shops-buy-qty'), max = typeof item.stock === 'number' ? Math.max(1, item.stock) : 99;
      out.textContent = String(Math.min(max, Math.max(1, Number(out.textContent) + Number(button.dataset.step)))); return;
    }
    if (kind === 'add' || kind === 'buy') {
      const qty = Number(document.getElementById('shops-buy-qty').textContent) || 1;
      if (!addToCart(item, qty)) return;
      if (kind === 'add') { sheet.close(); if (typeof window.toast === 'function') window.toast(t('added')); if (here(item)) window.pulseCartButton?.(); return; }
      if (here(item)) { sheet.close(); openCart(); } else location.href = item.shop.url + '?cart=1';
      return;
    }
    if (kind === 'delete') {
      button.disabled = true;
      try { showComments(item, await call(postUrl(item) + '/comments/' + Number(button.dataset.comment), 'DELETE')); } catch (error) { button.disabled = false; say(error.message); }
    }
  });
  sheet.addEventListener('submit', async event => {
    const form = event.target.closest('[data-sheet-form="comment"]'), item = sheetItem;
    if (!form || !item) return;
    event.preventDefault();
    const text = form.elements.body.value.trim(), send = form.querySelector('button');
    if (!text) return;
    send.disabled = true; say('');
    try { showComments(item, await call(postUrl(item) + '/comments', 'POST', {body:text})); }
    catch (error) { send.disabled = false; if (error.status === 401) openComments(item); else say(error.message); }
  });
  sheet.addEventListener('input', event => { if (event.target.matches('.shops-comment-form textarea')) { event.target.style.height = 'auto'; event.target.style.height = Math.min(120, event.target.scrollHeight) + 'px'; } });
  sheet.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && event.target.matches('.shops-comment-form textarea') && matchMedia('(pointer:fine)').matches) { event.preventDefault(); event.target.form.requestSubmit(); } });
  function closeMenus(except) { list.querySelectorAll('.shops-post-menu-list:not([hidden])').forEach(menu => { if (menu !== except) { menu.hidden = true; menu.previousElementSibling.setAttribute('aria-expanded', 'false'); } }); }
  document.addEventListener('click', event => { if (!event.target.closest('.shops-post-menu')) closeMenus(); });
  list.addEventListener('click', async event => {
    const expand = event.target.closest('[data-feed-expand]');
    if (expand) {
      const expanded = expand.getAttribute('aria-expanded') !== 'true';
      document.getElementById('shops-description-' + expand.dataset.feedExpand).classList.toggle('is-clamped', !expanded);
      expand.setAttribute('aria-expanded', String(expanded)); expand.textContent = t(expanded ? 'less' : 'read');
    }
    const menu = event.target.closest('[data-feed-menu]');
    if (menu) { const pop = menu.nextElementSibling, open = pop.hidden; closeMenus(pop); pop.hidden = !open; menu.setAttribute('aria-expanded', String(open)); return; }
    const follow = event.target.closest('[data-feed-follow]');
    if (follow) {
      const slug = follow.dataset.feedFollow, list2 = followed(), on = !list2.includes(slug);
      try { localStorage.setItem(FOLLOW, JSON.stringify(on ? [...list2, slug].slice(-100) : list2.filter(x => x !== slug))); } catch {}
      list.querySelectorAll('[data-feed-follow="' + CSS.escape(slug) + '"]').forEach(b => { b.textContent = t(on ? 'unfollow' : 'follow'); });
      closeMenus(); window.toast?.(t(on ? 'unfollow' : 'follow'));
      if (tab === 'following') load(true);
      return;
    }
    const like = event.target.closest('[data-feed-like]');
    if (like) {
      const item = find(Number(like.dataset.feedLike)); if (!item || like.disabled) return;
      like.disabled = true;
      const before = {liked:item.liked, likes:item.likes};
      item.liked = !item.liked; item.likes = Math.max(0, (item.likes || 0) + (item.liked ? 1 : -1)); refreshCard(item);
      try { Object.assign(item, await call(postUrl(item) + '/like', 'POST', {})); refreshCard(item); }
      catch (error) { Object.assign(item, before); refreshCard(item); if (error.status === 401) signInSheet(item); else window.toast?.(error.message); }
      finally { like.disabled = false; }
      return;
    }
    const comments = event.target.closest('[data-feed-comments]');
    if (comments) { const item = find(Number(comments.dataset.feedComments)); if (item) openComments(item); return; }
    const buy = event.target.closest('[data-feed-buy]');
    if (buy) { const item = find(Number(buy.dataset.feedBuy)); if (item) buySheet(item); return; }
    const save = event.target.closest('[data-feed-save]');
    if (save) {
      const item = find(Number(save.dataset.feedSave)); if (!item) return;
      const on = toggleSaved(item);
      save.classList.toggle('is-on', on); save.setAttribute('aria-pressed', String(on)); save.setAttribute('aria-label', t(on ? 'saved' : 'save'));
      window.toast?.(t(on ? 'saved' : 'save') + (on ? ' ✓' : ''));
      if (savedMode && !on) save.closest('.shops-post').remove();
      labels(); return;
    }
    const button = event.target.closest('[data-feed-photo]');
    if (!button) return;
    gallery = find(Number(button.dataset.feedPhoto));
    if (!gallery?.images?.length) return;
    photoIndex = Number(button.dataset.photoIndex) || 0; showPhoto();
    dialog.classList.add('open'); dialog.showModal();
  });
  // The photo frame takes the shape of the photo (between tall 4:5 and wide 2.5:1).
  list.addEventListener('load', event => {
    const image = event.target;
    if (image.tagName !== 'IMG' || !image.closest('.shops-post-media') || !image.naturalHeight) return;
    image.closest('.shops-post-media').style.setProperty('--feed-ratio', String(Math.min(2.5, Math.max(4 / 5, image.naturalWidth / image.naturalHeight))));
  }, true);
  document.getElementById('shops-photo-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { dialog.classList.remove('open'); photo.removeAttribute('src'); window.GearHubBackNav?.record(); });
  function move(delta) { if (gallery && photoIndex + delta >= 0 && photoIndex + delta < gallery.images.length) { photoIndex += delta; showPhoto(); } }
  document.getElementById('shops-photo-prev').addEventListener('click', () => move(-1));
  document.getElementById('shops-photo-next').addEventListener('click', () => move(1));
  dialog.addEventListener('keydown', event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1); } });
  more.addEventListener('click', () => load(!initialized || nextBefore === null));
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => { if (active && !savedMode && !failed && nextBefore && entries.some(entry => entry.isIntersecting)) load(); }, {rootMargin:'300px'}).observe(more);
  new MutationObserver(() => { if (initialized || savedMode) render(); else labels(); }).observe(document.documentElement, {attributes:true,attributeFilter:['lang']});
  // Settings → Saved opens the Shops tab with the saved posts; the Shops tab itself shows the feed again.
  document.addEventListener('click', event => { if (event.target.closest('[data-store-view="shops"]')) savedMode = false; }, true);
  document.getElementById('saved-posts-action')?.addEventListener('click', () => {
    savedMode = true;
    if (typeof window.showStoreView === 'function') window.showStoreView('shops'); else render();
    render(); scrollTo(0, 0); window.GearHubBackNav?.record();
  });
  window.GearHubShops = {setActive(value) { active = value; if (active) { brand(); bell(); account(); } if (active && savedMode) render(); else if (active && (!initialized || Date.now() - lastLoaded > 60000)) load(true); }};
  // Back from Google sign-in (?view=shops) or a Buy Now from another shop (?cart=1).
  const params = new URLSearchParams(location.search);
  if (params.has('view') || params.has('cart')) {
    addEventListener('gearhub:data-ready', () => {
      if (params.get('view') === 'shops') window.showStoreView?.('shops');
      if (params.get('cart') === '1') openCart();
      params.delete('view'); params.delete('cart');
      history.replaceState(history.state, '', location.pathname + (params.toString() ? '?' + params : '') + location.hash);
    }, {once:true});
  }
  labels();
})();
