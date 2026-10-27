(() => {
  const $ = (id) => document.getElementById(id);
  let csrf = "",
    me;
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const dateLabel=v=>v?new Date(v).toLocaleString('en-GB',{timeZone:'Asia/Yangon'})+' (Myanmar UTC+06:30)':'Not set';
  // Owner editor for the public policies page (/policies.html).
  const POLICY_SECTIONS = [["intro", "Introduction / မိတ်ဆက်"], ["terms", "Terms / အသုံးပြုမှု စည်းကမ်း"], ["privacy", "Privacy / ကိုယ်ရေးအချက်အလက်"], ["delivery", "Delivery & returns / ပို့ဆောင်ခြင်း၊ ပြန်လဲခြင်း"], ["seller", "Seller rules / ဆိုင်ရှင် စည်းကမ်း"], ["contact", "Contact / ဆက်သွယ်ရန်"]];
  const policyEditor = (p) => !p ? "" : `<details class="owner-settings policy-editor"><summary>Policies / စည်းကမ်းချက်များ <small>${p.custom ? "edited " + esc(p.updated) : "original text"}</small></summary><form id="policies-form"><p class="muted">ဒီမှာ ပြင်ပြီး Save နှိပ်ရင် <a href="/policies.html" target="_blank" rel="noopener">/policies.html</a> ချက်ချင်း ပြောင်းပါမယ်။ ဆိုင်တိုင်း footer က ဒီစာမျက်နှာကို ညွှန်ပါတယ်။<br><b>## </b>ခေါင်းစဉ်ငယ် · <b>- </b>စာရင်း · <b>&gt; </b>အရောင်ခံ မှတ်ချက် · <b>**စာ**</b> စာလုံးထူ · စာကြောင်းလွတ် = စာပိုဒ်အသစ် · စာအလွတ်ထားရင် အဲ့အပိုင်း မပြပါ။</p><div class="policy-contact">${field("phone", "Phone / ဖုန်း", p.phone, "tel")}${field("email", "Email (optional)", p.email, "email")}</div>${POLICY_SECTIONS.map(([id, label]) => `<fieldset class="policy-section"><legend>${esc(label)}</legend><div class="policy-titles">${field("t_" + id, "Title / ခေါင်းစဉ်", p.sections[id].title)}${field("s_" + id, "Subtitle (English)", p.sections[id].subtitle)}</div><label>Text / စာ<textarea name="b_${id}" rows="${id === "contact" ? 3 : 12}" maxlength="20000" spellcheck="false">${esc(p.sections[id].body)}</textarea></label></fieldset>`).join("")}<div class="policy-actions"><button>Save / သိမ်းမည်</button><a class="policy-preview" href="/policies.html" target="_blank" rel="noopener">Preview ↗</a><button type="submit" name="reset" value="1" class="policy-reset">Restore original</button></div></form></details>`;
  // Owner editor for the opening screen every seller shop shows (picture for PC / phone, sound, seconds).
  const SPLASH_ITEMS = [["pc", "PC picture / PC အတွက် ပုံ (အလျား)", "/images/skyshop-splash-pc.jpg"], ["phone", "Phone picture / ဖုန်းအတွက် ပုံ (အတောင်)", "/images/skyshop-splash-phone.jpg"]];
  const splashEditor = (st) => !st ? "" : `<details class="owner-settings splash-editor"><summary>Opening screen / ဆိုင်ဖွင့်ချိန် ပုံ၊ အသံ၊ ကြာချိန် <small>${Number(st.seconds) > 0 ? st.seconds + " s" : "off"}</small></summary><div class="splash-body">
    <p class="muted">ဆိုင်အားလုံး (ဆိုင်အသစ်တွေပါ) ဖွင့်တဲ့အခါ ပထမဆုံး ပေါ်မယ့် ပုံ၊ အသံနဲ့ ကြာချိန်ပါ။ App တစ်ခါဖွင့်တိုင်း ၁ ကြိမ်ပဲ ပေါ်ပါတယ်။ iPhone က Screen ကို မထိရင် အသံ မပေါ်ပါဘူး (အဲဒီအခါ "တစ်ချက်ထိပါ" စာပေါ်ပါမယ်)။</p>
    <form id="splash-seconds-form" class="splash-row"><label>ကြာချိန် / Seconds (0–10, 0 = မပြပါ)<input name="seconds" type="number" min="0" max="10" step="0.5" value="${esc(st.seconds)}" required></label><button class="primary" type="submit">Save</button></form>
    ${SPLASH_ITEMS.map(([kind, label, fallback]) => `<div class="splash-row"><div><strong>${label}</strong><small>${st[kind] ? "ကိုယ်ပိုင်ပုံ သုံးနေပါတယ်" : "မူလပုံ"}</small></div><img class="splash-preview" alt="" src="${st[kind] ? "/splash-asset/" + kind + "?v=" + encodeURIComponent(st.rev) : fallback}"><label class="splash-file">ပုံရွေးပြီး တင်ရန်<input type="file" accept="image/jpeg,image/png,image/webp" data-splash-upload="${kind}"></label>${st[kind] ? `<button type="button" data-splash-reset="${kind}">မူလပုံသို့ ပြန်ထား</button>` : ""}</div>`).join("")}
    <div class="splash-row"><div><strong>Sound / အသံ</strong><small>${st.sound ? "ကိုယ်ပိုင်အသံ (" + esc(st.sound) + ")" : "အသံ မရှိပါ"}</small></div>${st.sound ? `<audio controls preload="none" src="/splash-asset/sound?v=${encodeURIComponent(st.rev)}"></audio>` : ""}<label class="splash-file">အသံဖိုင်ရွေးပြီး တင်ရန် (mp3, m4a, wav, ogg · ၆ MB အောက်)<input type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg,.mp3,.m4a,.wav,.ogg" data-splash-upload="sound"></label>${st.sound ? '<button type="button" data-splash-reset="sound">အသံ ဖယ်ရန်</button>' : ""}</div>
  </div></details>`;
  // New shops (owner): a shop opens as soon as someone applies, up to this many seller shops, each with
  // this much storage; over the limit applications wait for the owner (Approve, as before).
  const signupEditor = (s) => !s ? "" : `<details class="owner-settings signup-editor"><summary>New shops / ဆိုင်အသစ် ဖွင့်ခြင်း <small>${Number(s.shops)} / ${Number(s.maxShops)} shops · ${Number(s.storageMb)} MB each</small></summary>
    <p class="muted">လျှောက်တာနဲ့ ဆိုင်ကို ချက်ချင်း ဖွင့်ပေးပါတယ်။ ဆိုင်ဦးရေ ပြည့်ရင် လျှောက်လွှာ စောင့်နေပြီး ဒီက Applications မှာ Approve လုပ်မှ ဖွင့်ပါမယ်။ / Shops open at once until the limit; then applications wait for you.</p>
    <form id="signup-form" class="splash-row"><label>ဆိုင် အများဆုံး / Seller shops (now ${Number(s.shops)})<input name="maxShops" type="number" min="0" max="10000" step="1" value="${esc(s.maxShops)}" required></label><label>ဆိုင်တစ်ခု storage / MB per new shop<input name="storageMb" type="number" min="1" max="10240" step="1" value="${esc(s.storageMb)}" required></label><button class="primary" type="submit">Save / သိမ်းမယ်</button></form>
    <p class="muted">Storage က ဆိုင်အသစ်တွေအတွက်ပဲ ဖြစ်ပါတယ်။ ရှိပြီးသား ဆိုင်ကို ဆိုင်စာရင်းထဲက Storage မှာ ပြင်ပါ။ / Applies to new shops; change an existing shop in its own settings.</p>
  </details>`;
  // Google Drive backup (owner): the daily backup and every shop photo's original go to the owner's
  // Google Drive folder "GearHub Backups"; shops still show photos from the server (fast).
  const driveEditor = (d) => !d ? "" : `<details class="owner-settings drive-editor" id="drive-settings"${new URLSearchParams(location.search).has("drive") ? " open" : ""}><summary>Google Drive backup / Drive မှာ အရန်သိမ်း <small>${d.connected ? "✓ " + esc(d.email || "connected") : "ချိတ်မထားရသေးပါ / not connected"}</small></summary>
    <p class="muted">နေ့တိုင်း data backup နဲ့ ဆိုင်တွေရဲ့ ပုံမူရင်းတွေကို Google Drive ရဲ့ "${esc(d.folder)}" folder ထဲ အလိုလို သိမ်းပေးပါတယ်။ ဆိုင်ပုံတွေကတော့ server ပေါ်ကပဲ ပြပါတယ် (မြန်ဖို့)။</p>
    ${!d.configured ? `<p class="drive-note">Google login is not set up on this server, so Drive cannot be connected.</p>` : d.connected ? `
    <div class="splash-row"><div><strong>Account / Drive</strong><small>${esc(d.email)}</small></div></div>
    <div class="splash-row"><div><strong>Last backup / နောက်ဆုံး backup</strong><small>${d.lastBackupAt ? esc(dateLabel(d.lastBackupAt)) : "မရှိသေးပါ (ချိတ်ပြီး မကြာခင် စပါမယ်) / not yet"}</small></div></div>
    <div class="splash-row"><div><strong>Photos / ပုံမူရင်း</strong><small>${Number(d.photosCopied)} / ${Number(d.photosTotal)} copied${d.lastPhotoAt ? " · " + esc(dateLabel(d.lastPhotoAt)) : ""}</small></div><button type="button" class="secondary" data-drive-action="sync">Copy photos now / ယခု ကူးမယ်</button></div>
    ${d.lastError ? `<p class="drive-error" role="alert">⚠ ${esc(d.lastError)}${d.lastErrorAt ? " · " + esc(dateLabel(d.lastErrorAt)) : ""}</p>` : ""}
    <div class="splash-row"><div><small>ဖြုတ်လည်း Drive ထဲက ဖိုင်တွေ မပျက်ပါ / Files already in Drive stay there.</small></div><button type="button" class="secondary" data-drive-action="disconnect">Disconnect / ဖြုတ်မယ်</button></div>` : `
    <div class="splash-row"><div><strong>Google Drive</strong><small>Google account နဲ့ တစ်ခါ ဝင်ပြီး "Allow" နှိပ်ပါ။ App က သူ့ဖိုင်တွေကိုပဲ မြင်ပါတယ်။</small></div><button type="button" class="primary" data-drive-action="connect">Connect Google Drive</button></div>
    ${d.lastError ? `<p class="drive-error" role="alert">⚠ ${esc(d.lastError)}</p>` : ""}`}
  </details>`;
  // skyshopmm.com background (owner): a picture, an optional moving SVG layer, or a Codex-style .zip
  // holding both (the zip is opened here in the browser and its two files are uploaded).
  const SCENE_SIDES = [["pc", "PC", "picture", "layer", "picture", "layer", "page", "page"], ["phone", "Phone / ဖုန်း", "phone", "phone-layer", "phone", "phoneLayer", "phone-page", "phonePage"]];
  const sceneEditor = (st) => !st ? "" : `<details class="owner-settings splash-editor scene-editor"><summary>skyshopmm.com background / နောက်ခံပုံ <small>${st.picture ? "ကိုယ်ပိုင်ပုံ" : "မူလပုံ"}${st.phone ? " · ဖုန်းပုံ" : ""}</small></summary><div class="splash-body">
    <p class="muted">skyshopmm.com ဖွင့်ရင် နောက်မှာ ပေါ်မယ့် ပုံပါ။ Zip (Codex ပို့တဲ့ ဖိုင်) တင်ရင် ထဲက ပုံနဲ့ လှုပ်တဲ့ SVG ကို အလိုလို ထည့်ပေးပါတယ်။ ဖုန်းပုံ မထည့်ရင် ဖုန်းမှာ PC ပုံကို ပြပါတယ်။</p>
    ${SCENE_SIDES.map(([side, title, pic, layer, picKey, layerKey, pageKind, pageKey]) => `<h4 class="scene-side">${title}</h4>
    <div class="scene-preview scene-preview-${side}"><img alt="" src="/scene-asset/${pic}?v=${encodeURIComponent(st.rev)}">${st[layerKey] || st.layer ? `<img alt="" src="/scene-asset/${layer}?v=${encodeURIComponent(st.rev)}">` : ""}</div>
    <div class="splash-row"><div><strong>Zip ဖိုင်</strong><small>ပုံ + SVG ပါတဲ့ zip (ဒါမှမဟုတ် Codex ရဲ့ HTML တစ်ဖိုင်တည်း)</small></div><label class="splash-file">Zip ရွေးပြီး တင်ရန်<input type="file" accept=".zip,application/zip,.html,text/html" data-scene-zip="${side}"></label></div>
    ${st[pageKey] ? `<div class="splash-row"><div><strong>Codex page</strong><small>Codex စာမျက်နှာ (လှုပ်တဲ့ မြက်ပင် စသဖြင့်) ပြနေပါတယ်</small></div><button type="button" data-scene-reset="${pageKind}">ဖယ်ရန်</button></div>` : ""}
    <div class="splash-row"><div><strong>Picture / ပုံ</strong><small>${st[picKey] ? "ကိုယ်ပိုင်ပုံ သုံးနေပါတယ်" : side === "pc" ? "မူလပုံ" : "PC ပုံကို သုံးနေပါတယ်"}</small></div><label class="splash-file">ပုံရွေးပြီး တင်ရန် (၁၂ MB အောက်)<input type="file" accept="image/jpeg,image/png,image/webp" data-scene-upload="${pic}"></label>${st[picKey] ? `<button type="button" data-scene-reset="${pic}">ဖယ်ရန်</button>` : ""}</div>
    <div class="splash-row"><div><strong>Moving layer / လှုပ်တဲ့ SVG</strong><small>${st[layerKey] ? "ထည့်ထားပါတယ်" : side === "pc" ? "မရှိပါ" : "PC အတိုင်း"}</small></div><label class="splash-file">SVG ရွေးပြီး တင်ရန် (1.5 MB အောက်)<input type="file" accept=".svg,image/svg+xml" data-scene-upload="${layer}"></label>${st[layerKey] ? `<button type="button" data-scene-reset="${layer}">ဖယ်ရန်</button>` : ""}</div>`).join("")}
  </div></details>`;
  // Reads the files inside a .zip in the browser (stored or deflated entries).
  async function unzipFiles(file) {
    const buf = await file.arrayBuffer(), b = new Uint8Array(buf), v = new DataView(buf), out = [];
    let end = -1; for (let i = b.length - 22; i >= 0 && i > b.length - 66000; i--) if (v.getUint32(i, true) === 0x06054b50) { end = i; break; }
    if (end < 0) throw new Error("This is not a zip file.");
    let p = v.getUint32(end + 16, true); const count = v.getUint16(end + 10, true);
    for (let n = 0; n < count && v.getUint32(p, true) === 0x02014b50; n++) {
      const method = v.getUint16(p + 10, true), size = v.getUint32(p + 20, true), nameLen = v.getUint16(p + 28, true), extra = v.getUint16(p + 30, true), comment = v.getUint16(p + 32, true), offset = v.getUint32(p + 42, true);
      const name = new TextDecoder().decode(b.slice(p + 46, p + 46 + nameLen)); p += 46 + nameLen + extra + comment;
      if (name.endsWith("/") || /(^|\/)(__MACOSX|\.)/.test(name)) continue;
      const start = offset + 30 + v.getUint16(offset + 26, true) + v.getUint16(offset + 28, true), raw = b.slice(start, start + size);
      out.push({ name, read: () => method === 0 ? new Blob([raw]) : method === 8 ? new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).blob() : Promise.reject(new Error("Unsupported zip")) });
    }
    return out;
  }
  // Codex can also pack a background as ONE html page: the picture inside it (data: URI) and the
  // moving <svg> inline. Take both out. For phones a wide picture is cut to a tall 9:16 picture at
  // the same spot the page shows (its object-position), so the phone looks like Codex's preview.
  async function fromHtmlPackage(html, tall) {
    const doc = new DOMParser().parseFromString(html, "text/html"), out = {};
    const src = doc.querySelector('img[src^="data:image/"]')?.getAttribute("src") || "";
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(src);
    if (m) {
      const bytes = Uint8Array.from(atob(m[2].replace(/\s+/g, "")), (c) => c.charCodeAt(0));
      let blob = new Blob([bytes], { type: m[1] });
      if (tall) {
        const css = [...doc.querySelectorAll("style")].map((x) => x.textContent).join("\n");
        const x = Number((/#art\s*\{[^}]*object-position:\s*([\d.]+)%/.exec(css) || [])[1] ?? 50) / 100;
        const url = URL.createObjectURL(blob), img = new Image();
        await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; img.src = url; });
        const w = img.naturalWidth, h = img.naturalHeight, cw = Math.round(h * 9 / 16);
        if (cw < w) {
          const canvas = document.createElement("canvas"); canvas.width = cw; canvas.height = h;
          canvas.getContext("2d").drawImage(img, Math.round((w - cw) * x), 0, cw, h, 0, 0, cw, h);
          blob = await new Promise((ok) => canvas.toBlob(ok, "image/jpeg", 0.9));
        }
        URL.revokeObjectURL(url);
      }
      out.picture = { blob, name: tall ? "phone.jpg" : "picture.jpg" };
    }
    const svg = doc.querySelector("svg");
    if (svg) out.layer = { blob: new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }), name: "layer.svg" };
    return out;
  }
  const field = (name, label, value = "", type = "text") =>
    `<label>${esc(label)}<input name="${name}" type="${type}" value="${esc(value)}"></label>`;
  const select = (name, label, values, current) =>
    `<label>${label}<select name="${name}">${values.map((v) => `<option ${v === current ? "selected" : ""}>${v}</option>`).join("")}</select></label>`;
  const storage = window.GearHubStorage;
  const storageFields = (bytes, optional=false) => {
    const v=storage.display(bytes);
    return `<label>${optional?'Storage override (blank = plan)':'Storage limit'}<input name="storageAmount" type="number" min="0" step="any" value="${v.amount}" ${optional?'':'required'}></label>${select('storageUnit','Unit',['MB','GB'],v.unit)}<p class="muted">1 MB = 1,048,576 bytes; 1 GB = 1,024 MB. Lowering a limit does not delete data.</p>`;
  };
  const msg = (t) => ($("message").textContent = t);
  let pendingWrites=0;
  async function api(url, method = "GET", body) {
    const headers = { "X-CSRF-Token": csrf };
    if (body && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(body);
    }
    const writes=method!=="GET";
    if(writes)window.__gearhubPlatformPending=++pendingWrites>0;
    try {
      const r = await fetch("/api/platform" + url, { method, headers, body });
      const v = await r.json();
      if (!r.ok) throw Error(v.error || "Request failed");
      return v;
    } finally {if(writes)window.__gearhubPlatformPending=--pendingWrites>0;}

  }
  function form(id, fn) {
    document.getElementById(id)?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const b = e.submitter;
      b.disabled = true;
      b.dataset.busy = "true";
      try {
        const data=Object.fromEntries(new FormData(e.target));
        if(b.name)data[b.name]=b.value;
        await fn(data, e.target);
        msg("သိမ်းပြီးပါပြီ / Saved");
        await load();
      } catch (err) {
        msg(err.message);
      } finally {
        b.disabled = false;
        delete b.dataset.busy;
      }
    });
  }
  // The moving layer over the background is optional; drop it when none is uploaded.
  const sceneLayer=document.querySelector(".sky-layer");
  // (An empty-alt image that fails shows nothing anyway; this only tidies up after a real error.)
  sceneLayer?.addEventListener("error",()=>(sceneLayer.closest("picture")||sceneLayer).remove());
  // A Codex background page (its own program, e.g. swaying grass) shows in a frame over the picture on PC.
  // No sandbox attribute: WebKit leaves attribute-sandboxed frames blank; the server's CSP header sandboxes it.
  // Phones: iPhone Safari froze the birds inside the frame and showed a dark screen for ~10 s (owner's
  // recording, 1.1.140). So the picture and flying-birds layer show at once, and the phone page's own
  // picture and grass program are then placed in this page directly (no frame) once its picture is ready,
  // under the birds layer: its birds (an <img>) fly on iPhone, while an <svg> moved in here stayed paused in WebKit.
  const afterPictures=(el)=>{const pictures=document.querySelectorAll(".sky-picture");(pictures[pictures.length-1]||document.body.firstChild).after(el);};
  const underBirds=(el)=>{const layer=document.querySelector(".sky-layer");layer?(layer.closest(".sky-picture")||layer).before(el):afterPictures(el);};
  const phoneScene=matchMedia("(max-width:600px)").matches;
  fetch("/scene-asset/state").then((r)=>r.ok?r.json():null).then(async (st)=>{
    if(!st)return;
    const v="?v="+encodeURIComponent(st.rev);
    if(!phoneScene){
      if(!st.page)return;
      const frame=document.createElement("iframe");
      frame.className="sky-frame";frame.title="Background";frame.tabIndex=-1;frame.setAttribute("aria-hidden","true");
      frame.src="/scene-asset/page"+v;afterPictures(frame);
      return;
    }
    if(!st.phonePage)return;
    const doc=new DOMParser().parseFromString(await (await fetch("/scene-asset/phone-page"+v)).text(),"text/html");
    const src=doc.querySelector("img#art")?.getAttribute("src")||"";if(!/^data:image\//.test(src))return;
    const css=[...doc.querySelectorAll("style")].map((x)=>x.textContent).join("\n");
    const box=document.createElement("div"),art=new Image();
    box.className="sky-frame sky-codex";box.setAttribute("aria-hidden","true");
    art.id="art";art.alt="";art.style.objectPosition=((/#art\s*\{[^}]*object-position:\s*([\d.]+%)/.exec(css)||[])[1]||"50%")+" center";
    box.append(art);
    art.addEventListener("load",()=>{
      underBirds(box);
      const program=document.createElement("script");program.src="/scene-asset/phone-script"+v;document.body.append(program);
      // The grass canvas is black until its first frames are drawn; the picture shows until then.
      program.addEventListener("load",()=>{let frames=0;const wait=()=>{if(box.querySelector("canvas[data-ready]")&&++frames>8)box.classList.add("drawn");else requestAnimationFrame(wait);};requestAnimationFrame(wait);},{once:true});
    },{once:true});
    art.src=src;
  }).catch(()=>{});
  // Sign in opens the card as a pop-up over the scene; ×, Esc or a tap outside closes it.
  const signIn=open=>document.body.classList.toggle("signin-open",open);
  $("signin-open")?.addEventListener("click",()=>signIn(true));
  $("account").addEventListener("click",e=>{if(e.target.id==="signin-close"||e.target===$("account"))signIn(false)});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")signIn(false)});
  async function load() {
    me = await api("/me");
    csrf = me.csrfToken;
    document.body.classList.toggle("onboarding",!me.isOwner);
    // Visitors (not signed in) see the scene and the top menu; the sign-in card opens from "Sign in".
    document.body.classList.toggle("visitor",!me.user&&!me.isOwner);
    $("site-nav").hidden=!!me.isOwner;
    $("signin-open").hidden=!!me.user;
    $("logout").hidden = !me.user;
    $("account").hidden=!!me.user&&!me.isOwner;
    $("owner").innerHTML = "";
    $("shop").innerHTML = "";
    $("application").innerHTML = "";
    $("account").innerHTML = me.user
      ? `<p>${esc(me.user.name)} · ${esc(me.user.email)}</p>`
      : window.GearHubApplication.login(me.oauthReady);
    if(!me.user)$("account").querySelector(".login-application")?.insertAdjacentHTML("afterbegin",'<button type="button" class="signin-close" id="signin-close" aria-label="Close">×</button>');
    $("google-login")?.addEventListener("click", async () => {
      try {
        location.href = (await api("/auth/start", "POST", {})).url;
      } catch (e) {
        msg(e.message);
      }
    });
    if (!me.user) return;
    if (!me.shop && !me.isOwner) {
      $("application").innerHTML = window.GearHubApplication.render(me);
      $("application-message")?.addEventListener("input",e=>$("application-counter").textContent=e.target.value.length+" / 500");
      // A shop that opens at once takes the seller straight into its admin (owner, 1.1.195).
      form("apply", async (d) => {
        const r = await api("/applications", "POST", d);
        if (r.slug) {
          location.href = "/shops/" + encodeURIComponent(r.slug) + "/admin?welcome=1";
          await new Promise(() => {});
        }
      });
    } else if (me.shop) {
      if(me.isOwner)await shop(me.shop.id);
      else $("application").innerHTML=window.GearHubApplication.render(me);
    }
    $("check-approval")?.addEventListener("click",()=>load().catch(e=>msg(e.message)));
    if (me.isOwner) await owner();
    window.GearHubUpdates?.restore();
    if($("application-message"))$("application-counter").textContent=$("application-message").value.length+" / 500";
  }
  async function shop(id) {
    const s = await api("/shops/" + id),
      b = s.settings,
      l = s.limits;
    const images = s.files.filter((f) => f.kind === "image" && f.ready);
    const imageSelect = (current) =>
      `<label>Image/logo<select name="imageId"><option value="">No image</option>${images.map((f) => `<option value="${esc(f.id)}" ${f.id === current ? "selected" : ""}>${esc(f.id.slice(0, 8))} · ${f.bytes} bytes</option>`).join("")}</select></label>`;
    $("shop").innerHTML =
      `<h2>${esc(s.name)}</h2><a href="/shops/${esc(s.slug)}" target="_blank" rel="noopener">Open shop / ဆိုင်ကြည့်ရန် ↗</a><p>${esc(l.plan)} · ${esc(l.subscriptionState)} · ${esc(s.status)}</p><p>Storage ${storage.label(l.usedBytes)} / ${storage.label(l.storageLimit)}. Product/logo/receipt files count. Data is never deleted automatically.</p><p class="muted">Write permissions: ${esc(JSON.stringify(l.permissions))}. Starts: ${esc(dateLabel(s.starts_at))}. End: ${esc(s.ends_at?dateLabel(s.ends_at):"No expiry")}</p><a href="/shops/${esc(s.slug)}/admin">ဆိုင်စီမံရန် / Manage shop</a><form id="shop-settings"><h3>Shop information</h3>${field("name", "Name", s.name)}${["description", "phone", "email", "address", "bankName", "bankAccountName", "bankAccountNumber", "paymentInstructions"].map((k) => field(k, k, b[k])).join("")}${imageSelect(b.logoId)}<button>Save shop</button></form><form id="upload-image"><h3>Upload product/logo image</h3><label>JPG/PNG/WebP ≤5 MB<input name="file" type="file" accept="image/jpeg,image/png,image/webp" required></label><button>Upload</button></form><div>${images.map((f) => `<span>${esc(f.id.slice(0, 8))} <button data-delete-file="${esc(f.id)}">Remove unused image</button></span>`).join("")}</div><form id="product-new"><h3>Add product / ပစ္စည်းတင်ရန်</h3>${productFields({})}${imageSelect("")}<button>Add product</button></form><h3>Products</h3>${s.products.length?"":"<p>ပထမပစ္စည်းကို အပေါ်က form မှ တင်ပါ။ / Add your first product above.</p>"}<div>${s.products.map((p) => `<form id="p-${p.id}">${productFields(p)}${imageSelect(p.image_id)}<button>Save product</button></form>`).join("")}</div><h3>Orders / အော်ဒါများ</h3>${s.orders.map((o) => `<article><strong>${esc(o.code)}</strong><p>${esc(o.customer)} · ${esc(o.phone)} · ${esc(o.address)}</p><p>${o.total} Ks · ${esc(o.invoice || "")}</p><p>${esc(o.items.map((i) => i.name + " × " + i.quantity).join(", "))}</p><a href="/api/platform/shops/${id}/receipts/${esc(o.receipt_id)}" target="_blank" rel="noopener">Private receipt</a><form id="o-${o.id}">${select("status", "Order status", ["pending", "confirmed", "processing", "shipped", "completed", "cancelled"], o.status)}${select("paymentStatus", "Manually verified payment", ["pending", "paid", "rejected"], o.payment_status)}<button>Save order</button></form></article>`).join("")}`;
    function productFields(p) {
      return (
        field("name", "Product name", p.name) +
        field("sku", "SKU", p.sku) +
        field("category", "Category", p.category) +
        field("description", "Description", p.description) +
        field("price", "Price (Ks)", p.price ?? 0, "number") +
        field("stock", "Stock", p.stock ?? 0, "number") +
        `<label><input name="active" type="checkbox" ${p.active !== 0 ? "checked" : ""}> Active</label>`
      );
    }
    function payload(d) {
      return {
        ...d,
        price: Number(d.price),
        stock: Number(d.stock),
        active: d.active === "on",
      };
    }
    form("shop-settings", (d) => {
      d.logoId = d.imageId;
      delete d.imageId;
      return api("/shops/" + id, "PATCH", d);
    });
    form("upload-image", (_d, f) =>
      api("/shops/" + id + "/files", "POST", new FormData(f)),
    );
    form("product-new", (d) =>
      api("/shops/" + id + "/products", "POST", payload(d)),
    );
    for (const p of s.products)
      form("p-" + p.id, (d) =>
        api("/shops/" + id + "/products/" + p.id, "PATCH", {
          ...payload(d),
          expectedStock: p.stock,
        }),
      );
    for (const o of s.orders)
      form("o-" + o.id, (d) =>
        api("/shops/" + id + "/orders/" + o.id, "PATCH", d),
      );
    document.querySelectorAll("[data-delete-file]").forEach(
      (b) =>
        (b.onclick = async () => {
          try {
            await api(
              "/shops/" + id + "/files/" + b.dataset.deleteFile,
              "DELETE",
            );
            await load();
          } catch (e) {
            msg(e.message);
          }
        }),
    );
  }
  // Survives the re-render that follows every save.
  const view = { tab: "all", q: "", status: "all", plan: "all" };
  async function owner() {
    const v = await api("/owner");
    const M = window.GearHubSellerManager;
    const sellerShops = v.shops.filter((s) => !s.legacy);
    const apps = (status) => v.applications.filter((a) => a.status === status);
    const ownerFor = (shop) => v.users.find((u) => u.id === shop.owner_id) || {};
    const planName = (shop) => v.plans.find((p) => p.id === shop.plan_id)?.name || "Basic";
    const states = new Map(sellerShops.map((s) => [s.id, M.state(s)]));
    const count = (...wanted) => sellerShops.filter((s) => wanted.includes(states.get(s.id))).length;
    const stateLabel = { active: "Active", expiring: "Expiring soon", expired: "Expired", suspended: "Suspended", scheduled: "Scheduled" };
    // Manual billing: payments recorded by the GearHub owner (no card processing).
    const payments = v.payments || [], kyat = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0) + " Ks";
    const paymentsFor = (id) => payments.filter((p) => p.shop_id === id);
    const monthKey = (iso) => M.yangonDate(iso).slice(0, 7);
    const paidIn = (key) => payments.filter((p) => monthKey(p.paid_at) === key).reduce((a, p) => a + p.amount, 0);
    const thisMonth = M.yangonDate(new Date().toISOString()).slice(0, 7);
    const lastMonth = (() => { const [y, m] = thisMonth.split("-").map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`; })();
    const paymentRow = (p, withShop) => `<li class="payment-row"><div><strong>${kyat(p.amount)}</strong> <span class="payment-method">${esc(p.method)}</span>${p.months ? ` <span class="payment-months">+${p.months} month${p.months > 1 ? "s" : ""}</span>` : ""}<small>${esc(M.yangonDate(p.paid_at))}${withShop ? " · " + esc(sellerShops.find((s) => s.id === p.shop_id)?.name || "Deleted shop") : ""}${p.note ? " · " + esc(p.note) : ""}</small></div><button type="button" class="payment-delete" data-delete-payment="${p.id}" aria-label="Delete payment record">×</button></li>`;
    const bindPaymentDeletes = () => panel.querySelectorAll("[data-delete-payment]").forEach((b) => (b.onclick = () => {
      if (!confirm("Delete this payment record? The service expiry is not changed.")) return;
      run(b, () => api("/owner/payments/" + b.dataset.deletePayment, "DELETE"), "မှတ်တမ်းဖျက်ပြီးပါပြီ / Payment record deleted");
    }));
    const tabs = [
      ["all", "All Shops", sellerShops.length],
      ["pending", "Pending Approval", apps("pending").length],
      ["active", "Active", count("active", "expiring")],
      ["expiring", "Expiring soon", count("expiring")],
      ["expired", "Expired", count("expired")],
      ["rejected", "Rejected", apps("rejected").length],
    ];
    const row = (s) => {
      const u = ownerFor(s), st = states.get(s.id), percent = M.usagePercent(s.limits);
      return `<tr data-shop-row="${s.id}" data-state="${st}" data-plan="${esc(planName(s))}"><td class="td-shop"><strong>${esc(s.name)}</strong><small>#SHP${String(s.id).padStart(4, "0")} · /shops/${esc(s.slug)}</small></td><td class="td-owner">${esc(u.name || "—")}<small>${esc(u.email || "")}</small></td><td class="td-plan"><span class="plan-badge">${esc(planName(s))}</span></td><td class="td-storage"><strong>${storage.label(s.limits.usedBytes)} / ${storage.label(s.limits.storageLimit)}</strong><i class="quota${percent >= 90 ? " full" : ""}"><b style="width:${percent}%"></b></i></td><td class="td-expiry">${esc(M.yangonDate(s.ends_at) || "—")}<small>${esc(M.expiryLabel(s.ends_at))}</small></td><td class="td-status"><span class="shop-state ${st}">${stateLabel[st]}</span></td><td class="td-actions shop-actions"><button type="button" data-view-shop="${esc(s.slug)}">View</button><button type="button" data-manage-shop="${s.id}">Manage</button></td></tr>`;
    };
    const appRow = (a) =>
      `<form id="a-${a.id}" class="application-row"><div><strong>${esc(a.name)}</strong><small>${esc(a.email)} · /shops/${esc(a.slug)}</small>${a.reason ? `<small>${esc(a.reason)}</small>` : ""}${a.decision_note ? `<small>Note: ${esc(a.decision_note)}</small>` : ""}</div>${a.status === "pending" ? `<button name="status" value="approved">✓ Approve</button><button name="status" value="rejected" class="reject">× Reject</button>` : ""}</form>`;
    const planForm = (p) =>
      `<form id="plan-${p.id}" class="plan-card">${p.id === "new" ? "<h4>＋ New plan / Plan အသစ်</h4>" : ""}${field("name", "Plan name", p.name)}${storageFields(p.storage_bytes)}<div class="permission-checks">${["products", "orders", "uploads", "selling"].map((k) => `<label><input type="checkbox" name="${k}" ${p.permissions[k] ? "checked" : ""}> ${k}</label>`).join("")}</div><button>${p.id === "new" ? "Create plan" : "Save plan"}</button></form>`;
    $("owner").innerHTML = `<section class="seller-manager" aria-label="Manage Seller Shops">
      <div class="seller-manager-head"><div class="manager-title"><span>🏪</span><div><h2>Manage Seller Shops</h2><p>View, approve sellers and manage their subscriptions.</p></div></div><button type="button" id="new-shop" class="manager-new">＋ New Shop</button></div>
      <div class="shop-tabs" role="tablist">${tabs.map(([id, label, n]) => `<button type="button" role="tab" data-shop-filter="${id}" aria-selected="${view.tab === id}" class="${view.tab === id ? "selected" : ""}${id === "expiring" && n ? " warn" : ""}">${label} (${n})</button>`).join("")}</div>
      <div id="shop-list-view"><div class="shop-toolbar"><label class="shop-search">⌕<input id="shop-search" placeholder="Search shop name, owner, email…" value="${esc(view.q)}"></label><select id="shop-status-filter" aria-label="Status">${[["all", "All Status"], ["active", "Active"], ["expiring", "Expiring soon"], ["expired", "Expired"], ["suspended", "Suspended"], ["scheduled", "Scheduled"]].map(([val, label]) => `<option value="${val}" ${view.status === val ? "selected" : ""}>${label}</option>`).join("")}</select><select id="shop-plan-filter" aria-label="Plan"><option value="all">All Plans</option>${v.plans.map((p) => `<option value="${esc(p.name)}" ${view.plan === p.name ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></div>
      <div class="shop-table-wrap"><table class="shop-table"><thead><tr><th>Shop</th><th>Owner</th><th>Plan</th><th>Storage</th><th>Expiry date</th><th>Status</th><th>Action</th></tr></thead><tbody>${sellerShops.map(row).join("") || '<tr><td colspan="7" class="empty-shops">No seller shops yet. Approve an application to create one.</td></tr>'}<tr id="no-shop-match" hidden><td colspan="7" class="empty-shops">No shops match these filters. <button type="button" id="clear-shop-filters">Clear filters</button></td></tr></tbody></table></div>
      <div class="seller-panels"><article><span>💰</span><div><h3>Payments</h3><p>This month ${kyat(paidIn(thisMonth))} · ${payments.length} record${payments.length === 1 ? "" : "s"}.</p><button type="button" data-open-panel="payments">View payments <b>›</b></button></div></article><article><span>🗓️</span><div><h3>Service Expiry Management</h3><p>${count("expiring")} expiring within ${M.EXPIRING_DAYS} days · ${count("expired")} expired.</p><button type="button" data-open-panel="expiry">Manage Expiry <b>›</b></button></div></article><article><span>🗄️</span><div><h3>Storage Management</h3><p>${sellerShops.filter((s) => M.usagePercent(s.limits) >= 90).length} shop(s) at 90% storage or more.</p><button type="button" data-open-panel="storage">Manage Storage <b>›</b></button></div></article></div></div>
      <section id="application-list-view" class="application-queue" hidden><h3 id="application-heading"></h3><div data-app-list="pending">${apps("pending").map(appRow).join("") || '<p class="muted">No pending seller application.</p>'}</div><div data-app-list="rejected">${apps("rejected").map(appRow).join("") || '<p class="muted">No rejected application.</p>'}<p class="muted">Rejected sellers can submit a new application from their own account.</p></div></section>
      <div id="shop-management-panel" class="shop-management-panel" hidden></div>
      <details class="owner-settings"><summary>Plans <small>manual, no automatic billing</small></summary><div class="plan-grid">${[...v.plans, { id: "new", permissions: {}, storage_bytes: 52428800, product_limit: 100 }].map(planForm).join("")}</div></details>
      <details class="owner-settings"><summary>Users <small>${v.users.length}</small></summary>${v.users.map((u) => `<form id="u-${u.id}" class="user-row"><div><strong>${esc(u.name || u.email)}</strong><small>${esc(u.email)}</small></div>${select("status", "Status", ["active", "suspended"], u.status)}<button>Save</button></form>`).join("")}</details>
      ${policyEditor(v.policies)}
      ${splashEditor(v.splash)}
      ${sceneEditor(v.scene)}
      ${signupEditor(v.signup)}
      ${driveEditor(v.drive)}
      <details class="owner-settings"><summary>In-app update announcement</summary><form id="release">${field("version", "Deployed version", v.release.version).replace("<input ", "<input readonly ")}${field("notes", "Update notes", v.release.notes)}<p class="muted">Updates install automatically when no checkout or file upload is in progress.</p><button>Publish</button></form></details>
    </section>`;

    const applyView = () => {
      const listTab = ["pending", "rejected"].includes(view.tab);
      $("shop-list-view").hidden = listTab;
      $("application-list-view").hidden = !listTab;
      $("application-heading").textContent = view.tab === "pending" ? "Pending approval" : "Rejected applications";
      document.querySelectorAll("[data-app-list]").forEach((el) => (el.hidden = el.dataset.appList !== view.tab));
      let shown = 0;
      document.querySelectorAll("[data-shop-row]").forEach((tr) => {
        tr.hidden = !M.matches({ text: tr.textContent, state: tr.dataset.state, plan: tr.dataset.plan }, view);
        if (!tr.hidden) shown++;
      });
      $("no-shop-match").hidden = shown > 0 || !sellerShops.length;
    };
    const selectTab = (id) => {
      view.tab = id;
      view.status = "all";
      $("shop-status-filter").value = "all";
      document.querySelectorAll("[data-shop-filter]").forEach((t) => {
        t.classList.toggle("selected", t.dataset.shopFilter === id);
        t.setAttribute("aria-selected", t.dataset.shopFilter === id);
      });
      applyView();
    };
    document.querySelectorAll("[data-shop-filter]").forEach((t) => (t.onclick = () => selectTab(t.dataset.shopFilter)));
    $("shop-search").oninput = (e) => { view.q = e.target.value; applyView(); };
    $("shop-status-filter").onchange = (e) => { view.status = e.target.value; applyView(); };
    $("shop-plan-filter").onchange = (e) => { view.plan = e.target.value; applyView(); };
    $("clear-shop-filters").onclick = () => {
      Object.assign(view, { q: "", status: "all", plan: "all" });
      $("shop-search").value = "";
      $("shop-plan-filter").value = "all";
      selectTab("all");
    };
    $("new-shop").onclick = () => {
      selectTab("pending");
      msg("New shops start as an application. Approve a pending application. / ဆိုင်အသစ်များကို လျှောက်လွှာမှ approve လုပ်ပါ။");
    };
    applyView();

    const panel = $("shop-management-panel");
    const closePanel = () => { panel.hidden = true; panel.innerHTML = ""; };
    panel.onclick = (e) => { if (e.target === panel) closePanel(); };
    document.onkeydown = (e) => { if (e.key === "Escape" && !panel.hidden) closePanel(); };
    const openDialog = (label, html, dialogClass = "") => {
      panel.hidden = false;
      panel.innerHTML = `<div class="manage-dialog ${esc(dialogClass)}" role="dialog" aria-modal="true" aria-label="${esc(label)}"><button type="button" class="dialog-close" aria-label="Close">×</button>${html}</div>`;
      panel.querySelector(".dialog-close").onclick = closePanel;
      panel.querySelector(".dialog-close").focus();
    };
    const showStorePreview = (slug) => {
      const s = sellerShops.find((shop) => shop.slug === slug);
      if (!s) return;
      const url = "/shops/" + encodeURIComponent(s.slug);
      openDialog("Customer preview — " + s.name, `<div class="store-preview-head"><div><h3>Customer preview</h3><p>This is the same live shop customers open.</p></div><a class="manage-link" href="${url}" target="_blank" rel="noopener">Open full page ↗</a></div><iframe class="store-preview-frame" src="${url}" title="${esc(s.name)} customer storefront"></iframe>`, "store-preview-dialog");
    };
    const run = async (button, work, done) => {
      button.disabled = true;
      button.dataset.busy = "true";
      try { await work(); msg(done); await load(); }
      catch (e) { msg(e.message); button.disabled = false; delete button.dataset.busy; }
    };
    const extend = (s, months, button) => {
      if (!confirm(`Extend ${s.name} by ${months} calendar month(s)? No charge is made.`)) return;
      run(button, () => api("/owner/shops/" + s.id + "/extend", "POST", { months }), "သက်တမ်းတိုးပြီးပါပြီ / Service extended");
    };
    const monthOptions = [1, 2, 3, 6, 12].map((m) => `<option value="${m}" ${m === 2 ? "selected" : ""}>${m} month${m > 1 ? "s" : ""}</option>`).join("");
    const showManager = (shopId) => {
      const s = sellerShops.find((x) => x.id === Number(shopId));
      if (!s) return;
      const u = ownerFor(s), override = storage.display(s.storage_override), st = states.get(s.id);
      const initialStart = M.yangonDate(s.starts_at), initialEnd = M.yangonDate(s.ends_at);
      openDialog("Manage " + s.name, `<div class="manage-shop-summary"><span>🏪</span><div><h3>${esc(s.name)} <span class="shop-state ${st}">${stateLabel[st]}</span></h3><p>${esc(u.name || "")} · ${esc(u.email || "")}</p><small>/shops/${esc(s.slug)} · ${storage.label(s.limits.usedBytes)} / ${storage.label(s.limits.storageLimit)} · ${esc(M.expiryLabel(s.ends_at))}</small></div></div><form id="manage-shop-${s.id}"><div class="manage-fields"><label>Shop status<select name="status">${["active", "suspended"].map((x) => `<option ${x === s.status ? "selected" : ""}>${x}</option>`).join("")}</select></label><label>Subscription<select name="subscriptionStatus">${["trial", "active", "sponsored", "inactive", "expired"].map((x) => `<option ${x === s.subscription_status ? "selected" : ""}>${x}</option>`).join("")}</select></label><label>Plan<select name="planId">${v.plans.map((p) => `<option value="${p.id}" ${p.id === s.plan_id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label><label>Storage override (blank = plan)<input name="storageAmount" type="number" min="0" step="any" value="${esc(override.amount)}"></label><label>Unit<select name="storageUnit">${["MB", "GB"].map((x) => `<option ${override.unit === x ? "selected" : ""}>${x}</option>`).join("")}</select></label><label>Start date (Myanmar)<input name="startsAt" type="date" value="${initialStart}"></label><label>Expiry date (Myanmar)<input name="endsAt" type="date" value="${initialEnd}"></label></div><div class="manage-dialog-actions"><button>Save changes</button><span class="extend-group"><select id="extend-months" aria-label="Extend by">${monthOptions}</select><button type="button" data-modal-extend>Extend</button></span><a class="manage-link" href="/shops/${esc(s.slug)}/admin" target="_blank" rel="noopener">Open seller admin ↗</a><button type="button" class="danger" data-modal-delete>Delete shop</button></div></form><section class="payment-box"><h4>💰 Payments / ငွေပေးမှတ်တမ်း</h4><form id="payment-form-${s.id}" class="payment-form"><label>Amount (Ks)<input name="amount" type="number" min="0" step="1" inputmode="numeric" required></label><label>Paid with<select name="method">${(v.paymentMethods || []).map((m) => `<option>${esc(m)}</option>`).join("")}</select></label><label>Extend service<select name="months"><option value="0">No extension</option>${[1, 2, 3, 6, 12].map((m) => `<option value="${m}" ${m === 1 ? "selected" : ""}>+${m} month${m > 1 ? "s" : ""}</option>`).join("")}</select></label><label>Paid on (Myanmar)<input name="paidAt" type="date" value="${M.yangonDate(new Date().toISOString())}"></label><label class="payment-note">Note<input name="note" maxlength="200" placeholder="Transaction ID, plan…"></label><button>Record payment</button></form><ul class="payment-list">${paymentsFor(s.id).map((p) => paymentRow(p, false)).join("") || '<li class="muted">No payment recorded yet.</li>'}</ul></section>`);
      form("manage-shop-" + s.id, (d) => {
        const body = { status: d.status, subscriptionStatus: d.subscriptionStatus, planId: Number(d.planId), storageBytes: storage.bytes(d.storageAmount, d.storageUnit, true) };
        // Resend dates only when edited so saving other fields keeps the exact stored time.
        if (d.startsAt !== initialStart) body.startsAt = M.fromYangonDate(d.startsAt, false);
        if (d.endsAt !== initialEnd) body.endsAt = M.fromYangonDate(d.endsAt, true);
        return api("/owner/shops/" + s.id, "PATCH", body);
      });
      panel.querySelector("[data-modal-extend]").onclick = (e) => extend(s, Number($("extend-months").value), e.currentTarget);
      form("payment-form-" + s.id, (d) => {
        return api("/owner/shops/" + s.id + "/payments", "POST", { amount: Number(d.amount), months: Number(d.months), method: d.method, note: d.note, paidAt: d.paidAt ? M.fromYangonDate(d.paidAt, false) : "" }).then((r) => { view.reopen = s.id; return r; });
      });
      bindPaymentDeletes();
      panel.querySelector("[data-modal-delete]").onclick = (e) => {
        // One tap to confirm (owner's request; typing the exact URL stopped test shops from being deleted).
        if (!confirm("“" + s.name + "” ဆိုင်ကို အပြီးဖျက်မှာ သေချာပါသလား? ပစ္စည်း၊ order၊ ပုံ အားလုံး ပျက်ပါမယ်။ ပြန်ယူလို့ မရပါ။\nDelete this shop and all its data for good?")) return;
        run(e.currentTarget, () => api("/owner/shops/" + s.id, "DELETE", { confirmDelete: s.slug }), "ဆိုင်ဖျက်ပြီးပါပြီ / Shop deleted");
      };
    };
    const showOverview = (kind) => {
      if (!sellerShops.length) return msg("Manage a seller after approving an application.");
      if (kind === "payments") {
        openDialog("Payments", `<h3>💰 Payments — newest first</h3><div class="payment-totals"><div><small>This month</small><strong>${kyat(paidIn(thisMonth))}</strong></div><div><small>Last month</small><strong>${kyat(paidIn(lastMonth))}</strong></div><div><small>All time</small><strong>${kyat(payments.reduce((a, p) => a + p.amount, 0))}</strong></div></div><ul class="payment-list">${payments.map((p) => paymentRow(p, true)).join("") || '<li class="muted">No payment recorded yet. Open Manage on a shop to record one.</li>'}</ul>`);
        return bindPaymentDeletes();
      }
      const expiry = kind === "expiry";
      const sorted = [...sellerShops].sort(expiry
        ? (a, b) => (Date.parse(a.ends_at) || Infinity) - (Date.parse(b.ends_at) || Infinity)
        : (a, b) => M.usagePercent(b.limits) - M.usagePercent(a.limits));
      openDialog(expiry ? "Service expiry" : "Storage", `<h3>${expiry ? "🗓️ Service expiry — soonest first" : "🗄️ Storage — fullest first"}</h3><div class="overview-list">${sorted.map((s) => {
        const st = states.get(s.id), percent = M.usagePercent(s.limits);
        const detail = expiry
          ? `${esc(M.yangonDate(s.ends_at) || "—")} · ${esc(M.expiryLabel(s.ends_at))}`
          : `${storage.label(s.limits.usedBytes)} / ${storage.label(s.limits.storageLimit)} (${percent}%)<i class="quota${percent >= 90 ? " full" : ""}"><b style="width:${percent}%"></b></i>`;
        return `<div class="overview-row"><div><strong>${esc(s.name)}</strong> <span class="shop-state ${st}">${stateLabel[st]}</span><small>${detail}</small></div>${expiry ? `<button type="button" data-quick-extend="${s.id}">+2 months</button>` : ""}<button type="button" data-overview-manage="${s.id}">${expiry ? "Manage" : "Change storage"}</button></div>`;
      }).join("")}</div>`);
      panel.querySelectorAll("[data-quick-extend]").forEach((b) => (b.onclick = () => extend(sellerShops.find((s) => s.id === Number(b.dataset.quickExtend)), 2, b)));
      panel.querySelectorAll("[data-overview-manage]").forEach((b) => (b.onclick = () => showManager(b.dataset.overviewManage)));
    };
    document.querySelectorAll("[data-manage-shop]").forEach((b) => (b.onclick = () => showManager(b.dataset.manageShop)));
    document.querySelectorAll("[data-view-shop]").forEach((b) => (b.onclick = () => showStorePreview(b.dataset.viewShop)));
    document.querySelectorAll("[data-open-panel]").forEach((b) => (b.onclick = () => showOverview(b.dataset.openPanel)));
    if (view.reopen) { const id = view.reopen; delete view.reopen; showManager(id); }

    for (const a of apps("pending"))
      form("a-" + a.id, (d) => {
        if (d.status === "rejected" && !confirm(`Reject ${a.name}?`)) throw Error("Cancelled.");
        return api("/owner/applications/" + a.id, "PATCH", d);
      });
    for (const u of v.users)
      form("u-" + u.id, (d) => api("/owner/users/" + u.id, "PATCH", d));
    for (const p of [...v.plans, { id: "new" }])
      form("plan-" + p.id, (d) =>
        api("/owner/plans" + (p.id === "new" ? "" : "/" + p.id), p.id === "new" ? "POST" : "PATCH", {
          name: d.name,
          storageBytes: storage.bytes(d.storageAmount, d.storageUnit),
          permissions: Object.fromEntries(["products", "orders", "uploads", "selling"].map((k) => [k, d[k] === "on"])),
        }),
      );
    form("release", (d) => api("/owner/release", "POST", d));
    form("policies-form", (d) => {
      if (d.reset) {
        if (!confirm("Restore the original policy text? Your edits will be replaced.")) return Promise.resolve();
        return api("/owner/policies", "PUT", { reset: true });
      }
      const sections = {};
      for (const [id] of POLICY_SECTIONS) sections[id] = { title: d["t_" + id] || "", subtitle: d["s_" + id] || "", body: d["b_" + id] || "" };
      return api("/owner/policies", "PUT", { phone: d.phone, email: d.email, sections });
    });
    form("signup-form", (d) => api("/owner/signup", "PUT", { maxShops: Number(d.maxShops), storageMb: Number(d.storageMb) }));
    form("splash-seconds-form", (d) => api("/owner/splash", "PUT", { seconds: d.seconds }));
    document.querySelectorAll("[data-splash-upload]").forEach((input) => input.addEventListener("change", async () => {
      const file = input.files[0];if (!file) return;
      const data = new FormData();data.append("file", file);
      try { msg("တင်နေပါတယ်… / Uploading…"); await api("/owner/splash/" + input.dataset.splashUpload, "POST", data); msg("သိမ်းပြီးပါပြီ / Saved"); await load(); } catch (err) { msg(err.message); input.value = ""; }
    }));
    const sceneUpload = async (kind, blob, name) => { const data = new FormData(); data.append("file", blob, name); await api("/owner/scene/" + kind, "POST", data); };
    document.querySelectorAll("[data-scene-upload]").forEach((input) => input.addEventListener("change", async () => {
      const file = input.files[0]; if (!file) return;
      try { msg("တင်နေပါတယ်… / Uploading…"); await sceneUpload(input.dataset.sceneUpload, file, file.name); msg("သိမ်းပြီးပါပြီ / Saved"); await load(); } catch (err) { msg(err.message); input.value = ""; }
    }));
    document.querySelectorAll("[data-scene-zip]").forEach((zipInput) => zipInput.addEventListener("change", async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const [picKind, layerKind, pageKind] = e.target.dataset.sceneZip === "phone" ? ["phone", "phone-layer", "phone-page"] : ["picture", "layer", "page"];
      try {
        msg("Zip ဖွင့်နေပါတယ်… / Opening zip…");
        const tall = picKind === "phone";
        const files = /\.html?$/i.test(file.name) ? [{ name: file.name, read: async () => file }] : await unzipFiles(file);
        let picture = files.find((f) => /\.(jpe?g|png|webp)$/i.test(f.name)), layer = files.find((f) => /\.svg$/i.test(f.name));
        picture = picture && { blob: await picture.read(), name: picture.name.split("/").pop() };
        layer = layer && { blob: new Blob([await (await layer.read()).arrayBuffer()], { type: "image/svg+xml" }), name: layer.name.split("/").pop() };
        const html = files.find((f) => /\.html?$/i.test(f.name)), htmlText = html && await (await html.read()).text();
        const page = !picture && !layer && htmlText;
        if (page) ({ picture, layer } = await fromHtmlPackage(htmlText, tall));
        // A page with its own program (e.g. Codex's swaying grass) that needs nothing from outside is
        // also kept whole; the picture and layer stay as the fallback. Otherwise this side's page is removed.
        const keepPage = !!htmlText && /<script[\s>]/i.test(htmlText) && !/\b(?:src|href)\s*=\s*["']?(?:https?:)?\/\//i.test(htmlText);
        if (!picture && !layer && !keepPage) throw new Error("Zip ထဲမှာ ပုံ (jpg/png/webp)၊ SVG ဒါမှမဟုတ် ပုံပါတဲ့ HTML မတွေ့ပါ / No picture, SVG or picture page in this zip.");
        if (picture) await sceneUpload(picKind, picture.blob, picture.name);
        if (layer) await sceneUpload(layerKind, layer.blob, layer.name);
        if (keepPage) await sceneUpload(pageKind, new Blob([htmlText], { type: "text/html" }), "page.html");
        else await api("/owner/scene/" + pageKind, "DELETE");
        msg("သိမ်းပြီးပါပြီ / Saved"); await load();
      } catch (err) { msg(err.message); e.target.value = ""; }
    }));
    document.querySelectorAll("[data-scene-reset]").forEach((button) => button.addEventListener("click", async () => {
      if (!confirm("မူလအတိုင်း ပြန်ထားမှာ သေချာပါသလား? / Go back to the default?")) return;
      try { await api("/owner/scene/" + button.dataset.sceneReset, "DELETE"); msg("သိမ်းပြီးပါပြီ / Saved"); await load(); } catch (err) { msg(err.message); }
    }));
    document.querySelectorAll("[data-drive-action]").forEach((button) => button.addEventListener("click", async () => {
      const action = button.dataset.driveAction;
      if (action === "disconnect" && !confirm("Google Drive ကို ဖြုတ်မှာ သေချာပါသလား? Drive ထဲက ဖိုင်တွေ မပျက်ပါ။ / Disconnect Google Drive?")) return;
      button.disabled = true;
      try {
        const r = await api("/owner/drive/" + action, "POST", {});
        if (action === "connect") { location.href = r.url; return; }
        msg(action === "sync" ? "ပုံတွေ ကူးနေပါတယ် / Copying photos…" : "ဖြုတ်ပြီးပါပြီ / Disconnected"); await load();
      } catch (err) { msg(err.message); button.disabled = false; }
    }));
    document.querySelectorAll("[data-splash-reset]").forEach((button) => button.addEventListener("click", async () => {
      if (!confirm("မူလအတိုင်း ပြန်ထားမှာ သေချာပါသလား? / Go back to the default?")) return;
      try { await api("/owner/splash/" + button.dataset.splashReset, "DELETE"); msg("သိမ်းပြီးပါပြီ / Saved"); await load(); } catch (err) { msg(err.message); }
    }));
  }
  $("logout").onclick = async () => {
    await api("/logout", "POST", {});
    location.reload();
  };
  setInterval(async()=>{if(document.hidden||!me?.application||me.application.status!=="pending"||me.shop||pendingWrites)return;try{const state=await api("/me");if(state.shop||state.application?.status!==me.application.status){window.GearHubUpdates?.saveDraft?.();await load();}}catch{}},15000);
  load().catch((e) => msg(e.message));
  window.platformRefresh = load;
})();
