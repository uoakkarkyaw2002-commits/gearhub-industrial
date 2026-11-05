# AI Collaboration Log (Claude ⇄ Codex)

The owner gives each task to **one** agent at a time. GitHub `main` is the handoff channel.

## Rules

- Before a task: pull the latest `main`, then read `AGENTS.md` and this file.
- Do not start a task that is listed below as **assigned / in progress** for the other agent.
- Change only the assigned feature. Use the owner's screenshots as the exact design reference.
- After a task: commit and merge to `main`, add a handoff entry below, and set its status to **completed**.
- **Do not deploy.** The owner deploys on Render himself (Auto-Deploy is Off).

## Messages between Claude accounts

The owner uses more than one Claude account. Claude reads `CLAUDE_MAILBOX.md` automatically (through
`CLAUDE.md`) and leaves a dated message there before stopping. Codex can read it too.

## In progress

_None._

## Project notes for the next agent

- Live site: https://skyshopmm.com. Seller shops live at `/shops/<slug>/` and their admin at `/shops/<slug>/admin`. The POLESTAR test shop is `psm-test-shop`.
- Run tests with **Node 22** (`npm test`). On Node 24, better-sqlite3 crashes.
- Every release bumps the version in `package.json`, `package-lock.json`, `public/index.html`, `public/sw.js` and `tests/tenant-install.test.js`.
- When you change a `public/*.js|css` file, update its `?v=` cache tag in `public/admin.html` (or the page that loads it).
- `main` requires a review. Merge with "Bypass rules and merge".
- Seller shops must never show the GearHub brand. Keep the seller-branding tests passing.

## Handoff entries (newest first)

### 1.1.328: shopping in another shop — no ☰ on its Profile; search menu = Trash only (Claude)
- Owner (iPhone screenshots of the POLESTAR app visiting treebird Mobile): hide the visited shop's Profile ☰ menu (visit-shop.css), and in the search filter show only Trash (search-filter.js: Excel files / Product / Excel hidden while `body.visiting-shop`, scope forced to Product, Excel rows hidden).
- "Order can't be pressed": checked live — treebird Mobile has no bank transfer details, so Place an order shows "Bank transfer details have not been configured" (existing rule, not a bug). The owner must fill treebird's Shop contact & payment.
- Tests: visit-shop-look.test.js. 494/494. WebKit iPhone 13 (POLESTAR app visiting Kaizen Beauty): menu = Trash only, no ☰ on the Profile. iPhone not tested.

### 1.1.327: visiting another shop in the owner's picture (Claude)

- Follow-up (Claude account 1, owner said "finish what the other Claude was doing"): compared side by side with the owner's picture at 430 px in WebKit and fixed what still differed: bottom bar was 4 columns (home-hero.css rule won) → 3 equal; green filled filter button + 🔍 in the search; catalog count in a green pill and a green line under the title; category / sort as round pills with layer / flame icons and ⌄; product promotion pill red, round, centred, starting with ⚡; Promotion banner divider line + gift; lighter header top. Still different only because of each shop's own data (logo, hero pictures, catalog texts).

- Owner's phone picture (treebird Mobile): visiting another shop inside a shop app (`body.visiting-shop`, visit-shop.js) now shows, on phones only (≤1023 px):
  - The shop header on the green Profile background (`images/profile-cover.svg`), with the logo in a green ring, the name, a green ✓, a Followers / Following / Posts pill (from `/api/platform/profile/<slug>`) and the caption pill. 🔔 💬, the speed badge and the tagline are hidden there.
  - A bottom bar with only Home · Category · the visited shop's own Profile (its logo, copied from `#home-profile-avatar`; owner's follow-up). On PC the exit link stays.
  - Back at the start of the visited shop leaves at once (popstate ghStep 0, handled before back-nav.js: `history.back()`, else `location.replace(home)`), with no "press again to exit". From its Profile, the first Back returns to its Home.
  - Cart as a round delivery button (`images/cart-scooter.png`, cut from the owner's picture) above the bar, with the live count from `#bottom-cart-count`; tapping it opens the existing Cart.
- New `public/visit-shop.css`. On PC nothing new shows. The app's own shop is unchanged.
- The ✓ uses its own class (`visit-verified`), because tenant-store.js removes every `.settings-verified` in seller shops.
- `tests/visit-shop.test.js`: the fake page's querySelector now answers only whole-bar selectors (on purpose). New `tests/visit-shop-look.test.js`.
- Tests: Node 22 check + 493/493. Chromium demo (standalone emulated, Alice's app visiting treebird Mobile) at 375/390 compared with the picture: scooter opens Cart, own shop unchanged, PC 1280 unchanged, no console errors. Demo note: a seller shop page is served from the saved release build, so restart the demo after changing index.html. iPhone not tested.

### 1.1.326: + Add → Category = the admin's own Product Categories, edited on the Profile (Claude)

- Owner (screenshot of the admin page opened by 1.1.325): edit right on the Profile, but with the admin's own Category manager. New `public/category-editor.js`: admin.js's category manager (rows, plant/folder icons, product counts, expand, ✎ editor with English/Myanmar/Parent/Icon, banner, move up/down, + Subcategory, + Add Main Category, Save Categories, swipe left to delete, same messages) ported into the Profile sheet; saves through the shop's `GET/PUT /api/platform/shops/:id/categories` (banner via `/shops/:id/files`). The admin's Select Parent Category picker (`category-picker.js/.css`, now also loaded on the shop page) is moved inside the sheet because the sheet is a modal dialog.
- `public/category-editor.css`: the category manager's rules copied from site-admin.css by scratchpad extract-cat-css.py, each limited to `.profile-category-sheet` so nothing reaches the shop page.
- GearHub's own Category still opens `/admin.html?categories=1` (its categories need the GearHub admin password session).
- Tests: Node 22 check + 492/492. Chromium demo seller at 375/1280: Profile sheet matches the admin page side by side; expand, add main, Select Parent Category picker over the sheet, Save (saved; duplicate name refused by the server), ← closes the sheet on the Profile; no console errors. iPhone not tested.

### 1.1.324: GearHub's own Profile like a shop profile (Claude)

- Owner approved ("လုပ်ပေး"). GearHub Home → Profile now shows Followers / Following / Posts, caption, + Add + Dashboard (GearHub owner) or Follow (others), Personal details and its personal posts (also in Discover).
- Server (`lib/platform.js`, `lib/shop-profile.js`): the legacy main shop (platform_shops id 1, slug `gearhub`) is served by `/profile/gearhub`; posts counts GearHub's active `products` rows; its name/logo in post cards come from site_settings (appIconUrl/logoUrl, local paths only). New owner-only `PUT /profile/gearhub/about` (caption + details into id 1 settings) and `POST /profile/gearhub/photo` (post photos). Image route allows GearHub's own (id 1) photos; every other shop still goes through `publicShop`. No schema change.
- Front end (`profile-menu.js`): on GearHub's site the profile uses `gearhub`; ✏️ edits caption + details (name/logo stay in GearHub admin); + Add → Business opens `/admin.html?add=1`, Category `/admin.html#category-manager-content`, Dashboard `/admin.html` (GearHub's products/categories live in its own tables). The Menu picture is now hidden on GearHub too.
- **1.1.325** (PR #408 was merged before this commit reached it, so it ships in its own PR): owner (screenshots of the admin's Product Categories): Category must be the admin's own, not a new editor. Removed 1.1.323's `category-sheet.js/.css`; Profile → + Add → Category now opens `/shops/<slug>/admin?categories=1` (GearHub: `/admin.html?categories=1`). `admin.js` opens the Product categories panel (phone section + PC view) and its ← returns to the shop Profile (asks first if unsaved). GearHub's admin.html still needs its own admin login; then the panel opens (waits up to 10 min). GearHub path not browser-tested (demo has no GearHub admin server).
- Built on 1.1.323 (PR #407): merge #407 first.
- Tests: Node 22 check + 492/492 (new tests/gearhub-profile.test.js). Chromium demo: GearHub owner at 375/1280 — edit details, Personal post, Business → admin add page; no console errors. iPhone not tested.

### 1.1.323: + Add → Category on the Profile, Work → Business, PC name at the left, ☰ only on Menu (Claude)

- Owner: + Add offers Personal / **Business** (was Work) / **Category**. Category opens a sheet on the Profile (new `public/category-sheet.js/.css`): list of main → sub categories with item counts; + New, tap to edit (English, Myanmar, icon, inside which category), Delete (blocked while it has products or subcategories). Uses the existing `GET/PUT /api/platform/shops/:id/categories`; no API/schema change, no Admin navigation.
- PC top bar (`pc-top.css`): logo + shop name flush to the window's left edge (16px), whole name shown (wraps to 2 lines on 1024–1399 instead of being cut).
- Menu view (`profile-menu.js/.css`): only a ☰ button (no "Menu" word, no back arrow) that returns to Profile; the logo / Admin Dashboard picture is hidden in seller shops (their Profile has Dashboard). Kept on GearHub's own site, because GearHub's Profile is still empty and that picture is the owner's way into Admin.
- Not done (needs owner's OK, server change): GearHub's own Profile like a shop profile (followers / posts / Add / Dashboard / details). GearHub is the legacy shop, which `/api/platform/profile/:slug` does not serve.
- Tests: Node 22 check + 491/491. Chromium on local demo: Category add / sub / rename / delete / blocked deletes at 375 and 1280, Menu ☰ → Profile at both, PC header with owner 🔔 💬 at 1024/1280/1440 incl. a long name; no console errors. iPhone not tested.

### 1.1.319: 🔔 and 💬 on GearHub's own Home for the GearHub owner (Claude)
- Owner asked for Notifications and Messages on the owner's (GearHub) Home too. noti-chat.js runs in owner mode on non-shop pages: buttons stay hidden until `/owner/notifications` says signed in as the GearHub owner. 🔔 = GearHub push history (orders, new shops) + buyer chat messages from every shop; 💬 = every shop's chats ("Buyer · Shop"), opening one answers as that shop (slug taken from the row).
- New owner-only routes in lib/shop-chat.js: GET `/owner/chats`, GET `/owner/notifications` (visitors get {signedIn:false}). No schema change.
- Tests: shop-chat.test.js (visitor, shop owner refused, owner list/answer). 489/489. WebKit iPhone 13 (local test GearHub owner): hidden for guests, shown for the owner, chat list + thread. Real iPhone not tested.
### 1.1.321: PC shop Home in the owner's picture (Claude)
- Owner's PC picture (POLESTAR Home on a computer): logo + name left; Home / Discover / Category / Promotion / Cart (red count) / Profile ⌄; divider; glass 🔔 💬 at the right end; solid green filter button, magnifier in the search, solid green scan button; hero with ‹ › and dots on the picture; wide green Promotion banner with machines and a white Shop Now pill. The previous Claude session only took a screenshot before its limit (nothing pushed); built from main 1.1.320.
- New `public/pc-top.css` + `public/pc-top.js` (index.html + sw.js SHELL), everything only from 1024 px: .nc-buttons moved into the header on PC and back into the banner on phones; Cart badge mirrors #cart-count; Profile chevron; search magnifier; ‹ › press the existing hero dots (timer unchanged); `public/images/promo-machines.png` (cut from the owner's picture) on the existing Promotion banner. 1024–1399 px uses a tighter menu. Phone layout unchanged.
- Checked: demo seller shop in Chromium at 1024 / 1180 / 1280 / 1366 / 1440 / 1920 (no overlap between menu and 🔔 💬, no sideways scroll), ‹ › change the picture, 390 phone unchanged (buttons in the banner, no arrows); no errors. Node 22 check + 489/489. PR #403 (1.1.319 owner notifications on GearHub Home) is still open and separate.

### 1.1.320: Work product composer opens on the Profile (Codex — review pending)
- Task: Add → Work stays on the storefront/Profile, like Personal, instead of navigating to /admin?add=1. Base `f9fbf4b`; branch `codex/work-product-sheet`; PR #404: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/404. Root checkout/PC-top edits untouched. 1.1.319 reserved by the separate owner-chat task.
- Files: new public/work-product.js/css; profile-menu.js uses the dialog; photo-editor.js adds reusable mount/cleanup and nested Escape behavior; index/admin/SW asset pins and package/lock release 1.1.320; shop-profile regression expectation and tenant-install cache pin; mailbox/log. Existing protected categories/files/products APIs used unchanged. No database/backend/API changes. Save refreshes the storefront/Profile count without leaving; errors retain data, retry reuses uploaded files, busy writes guard close/resubmission. Personal/Dashboard/standalone Admin and seller Confirm gate unchanged.
- Validation: Node22 check + tests **488/488**, zero skips/failures; touched JS syntax/diff checks. Actual local WebKit seller shop at 375×900, 589×1280, 1280×900: Work cancel/reopen/save, image upload/edit/rotate/Escape/cover, category hierarchy/custom, bilingual details/promotion, duplicate SKU error + retry, Personal, standalone Admin photo editor, GearHub owner opening another shop's Work. Real API readback; no JS errors or horizontal overflow. Synthetic fixtures only; HTTP QA removes CSP/HSTS headers and blocks SW, production protections unchanged. Screenshots `/Users/oakkar/Documents/Codex/outputs/qa-work-sheet-1.1.320/`; browser/server stopped. Physical iPhone/live unverified. Owner merges/deploys/Confirms; no agent merge/deploy/production Confirm.

### 1.1.318: Sticker and photo comments; TikTok-style comment box (Claude)
- Owner (TikTok picture): comment box = my initial + grey pill "Add comment…" with 🖼 photo, sticker and @ (names in this thread); a red send arrow shows when there is something to send.
- Owner approved: column `platform_post_comments.media` ("photo:<file id>" / "sticker:<name>") and table `platform_comment_photos(shop_id,file_id,user_id,used)`. Photos are made ≤1600 px on the phone, uploaded with POST `/feed/:slug/:id/comment-photo` (CSRF, signed in, 20 a day) into the POST's shop storage (owner's choice), used once by one comment, deleted with the comment; shop delete removes the rows. Stickers are 20 built-in emoji (no storage).
- Owner follow-up (TikTok picture): no pencil/bin on comment rows; press and hold (or right-click) a comment → bottom menu Delete / Edit (own comments) / Copy / Reply. The click from lifting the finger is swallowed so the menu stays open.
- Tests: shop-posts.test.js (sticker, bad sticker, someone else's photo, upload → comment → reuse refused → delete removes the file). 488/488. WebKit iPhone 13: sticker + photo comments drawn. Real iPhone not tested.

### 1.1.317: Blue Message inbox matching the owner's reference (Codex — review pending)
- Task: Message button → pale blue inbox with bubble title, rounded search/filter, conversation list/time/unread dots and Chats / Active Now / Followers footer. Full screen on phones (card/type/footer proportions scale on wider phones), centered panel on desktop. Base main `b2d732d`; branch `codex/message-inbox-design`. PR #401: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/401.
- Files: public/noti-chat.js/css (inbox rendering, name/preview search, unread toggle, tabs, real existing threads and blue styling), index/SW/cache/package release tags, tenant-install pin, mailbox/log. No backend, database, API, unrelated page or production release changes. Existing buyer↔shop sending/polling/Google entry and notifications retained.
- Limits: existing API has no contact photos, online presence or follower identities. Use real names with initials fallback; Active Now explains unavailable; Followers links to the current shop Profile/counts. Buyer has this shop's thread, owner has its customer list; no cross-shop aggregation or invented data.
- Validation: Node22 check + **488/488** tests, touched JS syntax/diff checks. Actual local WebKit seller shop at 375×812, 589×1280 and 1280×900: message/search/unread/tabs/thread/back, real owner/buyer send, notification isolation, guest login entry. No captured JS errors, panel fits. Visually checked screenshots in `/Users/oakkar/Documents/Codex/outputs/qa-message-design-1.1.317/`; fixture/browser stopped. Physical iPhone/live unverified. Owner merges/deploys/Confirms; no agent merge/deploy/Confirm.

### 1.1.316: Comment replies with curved lines + ❤ per comment; one pencil on Profile; full-screen photo viewer (Claude)
- Owner (TikTok / YouTube pictures): comments show avatar, name, text, time · Reply, ❤ count on the right; replies sit under their comment joined by a curved line ("Replying to …" bar above the box). Owner approved: new column `platform_post_comments.parent_id` (added with ALTER, existing comments untouched) and table `platform_comment_likes(shop_id,comment_id,user_id)`. A reply to a reply stays in the first comment's thread; deleting a comment deletes its replies and likes; shop delete removes comment likes. New route POST `/feed/:slug/:id/comments/:comment/like`.
- Owner mid-task: only the top pencil edits the Profile (caption and details pencils removed).
- Owner mid-task: Discover photo viewer on iPhone showed the page blurred at the top (dialog was 100svh and centred over a half-clear backdrop). Now it fills the whole screen on phones, solid backdrop, header below the status bar.
- Tests: shop-posts.test.js (replies, comment likes). 488/488. WebKit iPhone 13: thread with two replies + like, one pencil, viewer top 0 → bottom = screen. The real iPhone status bar area is not testable here.

### 1.1.315: Server Storage card in the owner's new design (Claude)
- Owner's picture (open + closed). For the GearHub owner (when R2/Drive/shops/backup data exists) the Server Storage row becomes one green card (public/storage-design.css, settings.js): the header (closed = header only; tap opens/closes), Render Server ring + bar, Cloudflare R2, Google Drive, All shops (pill + chevron folds the shop rows), Backup with Run / Download.
- To look exactly like the picture, the header (open + closed versions, with its texts and chevron), the logo tiles, the small icons and the two backup buttons are cut from the owner's picture (public/images/storage/*). Every size/position is the picture's pixel value × --u (card width / 960 via container query units), so it scales with the screen. Buttons keep ids storage-backup-run / storage-backup-download, so the existing backup actions work; "Backup running…" shows under the title and the Run picture dims.
- R2 total uses the server's 10 GB free-tier value (picture: "1.6 GB / 10 GB"). Seller shops' storage row is unchanged.
- Compared side by side at the same width in WebKit (iPhone, fed the picture's numbers): /Users/oakkar/Documents/Codex/outputs/storage-compare.png. Remaining small difference: the ring's multi-tone colours are approximated with CSS. Tests: tests/storage-design.test.js. 488/488. Real iPhone not tested.

### 1.1.314: 🔔 notifications and 💬 buyer ↔ shop chat at the top of each shop (Claude)
- Owner's picture: two glass buttons at the top right of the shop banner (public/noti-chat.js / .css; shop pages only). Red dot = new.
- 💬 Chat (owner approved two tables, new `lib/shop-chat.js`): `platform_chats(shop_id,user_id,…read_at)` and `platform_chat_messages(chat_id,shop_id,from_shop,body,created_at)`, all scoped by shop_id, removed with the shop; times keep milliseconds. A signed-in buyer has one thread per shop; the shop owner / GearHub owner sees the list and answers. Routes (own CSRF check): GET/POST `/chat/:slug`, GET/POST `/chat/:slug/:chat`. Open chats refresh every 5 s. A buyer message also sends a push alert to the shop's phones (scope shop:<id>, url `?chat=1` opens the chat).
- 🔔 Notifications (not stored; read live): shop side — orders, likes, comments, follows, chat messages; buyer side — shop answers in chat and new comments after theirs on the same post. GET `/notifications/:slug`; last-opened time kept on the phone (`gh-noti-seen:<slug>`). Discover's bell opens this list too.
- Owner follow-up ("icons must be exactly the same"): the two buttons are now the owner's own picture, cut out: public/images/noti-bell.png (with its red dot = something new), noti-bell-quiet.png (same picture, red dot painted out, shown when nothing is new) and noti-chat.png (+ CSS red dot for unread chats).
- Owner mid-task: Settings → Notifications row is only the on/off switch now (no history sheet, no count).
- Tests: tests/shop-chat.test.js. 487/487. WebKit iPhone 13 with a buyer and the POLESTAR owner (local sessions): buyer sends, owner sees red dots + list, answers, buyer sees the answer within 5 s, notification list. Real phones / push not tested.

### 1.1.313: Server Storage list opens on tap; Auto update time for shops (Claude)
- Settings → Server Storage: the R2 / Drive / All shops / Backup cards stay closed until the row is tapped (› beside the title turns down); tapping again closes it. settings.js + release-control.css.
- Shop updates (GearHub owner only): "Auto update" switch with a 12-hour time (hour, 5-minute steps, AM/PM). Saved in existing `platform_meta` key `shop-release-auto` {time:"HH:MM", doneDay} — no schema change — via new owner-only PUT `/api/admin/app-release/auto` (CSRF like the other admin routes). server.js checks every minute: when shops are behind GearHub and Myanmar time (UTC+6:30) is within 15 minutes after the set time and it has not run today, it publishes the deployed version (notes "Auto update HH:MM", log `shop_release_auto`). GET app-release returns `autoTime`.
- Verified on the local server: auto time set to the current Myanmar minute → shops moved 1.1.312 → 1.1.313 within 75 s, doneDay recorded. WebKit iPhone 13 (local test admin login): list closed/opened, switch + 9:00 PM saved as 21:00. Tests: shop-releases.test.js (stand-in createElement for the VM test; new auto test). 485/485. Real phone not tested.

### 1.1.312: Profile edited in place; no logo field in the shop admin; cleaner photo viewer (Claude)
- Owner: pencils opened the admin; they now open an "Edit profile" sheet on the profile: logo photo (made a 512 × 512 square, uploaded with /shops/:id/files), shop name, caption, address, phone, email, birthday, work → PATCH /shops/:id. A new logo also sets appearance.logoUrl + appIconUrl; a new description also updates the Site settings tagline (caption). A new name moves to the new link and reopens Profile.
- The shop admin hides its Logo image field (`.appearance-logo`, tenant-admin.js); GearHub's own admin keeps it.
- Photo viewer: the ✕ is a solid round button with no focus ring (iPhone drew a blue outline behind it), ‹ › buttons hidden, swipe left/right changes photos; personal-post titles no longer show "undefined".
- Tests: shop-profile (in-place edit, other shop refused), profile-menu (wiring). 484/484. WebKit iPhone 13 as POLESTAR owner: sheet fields, new photo + caption saved (logoId, logoUrl, description), viewer without arrows/outline. Real iPhone not tested.

### 1.1.311: Profile in the owner's new design (Claude)
- Owner's picture: green cover with clouds (existing /images/settings-banner.jpg, faded at the bottom, full width), round white buttons (Menu left, kept because it opens Settings; pencil edit right for the shop), big logo with a green ring, name + green check, "N Followers | N Following | N Posts" with icons, caption pill (shop tagline/description; pencil opens admin Site settings), Add + Dashboard (shop) or Follow (visitor), "Personal details" card (address, phone, email from the shop contact settings; pencil opens admin #tenant-contact-panel), Facebook-like post cards (logo, name, time, globe, ... menu with Delete).
- Follow-up (owner said add them): shop contact settings gain `birthday` (YYYY-MM-DD, not in the future; date picker in the admin contact form) and `work` (text) in the existing settings JSON (no schema change; PATCH /shops/:id allowed keys). The details card shows "February 5, 2002 (24 years old)" and the work line.
- Owner follow-up ("not the same as my picture"): new light lime wave cover `public/images/profile-cover.svg` (cloud left of the logo, fades into the page), filled green people icons, smaller caption pill and 50px buttons, address with a bold last-two-parts line over the full address. Menu stays on the left (it opens Settings) instead of the picture's back arrow. Side gaps like the picture: phones put the caption, buttons, details and posts 14px from both screen edges (measured in WebKit).
- `/profile/:slug` now returns `about:{caption,address,phone,email}` (public texts the store API already shows).
- Tests: shop-profile.test.js (about). 484/484. WebKit iPhone 13 as owner and visitor, and 1280: layout, no sideways scroll, no page errors. Real iPhone not tested.

### 1.1.310: Home — no "Shop by department", Promotion banner, up to 5 hero pictures; bigger bottom-bar icons (Claude)
- Owner's picture: `.popular-categories` hidden; the Promotion tab left the phone bottom bar (hidden by CSS, markup kept for the PC bar and tests) and became a green banner under the hero (`public/hero-slides.js` → button `data-store-view="promotion"`, opens the Promotion page; hidden with body.no-promotions and while searching).
- Hero: up to 5 pictures (Hero + Hero picture 2–5 in admin Site settings; `heroImageUrl2..5` in lib/tenant-admin.js appearance keys and server.js site settings). store.js sends `gearhub:hero`; hero-slides.js cross-fades every 4.5 s, dots under it, swipe to change, pauses when the page is hidden. Note: `.hero.hero-image-only>*{display:none!important}` and other hero rules needed strong overrides for the slide layer (home-hero.css).
- Owner mid-task: bottom-bar icons back to their old 41px (fb-nav.css), taller bar.
- Tests: tests/home-hero.test.js; free-ai smart-search tag updated on purpose. 484/484. WebKit iPhone 13: 3 slides change (dot 1→2), banner opens Promotion, no department row, 5 visible tabs. Locally the hero pictures needed https (checkedImageUrl), so slides were fed with the event; real https site not checked.

### 1.1.309: Facebook-like bottom bar; tap Home / Discover again to reload (Claude)
- Owner's screen recording (frames read with a small AVFoundation script in the scratchpad — ffmpeg is not on this Mac): our bar slid a big round bubble/notch and a tap left a dark grey square; Facebook switches at once with a light pill on the open tab.
- New `public/fb-nav.css` (≤850px, loaded after the other styles): plain white bar, no notch/bubble (liquid-nav.js still sets `.active`), active icon in a light green pill, no labels, `-webkit-tap-highlight-color:transparent`, small press scale. Dark theme kept.
- pull-refresh.js: tapping the open Home (or Discover) tab again scrolls to the top and refreshes (same sign + sound).
- Tests: tests/fb-nav.test.js. 483/483. WebKit iPhone 13: no bubble, pill on Home/Profile, Home again at scrollY 800 → 0 and one product reload. Real iPhone not tested.

### 1.1.308: Personal posts get ❤ / 💬 / 🔖; comments show the SkyShop name; writer can edit (Claude)
- Owner: personal posts should have everything a product post has except Buy Now. Like / comments / save now work on personal posts (`/feed/:slug/p<id>/…`). They reuse `platform_post_likes` / `platform_post_comments` with product_id = -<post id> (no schema change; never collides with product ids); deleting a personal post deletes its likes/comments. `/posts` items carry likes/comments/liked.
- Comment names: the writer's shop name (brandName or name) if they own a shop, "SkyShopMM" for the GearHub owner without a shop, else the Google name.
- New PUT `/feed/:slug/:id/comments/:comment` — writer only; the sheet shows a pencil (writer) beside a bin icon (writer, shop owner, GearHub owner), editing in place.
- Tests: shop-profile.test.js extended; shop-feed tag updated on purpose. 482/482. WebKit iPhone 13 as the POLESTAR owner (local session): personal card has like/comment/save, like → 1, comment shows "POLESTAR", edit → "Hello again". The profile page's own post list is unchanged (no buttons there). Real iPhone not tested.

### 1.1.307: Search bar stays on top; Trash plays the bin animation; no Refresh row (Claude)
- Owner (iPhone screenshots): in Product search, scrolling down lost the search bar. Cause: old phone rules `html,body{overflow-x:hidden}` (style.css, Oct 2026) make body its own scroll box in WebKit, so the 1.1.222 sticky bar scrolled away (measured on live: top -890 after scrolling). search-filter.css now sets `overflow-x:clip` (same sideways cut, no scroll box) inside `@supports (overflow:clip)` on ≤850px. WebKit: bar top 0 after scrolling 1500px; scrollWidth = width on Home/Discover/Category/Profile.
- Trash in the filter list plays the old bin animation (body.bin-eating shows the bar's bin while it eats the letters), then hides it.
- Settings Refresh row hidden (`#app-refresh-action`) — pull down to refresh replaces it. The Settings → Refresh code stays (updates.js still uses its own reload).
- Tests: search-filter.test.js updated. 482/482. WebKit iPhone 13 with 40 extra local test products. Real iPhone not tested.

### 1.1.306: No black Render "502 Bad Gateway" during a deploy (Claude)
- Owner (iPhone screenshot during a deploy). Cause: Render stops the server while it deploys (the persistent disk rules out zero-downtime deploys, see the Codex 1.1.288 note) and answers with its own 502 page. The service worker already used the saved copy for shop pages on 5xx, but admin pages passed the 502 through, and a page with no saved copy showed plain text.
- public/sw.js: admin pages treat 5xx like offline (saved copy); with no saved copy any page shows `busyPage()` — "ခဏစောင့်ပါ — app ကို update လုပ်နေပါတယ်" with a spinner, meta refresh every 5 s, status 503, never cached. Seller shops get it after Confirm update (shop SW comes from the saved build).
- Not fixable here: the very first visit with no service worker yet, or a browser without one, still sees Render's page; true zero downtime needs moving off the attached disk (owner chose not to).
- Tests: tests/sw-busy.test.js runs the real sw.js in a VM against a fake 502 (admin saved copy, admin/shop updating page). 482/482. Browser check not possible: Playwright WebKit cannot load the app on http://localhost (upgrade-insecure-requests) and the in-app pane refuses service workers.

### 1.1.305: Search bar — no second bin; ˄ ˅ beside the Excel count (Claude)
- Owner (iPhone screenshot): the bin showed twice (bar + Trash in the filter list) and the Excel search had a count but no arrows. The bar's bin is hidden when the filter is there (search-filter.css); Trash in the list empties the search directly. excel-search.js: the matching-rows view shows ˄ ˅ when there is more than one match and they step through the matches like the sheet view.
- Tests: search-filter.test.js updated. 480/480. WebKit iPhone 13 with the owner's workbook uploaded to the LOCAL test shop only: "carrier" → 60, ˄ ˅ shown, next → 2/60, 3/60 with the cell moving; no bin in the bar; Product → products count. Real iPhone not tested.

### 1.1.304: Search filter (Product / Excel / Trash), pull to refresh with sound, newest personal post first (Claude)
- Owner: "post doesn't show in Discover" — it did (checked live: 3rd card, after two products). Now each personal post goes before the first product that is older (products without a time count as older), so a new post is on top.
- Pull to refresh (new `public/pull-refresh.js`, touch screens only): pull down at the very top → round sign, short two-note sound (Web Audio, no file), Discover reloads posts (`GearHubShops.refresh`), other tabs reload products (`GearHubStore.retry`). Not while a sheet/photo/cart/Excel sheet is open or inside an inner scroller. The sign is gone after refreshing.
- Home search (owner's picture; new `public/search-filter.js` + `.css`): filter button left of the bar → Product (only products; count + up/down go through the found products and highlight each), Excel (only the Excel rows; shown only when the shop has an Excel file), Trash (empties the search with the existing bin). Choice kept in `gh-search-scope`. excel-search.js skips Excel rows in Product.
- Follow-up (owner): the Excel files folder on the right of the bar moved into the filter list as its first item ("Excel files", only when the shop has a file); the bin/Trash stays "empty the search" (owner confirmed).
- Tests: tests/search-filter.test.js; shop-feed tag updated on purpose. 480/480. WebKit iPhone 13: menu, "or" → 2, 1/2 + highlight, Trash empties, personal post first in Discover, pull → refresh called + sign hidden; PC 1280 menu. Real iPhone (sound, real finger pull) not tested.

### 1.1.303: Profile — real followers/following/posts, Follow, + Add (Personal / Work), personal posts in Discover (Claude)
- Owner (Facebook profile pictures): profile fills the screen (policies line no longer rides up); under the name "N followers · N following · N posts", real numbers. Visitors get Follow (Google sign-in; signed out → sign-in sheet). The shop (owner or GearHub owner) gets "+ Add" → sheet Personal / Work. Work → `/shops/<slug>/admin?add=1` opens Add Product (admin.js waits for the dashboard). Personal → photos (≤10, made ≤1600 px JPEG on the phone, uploaded with the existing `/shops/:id/files`) + text (≤3000) → shows on the profile and in Discover, never in products.
- Owner approved two tables (created in new `lib/shop-profile.js`): `platform_shop_follows(shop_id,user_id)` and `platform_posts(id,shop_id,body,image_ids,created_at)`; all queries scoped by shop_id; shop delete removes them; an image used by a personal post cannot be deleted. Followers = follows of the shop; following = shops its owner follows; posts = active products + personal posts. Routes: GET `/profile/following`, POST `/profile/following/import`, GET `/profile/:slug`, POST `/profile/:slug/follow`, GET `/posts` (?shop=/?shops=/?q=/?before=), POST/DELETE `/profile/:slug/posts[/:id]` (own CSRF check, like the feed routes).
- Discover: personal posts come between products (one after every two), not in Trending; Follow in the ••• menu now uses the account (phone list moved to the account once after sign-in). Personal post cards: header, text, one photo + count; no price/Buy/likes/save.
- Video is NOT included (owner: photos + text first). Tests: tests/shop-profile.test.js; shop-feed tag updated on purpose. 479/479. WebKit iPhone 13 + 1280 (local server, owner session made in the local DB): counts, Follow → sign-in, + Add → Personal/Work, real photo upload + post, post on profile and in Discover, Work → Add Product form. Real iPhone / real Google not tested.

### 1.1.302: Profile tab (person icon) with ☰ Menu → old Settings (Claude)
- Owner (Facebook profile/menu pictures): the bottom bar's Settings place shows a person ("Profile", existing `navProfile` text). Profile shows only the shop's profile photo (same as the Settings profile card) and name for now; ☰ at the top left opens the old Settings page unchanged, with "‹ Menu" to go back. Tapping Profile again always opens the profile. Phone Back closes the menu (`profile-menu` in back-nav overlays).
- New `public/profile-menu.js` / `.css` (in index.html + SW SHELL); index.html nav buttons (phone + PC); back-nav.js. Version 1.1.302 (main was 1.1.301 from Codex).
- Test: tests/profile-menu.test.js. 477/477. WebKit iPhone 13 + 1280: Profile label, only photo+name visible, Menu shows Settings, back, reopen = profile; no page errors. Real iPhone not tested.

### 1.1.301: Discover compass navigation and truthful product posting time (Codex — review pending)
- Task: rename visible Shops navigation to Discover with a compass; show original product posting date/time. Base main `41aeeb5`; branch `codex/discover-product-time`; isolated worktree `gearhub-discover-time`. PR #385: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/385. No merge/deploy/production Confirm.
- Files: `lib/platform.js` and `lib/tenant-admin.js` capture server-owned `details.postedAt` on first manual/spreadsheet creation; `lib/shop-feed.js` adds nullable postedAt to public posts; `public/shops-feed.js/css` render accessible Myanmar date/time and legacy unavailable text; `public/index.html` visible labels/native compass SVGs; package/SW/install and feed tag pins; new `tests/product-posted-at.test.js`; mailbox/log. No schema migration, invented legacy dates, unrelated redesign or route rename. Edits/reimports preserve original timestamps. Existing feed rotation and GearHub Confirm gate retained.
- Validation: Node22 check + tests **476/476**, focused 8/8, public JS syntax/diff checks. Real local IAB seller shop at 375×812 and 1280×900: Discover navigation/icon/time, legacy unavailable, Home/Category, alternating shops; zero console errors/warnings or horizontal overflow. Screenshots under `/Users/oakkar/Documents/Codex/outputs/qa-discover-time-1.1.301/`; browser and fixture cleaned up. Physical iPhone/live deployment unverified. Owner merges/deploys and explicitly Confirms seller update.

### 1.1.300: Rotate Feed posts one shop at a time across pages (Codex — review pending)
- Task: eliminate long POLESTAR-only blocks without redesigning the Shops feed. Base main `38f204e`; branch `codex/interleave-shop-feed`; isolated worktree `gearhub-feed-rotation`. PR #384: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/384. No merge/deploy or production Confirm update.
- Files: `lib/shop-feed.js` (explicit mixed-mode round robin with per-shop keyset cursors; snapshot cap and last shop keep turns across pages; bounded cursor decoding/filter binding), `public/shops-feed.js` (Feed/Following opt in; remove per-page client shuffle), package/index/SW release tags, tenant-install/shop-feed pinned-tag tests, new `tests/shop-feed-rotation.test.js`, mailbox/log. No CSS, schema or unrelated feature changes. Existing newest-first/Trending behavior and owner confirmation gate preserved.
- Validation: Node22 check + tests **473/473** (zero failures/skips), focused 7/7; touched public JS syntax and diff checks. Actual local IAB seller-shop 375×812 + 1280×900: alternating Kaizen/TREEBIRD/POLESTAR, continuation from 20 to 40 posts, Following of two shops alternates, New Arrivals remains newest-first, Home/Category work, no console error/warning or horizontal overflow. Screenshots under `/Users/oakkar/Documents/Codex/outputs/qa-feed-rotation-1.1.300/`; browser/fixture cleaned up. Physical phones and live deployment untested; owner merges/deploys and explicitly Confirms seller frontend updates.

### 2026-11-04: Owner selects Confirm update only (Codex — PR #371 review handoff)
- Owner chose Confirm update only after pricing discussion. Database migration, paid Postgres and full zero-downtime infrastructure are outside this authorized scope; do not pursue them or repeat the approval request.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/371. No runtime changes in this continuation; files changed: mailbox/log only. Code head `d03f8bd` has Node22 check + tests 459/459 and green Production readiness/node22 (run 41778088940). Preparing for review with actual 375/1280 browser/physical-device verification still explicitly unverified. No merge/deploy or production confirmation.
- Owner merges/deploys, checks GearHub Settings and seller versions, then presses Confirm update when satisfied. The feature controls seller frontend version changes; SQLite/disk-backed backend restarts remain possible during Render deploys.

### 1.1.299: Opening picture only when the app is opened (Claude)
- Owner: the SkyShopMM opening picture came up again and again when going to another shop or back to the own shop. Before, only a page change within 8 s was "quiet", and even a quiet cover showed the picture after 0.7 s.
- skyshop-splash.js: sessionStorage `sky-opened`; once set in this app/tab session the page gets the plain cover only (no picture, no sound, no Loading box) until the shop is drawn. Updating… and a failed load (Offline/Retrying) still show. Splash asset tag 20261022-solid-1 → 1.1.299 (sw.js SHELL + `SPLASH_V` in lib/tenant-install.js).
- Test: splash-waits-for-shop (once per session). 470/470. WebKit iPhone 13: open POLESTAR → picture; Kaizen and back to POLESTAR (9 s apart) → plain cover only, never the picture.

### 1.1.298: Shops — one centred photo, owner's top design (search, bell, profile, 4 tabs), shop-logo exit (Claude)
- Owner (iPhone screenshot): a post's one photo looked like two (WebKit drew the carousel slide 268 of 348 px wide, grey beside it). Now one photo per post, absolutely placed with `object-fit:contain` in a frame shaped like the photo (4:5…2.5:1); more photos show "🖼 n" on the photo and open in the viewer on tap. Reproduced and verified in Playwright WebKit (iPhone 13): photo 346/348 px (1px border each side).
- Owner's top picture: green bar with the page's own brand (shop logo/name/tagline; GearHub on GearHub — seller shops never show GearHub), search "Shop name and product", bell (only when Settings has the Notifications row; red dot = its new-alerts count; tap opens that list), profile (initial when signed in → Settings), tabs Feed / Following / Trending / New Arrivals. Old "FROM EVERY SHOP / Shops" heading now only in Saved.
- `/api/platform/feed` gained `q` (shop name, product name, SKU unless hidden by User show; LIKE escaped), `mode=trending` (likes + 2×comments, >0 only, one page) and `shops=a,b` (Following). Following is kept on the phone (`gh-followed-shops`, Follow/Following ✓ in the post ••• menu) — no DB change. Feed mixes shops per page; New Arrivals = newest first.
- visit-shop.js: the exit in the Settings place shows the app's own shop logo + name (saved as `gh-app-home-logo`, same-site only), red sign only when there is no logo.
- Tests: shop-posts (search/trending/following, photo CSS), visit-shop (logo, other-site logo refused). 469/469. WebKit 375 + 1280: photo, count + viewer 1/3, search "serum", Trending, Following empty/followed, exit logo; no page errors.

### 1.1.297: Shops posts — page scrolls when dragging on a photo; smaller posts on phones (Claude)
- Owner (iPhone video): dragging up/down on a post photo did not scroll the page; one post filled the whole screen. Cause: the photo carousel had only `overflow-x:auto`, so its `overflow-y` also became a scroll box. Now `overflow-y:hidden; touch-action:pan-x pan-y`.
- Phones (≤850px): smaller header/avatar/text, description clamped to 2 lines, photo frame max `min(250px,32svh)`, slimmer action row → a post is ~335px at 375px (was ~600). PC unchanged except photo max 420px.
- Files: public/shops-feed.css, public/shops-feed.js (See more after 110 letters / 2 lines), version files, tests/shop-feed + shop-posts. 468/468. Browser 375/1280 checked locally; the real iPhone drag is not tested here (owner tests). Seller shops need Confirm update.

### 1.1.296: Shops posts — new design, likes, comments, Buy Now sheet, Settings → Saved (Claude)
- Owner's reference picture: shop name + green check, "category · 🌐", "•••" menu (Visit shop), caption, rounded photo carousel with dots, action row ❤ count | 💬 | Buy Now | 🔖. Buy Now opens a bottom sheet (photo, name, SKU, Part No, price, Quantity − 1 +, Add to Cart / Buy Now). Only the Shops tab changed; Home is untouched (owner).
- Owner approved two new tables (created in `lib/shop-feed.js`): `platform_post_likes(shop_id,product_id,user_id)` and `platform_post_comments(id,shop_id,product_id,user_id,body,created_at)`. Every query has `shop_id=?`; shop delete removes them. Likes/comments need Google sign-in (owner's choice); routes `POST /api/platform/feed/:slug/:id/like`, `GET|POST /feed/:slug/:id/comments`, `DELETE /feed/:slug/:id/comments/:comment` (writer, shop owner or GearHub owner). The feed router is mounted before the platform CSRF middleware, so the routes check the CSRF token themselves. Names only, never e-mails; 1000 letters, 3 s between comments.
- Feed items now also carry sku, partNo (still hidden by User show), likes, comments, liked, shop.slug.
- `/auth/start` accepts `back` (`/?view=shops` or `/shops/<slug>/?view=shops` only) so signing in from a post returns to Shops; `GearHubAppLogin.start(back)`.
- Saved posts stay on the phone (owner's choice): localStorage `gh-saved-posts` (copies, max 200). Settings → "Saved" row (`#saved-posts-action`, bookmark icon in settings-design.js) opens the Shops tab in saved mode with "← Shops".
- Add to Cart / Buy Now write the post's own shop cart (`gh-shop-cart:<slug>`); store.js re-reads it on `gearhub:cart-changed`. Buy Now on the same shop opens the cart; on another shop goes to `<shop>/?cart=1`, which opens the cart there.
- Tests: new `tests/shop-posts.test.js`; asset tags updated on purpose in free-ai, settings-design, share-store, shop-feed tests. 468/468 pass.
- Browser (local platform server, seller shop with the 1.1.296 build confirmed in the local DB): 375 and 1280 — posts, photo frame shaped by the first photo, signed-out like → sign-in sheet, signed-in like/comment/delete (test user from a local session), Buy Now same shop (cart opens) and other shop (Kaizen opens with cart), stock limit, save → Settings → Saved. Not tested on a real phone or with real Google sign-in. Seller shops get it only after the owner presses Confirm update.

### 1.1.295: "Add this shop's app" ask — not when installed; at most once (Claude)
- Owner: inside an app, visiting POLESTAR asked to add the POLESTAR app although it is already on the Home Screen.
- Bug from 1.1.294: `visit-shop.js` and `app-switch.js` both used `sessionStorage gh-app-home` (path vs slug); visit-shop runs first, so app-switch could think even the app's own shop was "another shop". visit-shop now uses `gh-app-home-path`.
- `app-switch.js`: Android/PC check `navigator.getInstalledRelatedApps()` (each shop manifest lists itself) and skip + remember when installed. iPhone cannot know which web apps are installed, so the automatic ask now comes at most once per shop per app (`localStorage gh-app-asked:<shop>`, was per session). Settings "Create <shop> app" still works by hand.
- Checks: Node 22 check + 466/466 (app-switch and visit-shop tests updated on purpose). Browser: simulated app session on its own shop shows neither the ask nor the exit. Not tested on a phone.

### 1.1.294: Visiting another shop inside a shop app — 4 tabs + exit (Claude)
- Owner: 1.1.293 works (POLESTAR opens inside the Kaizen Beauty app after re-adding it). When in another shop, show only Home, Category, Promotion, Cart so it is clear; the exit goes in the Settings place.
- `public/visit-shop.js` (installed app only — display-mode standalone / navigator.standalone): the first shop page of the app session is saved as home (`sessionStorage gh-app-home` + name). On any other shop (or GearHub `/`), `body.visiting-shop`, Shops + Settings hidden on the phone bar and the PC bar, and a red "ပြန်ထွက်" link back to home ("Back to <name>"). Browser tabs never change.
- `style.css`: hidden items, 5 (4 without promotions) columns, red exit icon/label (the old header rule painted the PC label white).
- Checks: Node 22 check + 466/466 (new tests/visit-shop.test.js). Browser 375/1280 with a simulated standalone app: bar = Home|Category|Promotion|Cart|exit, link to /shops/kaizen-beauty/. Not tested on a phone.

### 1.1.293: Phone bottom bar hides on scroll down, returns on scroll up (Claude)
- Owner (screen recording, not viewable here — no ffmpeg): show the bottom navigation while nothing happens; hide it while scrolling down; show it again on scroll up; smooth.
- `public/nav-autohide.js`: phones only (≤850px); hides after >6px down past 80px; shows on >6px up, near the top, 1.2 s after scrolling stops, on a tap at the bottom edge, and never while searching or a drawer/modal/dialog is open. `style.css`: `.nav-away` slides 100%+40px down (bubble included) with a .34s ease; the liquid `--liquid-x` transition is kept; reduced motion = no animation.
- Checks: Node 22 check + 465/465 (new tests/nav-autohide.test.js). Browser 375: logic checked with scroll events and the hidden offset (123px); the test pane pauses animation frames, so the slide itself was not watched. Not tested on the iPhone.

### 1.1.292: iPhone shop apps keep other shops inside the app (Claude)
- Owner: from the installed Kaizen app, opening POLESTAR showed a Safari sheet (X, address bar, toolbar) — "looks like the website".
- Cause: `/shops/<slug>/app.webmanifest` scope was the shop's own folder; iOS shows anything outside the scope in a Safari sheet.
- Fix (lib/tenant-install.js): Apple devices (iPhone/iPad/iPod, Safari on Mac) get `scope:'/'` (like the admin manifest); Android/PC keep the shop scope so a shared shop link still opens that shop's own app (no app chooser). `Vary: User-Agent`. id/start_url unchanged.
- iOS reads the manifest only when the app is added: the owner must delete and re-add each shop app (Kaizen, POLESTAR) on the iPhone after deploy.
- Checks: Node 22 check + 464/464 (tenant-install test now checks both scopes; titlebar pin updated on purpose). Not testable in a desktop browser; not tested on the iPhone.

### 1.1.291: "User show" — the shop owner chooses what visitors see (Claude)
- Owner: a "User show" button right of + Add Product; switch each product field on/off for visitors (SKU, Part No, Price, Stock, Description) and choose how many photos, from the first, they see.
- Saved in settings JSON (seller: `platform_shops.settings.visitorView`; GearHub: `site_settings.settings_json.visitorView`; Appearance save keeps it). No new table or column.
- Routes: `GET/PUT /api/platform/shops/:id/visitor-view` (lib/tenant-admin.js, permission products) and `GET/PUT /api/admin/visitor-view` (server.js, adminOnly); seller admin maps `/visitor-view` in public/tenant-admin.js.
- Visitors: `lib/visitor-view.js` strips SKU / Part No / description and extra photos from `/api/platform/store/:slug`, GearHub `/api/products` and the Shops feed. Price and stock stay in the data (the cart needs them) and are hidden on the page (`config.visitorHide` → `html[data-visitor-hide]` CSS; feed sends price null). The shop owner / GearHub owner always get everything (`viewer: "manager"`).
- UI: public/user-show.js + user-show.css (switch sheet; phone: Add Product 2/3 + User show 1/3; PC: sixth toolbar column).
- Checks: Node 22 check + 464/464 tests (new tests/visitor-view.test.js). Real local server (test admin) phone 375 + PC 1280: button placement, sheet switches save, visitor page shows no SKU/price; no new console errors. Seller shop admin path covered by tests only.
- The paused home-cart work (owner said stop) is in `git stash` "paused 1.1.291 home cart"; if resumed it needs a new version number.

### 1.1.290: My shop page survives a server restart (Claude)
- Owner's iPhone showed only "The string did not match the expected pattern" on platform.html (My shop) right after the 1.1.289 deploy: the restarting server answered with an HTML page and `r.json()` failed (Safari's wording). `public/platform.js` `api()` now parses text and throws a busy error ("Server is restarting… / Server ပြန်စနေပါတယ်"); the first load retries every 3 s (up to 2 min) and clears the message when it works. Test `tests/platform-restart.test.js`.
- Checks: Node 22 check + 461/461 tests + new test. Browser: platform.html on a static server (HTML 404 for the API) shows the message and retries. Live server was healthy at the time of checking (1.1.289).

### 1.1.289: Shops tab — every shop's products as a feed (Codex started, Claude finished)
- Owner: a "Shops" tab to the right of Home (GearHub and every shop) showing all shops' products like Facebook: shop name, then description, then photos.
- Codex built it (lib/shop-feed.js `GET /api/platform/feed`, 20 per page by product id, each shop checked with publicShop and only its own ready photos; public/shops-feed.js/.css, Shops button in the phone and PC nav, photo viewer dialog, back-nav entry, tests/shop-feed.test.js) but stopped at its usage limit before testing.
- Claude fixed: the feed query used a non-existent `deleted_at` column (it is `trashed_at`; the error stopped createPlatform, failing tests/app-login); script order (smart-search + store share a tag, store must be followed by liquid-nav); post footer painted dark green by the site `footer` rule; grid photos fill their tiles (cover), a single photo keeps its own shape; feed is a 744px centred column on PC. Test pin in tests/free-ai.test.js updated on purpose.
- Seller shops get the tab after the owner presses Confirm update (1.1.288 release gate).
- Checks: Node 22 check + tests (461, last run 460 + the fixed pin re-run). Browser 375/1280 with a mocked feed: Shops tab, 1/2/3/5/no-photo posts, See more, photo viewer next/close, no console errors, no overflow. Not tested with live shop data.

### 1.1.288: GearHub confirms seller frontend releases (Codex — draft, backend downtime unresolved)
- Task: deploy GearHub first; hold all seller storefront/admin builds until owner Confirm update. PR #371: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/371. Branch `codex/owner-confirmed-updates`, base main `7997fef`; no merge/deploy or Render mutation.
- Files: new `lib/shop-releases.js`, `public/release-control.js`/CSS, `release-seed/` baseline archive/README, `tests/shop-releases.test.js`; server/platform/tenant installation integration; existing owner console form, updates client, page/SW asset tags, package manifests, version/tag/notification fixtures, mailbox/log.
- Durable confirmed-version key in existing `platform_meta`; immutable archived public assets, seller HTML/admin/SW pinning includes fresh visitors, per-shop cache eviction, GearHub owner Settings approval using admin/Google owner auth + CSRF. First deploy remains on live 1.1.287 via a public-only archive from that exact base; subsequent deploys keep approved state. Existing worker/install controls do not override approval; failed controller-change checks do not force reloads. No database schema change.
- Node22 check + tests **459/459** (0 failures/skips), real HTTP auth/CSRF + two-shop rollout, fake Google-owner/seller roles, persistence/subsequent deploy, stale/idempotent confirmation, archived lazy Worker and isolated cache tests, UI VM double-submit guards. All 99 archived/transformed JS sources + both generated worker versions parse; diff checks pass. No actual 375/1280 browser/physical device/live deploy test: browser tools unavailable. Keep draft pending those checks; follow the owner's subsequent PR status decision.
- Compatibility follow-up: root SW routes legacy GearHub-only release checks to the deployed preview; legacy seller checks remain approved-only. Both paths tested, full Node22 check/tests re-run **459/459**. Owner asked pricing: minimum paid Render Postgres $6/month (1 GB storage included); no approval to provision/migrate yet.
- Unresolved: frontend pinning cannot preserve an old backend or prevent Render's SQLite disk-backed service interruption. Current Render docs verified disk/deploy/health-check constraints; no selected MCP workspace, so no live service setting was assumed or changed. Full zero downtime needs a separate approved database/infrastructure migration. Saved `DATA_DIR/app-builds` must stay in backups and remain available to older open pages.

### 1.1.287: No Backup & monitoring card in the GearHub admin; saved pages without the redirect mark (Claude)
- Owner: the admin's Backup & monitoring card is no longer needed (Settings → Server Storage has it since 1.1.286). Removed its markup from `public/admin.html` and `refreshOperations` / the `#backup-run` handler from `public/admin.js` (routes stay; Settings uses them).
- Owner's installed app showed "Response served by service worker has redirections" on /platform.html while the server returned 502 after a deploy: the SW fallback served the saved "/" (cached through its 302 to /platform.html, so `redirected=true`), which Safari refuses. `public/sw.js` `unredirect()` hands saved navigation copies over as plain responses. Test `tests/sw-redirect.test.js`.
- Checks: Node 22 check + tests 454/454; admin.html loads with no script errors (local static server, not signed in). Not tested on the live iPhone app.

### 1.1.286: Backup buttons in Settings → Server Storage; storage cards redesigned (Claude)
- Task: owner wanted the GearHub admin's "Run backup now" and "Download full backup" under the storage lines in Settings, and the section to look tidy.
- Files: `server.js` (`ownerOnly` = GearHub admin session or the owner's Google account, used by `GET /api/admin/backup` and `POST /api/admin/backup/run`; owner-only `backup` status in `/api/storage`; shop totals query guarded), `public/settings.js` (cards for R2 / Drive / All shops / Backup, run button with CSRF from `/api/admin/csrf`), `public/index.html` (`#storage-more` moved to the full width of the row), `public/style.css`, `tests/integration.test.js`, version files.
- Checks: Node 22 `npm run check` + `npm test` 453/453. Browser 375 and 1280 with mocked `/api/storage`: cards, running → completed state, CSRF header sent, no page overflow. Not tested against the live server or the owner's Google session.

### 1.1.285: Refresh the five Excel reliability fixes onto current main (Codex — draft)
- Task: continue PR #350; merge latest main `a8f90ea` / 1.1.284 to resolve conflicts while preserving later storage/photo changes. Branch `codex/fix-audit-findings`; isolated worktree `gearhub-excel-followup`. PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/350.
- Files in this continuation: package manifests, index/SW, tenant-install + Excel upload/network asset tests, mailbox/log. Resolved only release/asset/log conflicts; runtime fixes from the original entry below are unchanged. UI markup matches main apart from release/asset versions; no layout/API/schema changes.
- Validation after merge: Node 22 `npm run check && npm test` passed **452/452**, zero failures/skips; all six touched runtime JS syntax checks and `git diff --check` passed. Full log: `/private/tmp/gearhub-285-tests.log`. Latest-head CI is checked separately after pushing.
- Browser: previous actual 375×812/1280×900 checks cover the same runtime fixes; no fresh browser run in this continuation (tools unavailable). Offline E2E remains unverified due to the earlier browser URL-security denial; unit/VM coverage exists. Keep draft, do not merge/deploy. Root checkout and pre-existing untracked files untouched.

### 1.1.269: Fix five follow-up audit findings (Codex — UI verified, review pending)
- Authorized: all five items from the owner's audit follow-up. Base main `43c73a1`, branch `codex/fix-audit-findings`; PR #350: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/350. No merge/deploy or unrelated Play Store changes.
- Runtime files: `public/excel-library.js`, `sw.js` (shop-scoped cache + matching legacy migration; legacy preserved), `excel-search.js` (30s ID checks during visible searches and on focus/online/upload; unchanged-ID reuse; offline fallback), `excel-map.js` (quoted/multiline CSV), `tenant-store.js` (8s shared fetch and consumer cancellation), `net-speed.js` (readiness/Excel idle + 15s delay, Save-Data, cooldown/deadline). Version/assets in package manifests/index/SW/install test use 1.1.269. No API/schema/layout changes.
- Added `tests/followup-regressions.test.js`; expanded SW offline migration tests; existing VM fixtures now expose native AbortSignal and pinned asset tests follow the new tags. Node22 check + full tests 433/433; focused regression run 30/30; touched public JS syntax and diff checks passed.
- Follow-up after owner enabled Browser: actual IAB local seller-shop 375×812 / 1280×900 UI passed both search modes, no-match recovery, same-page upload, external-tab replacement on subsequent search without reloading, and CSV quoting/column values. Actual controls clicked; screenshots inspected (no header overlap/page overflow); normal app console error/warning logs empty. No source changes in this continuation. Evidence: `/Users/oakkar/Documents/Codex/outputs/qa-1.1.269-2026-11-03/`.
- Offline E2E remains unverified: after stopping the local fixture origin, IAB navigation returned ERR_CONNECTION_REFUSED; Chrome tool access was then rejected by its URL security policy. No workaround/bypass attempted. Offline isolation/migration passed unit/VM tests; no physical phone, live deployment or measured startup claims. Pre-existing untracked `.claude/` and `public/zz-real.xlsm` untouched.

### 1.1.284: R2 keeps 3 backups; Google Drive capped at 1 TB; Settings shows all shops' storage (Claude)
- Owner (live 1.1.283: R2 6.2 GB / 10 GB, Drive 3.0 GB, Render 98 MB): Cloudflare too big; add every shop's storage; allow Google Drive up to 1 TB.
- `lib/backups.js`: after each R2 backup upload, archives under `BACKUP_S3_PREFIX` (gearhub/) beyond the newest `BACKUP_S3_KEEP` (3) are deleted (`oldBackupKeys`; only gearhub-*.tar.gz; shop files under files/ untouched). Drive still keeps 30.
- `lib/drive-backup.js`: `DRIVE_LIMIT` 1 TB — backups throw and photo sweeps stop once the app's Drive files reach it (uses the last known size, refreshed in the background, so Drive errors still surface from the upload).
- `/api/storage` (owner): `drive.limitBytes`, `shops {usedBytes,count,top[5]}` from platform_files. Settings: Drive line "X / 1.0 TB" with meter; "🏪 All shops" total + top 5 shops (names escaped).
- Local page with mocked numbers at 1280 (no overflow). Node 22 check + 446/446.

### 1.1.283: Settings → Storage shows Render, Cloudflare R2 and Google Drive (Claude)
- Owner: show the three storages (Render, Cloudflare, Google Drive — only what GearHub keeps there). After 1.1.282 + Render env `FILES_S3_BUCKET=gearhub-backups` and `FILES_CACHE_MB=50`, live /api/storage was 103 MB (was 855 MB).
- `/api/storage` adds `r2` (whole bucket via ListObjectsV2: bytes, files, shop-file bytes, 10 GB free tier) and `drive` (all non-folder files the app made, drive.file scope) only for the GearHub owner (`isGearHubOwner`: GearHub admin session or owner Google account). Both cached 10 min. `settings.js` shows "🖥️ Render · …" plus the R2 line with a meter and the Drive line (`#storage-more`); customers see the Render line as before.
- Local static page with a mocked /api/storage at 1280 and 375: lines shown, no overflow. Not verified with real R2/Drive numbers (owner-only). Node 22 check + 445/445.

### 1.1.282: Shop files kept in Cloudflare R2; Render disk keeps a cache (Claude)
- Owner: everything shops upload lands on the fixed-size Render disk; move it all ("အကုန်ရွှေ့ထား"), shops upload at any time.
- New `lib/file-store.js` (off until Render env `FILES_S3_BUCKET` is set; endpoint/keys default to BACKUP_S3_*; `FILES_S3_PREFIX` default `files/`, `FILES_CACHE_MB` default 400). Every 10 min (first at +1 min) each `platform-media/<shop>/<file>` older than 10 min is PutObject to R2 and recorded in the new additive table `file_store(key,bytes,stored_at,used_at)`. While the local copy is over the cache size, the least recently used files that R2 has (and `.opt.webp` variants) leave the disk. `ensureLocal(path)` fetches a file back from R2 before it is read. Hidden learning folders (.photo-looks, .scan-examples) and scene/splash stay local.
- Readers wired: images (variants), spreadsheets (Range still from the local file), receipts, receipt OCR, photo search learning (`ensure` option), Drive photo copy (`ensure` option), shop app icon (logo fetched back for the next request). Deletes: file discard, replaced spreadsheets and shop delete remove the R2 copies. Also: the unused BiRefNet download (224 MB) is deleted on plans under 3.5 GB.
- Backups/Drive: daily archives now contain only the files still on the disk; R2 keeps every file (and Drive keeps photo originals). Not verified against real R2 (owner must create the bucket and set the env); tests use a fake R2. Node 22 check + 444/444.

### 1.1.281: Scanner learns from the shop owner's confirmations; labels read while scanning (Claude)
- Owner asked how to make scan AI better and approved "1 + 2" (incl. storing confirmed scans).
- #1 `lib/photo-search.js`: `addExample(shop, product, image)` saves a 640 px JPEG in `media/<shop>/.scan-examples/<product>-<id>.jpg` (newest 6 per product), and `photos()` adds them as extra photos (`scan:true`) of active products, so both the look and the upright-part modes learn them. They are left out of "photo N of M" (`learned:true` instead) and of Similar parts. No DB schema change. Route `POST /api/platform/store/:slug/scan-example?product=` (raw image, 30/min): shop owner or GearHub owner only (403 otherwise). `public/photo-scan.js`: after a result, the shop owner (me.isOwner or me.shop.id = store id) sees "✓ ဒါမှန်တယ် / This is right" under the strip (pick another with ˄ ˅ first); it sends the answered camera frame; reason text says "matches a scan you confirmed earlier".
- #2 the live scanner sends a 1280 px frame to the existing `/read-label` (OCR) from 1.5 s and every 3.5 s; a Part No./SKU match stops the scan with that product (label reason).
- Built-in browser on live POLESTAR via test proxy (mocked owner/answers, gallery picture): button shown for the owner, POST to scan-example?product=277, "✓ Learned"; hidden for a visitor; 375 px: full-width button, no overflow. Tests: addExample learning (J71-33 first, learned, higher score, newest 6, not in Similar), owner-only route, auto-label. Node 22 check + 439/439. Live OCR load during scans not measured (one OCR at a time on the server).

### 1.1.280: Background removal uses measured memory needs; BiRefNet only on 4 GB plans (Claude)
- 1.1.279 live, Remove background still failed after ~10 s on the 2 GB plan (pump and a simple sensor photo). Measured one helper run here with bg-worker.js session options: U²-Netp peak 275 MB, silueta 520 MB (0.6 s), BiRefNet 2046 MB (18 s; fixed 1024 px input, smaller sizes rejected). The old guesses (150 MB / 300 MB / 1 GB) let BiRefNet start; it alone fills 2 GB, so Render restarted the server.
- `lib/bg-remove.js`: needs 300 MB / 550 MB / 2.1 GB; `NEED_MEMORY` 3.5e9, so the 2 GB plan never loads or uses BiRefNet (silueta). The BiRefNet file already downloaded on the live disk (224 MB, `DATA_DIR/models`) is left unused. Local run on a shop photo: silueta, 0.6 s. Node 22 check + 437/437.

### 1.1.279: Remove background picks its AI by the container's free memory (Claude)
- Owner (Render 2 GB): Edit photo → Remove background failed after ~10 s with "The server is busy" (the client's text for a non-JSON ≥500, i.e. the server restarted — the route itself always answers JSON). Cause in `lib/bg-remove.js`: BiRefNet (~1 GB while working) was chosen whenever the plan had ≥1.8 GB and the model was downloaded, without checking what was in use (main server + DINOv2/OCR, the scan cut-out helper ~220 MB, photo learning).
- Now free memory = cgroup `memory.max − memory.current` (all processes; falls back to this process's RSS), less 150 MB spare: BiRefNet only with ≥1 GB room, silueta with ≥300 MB, else U²-Netp. Not verified on live (no memory metrics or logs here); if it still fails, the next step is to stop the scan helper before BiRefNet runs.
- Tests: photo-editor pins updated on purpose + new 1.1.279 test. Node 22 check + 436/436.

### 1.1.278: Backups clean up after a cut-off run (Claude)
- Owner: is the Render disk full? Live /api/storage: app data 4.0 GB of 5.25 GB (1.18 GB free); shops only ~0.44 GB (POLESTAR 352 MB, kaizen 86 MB, treebird 3 MB). Owner console: last successful backup 2026-10-30, every later one failed at stage disk-space (ENOSPC).
- Cause (code): `lib/backups.js` removes its `.stage-*` copy of every photo and the `*.partial` archive only in `finally`; a restart mid-backup (deploy, out of memory) left them for ever, and `makeRoom()` only deleted finished `.tar.gz` files. Now `removeLeftovers()` runs before every backup (one backup at a time), and start() runs a backup at once because the last success is old, so live cleans up at the first start of 1.1.278. Not verified on the live disk (no shell access): the leftovers are the only writer found that matches ~3.5 GB.
- Test in backup-disk.test.js. Node 22 check + 435/435.

### 1.1.277: Scanner — look-alike parts decided by the average of 4 frames (Claude)
- Owner (live 1.1.276): scanning the K5V140 J71-33 shaft first showed K3V140 PSM-V-30, the next scan J71-33. Cause in `public/photo-scan.js`: two frames ≥80% with the same top product ended the scan even when the second product was within ±0.005 (J71-33 and V-30 both ~0.82), so two lucky frames decided.
- Now when the top two are within `CLOSE=0.02` the streak rule does not stop; scores are added up per product and after `AVERAGE_FRAMES=4` the best average is shown (with the existing "Closest · look alike, check ˄ ˅"). Clear matches still stop after one frame. Thumbnails guarded when a frame has no picture.
- Built-in browser on live POLESTAR (local scanner via test proxy, fake camera, scripted answers): V-30 wins frames 1–2, J71-33 frames 3–4 → shows DRIVE SHAFT(R) PSM-J71-33 after 4 frames (3.3 s); a clear 0.86 vs 0.79 match → Best match in 2.2 s. Tests: tag/streak pins updated on purpose, new 1.1.277 test. Node 22 check + 434/434.

### 1.1.276: Photo search — shape tolerance and best-2-photos score (Claude)
- Owner: after 1.1.275 went live, the J71-33 scan still came out 2nd (live 10:13–10:30 UTC: PSM-V-30 0.823, PSM-J71-33 0.821; J10-39 scans right). Cause: 1.1.275 was measured with one shop photo per product; live POLESTAR has 59 photos for its 8 shafts. The scan's shape (long÷short 7.35) is within ~5% of both J71-33 (6.9–7.1) and V-30 (7.2), yet any difference cost points.
- `lib/photo-search.js` (parts mode only): shape differences up to 8% (`SHAPE_FREE`) cost nothing, larger ones cost `SHAPE_WEIGHT=1` × the rest; a product scores the mean of its best 2 photos (`BEST_PHOTOS`). Stored part vectors unchanged, so no relearning after deploy.
- Eval on all 59 live shaft photos (scratchpad eval of 40 variants): 3/3 right (J71-33 +0.005 over V-30, J10-39 +0.067/+0.072); 1.1.275 settings 2/3. End-to-end with createPhotoSearch on the same photos: 3/3. Node 22 check + 433/433.

### 1.1.267: Excel search critical download and repeated search (Codex — in review)
- Owner: optimize Excel search; preserve the real viewer and both search modes. Branch `codex/excel-search-speed`; PR #346: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/346. No merge/deploy.
- Files: new `public/excel-zip.js` and `public/excel-search-index.js`; `excel-map.js`, `excel-search.js`, `excel-library.js`, `sw.js`, `index.html`; release manifests, focused Excel/version tests, mailbox/log. No API or database changes.
- Existing UUID spreadsheet URL supports Range. Read ZIP footer/directory, metadata concurrently and only the requested sheet; full-response/unsupported-Range/offline fallback. Do not cache 206 as a whole file. Defer offline full download until workbook/sheet work finishes. Reuse sparse normalized search text in a Worker (fallback on failure), share pending sheet parsing, yield row processing, set row filter before render, omit owner/import work for embedded search, cancel stale queries and refresh after upload.
- Node22 check + tests 427/427; touched browser JS syntax and diff checks passed. Actual local seller shop Chrome 375/1280: both modes, result counts, no-match, clear and folder; normal runs had no console errors and visible cells/counts matched baseline. Owner fixture cell/row copy, import panel, new-upload index and offline search/INV passed. Expected network failures when offline and one obsolete-file 404 during replacement were observed; no uncaught JS exceptions.
- One controlled 375px 1.6Mbps/150ms/CPU4 comparison, prewarming/full offline prefetch disabled equally to isolate first query: `seal` 24.510s → 11.464s; prepared `seal` 0.905s → 0.402s; exact `300426` 0.779s → 0.276s. Normal local prepared queries ~0.48s → 0.26–0.29s. Fresh critical workbook members 3,447,284 → 757,069 bytes; all six XML hashes match. Full offline copy continues later; no claim of total bandwidth reduction. Not live/real-phone results; no 1–3s slow-network guarantee. XML DOM parsing remains on the browser thread with chunked row processing.
- Local evidence only: `/private/tmp/excel-speed-review/` (results, range hashes, screenshots, reproducible harnesses). Pre-existing untracked `.claude/` and `public/zz-real.xlsm` excluded.

### 1.1.275: Look-alike parts — compare the parts upright, with their shape (Claude)
- Owner (live 1.1.273/274): a DRIVE SHAFT(R) PSM-J71-33 scan on grass was answered wrong; "the model is still weak, make this the best now" (label/SKU reading later).
- Eval set from the owner's screenshots (tests/fixtures/photo-scan/shafts): 3 real scans (2 × PSM-J10-39, 1 × PSM-J71-33) vs 5 look-alike shafts (J10-39, J71-33, R220, V30 Short, V31 Long). Methods tried: cut scan only (live) 2/3 first; cut both 3/3 but J71-33 lost to V31; + upright turn + shape term 0.3 × |log(long÷short ratio)| → 3/3 first with the widest margins (0.087 / 0.057 / 0.035). Upside-down matching and 3-segment matching were worse.
- `lib/object-crop.js` partView(): silueta/U²-Netp mask → part on white, turned so the long axis (mask PCA) is upright, trimmed; returns { jpeg, aspect }.
- `lib/photo-search.js`: learnParts() (after learn(); in warm() too) stores each shop photo's part look + aspect in `.photo-looks/<id>.dinov2s-part.f32` (385 floats). When a shop's parts are ready, ranked() scores part·part − 0.3·shape (view 3); until then the 1.1.273 way, and learning is kicked off in the background. ~1 s per shop photo, once (≈15–20 min for ~1000 photos after the first deploy, in the background; scans work meanwhile).
- Test: the 3 scans each find their own SKU first. Node 22 check + 433/433. Only 3 labelled scans — more owner scans with SKUs would let us tune further.

### 1.1.274: Photo scan — decide sooner, smaller frames, show server time (Claude)
- Owner (live 1.1.273, Render Standard): right product DRIVE SHAFT PSM-J10-39 found, 84% vs next 82%, "found in 7.7 s · 4.0 s per photo". Locally search() is ~1.0 s per frame on 1 core (silueta cut ~0.9 s + DINOv2 ~0.1 s), so ~3 s of the 4 s is the phone's upload/network and the queue.
- `public/photo-scan.js`: a part ≥ 80% alike on top twice in a row is taken (with its look-alikes); below that three times. Frames 384 px, JPEG 0.75 (was 448/0.8). The result shows "(server x s)" next to "s per photo".
- `lib/platform.js` photo-search route: `X-Scan-Ms` response header (server time); the JSON body is unchanged.
- Node 22 check + 432/432; search() timing measured with the real models (1 core): ~1.0 s, two at once 2.1 s.

### 1.1.273: Photo search compares the part alone, not the background (Claude)
- Owner: "I want the part exact — don't remember the background, remember only the part." Shop photos are parts on white; scans are parts on grass/tables, and the background pulled the look away.
- New `lib/object-crop.js` + `lib/cut-worker.js`: the scan picture is cut out with U²-Netp (512 MB plan) or silueta (≥1.5 GB, Render Standard 2 GB since 2026-11-21; owner scans 0.74/0.78 vs 0.71/0.73) (320 px) in a persistent forked helper (it briefly needs ~220 MB; main server RSS stays ~110 MB in a 10-scan loop), the part is put on white and cropped to it (8% margin). If no single part stands out (<1% or >85% of the picture) or the helper fails/takes >10 s, the old views (whole + middle 0.7 + middle 0.5) are used. One cut at a time; helper stopped after 60 s without scans; it never keeps the server or tests alive (unref'd channel).
- `lib/photo-search.js` ranked(): with a part → only view 3 (the part) is compared. `public/photo-scan.js`: reason says "(the part only, background removed)" for view 3.
- Measured on the owner's real scans of the Drive Shaft on grass vs the shop photo: right product 0.69/0.65 → 0.71/0.73, unrelated product 0.21/0.15 → 0.20/0.14. Cut ~0.45 s per frame here (1 core); expect ~1 s on Render 0.5 CPU. Fixtures tests/fixtures/photo-scan/ (owner's photos, small); new test: the cut leaves almost no grass and the shaft wins by view 3.
- Risk: on the 512 MB plan helper + server are close to the limit during a scan; if the helper is killed the scan silently falls back to the old views.
- Node 22 check + 432/432.

### 1.1.272: Photo scan overlaps frames (Claude)
- Owner after 1.1.271: "9 seconds, still slow; sometimes wrong". Each frame waited for its answer before the next was taken, so the live round trip (phone upload + Render) was paid 3× for look-alikes.
- `public/photo-scan.js`: tick() takes a frame every 350 ms with up to 2 requests on the way; answers are handled in answer() (same rules: quick / twice / streak 3 / 8 s limit). Frames are 448 px JPEG q0.8 (was 640/0.85). The result line shows the average round trip ("· 2.5 s per photo") so the owner's screenshot tells where the time goes.
- Wrong answers: the three Drive Shafts look almost the same to the model; the list with ˄ ˅ shows the look-alikes. More photos per product from other angles (and on plain background) help; nothing else changed on the server.
- Checked: fake camera + API delayed 2.5 s: clear 3.1 s (unchanged), look-alikes 8.6 s → 3.5 s, none 8.2 s; no errors. Node 22 check + 431/431.

### 1.1.271: Faster photo scan, no small box to aim at (Claude)
- Owner (iPhone, Drive Shaft): "found, but very slow; fitting the part into the box is awkward — scan the object in the middle by itself".
- Cause of the wait: the shop has three look-alike shafts (Drive Shaft / Drive Shaft (R) / Drive Shaft (Long)), so the lead over the next product stayed under 3% and no frame counted as sure until the 15 s limit. Server time is small (DINOv2 ~50 ms per view locally, 3 views per frame).
- `public/photo-scan.js`: QUICK — score ≥ 0.75 with a 5% lead is taken from one frame; STREAK — the same product on top (≥ 0.60) in 3 frames in a row is taken and shown with its look-alikes (˄ ˅); limit 15 s → 8 s, then likely()/No match as before.
- `public/style.css`: the scanner frame is most of the screen (88vw × 64vh) with a small centre dot; the server already looks at the whole picture and two closer views of its middle, so the part only needs to be roughly in the middle.
- Tags photo-scan.js / style.css 1.1.271 (index.html, admin.html style.css, sw.js). photo-scan tests updated on purpose.
- Checked: fake camera + stubbed API in Chromium 390: clear match 0.6 s, three look-alikes 1.1 s (˄ ˅), nothing alike → No match at 8.1 s; no errors. Node 22 check + 430/430. Real phone/network not measured.

### 1.1.270: Photo search shows the alike products instead of No match (Claude)
- Owner (iPhone, shaft part): scanner said "No match found — two products look almost the same (82% and 79%)" although the part is in the shop. `public/photo-scan.js`: new `likely()` — after 15 s (live) or for a gallery photo, if the closest is ≥ 60% alike it shows the products ≥ 50% (up to 3) with ˄ ˅ and the label "Closest · N look alike, check ˄ ˅"; below 60% it still says No match. Tag photo-scan.js 1.1.270 (index.html + sw.js).
- photo-scan tests updated on purpose (tag, likely()). Checked: stubbed API 82/79/40 → 2 shown with ˄ ˅; 45/40 → No match; no errors. Node 22 check + 429/429.

### 1.1.269: Camera allowed for the photo scanner (Claude)
- Owner (Android app, scan button): "Camera not allowed. Choose a photo instead." Cause: server.js sent `Permissions-Policy: camera=()` on every page (security headers commit 7702b3a), so browsers refused getUserMedia before asking. The live scanner could never open a camera (any phone).
- `server.js`: `camera=(self)` (own pages only; frames from other sites still blocked); everything else unchanged. Tests: new camera-policy test; integration test header check updated on purpose.
- Checked: real server in Chromium with a fake camera — before: getUserMedia NotAllowedError, after: OK. Node 22 check + 428/428. After deploy the phone may still ask "Allow camera?" once; if the owner pressed Block before, allow it in the app/site settings.

### 1.1.268: Settings top picture closer to the owner's picture (Claude)
- Owner: 1.1.266 "not the same". Now one drawn SVG picture (green sky with a light glow at the top right, fluffy clouds at the right / centre / left, a lime band rising to the right, then the page colour; a dark-mode variant). It is used as `center bottom/cover` on the Settings hero; the hero is 134px tall. The Admin Dashboard pill is smaller, with a dark green fill and a lime border.
- Owner: still not the same → the banner now IS the owner's picture: `public/images/settings-banner.jpg` (851x242, 21 KB) cut from it with the status bar removed and the POLESTAR logo / divider / pill painted out (row interpolation + feathered blur). Each shop's logo tile and the owner pill are drawn on top as before. Dark mode keeps the drawn SVG. Phones: compact rows like the picture (60px rows, 44px icons, 15.5px titles, 11px navy help text, smaller pills/switch, 31px title).
- Owner: the right cloud did not match. The banner image is now 851x293 (status-bar text painted out, crop from y=17) so 'cover' fits the width on 360–390px phones and nothing is cut at the right; on phones the logo tile is 72px and the pill smaller (14px text, 20px crown) like the picture, so the right cloud shows. Asset ?v=1.1.268b.
- Not possible here: the owner's picture shows green behind the phone status bar (the app keeps its normal top bar).
- Checked: hero element screenshots at 390/360 (owner and visitor), no errors. Node 22 check + 427/427.

### 1.1.266: Settings top picture = green sky, clouds, lime wave (Claude)
- Owner sent a picture: the Settings navigation background should look like it; "do nothing else".
- `public/settings-design.css` only: `#profile-view.settings-new>.settings-profile-hero` gets a CSS background (!important over the inline shop picture): wave SVG (lime #d7ee3c / green / page colour; dark-mode page colour variant), cloud SVG at the right, green radial gradient. min-height 150px, padding-bottom 40px. Data-URL '#' encoded as %23. Logo tile and owner Admin Dashboard pill unchanged. Tag settings-design.css 1.1.266 (index.html + sw.js).
- Checked: demo shop Settings at 390, 360 and 1280, no errors. Node 22 check + 419/419.

### 1.1.265: Popular categories show the real item count (Claude)
- Owner's Play Store screenshots: every Popular categories card on POLESTAR's Home said "0 items". Seller shops' categories carry no product_count, and the card printed `c.product_count||0`.
- `public/store.js` renderPopularCategories: categoryTotal counts products in the category and all its subcategories (recursive, cycle-safe), and the card shows that number (sorting already used it). Tags: store.js and smart-search.js 1.1.265 (index.html + sw.js; free-ai test pins them equal, updated on purpose).
- Play listing: 8 phone screenshots 1080x1920 made from the owner's Android/iPhone shots (scratchpad playstore/screenshots). Retake the Home shot after this deploy so it shows real counts.
- Checked: demo seller shop with Electrical > CAT > E305 + Pumps → Electrical=4, Pumps=1 items; no errors. Node 22 check + 418/418.

### 1.1.264: Phone admin dashboard fits one screen on Android like iPhone (Claude)
- Owner (Android photos vs iPhone): Android dashboard ran below the screen and its text looked thin. 1.1.263's 36px stat padding + 2-line labels had also made the iPhone stats taller (154px).
- `public/site-admin.css` (≤480px): stat padding-bottom 30px, no forced 2-line label, big menu cards min-height 150px. ≤380px (Android 360): 2-line labels kept so numbers line up, smaller stat icon (38px), numbers 22px (`:not(.stat-0)` — the Total sales card keeps its compact ::before value; without it the hidden full value showed twice), menu cards 116px with 46px icons.
- `public/style.css` body font: Inter, **Roboto**, Noto Sans Myanmar, … Android has Roboto with real bold weights (the old fallback rendered Latin thin); iPhone/Mac have no Roboto, so they are unchanged.
- Tags: style.css 1.1.264 (index.html, admin.html, sw.js), site-admin.css 1.1.264 (admin.html).
- Checked: seller admin (demo) in Chromium. 390x844 → last card bottom 815; 360x760 (Android UA) → 750; numbers above the arc; PC 1280 unchanged (toggle 84px), no errors. Node 22 check + 417/417. Not on a real Android phone.

### 1.1.263: Settings design fixes for Android (Claude)
- Owner: iPhone OK, Android not. On the Android phone (viewport ≤380px) an old style.css rule moved Light/Dark and English/မြန်မာ under the text; "Create new shop" / "My shops" (GearHub only) kept old icons; the subtitle still said "payment details" on both phones. The cause: a shop's saved texts (site.translations) override the default.
- `public/settings-design.css`: ≤380px rows use `42px 1fr auto`, the segment is put back in column 3 / row 1, with smaller pills and icon. `public/settings-design.js`: icons for create-shop-action / my-shops-action; an old "payment details/information" (or Myanmar ငွေပေးချေမှု) subtitle is replaced on the page only. Saved data is not changed.
- Admin dashboard on Android (owner photo): at 360px "Pending orders" / "Active products" wrapped to 2 lines and the number sat on the coloured arc. `public/site-admin.css` (≤480px): stat cards are a column with 36px bottom padding, labels get 2 lines of room (min-height 2.5em) so all 4 numbers line up, number weight 800. Tag site-admin.css 1.1.263 in admin.html.
- Checked: GearHub store as owner in Chromium at 360 and 390 (Android UA). Settings: pills beside the text, no sideways scroll, new icons, subtitle replaced, no errors. Node 22 check + 416/416. Not on a real Android phone. Admin at 360/390/430: the 4 numbers have the same top and ~12px above the arc.

### 1.1.262: Settings in the owner's new design (Claude)
- Owner sent a picture of the Settings page they want; bottom navigation stays as it is.
- New `public/settings-design.css` + `public/settings-design.js` (index.html after install-guide.css / settings-alerts.js, both in the sw.js SHELL). Only `#profile-view.settings-new` is styled. Changes: the top picture gets a green wave and a green bottom tint; the logo sits in a white rounded tile. For the shop owner or GearHub owner (/api/platform/me, same check as settings-alerts.js) the name is replaced by a divider and a gold-outlined "👑 Admin Dashboard" pill, and the picture links to /shops/<slug>/admin (GearHub: /admin.html). Visitors keep the name. No eyebrow; big "Settings"; every row is its own white rounded card with a soft shadow. Colour SVG icons per row (palette, A/文, share, bell with the count badge, phone, server, calendar, refresh, headset, info). Light/Dark and English/မြန်မာ are separate pills, green when chosen (the old sliding ::before is hidden). Green switch, green storage bar, light-green Offline success / Active chips, "Server Storage". Phones: row grid first column 50px.
- `public/site-content.js`: settingsDescription en "Manage app preferences and system details.", my "App နှင့် စနစ်ဆိုင်ရာ ပြင်ဆင်ချက်များ" (tag 1.1.262 everywhere).
- Owner follow-up: the navigation background picture stays exactly as before (no green wave/tint; only the logo tile and owner pill), and Add to Home Screen must show everywhere. `public/app-install.js` no longer hides the row inside an installed app; there a tap copies the store link (/shops/<slug>/ or /index.html) and shows 'open Safari/Chrome, paste, Add to Home Screen'. `public/updates.js` no longer hides it on iPhone apps. When app-switch's "Create <shop> app" row is present, Add to Home Screen is hidden (CSS :has) so the two do not repeat. Tags app-install.js/updates.js 1.1.262 (index.html, admin.html, sw.js); keep-category-draft test updated on purpose for the updates.js tag.
- Checked: demo shop in Chromium 390 (owner, visitor, dark) and 1280, no errors. Node 22 check + 415/415. Installed-app emulation (Android, 390): row shown, tap copies the link and shows the steps; inside another shop's app only "Create <shop> app" shows. Not tested on a real iPhone.

### 1.1.261: Account deletion page for the Google Play listing (Claude)
- Owner: the third-party Play publisher asked for the listing items, including an Account Deletion URL (Play requires one). Privacy and Terms already exist at /policies.html#privacy and #terms.
- New static `public/delete-account.html` (no scripts, inline styles allowed by the CSP): how to request deletion (Settings → Contact us / 09-766472432, give the Gmail and shop name, deleted within 30 days), what is deleted and what is kept (orders up to 90 days, backups within 30 days). Test `tests/delete-account.test.js`.
- Listing kit for the owner (not in the repo): scratchpad playstore/ — app-icon-512.png (public/icons/skyshop-512.png), feature-graphic-1024x500.png, play-store-listing.txt (name, short/full description, category, URLs, App access text, Data safety answers). Screenshots: crop the owner's real Android screenshots to 1080x1920. Support email and the reviewer test Gmail must come from the owner.
- Checked: page served 200 text/html, Chromium 390/1280 without errors or sideways scroll. Node 22 check + 413/413.

### 1.1.260: No "Ks" under Total sales on the phone admin (Claude)
- Owner (iPhone admin dashboard): remove the "Ks" under the Total sales number.
- `public/site-admin.css` (phone rule only): `#dashboard .stat-0 h2::after` no longer shows "Ks". The 535K value is unchanged; PC still shows "… Ks" in the number as before. Tag site-admin.css 1.1.260 in admin.html (not in the SW shell).
- Checked: local store at 390, the Total sales card shows only the number; 1280 unchanged; no errors. Node 22 check + 412/412.

### 1.1.259: Phone admin dashboard shows one panel at a time (Claude)
- Owner (iPhone): with Product Inventory open, opening Product categories left Inventory open below it. Wanted: opening another card closes the one before.
- `public/admin.js`: new `closeOtherMobileDashboardPanels(id)` runs in the existing dashboard toggle click handler, before the panel is positioned, on phones (≤800px) only. When a panel opens it hides every other open panel in `mobileDashboardDetailIds` (inventory, orders, low stock, product form, categories, appearance, confirmed, cancelled, deleted), sets their toggle to aria-expanded=false / ＋ and moves them back home. Nothing is reset (a half-filled product form keeps its values). PC is unchanged.
- Checked: local store in Chromium. At 390: Inventory → Categories → Orders → Recycle Bin, each time only the last one is open; no errors. At 1280 the behaviour is unchanged. Node 22 check + 412/412. Not tested on a real iPhone.

### 1.1.258: Swipe products and orders into the Recycle Bin, with a red border, arrow and bin (Claude)
- Owner: products could already be swiped left to delete, orders could not, and nothing showed what would happen. Wanted: pressing a card gives a red border and a right-to-left arrow (only while pressed); dragging opens a bin at the left corner; the card goes into the bin.
- New `public/swipe-bin.js` (admin.html, after order-detail.js): product cards (`[data-mobile-product-id]` → POST /api/admin/products/<id>/trash) and order cards in Orders & payment (`#orders-table [data-order-open]` → DELETE /api/admin/orders/<id>, the existing "move to Deleted orders"). Hold 250 ms or start dragging left → red outline + "← Bin" pill on the card + a red bin at the card's left edge. The lid opens as the card follows the finger; past max(72px, 30% of the width) it is ready. On release it asks once (same as before); OK → the card shrinks into the bin, then the API is called and the list is refreshed. Vertical scroll cancels; a swipe never opens the order. Touch only; PC is unchanged.
- `public/admin.js`: the old inventory swipe handler was removed, so a product is not moved twice. `tests/public-syntax.test.js`: the category-swipe regex had matched only because of that old handler; it was split on purpose (the category swipe is unchanged). New `tests/swipe-bin.test.js`.
- Checked: local GearHub store (SEED_DEMO, 2 orders) in Chromium at 390 with touch (CDP touch events). Product swipe → confirm → trashed_at set; a short swipe does nothing; order swipe → confirm → status deleted, detail not opened. At 1280 an order click still opens its detail. No errors. Node 22 check + 411/411. Not tested on a real iPhone/Android.

### 1.1.257: "Create GearHub app" in GearHub's own Settings inside another app (Claude)
- Owner: inside the SkyShopMM app, shop Settings had "Create <shop> app" but GearHub's own store (/index.html) had nothing (app-switch.js only knew /shops/<slug>/, and the normal Add to Home Screen row hides inside an installed app). Owner wants it everywhere.
- `public/app-switch.js`: /index.html counts as the place 'gearhub' (name "GearHub", link /index.html). The row, sheet and Android copy-link steps are the same as for shops. Not shown when the app's own first page was the GearHub store.
- Checked: Chromium with an emulated installed Android app (opened at /platform.html, then /index.html) at 390 and 1280: the row is shown, the sheet says GearHub, Add app copies /index.html and the page stays; no errors. Node 22 check + 410/410.

### 1.1.256: Shop app icon fills the whole tile on Android (maskable icon) (Claude)
- Owner: Kaizen app installed from Chrome (1.1.255 steps worked). The icon showed the logo small inside a white tile with empty space; they want the picture edge to edge.
- `lib/tenant-install.js`: new `/shops/<slug>/app-mask-<192|512>.png` (shop logo/app icon resized with `fit:cover`, flattened on white). The shop and admin manifests list it as `purpose:maskable`, next to the existing round `any` icons, which are unchanged (iPhone/others). The icon revision includes `mask-1`, so installed apps get the new icon URLs. With no logo, no maskable icon is listed (neutral icon as before).
- Checked: Node 22 check + 409/409 (tenant-install test asserts the maskable icon and that its corner is the logo). Old/new preview rendered with sharp. Not verified on a real Android launcher. An already installed WebAPK updates its icon only when Chrome refreshes it (it can take up to a day; removing and reinstalling the app is quicker).

### 1.1.255: Android "Add app" copies the link and shows the Chrome steps (Claude)
- Owner (Android, SkyShopMM APK → Kaizen → Add app) on 1.1.254: white screen, then the same app reloaded Kaizen. The TWA runs on Chrome, and Chrome handles an intent aimed at itself inside the current tab, so no intent can open a real Chrome tab from the app. A new web app can only be added from the Chrome app.
- `app-switch.js`: on Android, "Add app" now calls preventDefault, copies `/shops/<slug>/?install=1` and shows three steps (open Chrome → paste → ⋮ Add to Home screen / Install app). The intent was removed. iPhone is unchanged (x-safari-https).
- Checked: Chromium with an emulated installed Android app at 390 and 1280: Add app → the page stays, the steps are shown, the link is copied, no errors. Node 22: check + 409/409. Not verified on a real Android phone.

### 1.1.254: "Add app" opens Chrome, never turns the same app into the shop (Claude)
- Owner (Android, SkyShopMM APK → Kaizen → Create app → Add app): no new app; the SkyShopMM app itself just moved to Kaizen. The Chrome intent had `S.browser_fallback_url`, and inside the app the fallback opened in the same app. Owner chose "open Chrome with one tap" (installing a separate web app without the browser is not possible on Android).
- `app-switch.js`: Android intent now `intent://<host>/shops/<slug>/?install=1#Intent;scheme=https;action=VIEW;category=BROWSABLE;package=com.android.chrome;end` (no fallback). If the page is still on screen 1.5 s after the tap (Chrome did not open / not installed), the link is copied and the sheet says how to finish (open Chrome, paste, Install).
- Checked: Chrome 390 (installed app emulated): tap Add app → page stays on the shop (no in-app navigation), help note shown; no console errors. Node 22: check + 409/409. Real Android not verified — whether Chrome opens from the TWA must be tested on the owner's phone.

### 1.1.253: Settings → "Create <shop> app" inside another app (Claude)
- Owner (SkyShopMM APK showing Kaizen): the APK icon/name stays SkyShopMM (fixed inside the APK — cannot follow the shop). Owner asked for a Settings button that makes the shop's own app with its name and logo.
- `app-switch.js`: when an installed app (SkyShopMM Play/APK app or another shop's app) shows a shop that is not its own (`gh-app-home` ≠ shop), Settings gets "📲 Create <shop> app" under Share My Store; tap → the existing add-app sheet (1.1.212/1.1.213): Android opens Chrome at /shops/<slug>/?install=1 (install bar → Install), iPhone opens Safari with the install helper. The automatic ask still happens once per session; "I have it" only stops the automatic ask, the row stays. Not shown in the shop's own app or in a browser. The final install needs one tap by the user (browsers never install silently).
- Tags: app-switch.js 1.1.253 in index.html, admin.html, platform.html, sw.js; tests/install-guide test updated on purpose.
- Checked: Chrome 390/1280 with standalone emulated + Android UA: GearHub page first then Alice Parts → auto sheet; Settings row "Create Alice Parts app"; tap → sheet with Chrome intent link; own app / plain browser → no row; no console errors. Node 22: check + 408/408. Not tested on a real Android/iPhone.

### 1.1.252: Zawgyi names → Unicode (Claude)
- Owner (alerts list showed the customer name as "▯◌◌▯"): the customer typed with a Zawgyi keyboard; phones use Unicode Burmese fonts. New `lib/zawgyi.js`: Rabbit Converter's zg2uni (MIT, copied with its licence) + a small Zawgyi detector (Zawgyi-only codes U+1060–1097/U+105A, ေ/ျ typed before the consonant, ္ as asat, U+1033/1034); `toUnicode` converts only text that looks like Zawgyi.
- Used for: new shop orders (customer, address in lib/platform.js) and GearHub orders (server.js) — stored as Unicode; shop order lists (/api/platform/shops/:id) and GearHub /api/admin/orders show old Zawgyi names as Unicode (display only, stored data unchanged); alert text (orderMessage) and the Notifications history (also old entries). `myanmar-tools` from npm was not usable (published without its build).
- Checked: `tests/zawgyi.test.js` (Zawgyi → Unicode; Unicode/English/numbers unchanged; alert body). Server-only; no browser run (no Zawgyi order in the demo). Node 22: check + 407/407.

### 1.1.251: New-alerts count on Settings → Notifications (Claude)
- Owner: show the number of notifications on the Notifications row too. `settings-alerts.js`: red pill `.alerts-count` next to "Notifications" = alerts newer than the last time this phone opened the list (localStorage `gh-alerts-seen:<slug|main>`); loaded with the row and when the app comes back on screen. Opening the list marks all seen, clears the pill; items that were new are tinted (`.is-new`). style.css 1.1.251.
- Checked: Chrome 390/1280 demo — 3 test alerts → pill "3"; open list → 3 tinted items, pill gone; switch still separate; no console errors. Node 22: check + 406/406 (1.1.250 test regex updated on purpose).

### 1.1.250: Notifications history (Claude)
- Owner: like Facebook — tapping Notifications in Settings shows every alert that came in, with time and text.
- `lib/order-push.js` send(): after each alert (order, test, new shop) appends {at,title,body,url,kind} to platform_meta `push-log:<scope>` (last 100; scopes shop:<id>, main, owner) — no new table; `history(scope)`. `lib/platform.js`: GET /api/platform/shops/:id/push/history (shop owner / GearHub owner) and GET /api/platform/owner/push/history (main + new-shop, newest first, owner only).
- `settings-alerts.js`: the Notifications row (not the switch) opens a bottom sheet "Notifications" (`.alerts-history…`, style.css 1.1.250): icon by kind (🛒 order, 🆕 new shop, 🔔 test), title, text, "5 min ago"/date; tap an item → its link (e.g. orders); ✕ / backdrop / Esc closes. History starts from this deploy (older alerts were not stored).
- Checked: `tests/owner-signup-alert.test.js` (owner history newest first incl. bodies; seller 403 on owner history; shop history; other seller 404); Chrome 390/1280 demo with stubbed push: switch tap does not open the sheet, row tap lists 2 test alerts with "just now", ✕ closes; no console errors. Node 22: check + 405/405.

### 1.1.249: Unseen-alerts number on the app icon (Claude)
- Owner (iPhone Home Screen): show on the app icon how many notifications arrived and were not looked at yet.
- `public/sw.js` push handler: keeps a count per app (Cache "gearhub-badge", key = registration scope + "__badge") and calls `self.navigator.setAppBadge(count)` (Badging API: iPhone iOS 16.4+ Home Screen apps with notifications allowed; Android installed apps). New `public/app-badge.js` (index.html + admin.html + SW SHELL): when the app is opened/visible/focused → `navigator.clearAppBadge()` and the count is reset.
- Checked: Chrome 390/1280 demo — 3 pushes delivered with CDP ServiceWorker.deliverPushMessage → stored count 3; app focus → count cleared; no console errors. The icon number itself cannot be seen in headless Chrome; real iPhone not verified. Node 22: check + 404/404.

### 1.1.248: No alerts card in the GearHub admin either (Claude)
- Owner: GearHub's Settings already has the Notifications switch (1.1.247) — remove the alerts card from the admin. `admin-extras.js` initAlerts returns at once for every admin (was: seller shops only). Phones already subscribed keep getting alerts (scope "main" unchanged).
- Checked: real server.js with admin password, Chrome 390/1280 — logged in, Frontend Appearance opened, no #order-alerts-card, no console errors. Node 22: check + 403/403.

### 1.1.247: Notifications switch in GearHub's own Settings (Claude)
- Owner (GearHub app Settings screenshot): no Notifications row there. `settings-alerts.js` now also runs on GearHub's main store (not /shops/…): shown only when /api/platform/me is the GearHub owner; uses /sw.js and new owner-only routes in `lib/platform.js`: GET/POST /api/platform/owner/push(/subscribe|/unsubscribe) on scope "main" (same as the GearHub admin's order alerts) and adds/removes the phone in `ownerPhones` (new-shop alerts, 1.1.246). Off key "gh-alerts-off:main" (same as admin-extras).
- Checked: `tests/owner-signup-alert.test.js` extended (seller 403, owner on → new-shop alert → off); Chrome 390/1280 demo /index.html with stubbed push: owner sees switch, Off → On → Off; alice (seller) sees no switch; no console errors. Node 22: check + 403/403. Real iPhone push not verified.

### 1.1.246: New-shop alert on the GearHub owner's phone (Claude)
- Owner: new shops (Kz, Siam Pi, IT UNITY) arrived and the owner did not know — alert on every new shop.
- `lib/order-push.js`: `notifyEndpoints(endpoints, message, key)` (same sender as order alerts; `notify` now shares `send`).
- `lib/platform.js`: `ownerPhones` = endpoints of phones the GearHub owner switched on in any shop app's Settings (stored in platform_meta `owner-push-endpoints`, max 20; no new table — push_subscriptions keeps one scope per endpoint). Added on /shops/:id/push/subscribe and on the status GET (so the owner's phone that is already On is enrolled the next time a shop page opens), removed on unsubscribe — only when the signed-in user is the GearHub owner. `alertNewShop` after POST /applications sends "🆕 ဆိုင်အသစ် / New shop · <name>" (email · Opened / Waiting for approval, opens /platform.html?view=console) to ownerPhones + GearHub main admin phones (scope "main"). Seller phones never get it.
- Checked: `tests/owner-signup-alert.test.js` (owner phone alerted, seller phone not, off → no alert). Server-only change, no page UI changed (no browser run). Node 22: check + 403/403. Real push to the owner's iPhone not verified.

### 1.1.245: Notifications switch — no extra white dot (Claude)
- Owner (iPhone screenshot): switched On, a white dot stayed on the left. The class name `.settings-switch` was already used by an older checkbox switch in style.css (line ~123: its own ::after knob at left:3px and track colour), which drew on our label too. The new switch now uses `.settings-toggle` (CSS block 1.1.242 + `settings-alerts.js`).
- Checked: Chrome 390/1280 push demo with stubbed push — On: green track, one knob on the right (screenshot); On → Off works; visitor: no row; no console errors. Node 22: check + 402/402.

### 1.1.244: Notifications switch only for the owner (Claude)
- Owner: only the owner should see Notifications; visitors must not. `settings-alerts.js`: the row shows only when /api/platform/me is this shop's owner or the GearHub owner (as 1.1.242); the 1.1.243 "sign in from the switch" path for visitors is gone. App sign-in handoff (app-login.js, /auth/claim) stays — owners sign in from the shop admin's "Continue with Google" card in the app.
- Checked: Chrome 390/1280 push demo — visitor: no row; owner after app sign-in claim: row shown; no console errors. Node 22: check + 401/401.

### 1.1.243: Login inside the installed app + Notifications switch for every user (Claude)
- Owner (iPhone, after re-adding the POLESTAR app): "asks to log in again — logging in does not work"; and every user's Settings must have the Notifications switch.
- Cause: an installed iPhone app has its own cookies; Google sign-in (out of the app's scope) runs in iOS's browser sheet, so the session landed in the sheet, never in the app.
- `lib/platform.js`: /auth/start also keeps the state in memory (`pendingLogins`, 10 min) with an optional `handoff` id from the app; /auth/callback accepts that server-side state only when it carries a handoff (cookie-less sheet), records `handoffs[id]=user` (15 min, one use). New POST /auth/claim {handoff} (CSRF) puts that user into the app's own session. Normal same-browser login unchanged. No DB change (in-memory, single Render instance).
- New `public/app-login.js` (index.html + admin.html, before tenant-admin/settings-alerts): `GearHubAppLogin.start()` (random handoff id in localStorage → /auth/start → Google) and auto-claim on load/focus/visibility + every 3 s while pending, then reload.
- `tenant-admin.js`: "Google login required" inside a Home Screen app shows a "Continue with Google" card (app-login) instead of going to /platform.html; browsers unchanged.
- `settings-alerts.js`: the Notifications row shows on every shop page for everyone: not signed in → switch starts Google sign-in; signed in but not the shop's owner → disabled with a note; owner → on/off as 1.1.242.
- Checked: `tests/app-login.test.js` (sheet without cookies finishes sign-in, app claims once, unknown/used handoff waits, state single use, plain login unchanged); Chrome 390/1280 on push demo: visitor sees switch + sign-in note, tap → Google page; app-started sign-in finished in a separate browser context, app claimed it on focus (signed in as owner, handoff cleared); no console errors. Not verified on a real iPhone (standalone mode cannot be emulated here). Node 22: check + 401/401.

### 1.1.242: Shop Settings — Contact us + Notifications switch (Claude)
- Owner: every shop's Settings gets "Contact us" 09-766472432, and the order Notifications move into Settings with an on/off switch.
- `index.html`: Contact us row (`a.settings-contact`, tel:09766472432) above About app, for every store. `tenant-store.js` fills shop phone numbers into `a[href^="tel:"]` — now `:not(.settings-contact)` so it keeps our number.
- New `public/settings-alerts.js` (loaded after back-nav): on /shops/<slug>/ only, and only when /api/platform/me is that shop's owner or the GearHub owner, a "Notifications" row with a switch (role=switch) appears under Share My Store. On = permission + subscribe on the shop's own service worker + POST /api/platform/shops/<id>/push/subscribe (CSRF from /me); Off = unsubscribe; state read from GET …/push?endpoint=. iPhone browser (not Home Screen app) / denied → switch disabled with a hint. Same "gh-alerts-off" key as before.
- `admin-extras.js`: seller shops no longer show the alerts card in the admin (`if(SHOP_SCOPE)return;` in initAlerts); GearHub main admin keeps it. Style: `.settings-switch` in style.css.
- Checked: demo copy with order push enabled (scratchpad demo-push.js; the plain demo has no push routes and 404s /app.webmanifest + /app-icon.png, which blocks the service worker — stubbed in the test) Chrome 390/1280: owner sees switch Off → On (subscription stored) → Off; visitor sees no switch; Contact us tel link on both; shop admin has no alerts card; no console errors. Push itself stubbed (headless has no push service). Node 22: check + 399/399.

### 1.1.241: Owner console Users — only people with a shop, user limit inside (Claude)
- Owner (iPhone screenshot of owner console → Users): people whose shop is gone still showed; and "how many users to accept" could not be found. `platform.js`: Users lists only users who own a seller shop now (`shopUsers`, shop name shown under the email); people without a shop are hidden, not deleted. The existing shop limit (`/owner/signup`, max shops = max sellers, + MB per new shop) now sits open at the top of Users ("User limit / user အများဆုံး"); summary "Users N / max". The separate "New shops" section is gone (same form/ids, same API). No server or DB change.
- Checked: demo owner console Chrome 390/1280 — bob (no shop) hidden, alice + "Alice Parts" shown, limit field present once, Save 10 → 12 stored; no console errors. Node 22: check + 398/398.

### 1.1.240: Shop link follows the shop name (Claude)
- Owner: the link must show the shop name, and change when the name changes; no other data may be touched.
- `lib/shop-alias.js`: `syncSlug(db,id)` gives a shop the link made from its name (same rule as new shops: lower-case Latin letters/digits joined by "-"; next free "name-2" when taken); names without Latin letters, or a link that already matches ("name" or "name-N"), keep their link. Only `platform_shops.slug` + the owner's `platform_applications.slug` change; every old slug goes to `settings.formerSlugs` (redirects as in 1.1.239). `syncAll` runs at start-up for every shop (replaces the one-off psm-test-shop rename). `PATCH /api/platform/shops/:id` calls `syncSlug` after saving the name and returns `slug`; `tenant-admin.js` then moves the admin page to /shops/<new>/admin.
- Deploy note: at start-up every live shop whose link does not match its name gets the new link (installed apps of those shops must be added again; old links redirect).
- Checked: `tests/shop-alias.test.js` (follow name, Burmese-only name kept, name-2 kept, rename back, other columns and settings unchanged, old links → current); Chrome 375 rename Alice Parts → Alice Motors: admin URL /shops/alice-motors/admin, store API 200, store title updated; 1280 rename back. (Demo server has no alias middleware — redirects tested with real server.js in 1.1.239.) Node 22: check + 397/397.

### 1.1.239: POLESTAR link /shops/polestar/ (Claude)
- Owner: the Share My Store link read skyshopmm.com/shops/psm-test-shop/ (POLESTAR was opened as a test shop); it must read POLESTAR. Owner approved changing the shop's link.
- New `lib/shop-alias.js`, wired in `server.js`: at start-up `renameOnce` changes only `platform_shops.slug` psm-test-shop → polestar (and the owner's `platform_applications.slug`), once, and only if "polestar" is free; the old slug is kept in `settings.formerSlugs`. `aliasMiddleware` (mounted before /api/platform and the shop pages): GET /shops/<old>/… → 302 to /shops/polestar/… (query kept); /api/platform/store/<old>/… is answered as the new slug (old cached pages, orders). Products, photos, files, orders, upload keys are by shop id — unchanged. No new tables/columns.
- Effects: the installed POLESTAR app (scope /shops/psm-test-shop/) should be deleted and added again from /shops/polestar/; a browser cart/offline copy kept under the old link starts fresh; Drive photo sweep moves the photos into a "polestar" folder (old folder left empty). Excel auto-upload uses the upload key — unaffected.
- Checked: `tests/shop-alias.test.js` (rename once, settings kept, redirects incl. /admin and query, API rewrite, skip when taken); real `server.js` with a seeded psm-test-shop DB → 302 to /shops/polestar/, store API 200 for both slugs, manifest scope /shops/polestar/; Chrome 390/1280: old link lands on /shops/polestar/, Share My Store link = /shops/polestar/, no errors. Node 22: check + 396/396.

### 1.1.238: Centred ✕ on the phone photo sheet (Claude)
- Owner (iPhone screenshot): the ✕ in the round close button was off-centre (the text glyph's own spacing). `style.css` (phones): the glyph is hidden (`font-size:0`) and the ✕ is two 16x2 px bars centred with `left/top:50%` + rotate ±45°. Markup/aria unchanged; PC unchanged.
- Checked: Chrome 390 @3x — ✕ centre 95.5,95.5 vs button centre 96,96 (px). WebKit is not installed in this container (Playwright webkit-2359 missing). Node 22: check + 394/394.

### 1.1.237: Bigger download parachute on phones (Claude)
- Owner (live 1.1.236 screenshot at 51%): the parachute was too small next to the bigger button. `style.css` (phone overlay only): parachute 24x34 → 40x57 px, falls from -72 px and lands on the bar (now 170 px wide, 5 px high), check mark 38 px, % label at the right. Animation logic in `store.js` unchanged; PC unchanged.
- Checked: Chrome 390 screenshots of downloading 40% / 100% and done (state set by script, no real download); no console errors. Node 22: check + tests.

### 1.1.236: Phone photo sheet — no side arrows, tray download icon (Claude)
- Owner (live 1.1.235 screenshot): remove the ‹ › buttons beside the photo (swipe still works) and use the tray download icon from their picture, a little bigger. `style.css`: phone arrow rules removed (the global `.gallery-arrow{display:none!important}` hides them again); download button 48 → 58 px; in idle the parachute drop is hidden and a new `.gallery-dl-icon` (arrow into a tray, `index.html`) shows; the download animation states are unchanged. PC unchanged (icon hidden there).
- Checked: Chrome 390 (arrows display none, icon white on the teal circle, card tap opens), 1280; no console errors. Node 22: check + 392/392. The demo server caches index.html — restart it after HTML edits.

### 1.1.235: Product photos on phones in the owner's design (Claude)
- Owner sent old vs new pictures of the product photo sheet. Phones only (≤520px): bold name, round grey close, SKU / Part No chips (`#gallery-ids`, filled in `renderGallery`), grey photo panel with round ‹ › arrows, "1 / 4" pill and a teal round download button on the photo (`galleryPlace()` moves `#gallery-count` + `#gallery-download` into the stage on phones, back under it on PC), four thumbnails per row with a teal edge, Similar parts with "See all ›" (more than 4; wraps them, "Show less") (`similar-parts.js`); tapping a card opens that product (owner asked to remove the "View ›" button). PC layout unchanged (chips and See all hidden).
- `store.js`/`smart-search.js` tags moved together to 1.1.235 (free-ai test pins them equal; test updated on purpose).
- Checked: Chrome 390 touch with stubbed products/similar API — chips, arrows (next → 2 / 4), See all/Show less, View opens that product, resize to 1000 moves count back; 1280 screenshot identical to main. No console errors. Node 22: check + 391/391. Not on a real iPhone.

### 1.1.234: Share My Store QR in the owner's design (Claude)
- Owner sent a picture (green card, shop name in white, QR on a white card with a light green edge, logo tile, link in a pill with a bag icon) and wants the logo to fill its tile. `index.html`: `.share-poster` wraps the name, `#share-qr` and a new `#share-poster-link`; `style.css` 1.1.234 block; `settings.js`: the logo is the shop's own `img[data-site-logo]` (the app icon only when there is none), drawn cover-fit in the tile; `makeQrPicture` draws the same design (1080x1140 PNG). Hint, link box, Copy/Save/Share unchanged.
- Checked: Chrome 390 touch (stubbed share → 1080x1140 PNG) and 1280 (download); the saved PNG and both screenshots decode with OpenCV to the shop link; no console errors. Node 22: check + 390/390 tests. Not on a real iPhone; the test logo was a product photo (live shops use their own logo).

### 1.1.233: Save QR image reaches Photos on iPhone (Claude)
- Owner (iPhone app, Settings → Share My Store → Save QR image): nothing was saved — the button was an `<a download>` to a GIF data URL, which an installed iPhone app does not put in Photos. `settings.js`: when the sheet opens, `makeQrPicture` draws a 1080 px PNG card (shop name, QR, link) and keeps it as a File; on a touch phone with file sharing the tap calls `navigator.share({files})` at once (iPhone: Save Image → Photos; Android: share/save); elsewhere it downloads the PNG. The old GIF link is the fallback until the card is ready.
- Checked: Chrome 390 touch with a stubbed share → `store-qr.png` image/png 56 KB shared; 1280 → `store-qr.png` downloaded, card renders (name, QR, link). Node 22 check + tests. Not on a real iPhone.
- Then (owner, WeChat-style): the shop's logo sits in the middle of the QR, on screen (`.share-qr-logo` img over the SVG, `style.css`) and in the saved PNG (white rounded box, 24% of the QR). QR error level raised to H so it still scans. The logo is the page's `apple-touch-icon` (each shop's own `app-icon-180.png`).
- Checked: Chrome 390/1280 — logo shown (52 px on a 240 px QR); the saved PNG and both screenshots decode with OpenCV to the shop link; no console errors. Node 22: check + 390/390 tests.

### 1.1.232: Similar parts scroll sideways on Android (Claude)
- Owner (Android): the Similar parts strip under a product's photos would not scroll. The strip's box grew to its content width (1144 px on a 390 px screen), so there was nothing to scroll; the gallery's `touch-action:none` did the rest. `style.css`: `.gallery-similar` width/max-width 100%, min-width 0; its row `width:100%`, `touch-action:pan-x`, `overscroll-behavior-x:contain`.
- Checked: Chrome 390 Android UA, 12 parts, real touch swipe via CDP → scrollLeft 247 (was 0, row 346 px wide). Node 22 check + tests.

### 1.1.231: Android shop Home asks to install the app (Claude)
- Owner (Android, treebird): the shop never asked to install its app. Our scripts call `preventDefault()` on `beforeinstallprompt` (app-install.js, install-guide.js), which also stops Chrome's own install bar, and since 1.1.213 the helper opens on Home only with `?install=1`. Chrome's installability check passes (no errors).
- `install-guide.js` `banner()`: on the shop Home page, Android only, not standalone, when Chrome offers install: a bottom bar (shop icon, "<name> app", Install, ×) 2.5 s later; Install calls the saved prompt (Chrome's own install box); × hides it 7 days (`gh-install-banner-off:<slug>`); `appinstalled` hides it. iPhone unchanged (no such event).
- Checked: Chrome 390 with Android UA + synthetic beforeinstallprompt → bar, Install → prompt() called, bar gone; iPhone UA → no bar; no errors. Node 22 check + tests. Not on a real Android phone.

### 1.1.230: Remove background works on the 512 MB Render plan (Claude)
- Live (owner, $7 plan 0.5 CPU / 512 MB): "Could not remove the background." Cause: silueta in the server process with ONNX Runtime's arena took +410 MB → the request died. Measured: silueta +410 MB (arena) / +190 MB (no arena); U²-Netp +310 / +50; server idle ~190 MB.
- `lib/bg-worker.js` (new): runs one model in a forked helper (`serialization:"advanced"`), arena/mem-pattern off, 1 thread, exits after each photo. `lib/bg-remove.js` picks best (BiRefNet, ≥1.8 GB) / fast (silueta, ≥300 MB free) / small (U²-Netp, `models/u2netp.onnx` restored); a helper stopped by a signal (OOM) is retried with small; 503 "short of memory" if that fails too. Parent RSS stays ~80 MB during a cut. Editor shows "The server is busy…" on 5xx.
- Checked: fast 1.5 s, forced small 0.8 s, bad model path → error; Node 22 check + tests. Not checked on the live 512 MB box.

### 1.1.229: BiRefNet when the server has the memory — Remove background finishes by itself (Claude)
- Owner: no hand work; Remove background must do everything, also the table inside the pump's pipe loop. Tested BiRefNet-lite (rembg release `BiRefNet-general-bb_swin_v1_tiny-epoch_232.onnx`, MIT, 224 MB, 1024 px): all 4 pump photos clean incl. the loop holes; ~25–40 s per photo here (4 CPU), peak RSS 0.6–0.9 GB with `enableCpuMemArena:false`/`enableMemPattern:false`.
- `lib/bg-remove.js`: two models — fast = silueta (repo), best = BiRefNet. Best is used only when the container memory limit (cgroup `memory.max`, else `os.totalmem`) ≥ 1.8 GB; the file is too big for git, so `prepare(dataDir)` downloads it once to `DATA_DIR/models/birefnet-lite.onnx` (size-checked, `.part` then rename; server.js calls it 30 s after start) and silueta is used until it is there. One photo at a time (queue). Response header `X-Bg-Model: fast|best`. Editor busy text says it can take up to a minute.
- The owner's Render plan/RAM is unknown to us (no dashboard access). If it is the 512 MB Starter, nothing changes (silueta); with ≥2 GB (Standard) BiRefNet turns on by itself after deploy. Disk: +224 MB of the 3 GB.
- Checked: module with no model → fast; with the model and 16.9 GB → best, p3 loop cleared (28 s). Node 22 check + tests.

### 1.1.228: Better background removal + Erase/Restore brush (Claude)
- Owner: our cut-out was much worse than an outside tool's. Compared on the owner's pump photos: U²-Netp (smudges, soft holes) < silueta (rembg, MIT, 44 MB) ≈ ISNet-general (88 MB fp16, 1024 px, ~1.1 GB RSS, 3.5 s — too heavy for Render). Switched to `models/silueta.onnx` (npm `@rmbg/model-silueta`, 5 parts joined); u2netp.onnx removed. `lib/bg-remove.js`: mask curve (0.25–0.65 → 0–1) for crisp edges without grey halo, lanczos upscale + 0.6 blur, `dropSpecks` clears separate patches <3% of the biggest, session released after 2 idle minutes. Local: ~0.5 s per photo (first ~1.6 s), RSS ~500–650 MB while working.
- Neither model removes background seen through closed loops (table inside the pump's pipe loop), so `photo-editor.js` adds a Brush row after Remove background: 🧽 Erase / 🖌 Restore (paints the original back), size slider, ↶ undo (6 steps); works with turn/straighten via the preview's inverse transform (`state.view`). The cut-out is now an editable canvas.
- Checked: real server + admin, Chrome 390: cut 2.5 s (first load), erase stroke turns the wood pixel white, undo brings it back, save gives `p3-edited.jpg`; no errors. Node 22 check + 385/385. Watch Render memory.

### 1.1.227: Product photos — one row + See more; Edit photo (turn, straighten, remove background, colour) (Claude)
- Owner (Edit Product, 9 photos): show only one row of cover photos with "See more"; add "Edit photo" beside Choose photos that can remove the background, change the background colour and straighten a tilted photo.
- `admin.js`: `fitCoverRow()` hides every cover option below the first row (row = options level with the first; ResizeObserver), "See more (n) ▼"/"See less ▲". `window.GearHubProductPhotos={list,replace}` — replace swaps a chosen file in the `images` FileList, or removes a URL photo from `imageUrls` and adds the edited file (so an edited URL photo moves to the end of the uploaded files); the cover choice follows it.
- `public/photo-editor.js/.css` (admin.html, sw SHELL): picker of the product's photos → editor canvas: ⟲/⟳ 90°, Straighten slider ±45° (auto-zoom so no empty corners), Remove background, background Original/White/Light gray/Black/Clear/any colour, Reset, Save photo (JPEG, PNG when Clear; ≤5 MB). Drive-only photos (no preview) cannot be edited until imported.
- Server: `lib/bg-remove.js` + `models/u2netp.onnx` (U²-Netp, Apache-2.0, 4.6 MB from npm `@rmbg/model-u2netp`) on onnxruntime-node + sharp; `POST /api/tools/remove-background` (raw image ≤8 MB, admin or platform session, CSRF, 20/min) returns a transparent PNG ≤1600 px. ~0.3–0.8 s per photo locally.
- Checked: real server.js + GearHub admin, Chrome 375 (2 per row shown, See more 5) and 1280 (all 7 fit one row, no button): pick Photo 2 → ⟳90 + 6° + Remove background (≈0.4 s) + Light gray → Save → `p2-edited.jpg` in place of Photo 2. Node 22 check + 384/384. Not tested in a seller shop on a real phone; quality on real photos depends on the model (owner's pump photo came out clean).

### 1.1.226: Excel link cells offer Copy / Go (Claude)
- Owner: the PHOTO column's Google Drive links did nothing. `excel-select.js`: tapping (or clicking) a cell whose text is a single http(s) URL selects it and shows a small dark menu above it — Copy (clipboard, then "Copied ✓") and Go ↗ (`window.open(url,'_blank','noopener')`); outside tap or scroll closes it. Other cells behave as before. Works in the search views and the folder viewer (same grid).
- Checked: Chrome 375 rows view: link cell tap → menu, Copy put the URL on the clipboard, Go opened a new tab with the URL; plain cell → no menu; no errors. Node 22 check + 381/381.

### 1.1.225: "ရှာတာပဲ" rows are the same viewer; select/copy in place, nothing opens (Claude)
- Owner: tapping a row in the search results opened the Excel viewer — it must not; select, drag and copy must work right there. `excel-map.js`: `rowFilter` in renderSheet + `GearHubExcelViewer.rows(set)` (tabs hidden while filtered; `home()`/`release()` clear it). `excel-search.js` rows view = `embed` + `rows(new Set([header,...hits]))` + `search(q)`, up to 200 hits; the box is sized to the drawn table (≤75% of the screen); my separate rows table and the row-tap-opens-viewer handler are gone. 1.1.224 deployed fine (owner's screenshot).
- Checked: Chrome 375: rows view shows 1,1225,1289,1327,1427 only, cell tap selects, row-number tap selects 8 cells, no modal; Excel view still 155 rows drawn, 1/4; folder viewer full screen with tabs; no errors. Node 22 check + 380/380.

### 1.1.224: "Excel လို" search uses the real Excel viewer; faster first search (Claude)
- Owner (night, wants it ready by morning): PART NO column too wide; keep every column/row at its original size; bring back drag-select, copy and row select from the Excel viewer; hide the keyboard's bar (it does nothing); make the app as fast as possible.
- `excel-map.js`: workbooks are read once per page (`loadBook` cache, shared with search); `openBook(b,sheetName,embedded)`; new `GearHubExcelViewer.embed(host,…)`, `search(q)`, `step(n)`, `release()` — the viewer section (grid, tabs, excel-select.js selection/copy/row select, zoom) is moved under the shop search bar for the Excel view and moved back to its panel for the folder button. `excel-search.js`: Excel view = `embed` + `search`, the bar's count/˄ ˅ call `step`; my own 1.1.216–1.1.220 grid is now only the "ရှာတာပဲ" rows list (table width = sum of the file's column widths). Enter (Search key) = next match + closes the keyboard; `enterkeyhint="search"`. The workbook is read on idle (`requestIdleCallback`, skipped with Save-Data) so the first search takes ~0.2 s instead of ~0.8 s.
- Keyboard bar (˄ ˅ ✓ above the iPhone keyboard): drawn by iOS Safari/web apps for every text field; a web page cannot hide it. ✓ closes the keyboard; ˄ ˅ only jump between fields.
- Checked: Chrome 375: Excel view 1/4 → ˅ 2/4 (141 ms), "seal" 1/238, row-number tap selects the row, folder viewer still full screen; rows view table 877 px = file widths, tap opens the viewer at the row; 1280 fine; no errors. Node 22 check + 382/382. Not on a real iPhone.

### 1.1.223: The bin eats the typed letters (owner's video); scan hides while searching (Claude)
- Owner's video (Delete button "the bin eats the label"): tap the bin → lid opens (260 ms), the typed letters jump one by one (first letter first, ≤120 ms apart, 560 ms flight with a small arc) into the bin, the bin fills, lid closes (300 ms), a ring runs once around the bin (760 ms) and fades; then the search clears (~3 s like the video). `excel-search.js` `eat(bin)`: letters are copied into a fixed `.bin-letters` layer over the input (input text hidden meanwhile), Web Animations; reduced motion clears at once. Scan is hidden again while searching (owner changed their mind).
- Checked: Chrome 375 frames every 150 ms (lid, letters, fill, ring), search empty afterwards, banner/nav back; no errors. Node 22 check + tests.

### 1.1.222: Searching hides the banner and bottom nav; bar at the top (Claude)
- Owner (iPhone): while searching, hide the bottom navigation and the top banner and keep the search bar at the very top. `style.css` (≤850px): `body.searching` hides `.home-navigation`, `.announcement`, `.mobile-bottom-nav`; `.mobile-search` is sticky at top 0 (safe-area padding); in the Excel view the page itself does not scroll (`html:has(...)`/body overflow hidden), only the sheet. `excel-search.js` fit() no longer scrolls the page when the bar is sticky. PC unchanged. Owner: keep the camera in the bar while searching — only the folder hides; `.search-tools` is `display:contents` and `order` puts count, ˄ ˅, camera, bin.
- Checked: Chrome 375 both views: bar at y=10, banner/bottom nav hidden, sheet 86→804 of 812, wheel scroll keeps the bar; cleared → banner and nav back; 1280 top nav unchanged; no errors. Node 22 check + 381/381.

### 1.1.221: New search bar; count, ˄ ˅ and bin in the bar (Claude)
- Owner's picture: white pill with a 2px green line and soft green glow, green scan icon, no magnifier; white tile with a filled green folder (index.html svg). While typing (`body.searching`) the scan and folder hide, the bar runs full width and ends with `.search-tools` (from `excel-search.js`): number found (Excel hits; "n/total" in the Excel view), ˄ ˅ (Excel view only, like the viewer's) and a bin that clears the search. The "Open in Excel" button and the count bar on the grid are gone; the grid fills down to the bottom nav.
- Checked: Chrome 375 both views (1/4 → 2/4, bin clears and brings scan/folder back) and 1280 (bar full width, count + bin); no errors. Node 22 check + 380/380.

### 1.1.220: Excel view is light on iPhone (Claude)
- Owner: search works but the app became very heavy. The sheet view drew every row (1400+ × all columns) on each search. Now `excel-search.js` keeps the row list in `win` and draws only 100 rows around the current match (`draw(i)`: 40 above, 60 below); scrolling near the top/bottom adds 60 more (`grow`, keeps the scroll position when adding above). ˄ ˅ redraw only when the next match is outside the drawn rows. Search waits 450 ms after typing in the sheet view. Count/˄ ˅ moved to the left corner (the right edge had the phone's back handle over the ˅).
- Checked: Chrome 375, 1428-row sheet: 100 rows in the page, ˅ 87 ms, wraps, scroll up/down adds rows; no errors. Node 22 check + 379/379. Not measured on a real iPhone.

### 1.1.219: Excel view choice moved into the files panel; sheet edge to edge (Claude)
- Owner: move "Excel · BC / ရှာတာပဲ / Excel လို" into the folder (Excel files) panel beside the search bar; the sheet must have no side gaps or outer frame, one piece like Excel. `excel-search.js`: the choice is a "ရှာရင် Excel ပြပုံ / Search shows" row injected after `.excel-library-help` (hidden while a workbook is open); the page shows only the grid (Excel view: count + ˄ ˅ sit on the right of the letters row). `style.css`: `.excel-results` is 100vw wide (calc(50% - 50vw) margins), grid has only top/bottom lines.
- Checked: Chrome 375 and 1280 — grid 0→viewport width, page has no sideways scroll, setting switches the view, count 1 / 4, products hidden in the Excel view; no errors. Node 22 check + 378/378.

### 1.1.218: "Excel လို" view hides the products and fills the screen (Claude)
- Owner: in the Excel view the products must go; it must look fully like Excel. `excel-search.js`: body class `excel-sheet-mode` while the sheet view shows (removed when the search is cleared or in "ရှာတာပဲ"); `fit()` scrolls the search bar to the top and sizes the grid to the rest of the screen above the bottom nav and the Open button. `style.css` hides `#products` in that mode.
- Checked: Chrome 375 (grid 164→658 of 812) and 1280 (172→729 of 800); rows view keeps products; clearing restores them; no page sideways scroll; no errors. Node 22 check + 377/377.

### 1.1.217: Search Excel — "ရှာတာပဲ" / "Excel လို" views (Claude)
- Owner: rows were too small; wants two modes beside "Excel · BC": only the matching rows (as before), and the sheet like Excel that jumps to the match with the rows around it visible. `excel-search.js`: mode switch (remembered in localStorage `gh-excel-search-mode`); sheet view draws every visible row (up to 4000), marks hit rows, outlines the matching cell of the current hit, scrolls it a third down under the sticky header, ˄ ˅ and "n / total"; taps do not open the viewer there (the button does, at the current hit). Cells use the file's font size and row heights (bigger); base font 16px.
- Checked: Chrome 375 with a 1428-row BC sheet: rows view 4 rows; sheet view 1428 rows drawn in < 1 s, 1 / 4 at row 1225, ˅ → 1289, ˄˄ → 1427 (wraps), view remembered after reload; no page sideways scroll; no errors. Node 22 check + 376/376.

### 1.1.216: Search Excel rows look like the sheet (Claude)
- Owner: the 1.1.215 cards were hard to read; show the rows like Excel, with the header, scrolling sideways. `excel-search.js` now draws a table: column letters, row numbers (sticky left), the sheet's header row (sticky under the letters), the sheet's column widths, fills and fonts; hidden columns/rows skipped; max-height 70vh, scrolls both ways. Tapping a row still opens the viewer at that row.
- Checked: Chrome 375/1280 with a BC sheet (green header, hidden column D, wide PHOTO column): page has no sideways scroll, grid scrolls (scrollWidth 1405 vs 343), row numbers and header stay put; row tap → viewer at that row. Node 22 check + 375/375.

### 1.1.215: Search also lists Excel rows (sheet BC) (Claude)
- Owner (POLESTAR): when searching, show the Excel file under the products; default sheet "BC". New `public/excel-search.js` (seller shops only): reads the first .xlsx/.xlsm that has a sheet named BC (else the first file's first sheet) once per page through `window.GearHubExcelViewer.sheet()`, lists up to 30 matching rows (hidden rows/columns skipped; column names = first row with 2+ filled cells) under `#products`; a row or "Open in Excel" opens the viewer on that sheet with the same search, at that row. `excel-map.js`: the file-open click is now `openBook(b,sheetName)`; `readSheet(sheet,from=book)` no longer uses the global book; `window.GearHubExcelViewer={sheet,open}`.
- Checked: demo shop with a 2-sheet workbook (INV, BC), Chrome 375/1280: "monitor" → 2 BC rows; tapping row 2 → viewer on BC, "2 found", row 3 selected; folder button → file → INV, switching to BC still works; no page errors. Node 22 check + 374/374. Not checked with the real POLESTAR workbook (size/speed).

### 1.1.214: Searching shows only products (Claude)
- Owner (POLESTAR, iPhone): typing in the search bar left the banner, categories and catalog heading between the bar and the results. `store.js` renderProducts toggles `body.searching` when the search box has text; `style.css` hides every `[data-home-content]` except `.mobile-search` and `#catalog`, plus the catalog heading, filters and the Policies line.
- Checked: Chrome 375 and 1280 — hidden while typing, all back when cleared, no page errors. Node 22 check + 373/373.

### 1.1.213: Shop apps are added from the shop Home page (Claude)
- Owner (iPhone): the app added from the admin was "POLESTAR Admin" with a "P" icon and opened the admin; they want "POLESTAR" with the logo, opening the Home page. The paused `claude/install-from-home` helper is now in: on `/shops/<slug>/admin` the robot only says "Go to Home page" (→ `/shops/<slug>/?install=1`); on the Home page the steps open only with `?install=1` (customers never see it). `app-switch.js` "Add app" now opens `/shops/<slug>/?install=1` too. index.html loads install-guide.css/js; tags 1.1.213 in index/admin/platform/sw.
- Checked: Chrome 375 (iPhone UA): admin welcome → Go to Home page → Home with the 4 Safari steps; plain customer visit → no helper; standalone other-shop sheet → `x-safari-https://…/?install=1`; store page title/apple-touch-icon/manifest are the shop's. Node 22 check + 372/372. Old apps keep their install-time name/icon: delete "POLESTAR Admin" and add again from the Home page.

### 1.1.212: Another shop inside an installed app asks for its own app (Claude)
- Owner (iPhone): inside the installed GearHub app, opening POLESTAR showed POLESTAR under the GearHub app. Now `public/app-switch.js` (loaded by index.html, admin.html, platform.html; in sw.js SHELL) runs only in standalone mode: the first page of an app session sets sessionStorage `gh-app-home` (shop slug, '' for GearHub); on another shop a sheet asks to add that shop's own app. "Add app" opens Safari (`x-safari-https://`, iOS 17+) or Chrome (intent) at `/shops/<slug>/admin?welcome=1` (existing install helper); "Copy link"; "I have it" (localStorage `gh-app-own:<slug>`); "Not now" (asked once per session). iPhone cannot tell whether an app is installed, hence "I have it".
- Checked: Chrome 375 with navigator.standalone faked: GearHub start → other shop asks; Not now + reload → not again; app started on its own shop → no sheet; no page errors. Node 22 check + 371/371. Not checked on a real iPhone.

### 1.1.211: Play Store upload key in assetlinks.json (Claude)
- Owner built the Android package on pwabuilder.com (package `com.skyshopmm.app`) and sent its assetlinks.json. Its SHA-256 (upload key) is now always in `/.well-known/assetlinks.json` (`server.js`); `ANDROID_SHA256` only needs Google's App signing key after the first Play upload. The owner keeps `signing.keystore` + `signing-key-info.txt` (never in this public repo).

### 1.1.210: Ready for the Play Store (Claude)
- Owner: put skyshopmm.com on the Play Store. A Trusted Web Activity app (package `com.skyshopmm.app`) opens the site full screen.
- Files: `public/skyshop.webmanifest` (SkyShopMM, start `/`, 192/512 + maskable PNG icons in `public/icons/skyshop-*`), linked from `public/platform.html`; `server.js` serves `/.well-known/assetlinks.json` from `ANDROID_PACKAGE` + `ANDROID_SHA256` (comma list; 404 when empty); `.env.example`; `tests/play-store.test.js`.
- Not done: the .aab build. This container cannot reach dl.google.com (Android SDK). Either the owner allows dl.google.com and Claude builds with Bubblewrap, or the owner uses pwabuilder.com (Android package) with package `com.skyshopmm.app`. After the first upload, put the Play Console "App signing key" SHA-256 (and the upload key's) in Render env `ANDROID_SHA256`.
- Paused (owner said stop): branch `claude/install-from-home` — install helper moves to the shop Home page; it also uses 1.1.210, so bump it when resumed.
- Login page bar shows "SkyShopMM" instead of "GearHub" (phone + PC; ≤340px rule keeps one row at 320).
- Checked: Node 22 check + 369/369; real server: assetlinks JSON with a fingerprint, 404 without; manifest 200 `application/manifest+json`; `/` → `/platform.html`.

### 1.1.209: Phone login page = owner's factory picture (Claude)
- Owner sent a phone picture: blue-sky factory scene, one light glass top bar with GearHub (Hub green), Home/About/Service/Contact and a solid green Sign in with a person icon. Phone only (≤600px); PC visitor page unchanged.
- Files: `public/images/signin-scene-phone.webp` (owner's picture with its drawn top bar cropped off), `public/platform.html` (`data-phone-src`, `Gear<span>Hub</span>`), `public/platform.js` (phones load the phone scene), `public/signin.css` (1.1.209 block; brand gap moved to `::before` margin so "GearHub" has no space), `public/sw.js`, tests. The Sign in card still opens by itself (1.1.204).
- Checked: Chrome 320/360/390/430 (no sideways scroll, one row) and 1280 (unchanged); Node 22 check + 367/367. WebKit was not available in this container.

### 1.1.208: No excavator in the seller Hero field (Claude)
- Owner (treebird admin): the Hero / Homepage Banner field showed GearHub's excavator. `admin.js` fills an empty seller hero with "" (GearHub's own admin keeps the excavator default); `tenant-admin.js` PUT /appearance stores "" instead of `/images/hero-excavator.jpg` for every seller shop (platform.test.js). WebKit 375 local: field empty, preview hidden. Node 22 check + 366/366.

### 1.1.207: No footer gear; Navigation Background and Page Wallpaper are GearHub-only (Claude)
- Owner (treebird, Android): remove the gear at the bottom; remove Navigation Background and Page Wallpaper from sellers — only the owner changes them.
- `store.js` hideShopDefaults hides `.footer-logo` when the shop has no own logo (`style.css` `.footer-logo[hidden]`). `admin.html`: both appearance sections get `gearhub-only`; `site-admin.css` hides them unless `body.gearhub-owner`. Server `PUT /appearance` now keeps both navigationBackgroundUrl and wallpaperUrl unless GearHub saves (platform.test.js extended).
- WebKit 375 on the local server: seller sees neither section; kaizen footer logo hidden. Tags style/store/smart-search 1.1.207, site-admin 1.1.207. Node 22 check + 366/366.

### 1.1.206: One picture on Settings; smaller phone admin banner (Claude)
- Owner (treebird, Android): Settings showed two pictures — the 1.1.202 Home banner `.hero.seller-nav-hero{display:flex!important}` beat `.store-view-hidden{display:none!important}` (higher specificity). Now `.hero.seller-nav-hero:not(.store-view-hidden){display:flex!important}`.
- Owner: phone admin banner too big; make it the navigation picture size. `site-admin.css` (max-width:800px, body.seller-admin): min-height 116px, padding 14px 20px, h1 26px, text 13px → 126px tall at 375 (was 214px). PC unchanged.
- WebKit 375 on the local server: Home banner flex, Settings none, admin banner 126px. Node 22 check + 366/366.

### 1.1.205: Tab title "skyshopmm.com" (Claude)
- Owner: the browser tab of skyshopmm.com (platform.html) said "GearHub ဆိုင်စီမံခန့်ခွဲမှု"; now `<title>skyshopmm.com</title>`. Test line in platform-scene.test.js. Node 22 check + 366/366.

### 1.1.204: skyshopmm.com = login page for everyone (Claude)
- Owner-approved plan (mailbox 2026-10-29 night): a phone signed in as POLESTAR always jumped into POLESTAR admin (1.1.196 `gh-into-shop`, now removed). `platform.js` load(): `view=?view` (`drive` → console). Landing (no view, or `?visitor`) = visitor scene + Codex's glass card opened by itself (`signIn(true)`); header button reads "Account" when signed in. Signed in → `GearHubApplication.account(me)` (new in shop-application.js): "<shop> ဆိုင်ထဲ သွားမယ်" → admin / "Create your shop" or "Check status" → `?view=create` / "Owner console" → `?view=console`, plus "တခြား account နဲ့ ဝင်မယ်" (id google-login → /auth/start) and Logout. `?view=console` = owner console, `?view=create` = form/pending (non-owner without shop). Owner console "Skyshop" → /platform.html.
- `/auth/callback` redirect: owner → `?view=console`, seller with shop → admin (unchanged; so an expired app login comes straight back to the shop), no shop → `?view=create`. Store Settings "My shops" and the new-application email link → `?view=console`.
- Tests updated on purpose: platform-scene (card opens by itself), shop-application (artwork only on landing), install-guide (1.1.196 redirect → 1.1.204 account card). WebKit 375 on a local fake-Google server: visitor, seller, owner, owner ?view=console, new account, ?view=create, and seller sign-in landing in admin; 1280 seller card. Node 22 check + 366/366.

### 1.1.203: Approved glass Sign in screen and gentle floating entrance (Codex) — [PR #277](https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/277)
- Owner clarified the previous request was image-only, so all uncommitted 1.1.200 design edits were restored and the unused branch deleted without a push/PR. Then supplied an 8.33-second video as a motion-only reference and explicitly authorized implementing the approved generated glass design in the app.
- Cause: visitor login still rendered the obsolete Apply/Review/Approved progress and an opaque card over a page-wide blur. `shop-application.js` now renders the approved bilingual title, three English feature rows, Google CTA and helper text in a glass dialog, without the review step. The existing one-field Create your shop form, pending/approved fallback states, Google readiness and all server logic remain intact.
- New visitor-only `signin.css` recreates the approved artwork/card, clear scene, green Google button and header. Entrance is a 1400 ms gentle downward/3D tilt-and-settle animation, informed by the video's entrance around 2.4–3.4 s. Reopens replay it; X/outside/Escape cancel it; reduced-motion users get the settled card immediately. `platform.js` preserves the original auth/start handler and adds dialog focus/Tab cycling and aria-expanded. No sound added.
- `public/images/signin-scene.webp` is a 1585×992, 344 KB clean background derived with the imagegen skill's built-in image_gen from the approved design image. Prompt: remove the central glass panel, every word/icon/button, GearHub wordmark and top navigation; seamlessly reconstruct the same blue mountain/forest lake, peach/lavender sunset peaks, straw-hat traveller with red cape, flowering grass and right tree canopy; preserve framing/colour/light, no UI/logos/new objects. Optimized to WebP; original generation remains in Codex generated_images. Only visitors use this artwork; signed-in owner/status/create views retain the configured scene and settings.
- Node 22 main baseline 364/364. Final `npm run check` passed and `npm test` 366/366; every touched browser JS passed node --check. New tests pin step-free approved login content/readiness, dialog semantics, motion/reduced-motion and asset/cache consistency. Updated the existing visitor-menu assertion on purpose for its new aria-expanded/aria-controls attributes (the first full run correctly flagged that markup change).
- Actual local seller/platform server, Chrome 375×812 and 1280×800: real Sign in clicks; sampled CSS transforms/opacity at 0/350/900/1400 ms; card fits with no horizontal overflow; repeat and mid-animation close/reopen, X, Escape, outside click, focus and reduced-motion passed. No console errors in the visitor flow. Real auth/start with a local fake Google provider → new seller → type shop name → Create → immediate shop admin passed. Owner page remained non-visitor, new scene image had no src, and owner Skyshop visitor preview kept the authenticated owner session. No live Google/iPhone device test or deployment.
- Actual rendered screenshots and a 31-frame 960×600 GIF (CSS animation sampled every 50 ms, with start/end holds) are saved in the task outputs for the owner. Compared settled UI with the approved design; header retains its functional Sign in trigger.
- Files: `public/shop-application.js`, `public/platform.js`, `public/platform.html`, new `public/signin.css` and scene WebP; `tests/shop-application.test.js`, `tests/platform-scene.test.js`; required version/cache metadata in `package.json`, `package-lock.json`, `public/index.html`, `public/sw.js`, `tests/tenant-install.test.js`; mailbox and this log. Base latest main d7e0691 (1.1.202). No backend/schema/product/order or seller storefront/admin edits. No merge/deploy.

### 1.1.202: New shop Home shows the settings navigation picture (Claude)
- Owner chose "1": a seller shop without its own hero photo now shows its settings navigation picture (GearHub default `/images/shop-nav-default.jpg`, or the picture GearHub set) on Home, with only the shop name (no GearHub texts). `store.js` `hideShopDefaults` adds `.seller-nav-hero` + `--seller-nav-picture`; `style.css` styles it (240px PC, 170px phone with 16px side margins). Shops with their own hero photo (POLESTAR) unchanged.
- Tags: style.css, store.js and smart-search.js → 1.1.202 (store/smart-search must share a tag). Tests updated on purpose (new-shop-defaults, free-ai sw tag). WebKit 375/1280 on the local server; Node 22 check + 364/364.

### 1.1.201: Seller admin banner = settings navigation picture; only GearHub changes it (Claude)
- Owner (kaizen): seller shops must not show the excavator admin picture; the admin home must use the settings navigation picture, which sellers cannot change (only GearHub).
- `lib/tenant-install.js` marks seller admin pages `body.seller-admin`; `site-admin.css` paints `.inventory-hero` (PC) and `.admin-head` (phone) with `var(--seller-nav-picture, url(/images/shop-nav-default.jpg))`; `admin.js` `setSellerNavPicture()` sets the variable from the shop's navigationBackgroundUrl (no more heroImageUrl/excavator for seller shops). `tenant-admin.js` (public) adds `gearhub-owner` for the platform owner; the Navigation background field is hidden for everyone else.
- Server: `shopFor()` also returns `isOwner`; `PUT /shops/:id/appearance` keeps the stored navigationBackgroundUrl unless GearHub saves (internal change, no new API). Applies to every seller shop, POLESTAR included (its admin banner now shows its own navigation picture on PC too).
- Tests: platform.test.js (seller cannot set, GearHub can, seller save keeps it). WebKit 375/1280 on the local fake-Google server (kaizen-like new shop). Node 22 check + 364/364.

### 1.1.200: Bouncing "Open in app" when the shop app is installed (Claude)
- Owner (Android photo): POLESTAR app is on the Home Screen but the admin was open in Chrome; show a bouncing "Open in app" note. `lib/tenant-install.js`: shop and admin manifests now list themselves in `related_applications` (platform webapp, absolute manifest URL; added after display_override so the title-bar test keeps its order). New `public/open-in-app.js` (admin.html + index.html, in the sw SHELL): in a browser tab, `navigator.getInstalledRelatedApps()` → bouncing green pill above the bottom nav with ×; Android tap tries an `intent://` hand-off with `S.browser_fallback_url=...#open-in-app`, and if Chrome keeps the page it shows "⋮ → Open in app"; PC shows the address-bar Open in app hint. iPhone Safari has no such API: nothing shows there.
- WebKit 375/1280 with a faked installed app (WebKit lacks the API): pill/help placement, no sideways scroll. Not verified on a real Android: whether the intent opens the installed app or falls back to the help. Node 22 check + 364/364.

### 1.1.199: Simple "Create your shop" form (Claude)
- Owner: remove the steps and texts from the shop application; pressing "Create your shop" makes the shop at once. `public/shop-application.js` form: heading, required shop name, one "ဆိုင်ဖွင့်မယ် / Create your shop" button and a one-line Seller Rules link (kept: sellers still agree to the rules). Removed: 1-2-3 steps, rejected note, Gmail field, About field/counter, help lines. Server unchanged (it already opens the shop at once while the owner's shop limit allows; then 1.1.195 goes to the admin with the install helper). Pending/approved cards unchanged.
- `tests/shop-application.test.js` updated on purpose for the new form. WebKit 375/1280 on the local fake-Google server: form, then Create → `/shops/<slug>/admin` with the helper. Node 22 check + 362/362.

### 1.1.198: Install helper as a chat with short step videos (Claude)
- Owner: show short videos instead of pictures, like someone teaching in front of you, with auto replies. `public/install-guide.js`: chat thread (robot types ~0.9 s, then the step; the seller taps "ပြီးပြီ ✓ / Done", their reply bubble appears and the robot answers with the next step; earlier steps stay above, shortened). Each iPhone Safari/Chrome and Android step has a drawn 5 s looping video (`install-guide.css`: phone screen mock, finger, menus/sheets moving; iOS 26 Safari ≡ → Share → Add to Home Screen → Open as Web App/Add → Home Screen icon). PC steps keep icons. These are CSS animations, not screen recordings (no iOS Simulator here).
- Fixed: the admin page `footer` style painted a dark band behind the helper buttons (now a div). The bubble no longer fades in from opacity 0 (the hidden WebKit test page does not run animations, so a fade left it invisible).
- WebKit 375 (frames paused at each tap: finger inside its target in all 4 iPhone steps) and 1280; Node 22 check + 362/362. Animations can only be seen moving on a real phone.

### 1.1.197: Owner "Skyshop" button opens the new-seller page (Claude)
- Owner: rename "Google Sign in" to "Skyshop"; tapping it shows the Skyshop new-shop page. It is now a link to `/platform.html?visitor`; with `?visitor` `platform.js` renders the visitor page (scene, Sign in → Continue with Google) while the owner stays signed in. Signing in there switches the Google account.
- WebKit 375/1280 on the local fake-Google platform server: link on the name line, visitor page shown, owner session kept. Node 22 check + 361/361.

### 1.1.196: Owner Google Sign in button; seller with a shop goes straight in; seller menu fits (Claude)
- Owner: a button on the owner console to go straight to Google sign-in. `platform.js` adds "Google Sign in" (owner only) on the name/email line; it uses the existing `/auth/start` (Google account chooser). Styles at the end of `platform.css`.
- Owner: a new shop (treebird) did not open straight in on the iPhone, although the shop was made on live. Locally (fake Google server, WebKit 375) Submit → `/shops/<slug>/admin?welcome=1` and the install helper worked, so the cause on the phone is unknown. Now `platform.html` also sends any signed-in seller who has a shop straight to its admin (at most once a minute via sessionStorage, so an admin that sends them back cannot loop); `?welcome=1` while the auto-opened shop has not finished the install helper.
- Seller menu on phones: with the logout button the words broke apart ("GearHu b", "Hom e"); for signed-in non-owners on phones the brand/links stay on one line (13px, 10px gap). Fits at 375.
- Tests: re-applying after the owner deletes the shop opens a new shop at once (`platform.test.js`); `install-guide.test.js` pins the redirect, button and menu. Node 22 check + 361/361. WebKit 375/1280 on a local platform server with fake Google login.

### 1.1.195: New shop goes straight into its admin + Home Screen install helper (Claude)
- Owner: after applying with Google the seller should land in their shop at once, then get step-by-step help to add it to the Home Screen.
- `public/platform.js`: when `POST /applications` returns a slug (shop opened), go to `/shops/<slug>/admin?welcome=1`. Shops that wait for the owner (limit reached) behave as before. `public/shop-application.js`: removed the old "opens only after owner approval" lines.
- New `public/install-guide.js` + `.css` (loaded in `admin.html`, in the sw SHELL): robot helper, one step at a time with Back/Next and dots, for iPhone Safari, iPhone Chrome, other iPhone apps (copy link → Safari), Android (install prompt or ⋮ menu) and PC. Opens on `?welcome=1`, and on phones until Done; Close hides it for the session; never inside the installed app. The installed iOS app has its own cookies, so the last step says Google sign-in may be asked once.
- Checked in WebKit at 375 and 1280 on a test page at a shop admin address (auto open, welcome removed from the URL, 4 steps, Done; no sideways scroll). The full admin with a faked sign-in froze the WebKit runner, so the guide was not seen inside the real admin page. Node 22 check + 360/360.

### 1.1.194: Phone Add Product at the size of the owner's picture (Claude)
- Owner sent the 1.1.193 reference picture again: "change to this size, the original is small". Only `public/product-phone.css` changed: new rules at the end of its phone-only media query. `--u` = one pixel of the 851px-wide picture (`min(.1175vw,.505px)`), so the toolbar, cards, fields, inputs, tabs and textarea keep the picture's proportions at any phone width. Text is a little smaller than the picture because the phone system font is wider than the picture's (labels stay on one line at 375).
- Checked in WebKit at 390 and 375 (field 43px/41px tall, was 34px) and PC 1280 (desktop form unchanged). Node 22 `npm run check`, `npm test` 358/358.
- Files: `public/product-phone.css`, `public/admin.html` + `public/sw.js` (css tag), version files, mailbox, this log.

### 1.1.193: Phone Add Product and AI advice match the owner's references (Codex) — [PR #267](https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/267)
- Owner: redesign Phone Add Product and the AI warning/category advice from the two supplied images, send actual screenshots, and leave PC unchanged.
- Existing form controls and AI results already worked; the phone still used the long desktop-oriented sections/draft toolbar, and AI advice was a plain warning paragraph. New `product-phone.css` has only a max-width:800px media query. `product-phone.js` adds the top native Save action, compact two-column cards, barcode decoration and image chooser; folds Myanmar name/promotion/other optional controls into the existing details without deleting or duplicating them. Every moved node has a placeholder and returns home on desktop resize, preserving values/listeners. The new Save submits the original form and mirrors its disabled state.
- `product-ai.js` keeps its desktop HTML and existing API/category-ID action; phone results use the red robot warning and green bulb/category card. Scores/names/category paths come from the real response, including 99% MONITOR (300426-00202), Electrical Parts › Doosan in the local fixture. No fake response, threshold, backend, schema or API changes.
- Robot asset: `public/images/product-ai-robot.png` (360×285 transparent PNG, 108 KB), built-in image_gen via imagegen skill, derived from the supplied robot reference. Prompt: isolate/recreate only its white/silver robot, navy face and pointing hand, cyan eyes, green AI badge and red attention marks; transparent background; preserve pose/material, remove all UI/text except AI. Source output remains in Codex generated_images; project references only the committed asset. Standard image size optimization preserves alpha.
- Node 22 baseline main 355/355. Final `npm run check` and `npm test` 358/358; new tests pin desktop startup without mutation, media-query containment, existing field names/native Save, live-response AI markup, safe text, category ID selection and desktop advice restoration.
- Actual local seller server, Chrome 375×812/648 and 1280×900: typed required/optional fields, native required validation, clicked category picker, language tabs, chosen real MONITOR photo, tapped real AI category suggestion and top Save. Server data kept photo, part number, Myanmar/English descriptions, category ID and promotion. Edited the saved product's stock via the actual inventory Edit button; all other fields/photos remained unchanged. Back closes the phone editor. Desktop widths/heights, styles, labels and relative positions matched the pre-change baseline exactly (scroll offset normalized); resizing phone→PC returned fields to their original parents. Compared screenshots with the references; actual screenshots in the task outputs. No physical iPhone test. Initialization has a pre-existing blob-audio CSP rejection (also seen before the phone editor was loaded); no new errors during the editor flow. Audio/security untouched.
- Files: new `public/product-phone.js`, `public/product-phone.css`, robot PNG, `tests/product-phone.test.js`; `public/product-ai.js`, `public/admin.html`; required metadata/cache changes in `package.json`, `package-lock.json`, `public/index.html`, `public/sw.js`, `tests/tenant-install.test.js`; mailbox and this log. Base main 59aa54a (1.1.192). No merge/deploy.

### 1.1.192: Free AI pack — FREE_AI_PLAN.md #2–#8 (Claude) — in review
- Owner (going out): "add all the free AI". Everything runs on the GearHub server (or in the phone); no outside service, no cost per use.
- #2 #3 #4 `lib/photo-search.js` `insight()` + `POST /shops/:id/ai/photo` (owner of the shop or GearHub owner, 60/min) + `public/product-ai.js` under "Choose photos": category suggestion from look-alike products' categories (one tap fills Category + categoryId), "may already be in the shop" (score ≥ 0.93, the edited product excluded), dark (brightness < 70) / blurred (edge strength < 5; calibrated on POLESTAR photos: clear 7.7–27, blurred 2.6–8.4).
- #5 `public/smart-search.js` (phone): spelling mistakes, word order, codes without dashes; added after exact matches in `store.js`.
- #6 `similar()` + `GET /store/:slug/similar/:product` + `public/similar-parts.js`: "Similar parts" row under a product's photos (score ≥ 0.55, top 6).
- #7 #8 `lib/ocr.js` (tesseract.js 7 + @tesseract.js-data/eng best_int 2.9 MB from node_modules, one job at a time, stops after 60 s idle; OCR=off turns it off). #7 "Part No." button in the scanner → `POST /store/:slug/read-label` → products whose Part No./SKU is on the label (O/0, I/1… tolerated). #8 `GET /shops/:id/orders/:order/receipt-read` (orders permission) → amount + transaction ID, compared with the order total, kept in order details (`receiptRead`, read once per receipt); line under the order's buttons (`order-detail.js`).
- Tests `tests/free-ai.test.js` run the real image model and real OCR. Checked in headless WebKit at 375 and 1280 (AI panel with sample answers; tap fills Category), live POLESTAR data through a pass-through (smart search "startr swich", "k100-1858"; Similar parts row with sample look-alikes; Part No. button present), order receipt line (sample answer). Not checked with the owner's login, a real camera label or a real KBZPay screenshot.

### 1.1.191: Excel library matches the owner's photo; open the whole file card (Codex) — [PR #265](https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/265)
- Owner: match the supplied Excel files photo, make every part of an uploaded workbook card open it, compare the actual result and send a screenshot.
- Cause: only the old View link carried the existing viewer action; the library used the old horizontal upload form and Windows-only download UI. Each workbook is now one native accessible button with its existing viewer data, an Excel icon, filename and size. Icon/name/padding and Enter open the same viewer. The dialog has the pictured full-width file chooser, green Upload button, dashed automatic-upload panel and Windows/Mac download buttons. No viewer, product/order data, database, route or permission changes.
- Mac download is a ZIP preserving the .command executable bit; it uses the native file picker, curl and a per-shop user LaunchAgent. It snapshots a stable workbook, sends the existing shop key/origin, retries failures and leaves the source file intact. Windows generation is unchanged. No installer was installed on the test host and no Windows machine or physical iPhone was used.
- Node 22 main baseline 346/346; final `npm run check` passed and `npm test` 349/349. New tests cover the whole-card action, safe filename text, Mac ZIP/shell syntax and watcher retry/key/origin/source preservation. The full-suite run exposed an overly short watcher-test wait; it now waits up to 15 seconds and reports child stderr rather than failing with an opaque missing-file error.
- Real server with isolated POLESTAR branding/workbook fixtures, Chrome 375×812 and 1280×900: clicked icon, name, blank card padding and Enter; existing sheet rendered. Selected/uploaded the workbook (one file retained), downloaded both OS files, checked ZIP/executable/shell syntax, verified anonymous cannot upload and GearHub owner can. Both dialog sizes fit without internal overflow; no console errors during the card tests. Compared actual phone and PC screenshots to the photo; screenshots saved in the task output folder. Device status/assistive controls belong to the photographed phone; unrelated storefront chrome is unchanged.
- Files: `public/index.html`, `public/style.css`, `public/excel-library.js`, `public/excel-auto-upload.js`; `tests/excel-library-card.test.js`, `tests/excel-auto-upload.test.js`; required version/cache metadata in `package.json`, `package-lock.json`, `public/sw.js`, `tests/tenant-install.test.js`; this log and mailbox. Based on latest main b706e45 (documentation-only change after baseline). No merge/deploy.

### 1.1.190: Keep Google owner login when signing into GearHub Admin (Codex) — [PR #263](https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/263)
- Owner: Settings → My shops repeatedly required Google owner login after signing into GearHub Admin with its password; the owner confirmed this trigger.
- Cause reproduced against the real server: `/api/admin/login` regenerated the shared session and retained only `admin`, discarding the existing verified `platformUser`. `server.js` now preserves only that server-side Google identity during rotation. Session ID/CSRF rotation and explicit logout remain intact; password login by itself never creates a Google identity or owner role.
- Added `tests/owner-login.test.js`: existing owner survives password login and server restart; old session ID revoked; password-only visitor is not a platform owner; seller stays a seller; explicit logout clears both identities. Fixtures seed verified Google state only in a temporary SQLite session, with no app authentication bypass.
- Node 22 baseline 345/345; final `npm run check` and `npm test` 346/346. Real-server Chrome at 375×812 and 1280×812: typed Admin password, clicked Settings → My shops twice, returned through GearHub link, reloaded owner page; no OAuth requests or post-login console errors. Seller page retained its branding and did not gain My shops. No iPhone device test performed.
- Files: `server.js`, new regression test; required version/cache metadata in `package.json`, `package-lock.json`, `public/index.html`, `public/sw.js`, `tests/tenant-install.test.js`. No storefront layout, product/order data or schema changes. If the previous version already lost the Google session, sign in once after deploy; subsequent Admin password logins retain it. No merge/deploy.

### 1.1.189: "GearHub" link on the My shop page opens GearHub's store (Claude) — in review
- Owner: clicking "GearHub" (top left of skyshopmm.com/platform.html) no longer showed the shop.
- Cause: since 1.1.130 "/" redirects to /platform.html (owner's request) and GearHub's store is at /index.html; the link still pointed to "/", so it reloaded the same page.
- `public/platform.html`: link → `/index.html`. Test `tests/gearhub-link.test.js`. Live /index.html checked (200, GearHub store).

### 1.1.188: Backups live in Google Drive only, not on the Render disk (Claude) — merged, live
- Owner: the Render disk is 3 GB (live: 3.13 GB, 1.42 GB used); keep backups only in Drive (5 TB, newest 30), none on Render.
- `lib/backups.js`: after Drive confirms the upload, every local archive is deleted (step "local-cleanup"); if Drive fails, local copies stay until a later upload works. The free-space check uses the last backup's size when no local archive is left. Status `retainedLocalCopies` is 0 with Drive.
- Tests: `tests/backup-disk.test.js` (no local copy with Drive; kept when Drive fails; cleared by the next good upload). Server-only change, nothing to see in the browser. After deploy the first daily backup frees the local copies.

### 1.1.187: Review and fix the owner storefront preview blocked in production (Codex) — [PR #260](https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/260)
- Owner requested a recheck of PR #259. Confirmed the live storefront sends `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'`, which blocks its iframe. The previous demo omitted Helmet and served the obsolete `platform-shop.html`, so its browser check did not verify the production storefront.
- Only successful public `/shops/<slug>/` HTML now allows same-origin framing (`SAMEORIGIN`, `frame-ancestors 'self'`). All other CSP rules remain unchanged; admin/login, manifests and unavailable shops keep DENY. No database or API changes.
- `lib/security.js` shares the unchanged production Helmet policy with `server.js`, the test and demo; only the local HTTP demo disables HTTPS upgrading. `scripts/platform-demo.js` uses the actual `installTenantApps` storefront routes now.
- Extended `tests/owner-store-preview.test.js` with HTTP assertions: reproduced DENY before the fix, then verified SAMEORIGIN only on public shop HTML and intact protections elsewhere. Node 22 main baseline: 342/342; final `npm run check` and `npm test`: 343/343. Chrome at 375×812 and 1280×812: actual View, Category, Close and Manage clicks passed; real branded storefront loaded with no console errors or failed requests.
- Files: `lib/security.js`, `lib/tenant-install.js`, `server.js`, `scripts/platform-demo.js`, preview regression test; required version/cache metadata in `package.json`, `package-lock.json`, `public/index.html`, `public/sw.js`, `tests/tenant-install.test.js`. No merge or deploy.

### 1.1.186: Preview the customer storefront inside GearHub owner shops (Codex) — [PR #259](https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/259)
- Owner asked to see a newly opened shop exactly as customers see it from GearHub owner settings.
- The owner shop list's existing `View` action now opens a full-viewport in-console preview iframe pointed at the same `/shops/<slug>` route, with a close button and an optional full-page link. No storefront rendering or shop data is duplicated.
- Files: `public/platform.js`, `public/platform.css`, `public/platform.html`; version/cache metadata in `package.json`, `package-lock.json`, `public/index.html`, `public/sw.js`, `tests/tenant-install.test.js`; focused test `tests/owner-store-preview.test.js`.
- Verified on local-only fixtures in Chrome at 1280×900 and 375×812: clicked the actual View and Close buttons; the preview filled the viewport and its iframe showed the fixture shop's public storefront. `npm run check` and `npm test` passed on Node 22 (342/342 tests). The empty demo shop returned 404s for absent image/media fixtures; preview UI and app code produced no reported exceptions.
- Do not merge or deploy; owner handles deployment after review.

### 1.1.185: No GearHub info cards in seller shops (Claude) — in review
- Owner: remove "🏭 Industrial selection / 💸 Bank / mobile transfer / 🧰 Purchase support" from all seller shops, new and old.
- `public/store.js` `hideShopDefaults()` adds class `seller-shop` on <html>; `public/style.css` `.seller-shop .benefits{display:none!important}` (a class, so switching views never brings them back). GearHub's own store keeps them.
- Checked with live data through a pass-through: treebird and POLESTAR at 375 (cards gone; POLESTAR otherwise unchanged, 101 products) and 1280 (hidden). Seen but not asked: the footer of a seller shop still shows GearHub's gear logo.

### 1.1.184: New seller shops without GearHub's hero, gear logo and default texts; default navigation picture (Claude) — merged, live
- Owner (new shop "treebird" on iPhone): no hero (gear picture, "INDUSTRIAL SUPPLY · BUILT FOR WORK", "Browse our products.", "Browse equipment"), no gear in the logo circle, no "Industrial equipment" / "Find what you need, from motors to safety supplies."; the navigation background must be the owner's picture (factory skyline) for every shop by default.
- New `public/images/shop-nav-default.jpg` (owner's picture, 1320×429, 84 KB). `public/store.js`: seller shop navigation = its own navigation picture, else the default (GearHub main unchanged); empty logo circle instead of ⚙; `hideShopDefaults()` hides `.hero` without the shop's own hero picture and the catalogue heading/text unless the shop saved its own. Owner: only new shops change — POLESTAR (own logo, navigation picture, hero, saved texts) stays exactly as before. `public/style.css`: `[hidden]` rules.
- Checked with live data through a localhost pass-through (http localhost rejects images in `checkedImageUrl`; relaxed in the test page only): treebird 375/1280 — nothing listed shows, navigation shows the picture; POLESTAR unchanged (logo, own navigation picture, EXCAVATOR hero, its saved "Industrial equipment" text).
- Still GearHub defaults on new shops (not asked): the three cards "Industrial selection / Bank, mobile transfer / Purchase support".

### 1.1.183: No product limit (Claude) — merged, live
- Owner (Plans screenshot): remove the product limit.
- `lib/platform-model.js`: `permissions().productLimit` is `Infinity`, so creating a product, Excel import and restoring from Trash never stop at a count (storage stays the limit). `platform_plans.product_limit` column kept (no schema change).
- `lib/platform.js`: plans saved without `productLimit` keep the stored value (PATCH `COALESCE`), new plans store 100000. `public/platform.js`: "Active product limit" field removed from Plans.
- Test `tests/no-product-limit.test.js`; browser (sample data, 375): Plans has no limit field, Save sends name/storage/permissions only.

### 1.1.182: Owner deletes a test shop at once (Claude) — merged, live
- Owner (iPhone): "Delete shop" in Manage shop did not delete the test shop; wanted it deleted at once.
- Causes: (1) a prompt asked to type the exact shop URL and silently stopped on any mismatch; (2) `platform_upload_keys` (Excel auto-upload key) references the shop, so with foreign keys ON the delete failed for a shop that used auto-upload.
- `lib/platform.js` DELETE `/owner/shops/:id`: also deletes the shop's upload key and Drive photo rows (Drive copies stay in Drive). `public/platform.js`: one confirm ("Delete this shop and all its data for good?") instead of typing the URL; the client still sends `confirmDelete: slug`.
- Test: a shop with an upload key is deleted (owner only). Browser (sample data, 375): one confirm, DELETE sent, shop gone from the list.

### 1.1.181: New shops open at once, up to the owner's shop limit, with the owner's MB (Claude) — merged, live
- Owner: remove the "owner approves" step for new shop applications; owner sets how many shops may open (e.g. 10) and the storage per new shop (e.g. 100 MB).
- `lib/platform.js`: table `platform_signup` (max_shops default 10, storage_mb default 100). `POST /applications` opens the shop in the same transaction while seller shops < max_shops (trial 2 months, `storage_override` = MB, application "approved", note "Opened automatically", GearHub notice has `opened:true`); otherwise it stays pending and the owner approves as before (owner-approved shops also get the MB setting). `PUT /owner/signup` (owner only, 0–10000 shops, 1–10240 MB); owner view has `signup`.
- Owner console: "New shops / ဆိုင်အသစ် ဖွင့်ခြင်း" — shop limit (with current count) and MB per new shop. Applicant page: "Your shop opens straight away"; the waiting card says shops are full.
- Tests: platform tests start with max_shops 0 (they test manual approval); new subtest for auto-open, limit, MB, owner-only. Checked the owner section and applicant text with sample data at 375. Not checked live (needs owner login / a new Google account).

### 1.1.180: Drive photos sorted into category folders, named by product (Claude) — merged, live
- Owner (Drive on iPhone): 1.1.179 put all 990 photos in one shop folder with ID names — too mixed. Wanted category folders.
- `lib/drive-backup.js`: "GearHub Backups/Photos/<shop>/<main>/<sub>/<child>/<SKU> <product name> (n).jpg" (category by `categoryOf` + parent_id); photos on no product → "Other". `platform_drive_photos` gains `parent_id`, `name`; each sweep moves/renames copies whose product category or name changed (PATCH addParents/removeParents, one parent). 1.1.179's flat copies (no parent_id) are moved out of the shop folder on the first sweep after deploy (200 per batch, loops until done).
- `lib/platform.js`: a product save triggers a sweep (~30 s), so Drive follows edits.
- Tests: fake Drive with move/rename; exact paths for Main/Sub, Other, the two-"Sany" move, old flat copies sorted. Not run against the real Drive yet: after deploy the owner opens Drive → GearHub Backups → Photos → psm-test-shop (sorting starts about a minute after the deploy).

### 1.1.179: Google Drive backup — daily backup and shop photo originals (Claude) — merged, live; owner connected Drive, 990/990 photos copied
- Owner: has 5 TB Google Drive; chose "option 1" (approved new server storage code): Drive holds the daily backup and the original of every shop photo; shops keep serving photos from the Render disk (fast, no Drive quotas).
- New `lib/drive-backup.js`: owner connects once (same Google OAuth client as login, extra scope `drive.file` = only files the app made; refresh token in table `platform_drive`). Folder "GearHub Backups": backup archives (newest 30 kept); "GearHub Backups/Photos/<shop slug>/" every ready image (existing ones too, 200 per batch, every 15 min and ~30 s after an upload; table `platform_drive_photos`). Deleted shop photos stay in Drive. Revoked access → shows "not connected" + error.
- `lib/backups.js`: Drive is an off-site destination (step "drive-delivery"). `server.js`: creates Drive when PLATFORM_ENABLED, runs a backup right after connecting. `lib/platform.js`: `POST /owner/drive/connect|sync|disconnect` (owner only), the OAuth callback handles `stored.drive`, owner view has `drive` status, image saves call `drive.photoSaved()`.
- Owner console (`public/platform.js`, `platform.css`): "Google Drive backup" section — Connect / account, last backup, photos copied n/N, Copy photos now, Disconnect.
- Owner setup (one time): Google Cloud project of the login client → enable "Google Drive API"; OAuth consent screen must be "In production" (Testing tokens expire after 7 days). No new Render keys.
- Checked: tests with a fake Google (folders, uploads, retention, photo copy once, revoked access), owner-only routes; owner console with sample data at 375 and 1280 (connect button leads to Google's address, connected view, Copy photos now). Not checked against the real Google Drive (needs the owner's Google consent).

### 1.1.178: Same subcategory name under different main categories; inventory filter uses the category picker (Claude) — merged, live
- Owner (iPhone): "Sany" under Swing Gear Parts was refused ("Category names must be non-empty and unique") because SANY exists under Electrical Parts. Owner approved changing how products store their category. Then: make the Product Inventory category filter the same picker as Add Product.
- Data: products keep `category` (name) and now also `details.categoryId` (no table change). A product belongs to its category ID while that category still has the product's name, else to the first category with that name (`categoryOf` in `lib/category-hierarchy.js`, `public/category-browser.js`, `public/tenant-store.js`, `public/admin.js`). Saving categories gives every product its category ID (renames follow the ID, delete check by ID).
- `lib/category-hierarchy.js`: `validateHierarchy(rows,{sameNameUnderOtherParents:true})` for seller shops: names unique among siblings only; parents by `parent_id` (a name two categories share must be a main). GearHub main (server.js) unchanged (one name per shop).
- `lib/tenant-admin.js`: counts by ID, saves `parent_id`, product save resolves `categoryId` (chosen ID if it has this name, else previous, else first by name).
- Admin: `category-picker.js` adds a hidden `categoryId` to the product form, finds parents by ID, refreshes after a category save; `admin.js` category editor links rows to their parent row (`_parentKey`) and saves `parent_id`; edit fills `categoryId`. Inventory filter: the select only shows the choice ("Sany (Swing Gear Parts)"); a transparent button opens the picker (All Categories / main / subcategory; a main shows everything under it).
- Storefront: `store.js` buttons carry `data-category-id`, the catalogue select uses IDs, counts by ID.
- Checked: new unit + platform tests (owner's case end to end); admin with sample data at 375 and 1280 (filter, Add Product picker sends ID 4 for Swing's Sany, Edit opens on the right main even when both are spelled "Sany", editor tree, save sends parent_id); live POLESTAR storefront through a pass-through with the new scripts (Doosan 19 in the select and the category page). Not checked in the real seller admin (needs login) or on the owner's iPhone.

### 1.1.177: Photo scan counts seconds, stops with "No match found", says why (Claude) — merged, live
- Owner (iPhone): the scanner kept "Looking…" forever when nothing matched. Wanted: say there is no match; count seconds and say how long it took; say why the photo matches.
- `public/photo-scan.js`: "Looking… 3 s" count while scanning (paused while the shop's photos are still being learned). A sure match (same product twice) shows "found in 3.4 s" and a reason line: "Why: 81% alike in shape, colour and surface to its photo 2 of 4 (close-up of the middle); next closest product 69%". After 15 s without one it stops: "No match found · Searched 15.x s" and why (closest only N% alike, needs 60% / seen only for a moment, hold still / two products look the same). A saved photo now also says "No match found" instead of showing a weak closest product. The product name is the top line ("Best match" moved to the line under it); ˄ ˅ hidden when there is nothing to step through.
- `lib/photo-search.js`: each match also returns `photo` / `photos` (which of the product's photos matched) and `view` (0 whole picture, 1–2 closer views). Same API, extra fields.
- `public/style.css`: the reason is a full-width line under the result; name up to two lines.
- Checked at 375 on the live POLESTAR catalogue through a local pass-through (scratchpad live-proxy.js serves the new script/CSS, everything else from skyshopmm.com) with a fake camera: product photo → "SWITCH STARTER", found in 3.4–6.1 s, reason shown; coloured blocks → stopped at 16.2 s, "No match found", "closest, Drive Shaft, only 21% alike". 1280: bar fits. The "photo n of N" part needs the new server (verified by the real-model test). Not checked with the owner's iPhone camera.

### 1.1.176: Recycle Bin looks like the owner's reference photo (Claude) — merged, live
- Owner (reference photo + iPhone screenshots): redesign the inside of Deleted orders like the photo; the dashboard card must not be a "delete" (❌) icon — call it "Recycle Bin".
- `public/admin.html`: card "🗑️ Recycle Bin" (PC sidebar link too). Panel header: red bin in a pink circle, "DELETED", "Deleted orders", red "Delete all" button, note.
- `public/admin.js`: each order is a card — Order ID and Customer on the left, Total and Order date (date / time) in the middle, dark-green Restore on the right, icons as in the photo. As in the photo there is no per-order "Delete forever" any more; "Delete all" empties the bin. The PC sidebar link only opens the bin (a second tap closed it into a blank page).
- `public/tenant-admin.js`: seller shops no longer hide "Delete all" (the platform `/trash` route empties that shop only).
- `public/site-admin.css`: `#deleted-panel .bin-*` styles; phones ≤ 480 px tighter spacing, numbers stay on one line, middle column 126 px so cards line up.
- Checked with sample orders at 375 (no overflow, Restore, Delete all) and 1280 (sidebar link twice, Restore cards). Not checked on the owner's iPhone.

### 1.1.175: Network speed reads like the phone's meter (Claude) — merged, live
- Owner (phone photo): the phone's status bar showed 1.80 MB/s while the badge showed 228KB.
- Cause: the badge timed the shop catalogue, which is only ~28 KB on the wire (brotli) but was counted as ~99 KB, and its time included the server building it and the long wait for a far server. A sample that small measures mostly the wait.
- New `public/speed-test.bin` (1 MB of random bytes: plain file, no compression, not kept by the service worker). `public/net-speed.js` reads it as a stream and times from the first byte; stops after 1.5 s (slow links use little data). Every 3 minutes instead of every minute (each check can use up to ~1 MB on a fast link), plus on opening, returning to the app and coming online. MB now shows two decimals ("1.80MB") like the phone. Good = ≥ 1 MB/s (and first byte < 2 s), Normal ≥ 200 KB/s.
- Checked through a throttled local link: real 1.80 MB/s → 1.61–1.65MB (the page was loading at the same time), real 300 KB/s → 277KB yellow. Fits under the logo at 375 and in the PC pill at 1280. Not checked on the owner's phone. The phone's own meter shows all traffic at that second, so the two will never match exactly.

### 1.1.174: Add Product opens full width on phones (Claude) — merged, live
- Owner (iPhone screenshot): after 1.1.173, "+ Add Product" opened the form squeezed into a one-third card slot.
- Cause: on phones the form was moved to the full-width area under the cards only when its own card ("Add a product", removed in 1.1.173) was tapped.
- `public/admin.js`: `setProductFormOpen` now places the form there on phones (`positionMobileDashboardDetail`), so "+ Add Product" and Edit both open it full width; Edit scrolls to the form's title. PC unchanged.
- Checked locally with sample data at 375 (Add, Back, Edit: 355 px wide, title at the top) and 1280 (Add, Edit). Not checked on the owner's iPhone.

### 1.1.173: Cancelled orders go to the trash; no Add a product card (Claude) — merged, live
- Owner (admin screenshot): remove the "Cancelled orders" card — a cancelled order goes to the trash, and everything deleted is kept there; remove the "Add a product" card (Product Inventory already has "+ Add Product").
- `public/admin.html`: no Cancelled orders button or panel; the PC sidebar's "Cancel Order" link is now "Deleted Orders" (opens the trash).
- `public/admin.js`: "Deleted orders" lists deleted and cancelled orders. Restore brings a cancelled order back to pending (as before). "Delete forever" on a cancelled order calls DELETE twice (to deleted, then for good); "Permanently delete all" moves cancelled orders to deleted first. No API or database change. Product editor Back now scrolls to Product Inventory.
- `public/site-admin.css`: phone order cards are 2 per row; the Add a product card is hidden, its panel only shows while the form is open (from "+ Add Product", Edit, or the PC sidebar).
- Checked in the browser with sample orders (page requests answered in the browser, no login) at 375 and 1280: cards, trash list, Delete forever, Restore, Permanently delete all, + Add Product, sidebar links; no script errors. Not checked on the owner's iPhone or the live shop admin.
- Tests: new `tests/order-trash.test.js`; 322 pass.

### 1.1.172: Speed badge no longer touches the logo (Claude) — merged, live
- Owner (iPhone + mock-up): the wifi badge overlapped the logo; wanted the logo and shop name a little higher and the badge below the logo with a gap.
- `public/style.css` (phones, ≤ 850 px): logo and name moved up 12 px; badge starts 5 px under the logo; icon 21 px. PC unchanged.
- Checked at 375 on the local store: logo 13–79 px, badge 81–113 px, banner ends at 116 px; matches the mock-up. Not checked on the owner's iPhone (its banner also has the status-bar area).

### 1.1.171: Network speed under the shop logo (Claude) — merged, live
- Owner (iPhone mock-up): a wifi icon under the logo showing the real network speed — green good, yellow normal, red low.
- New `public/net-speed.js`: iPhone Safari does not report the speed, so it is measured: a tiny request (`/api/platform/me`) gives the delay, then the shop's catalogue (`/api/platform/store/<slug>`, no-store, ~100 KB for POLESTAR; `/api/products` on the main store) gives bytes per second. Good ≥ 1 MB/s with delay < 600 ms, Normal ≥ 200 KB/s with delay < 1.5 s, else Low; grey "Offline". Shown as e.g. "1MB" / "350KB". Measured 1.5 s after opening, every minute while the app is on screen, on coming back online and on returning to the app (about 100 KB per minute).
- `public/style.css`: under the logo on phones (white text, coloured icon); a small white pill under the small logo on PC (≥ 851 px).
- Checked in the app browser on the local store at 375 and 1280. Not checked: real numbers on the owner's iPhone over Wi-Fi / mobile data.

### 1.1.170: Closing a product keeps the shop where it was (Claude) — merged, live
- Owner (iPhone): after looking at a product's photos and closing them, the shop jumped back to the top.
- Cause (reproduced in WebKit on the live site: 1470 px → 0): `back-nav.js` adds a history step when photos open and steps back with `history.go` on ✕/Back; the browser then restored the scroll it had saved for that step while `body.gallery-open` locked the page — 0.
- Fix: `back-nav.js` sets `history.scrollRestoration='manual'`; `store.js` remembers the scroll when photos open and returns there on close (focus inside the photos is dropped first); `dialogs.js` returns focus with `preventScroll` and never to `<body>` (iPhone taps don't focus buttons, so the "opener" was the page); `photo-scan.js` returns to the same place when the scanner closes.
- Checked in WebKit (iPhone user agent) on the local store: ✕ and Back both keep the position at 375 (1581 → 1581) and 1280 (1393 → 1393). Test added. Not checked on the owner's iPhone.

### 1.1.169: Photo scan on the server (DINOv2) — accurate matches (Claude) — merged, live, owner confirmed
- Owner (iPhone, 1.1.168): scanning a VALVE PLATE highlighted SHOE PLATE. Owner allowed a new server API and AI model.
- Why 1.1.168 failed: the on-phone MobileNet v2 0.5 gave the right photo only 0.46, while blank/blurred camera frames scored 0.56–0.65, so the scanner locked onto junk before the part was in view; parts shot from another angle were first only ~10 % of the time.
- New `lib/photo-search.js`: DINOv2-small (Meta, Apache-2.0; `models/dinov2-small-q8.onnx`, 24 MB uint8 ONNX from Hugging Face Xenova/dinov2-small) via `onnxruntime-node` 1.20.1 (CPU, one picture at a time). Every photo of every active product is turned into 384 numbers once and kept next to the photo (`platform-media/<shop>/.photo-looks/<id>.dinov2s.f32`); all shops are learned 20 s after the server starts; new photos are learned on the next scan; unreadable photos are skipped. Queries are compared whole and at 70 % / 50 % centre views; best photo per product; top 5 returned.
- New route `POST /api/platform/store/:slug/photo-search` (public shop via `publicShop`, CSRF like orders, 120/min per IP, JPEG/PNG/WebP up to 4 MB) → `{ready:false,learned,total}` while learning, else `{ready:true,matches:[{id,score}]}`. `PHOTO_SEARCH=off` disables it. `.npmrc` skips onnxruntime's CUDA download on Render.
- `public/photo-scan.js`: no on-phone model (removed `public/vendor/`); the scanner sends the part inside the frame (≤640 px JPEG) frame after frame; an answer needs score ≥ 0.6, 0.03 ahead of the next product, the same product twice in a row. Gallery photos show the closest products. Seller shops only.
- Measured on POLESTAR's 641 photos: owner's scan → VALVE PLATE 0.92 (next 0.76); blank 0.31, blurred 0.40; simulated shots from another angle: right product first 48 %, top 3 79 % (MobileNet: ~10 % / ~20 %). Learning all 641 photos: ~50 s on this Mac, server memory ~120–220 MB; a scan ~0.25 s here. Render CPU is slower: not measured.
- Checked: `tests/photo-scan.test.js` runs the real model (two synthetic parts); module run end-to-end on the 641 photos; app flow in the browser with a stubbed server (not ready → wait, 0.35 ignored, 0.92 twice → highlight). Not checked: Render memory/speed and the real iPhone camera (owner, after deploy).

### 1.1.168: Photo scan — live camera, quiet learning, best match highlighted (Claude) — merged, live (wrong matches, see 1.1.169)
- Owner (iPhone, 1.1.167): wants the scan button to open a live scanner at once (like the iPhone code scanner: corner frame, flashlight), no "first time only" learning message, and the closest product highlighted like an Excel search match (not a filtered list). The shop's products have many photos from every side; all are used.
- `public/photo-scan.js` rewritten: the shop's photos are learned quietly in the background a few seconds after the shop opens (one photo per ~120 ms; faster while the scanner is open) and kept in IndexedDB. Scan button → full-screen camera (`getUserMedia`, back camera) with a corner frame, gallery button (saved photo) and a flashlight button when the camera supports it. Every ~350 ms the part inside the frame is compared (whole frame and its centre); the same product first 3 times in a row, clearly ahead of the next, is the answer: the scanner closes, the product card gets a blue highlight (kept when the list redraws) and a strip under the search bar shows the photo, "Best match: …", ˄ ˅ to the next 4 closest, and ✕. Scanning waits until learning has finished ("Getting ready…"), so a half-learned shop cannot answer wrongly. Search word / category are cleared if they hide the match.
- `public/store.js`: list filtering from 1.1.167 removed. `public/style.css`: scanner, highlight, ˄ ˅ styles; progress-bar styles removed.
- Checked in the app browser at 375 with the local store: learning ran silently; a gallery photo and a simulated camera (canvas stream of the part on a table) both found the right product (camera in 1.9 s) and highlighted its card. The real camera is blocked in the app browser: the iPhone camera, permission prompt and flashlight are not verified (owner).

### 1.1.167: Photo search in the shop (scan button in the search bar) (Claude) — merged, live (owner asked for changes, see 1.1.168)
- Owner: a scan button at the right of the search bar; take a photo or pick one from the gallery, and products that look the same are shown (owner chose "photo look", not part-number text).
- New `public/photo-scan.js`: the button opens the iPhone camera / photo library (`<input type=file accept=image/*>`). On the phone, TensorFlow.js + MobileNet v2 0.5 (`public/vendor/`, served from this site because the CSP allows only same-origin scripts; weights re-packed to uint8, 2.0 MB) turns each picture into 1280 numbers. The shop's photos are turned once and kept in IndexedDB (first scan shows "Learning the shop's photos… n / N"); model files are kept with the Cache API, so it works offline after the first use. Matching: the shop-wide average is taken away (white background), the photo is compared whole and at two closer centre crops, best photo per product; top 12 products replace the list (most similar first) until ✕. `public/store.js` `renderProducts` reads `window.photoScanIds`.
- TF.js assigns `regeneratorRuntime` and falls back to `Function()` (blocked by CSP) when the global is missing; the script creates it first.
- Accuracy check with POLESTAR's own photos (30 products, each photo turned into 4 simulated phone shots — rotated, on coloured surfaces, darker): right product first 66 %, in the top 3 92 %. Photos taken from a very different angle, or of the box, match less well. End-to-end at 375: simulated phone photo of RELAY → "Closest match: RELAY", list shows it first; ✕ restores all; PC 1280 button in place. Not checked on a real iPhone camera (owner).
- Files: `public/photo-scan.js`, `public/vendor/` (+ README), `public/store.js`, `public/style.css`, `public/index.html`, `public/sw.js`, `tests/photo-scan.test.js`, version files.

### 1.1.166: Excel — dragging a selection keeps all its rows/columns (Claude) — merged, live
- Owner (Google Sheets video): with 3 cells selected, a sideways drag should grow all 3 rows; ours restarted from the touched cell (one row).
- `public/excel-select.js`: a drag that starts on the selection now grows the whole selection towards the finger (union of the selection and the finger's cell); holding still on the selection no longer shrinks it to one cell. Handles unchanged (they can still shrink).
- Test added; cache tag bumped.
- Checked in the app browser at 375 with the real workbook: B7:B9 dragged sideways from B8 → B7:D9.

### 1.1.165: Excel — drag the selection sideways on iPhone (Claude) — merged, live, owner confirmed
- Owner (iPhone video): dragging down grew the selection, but a sideways drag moved the whole screen and selected nothing.
- iPhone decides at touch-down whether a finger pans, so `preventDefault` in `touchmove` was too late for sideways drags. `public/style.css`: `#excel-grid td.xs-sel, .xs-handle {touch-action:none}` (the selection and its dots never pan), `#excel-grid{overscroll-behavior:contain}` (the sheet's scrolling never pulls the page). `public/excel-select.js`: while dragging a selection near an edge of the sheet, it scrolls (Google Sheets style).
- Test added; cache tags bumped.
- Checked in the app browser at 375 with the real workbook: selected cells report `touch-action:none`, others `auto`; dragging the end dot to the right edge auto-scrolled 168 px and selected columns B–E. Real iPhone: owner.

### 1.1.164: Excel selection polish — drag from the selection, one outline, visible "Copied" (Claude) — merged, live
- Owner (iPhone, 1.1.163 works): "Copied" never showed; dragging only worked from the blue dots; selected cells showed double lines.
- `public/excel-select.js`: a touch that starts on the selection holds back the first move (no page scroll) and, once it moves, selects from that cell; a still touch there still copies. Elsewhere a drag scrolls. The per-cell blue box is replaced by one `.xs-range` outline around the whole selection, drawn over the cell lines. "Copied" is its own `.xs-copied-note` on `document.body` above the full-screen sheet (the shop toast sat behind it). Handles + outline share `.xs-mark`, which the repaint observer ignores.
- `public/style.css`: `.xs-range`, `.xs-copied-note`; `td.xs-active` no longer draws an inset box. Tests updated/added.
- Checked in the app browser with the real workbook: phone 375 (drag from A4 → A4:B6, outline exactly around it, tap → 3 lines copied and "Copied" visible), PC 1280 (outline, no handles). No script errors. Real iPhone: owner.

### 1.1.163: Excel tap-to-select works on iPhone (Claude) — merged, live, owner confirmed
- Owner (iPhone, 1.1.162): tapping a cell selected nothing, so the handles and copy never appeared.
- 1.1.162 selected on the `click` event; iPhone Safari did not deliver it there. `public/excel-select.js` now reads a tap from `touchend` (touch shorter than 500 ms that moved under 8 px, not a handle drag or hold) and ignores the click that may follow; `click` stays for pens/other pointers. Copy runs inside `touchend` (a user gesture, so the clipboard is allowed).
- Test added in `tests/excel-select.test.js`; cache tag bumped.
- Checked in the app browser at 375 with touch events only (no click): tap selects + handles, second tap copies + "Copied". Not checked on a real iPhone: this Mac has no Xcode / iOS Simulator.

### 1.1.162: Excel selection like Google Sheets on phones; tap selection to copy (Claude) — merged, live (tap failed on iPhone, see 1.1.163)
- Owner (iPhone video): scrolling selected the cell under the finger. Wanted: tap where you want, then drag to select (like Google Sheets); tapping the selection again copies it.
- `public/excel-select.js`: touch `pointerdown` no longer selects (a swipe only scrolls); a tap (`click`) selects a cell. On touch screens two blue corner handles (`.xs-handle`, placed in the grid) drag to grow/shrink the selection; hold-and-drag still works. Tapping inside the selection copies it (toast "Copied", short flash). Mouse: clicking the selected single cell again copies it; clicking a cell inside a bigger selection selects that cell; Ctrl/Cmd+C as before. The repaint observer ignores the handles moving (no loop).
- Styles at the end of `public/style.css`. Tests in `tests/excel-select.test.js` updated and added.
- Checked in the app browser with the real workbook: phone 375 (touch-down selects nothing, tap selects + handles, dragging the end handle selects B6:D9 with scrolling blocked, tapping inside copies 4 lines + toast), PC 1280 (drag range, click inside → single cell, click again → copied). No script errors. Not checked on a real iPhone (owner).

### 1.1.161: Excel pictures scale with zoom; tab line only on the open sheet (Claude) — merged, live
- Owner (iPhone): zoomed out, INV's logo stayed big and ran over the address rows; and the coloured line under the sheet tabs should show only on the open sheet.
- `public/excel-map.js` `placeShapes`: anchor offsets (`colOff`/`rowOff`), one-cell sizes, picture frame and shadow are stored at 100 % and are now multiplied by the sheet zoom. `renderTabs` no longer sets each tab's own colour.
- `public/style.css`: `.excel-tab` bottom line is transparent; only `.excel-tab.active` keeps the blue line.
- Checked in the app browser with the real workbook at 375: INV logo vs row 32 at zoom 3 (bottom 364 px, row 32 at 406 px) and 0.3 (37 / 65) — same proportions, no overlap; only the INV tab has a line.

### 1.1.160: Excel viewer — ≡ sheet list like Google Sheets (Claude) — merged, live
- Owner (Google Sheets app screenshots): add a button at the left of the sheet tabs that lists every sheet.
- `public/excel-map.js`: `renderTabs` puts a ≡ button first in `#excel-tabs` (sticky, stays at the left while the tabs scroll). It opens `.excel-sheet-list`: a "Sheets" panel from the bottom (phones) / centred card (≥700 px) listing all sheets, the open one in green; a row opens that sheet, a tap outside or Esc closes. The open sheet's tab is now scrolled into view (it stayed off-screen before when picked far right).
- Styles at the end of `public/style.css` (dark panel like the reference). Cache tags bumped.
- Checked in the app browser with the real workbook: phone 375 (≡ visible, list of 24 sheets, INV picked → 1104 rows, INV tab in view), PC 1280 (centred list). No script errors (the console only had local-server 401/404s from opening a logged-out admin earlier).

### 1.1.159: Product category is required again (Claude) — merged, live
- Owner (iPhone, 1.1.158): a product could be added with no category, and the runaway button showed Category as filled.
- Cause: `public/category-picker.js` made the category field `readOnly`; browsers skip `required` on read-only fields, so neither the form check nor the runaway button saw it as empty.
- Fix: not read-only any more; `inputMode="none"` (no keyboard) and typing / paste / drop are blocked, so the value still only comes from the picker and `required` works.
- Tests: `tests/category-parent-picker.test.js`. Version files and the picker's cache tag bumped.
- Checked in the app browser with the real form at 375: empty category → form invalid, the button runs with "One to go — Category", typing is blocked; after a category is set → "Locked in", form valid.

### 1.1.158: Add Product "runaway" button (Claude) — merged, live
- Owner: when Add Product is pressed with required fields empty, animate like their reference video ("Runaway Login": the button will not stand still until the form is filled).
- New `public/product-runaway.js` (loaded by `admin.html`): with SKU / Category / English name / Price / Stock empty, a tap (phones) or the mouse coming close (PCs) makes the button bolt out of its slot as a pill; a dashed outline marks the slot, a line ties it back, and a status line lists the empty fields ("N fields to fill before it stands still", "One to go — it is slowing down"). Filled required fields get a green outline + check, empty ones an orange outline. Once all are filled it returns to the slot ("Locked in. Go on then."). While saving, the button shows a spinner. Enter still submits through the existing `saveProductForm` (browser validation). Save logic is unchanged.
- Styles at the end of `public/site-admin.css`.
- Checked in the app browser with the real form markup on a temporary page (no admin login locally): phone 375 (bolt, status updates 5 → 2 → 1 → locked in, checks/outlines, spinner) and PC 1280 (mouse dodging). Not checked inside a logged-in admin (owner).

### 1.1.157: Gallery download — parachute falls slowly, save after landing (Claude) — merged, live, owner confirmed
- Owner (iPhone video of 1.1.156): photos came from the saved copies so fast that the parachute flashed and the share sheet opened at once. Wanted: the parachute falls slowly from above onto the bar, and saving shows only after it lands.
- `public/store.js` `downloadGalleryPhotos`: the shown progress is the smaller of the real download progress and time / 3 s, driven by a 30 ms timer (animation frames stop in hidden windows). It sets `--fall` (0→1) and the %; after landing: check + "Complete", 0.5 s, then the share sheet (phones) or the file downloads (PCs). If iOS refuses the late share sheet, the existing "Tap to save" step appears.
- `public/style.css`: while downloading the drop sits at `calc(-40px + var(--fall) * 48px)` (starts above the bar, lands on it), no transition.
- Checked in the app browser: phone 375 — the parachute goes from 44 px above the bar to the bar over ~3 s (6 %, 41 %, 75 %, Complete), share called after landing (~4.3 s); PC 1280 — files saved after landing. No console errors.

### 1.1.156: Download all photos button in the product gallery (Claude) — merged, live
- Owner: add a button that downloads all of a product's photos; design from their reference video (a ring with a down arrow; pressed, the ring unrolls into a progress bar, the arrow floats on a parachute with the %, then a check and "Complete").
- `public/index.html`: `#gallery-download` next to the gallery count. `public/style.css` (end of file): `.gallery-dl*` states idle / downloading / done / save. `public/store.js` `downloadGalleryPhotos`: fetches each photo with byte progress (works offline, photos are cache-first), names files `<product>-<n>.<ext>`. Phones (`pointer:coarse` + `navigator.canShare({files})`) open the share sheet (Save Images → Photos); if the browser refuses it after the download, the button shows "Tap to save" and the next tap opens it. PCs download each file.
- Checked in the app browser: PC 1280 (3 photos → 3 files named correctly, idle / 33 % with parachute / 100 % / Complete), phone 375 (share path with a stubbed share: "Tap to save" then Complete), no console errors, no sideways scroll. Not checked: the real iPhone share sheet (owner).

### 1.1.155: Saved product photos show at once offline (Claude) — merged, live, owner confirmed
- Owner (installed PC app, internet off, 1.1.154): Fuse Box gallery showed the big photo but thumbnails 2–11 stayed blank.
- All 11 photos were in the offline cache (checked on live). The fetch handler tried the network first and used the cache only after the network failed; offline the network can hang instead of failing, so those requests never finished. The big photo came from the browser's own HTTP cache.
- `public/sw.js`: product photos (`/api/platform/images/<id>`, immutable) are now served from the cache first, and downloaded (and kept, max 900) only when missing. Other images keep network-first.
- Tests: `tests/tenant-install.test.js` (a saved photo answers even when fetch never settles). Version files bumped.
- Checked locally: with the server up, the service worker answers a saved photo from the cache; the store's photos load, no console errors.

### 1.1.154: Offline photos finish on big shops (Claude) — merged, live (645/645 saved in 128 s)
- Live check of 1.1.153 on POLESTAR (100 products, 645 photos, ~180 KB each): after 2 minutes 393/645 photos were saved (61 %) and Settings showed "Offline failed". `store.js` gave the whole download 120 s, and every run downloaded every photo again (`cache:"reload"`).
- `store.js`: the 120 s limit now restarts on every progress message, so it only fails when the download stalls.
- `sw.js` SAVE_OFFLINE: a product photo (`/api/platform/images/<id>`, immutable) already in the offline cache is skipped; one already seen while browsing is copied from the other caches instead of downloaded. Later runs only fetch new photos.
- Tests: `tests/tenant-install.test.js` (saved/seen photos are not fetched again). Version files and cache tags bumped.

### 1.1.153: Offline keeps product photos (Claude) — merged, live (timed out on POLESTAR, see 1.1.154)
- Owner (installed PC app, internet off): Settings said "Offline success" but product photos (gallery 2/3, 3/3) were blank.
- Cause: product photos are served from `/api/platform/images/<id>`, and the offline save skipped every `/api/` address (in `store.js` collect and in the `sw.js` SAVE_OFFLINE filter). Only photos already seen were in the image cache.
- Fix: both allow `/api/platform/images/`; other `/api/` data is still not saved. Offline, the image branch of the fetch handler already falls back to `caches.match`, which finds the saved copy.
- Files: `public/store.js`, `public/sw.js` (+ cache tag in `index.html`), `tests/tenant-install.test.js`, version files.
- Checked locally (port 3008): the save includes the photo URL and skips `/api/products`; with the server stopped, the saved photo URL answers 200 from the cache and the store reloads with all 14 products and 6/6 photos. Real POLESTAR photos can only be checked on the live site after deploy.

### 1.1.152: Offline download progress in Settings (Claude) — merged, live
- Owner: "I can't tell whether offline has finished". Asked for "Offline" on the right of Server storage, a 1–100 % ring while downloading, and a check with "Offline success" at 100 %.
- `public/sw.js` SAVE_OFFLINE posts `{progress,total}` after each batch of 6 files; `public/store.js` passes the percent with the `gearhub:auto-download` event; `public/settings.js` `renderOffline` draws it in `#offline-status` (replaces the storage row's chevron in `index.html`). States: Offline / N% / Offline success / Offline failed. Styles in `style.css` (`.offline-status`, `.offline-ring`, dark mode).
- Tests: `tests/tenant-install.test.js` checks the progress messages. Version files and cache tags bumped.
- Checked in the app browser on a local store (port 3008, no platform mode — locally the platform root redirects `/`, so its service worker cannot install): real download went 0→21→43→64→86→100 % → Offline success; PC 1280 and phone 375, no console errors, no sideways scroll.

### 1.1.151: INV lines like Excel — SR box, WH-1 boxes, blue bar (Claude) — merged, live
- Owner (PC app, ~1625px): "SR border still broken; WH-1 lines don't look good".
- `public/excel-map.js` `edgeAt`/`edgeCss`: each line is now drawn whole inside the cell that owns it (no more half-and-half thick lines). On an edge both cells claim, the right/lower cell's line wins, as in Excel (SR's black left line over D36:F36's thick white right line); the cell that gives way hides its line and its gridline there. Merged cells do this part by part, placed from the border box so they line up with the cells beside (WH-1 top line stuck out 2px).
- Files: `public/excel-map.js` (+ cache tag in `index.html`/`sw.js`), `tests/excel-library.test.js`, version files.
- Checked in WebKit with the real workbook: INV at 1625×1017 (SR box closed, WH-1 boxes even, blue bar straight at row 36) and 440×956; all 24 sheets scrolled at phone size: 0 gaps, 0 jumps.

### 1.1.150: Installed app title bar stays white (Claude) — merged
- Owner (PC app screenshot): the dark green bar at the very top of the installed POLESTAR app should be white like the header below.
- Cause: the page and manifest were already white (1.1.147), but `public/settings.js` `applyTheme` set `<meta name="theme-color">` back to `#183426` in light mode after load. Now `#ffffff` (dark mode keeps `#101a14`).
- Files: `public/settings.js` (+ cache tag in `index.html`/`sw.js`), `tests/manifest.test.js`, version files.
- Checked: after load the meta stays `#ffffff`. The owner should close and reopen the installed app.

### 1.1.149: INV like Excel — logo, centred thick lines, merged edges, cell margin (Claude) — in review
- Owner's screenshot (PC app, wide window): INV logo cut off, borders broken, "22,854,000 DT" box cut, "***" cut.
- Pictures/shapes: a picture's cell no longer forms its own layer (a later picture cell's white background covered the bottom of the logo); shapes sit at z 5 above cells. Frozen cells holding boxes are stacked so earlier (upper/left) ones are on top. Picture frames (`a:ln`, Excel picture styles) and saved outer shadows are drawn from the file.
- Borders: thick lines are centred on the shared edge like Excel (left/upper cell draws the first half) — removes the white notch in INV's blue bar at row 36. A neighbour inside a merged range shows the range's outer edge (E53:G53 with G hidden showed F53's inner red line). Merged cells draw all four sides part by part (O48:Q49 drew row 48's green line on row 49 too).
- Excel's cell margin (column width = text + 5px): `td{padding:0 2px}`; text spill widths follow. Spilling cells sit above neighbouring pinned (frozen) cells, which paint white backgrounds.
- Checked in WebKit at the owner's window size (1625px) and phone size with the real workbook.

### 1.1.148: Excel looks like the file — all rows, no gridlines where off, merged borders, wrapping (Claude) — in review
- Owner: "BC sheet doesn't show all rows" and "INV differs from the original a lot". Reference: the owner's earlier photos of Excel on the laptop (INV top and totals area).
- BC has 2297 rows; the 1500-row cap (from before only nearby rows were drawn) cut it. `MAX_ROWS` is now Excel's 1048576 (`<col>` ranges stop 1000 columns after their start).
- INV/YUAN/GRP/Sheet4 turn gridlines off (`showGridLines="0"`); the viewer drew them anyway → `table.excel-nogrid` hides the light lines, file borders stay.
- Merged cells: the right/bottom edge is taken from the range's last column/row, part by part (INV H34:I34 "NO PAID" lost its red right side; D36:F36 drew D37's green top across E–F). Uneven edges are drawn as background segments.
- Excel wraps only at spaces: Myanmar words stay whole (`.excel-word`), so "NO PAID / ငွေမရှင်းသေး" breaks like Excel.
- Text rotation (`textRotation` 90/180/255/angles) and long text spilling into empty neighbour cells (left/right/centre, stops at text or merges) as in Excel.
- Kept: rows above / columns left of a pane frozen low down stay hidden (owner's Excel photo, 1.1.125: INV starts at row 28 / column C).
- Checked in WebKit with the real workbook: INV top and totals area match the Excel photos (shape colours come straight from the file, e.g. FF00FF); vertical total in O894; BC shows 2296 rows, SLM STOCK 6008 (both were cut at 1500). All 24 sheets at 440px: no gaps/jumps, zoom 3–82 ms. A `:has()` rule made INV zoom take 1.3 s in WebKit; spilled-text cells use a class instead.

### 1.1.147: White installed storefront top bar (Codex) — in review
- Owner asked for the dark top app/browser color to become white and blend into the storefront below.
- Cause: the root page theme-color and installed seller app manifest theme_color were both dark green; iOS standalone status style also requested a dark translucent bar.
- `public/index.html`, `public/manifest.webmanifest`, `lib/tenant-install.js`: set storefront/app theme color to white and iOS standalone status style to default.
- Release version and shell cache bumped; `tests/manifest.test.js` and `tests/tenant-install.test.js` pin white.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/219
- Node 22 checks: static check passed; 304 tests passed. Browser visual check unavailable; no deployment.

### 1.1.146: Excel borders like the file; clean top bar (Claude) — in review
- Owner (iPhone screenshot, BC row 1010): cell borders missing; wants the look exactly like the original file. Also: never again anything smudged/overlapping at the very top.
- Cause 1: the file sets borders on cells' left/top. With collapsed table borders the left/upper cell's light gridline wins a shared edge, so most black lines showed grey (this was true before the recent Excel changes too: 525/525 cell borders identical to 1.1.143).
- Cause 2: with collapsed borders, rows scrolling under the sticky column letters painted their lines and a strip of text over them (WebKit and Chrome).
- `public/style.css`: table uses separate borders; cells and headers draw right/bottom edges only. Search bar fixed to 40px inside the 50px white bar (it was 57px and hung over the column letters); back button centred.
- `public/excel-map.js`: each cell's right/bottom edge = its own border, else the left/top border of the cell to the right/below (inside a merged range: the range's first cell). First shown column/row draw their own left/top.
- Checks (WebKit, owner's real workbook): BC rows 1004–1018 now show black borders like Google Sheets; top bar clean at 440px and 1280px; all 24 sheets scroll with no gaps/jumps; old-vs-new pixel check at the top of all 24 sheets: no line lost (only 1–3px shifts of thick lines, now inside the cell), black lines gained where the file has them; search jumps at 440/1280 still correct; row heights equal (one INV row +1px from a 2px border).

### 1.1.145: Excel search like Google Sheets (Claude) — in review
- Owner (iPhone screenshots): searching hid every row without a match, so the header row disappeared; wanted it like Google Sheets.
- `public/excel-map.js`: search no longer filters rows. `find()` lists matching cells (row by row), selects the first, scrolls it just under the header/frozen rows (and sideways past frozen columns only when they are really frozen), and ˄ ˅ buttons / Enter / Shift+Enter go to the previous/next match (wrapping). Status shows "N found" / "No match". After zoom the same match stays selected.
- `public/excel-select.js`: an `excel-find` event selects the found cell (blue box, lit column letter and row number). A selection made on a freshly drawn table is no longer wiped by the table-replaced observer (a zoomed match kept its box when the next match was selected).
- `public/style.css`: search bar = box + two round arrow buttons.
- Checks: real workbook in WebKit at 375px and 1280px — BC "carrier" (60, incl. jumps to rows 1160–1168), CB "A8-Y26" (44), INV "hitachi", Fast Moving "assy" (90), DEL: match always on screen, exactly one blue box, header row stays; "No match" case. Node 22 check + tests.

### 1.1.144: Faster Excel viewer (Claude) — in review
- Owner: the Excel viewer stutters and feels heavy. Tested with the owner's real workbook (OCT-2026 (Excavator).xlsm, 24 sheets, up to 37,000 cells per sheet; frozen rows/columns, pictures, 1,500 merges).
- `public/excel-map.js`: only rows near the screen are drawn (1200 px above/below; frozen rows always); spacer rows stand in for the rest (bottom spacer in its own `tbody.excel-after` so cut merges end at the drawn part). A merge starts its drawn part at its first row. Drawn rows are measured with fractional heights so spacers stay exact; no spacer above the first rows (an empty row takes a pixel between collapsed borders). Shapes are placed only when their corner row is drawn. `grid.cellText` gives copy the sheet's own text.
- `public/excel-select.js`: cells/headers indexed by position (rebuilt and selection repainted when rows are redrawn); copy reads `grid.cellText`.
- `public/style.css`: spacer rows; `.excel-sheet{overflow-anchor:none}` (browser scroll anchoring moved the sheet ~3000 px per redraw).
- Results (WebKit at 375px, real workbook): zoom 2–110 ms (was 121–448 ms on a Mac, more on phones); sheet switch e.g. CB 210→29 ms, BC revisit 674→53 ms; drag select ~0.1 ms (was 20–46 ms); cells on the page e.g. BC 37,489→~1,900.
- Checks: every sheet scrolled top to bottom in WebKit at 375px (and 6 big sheets at 1280px): no gaps, no jumps. Screenshots vs the previous version at the top of 10 sheets and after scrolling down on 6 (incl. frozen columns, pictures): pixel-identical except one 1-px line under the sticky header on 2 sheets. Selection across redraws, copy of 247 rows incl. undrawn ones, row-number select, search: correct. Chrome 375px: no gaps.
- Known: jumping straight to a far scroll position (scroll-bar drag) can land a few rows from where the old full table would, because undrawn rows' wrapped-text heights are only known once drawn; content is always correct. First open of a very large sheet still spends ~0.4 s reading its XML (once per file).
- Testing notes: WebKit probe = Swift WKWebView runner, local server behind a proxy that strips `upgrade-insecure-requests` and caching; hide the SkyShop splash before snapshots.

### 1.1.143: Phone grass under the working birds layer (Claude) — in review
- Owner's iPhone recording after 1.1.142: picture fast, but the grass didn't sway and the birds vanished once the Codex box appeared.
- Reproduced with a WebKit (WKWebView) probe at 375px: the Codex `<svg>` moved into the page can stay paused at time 0 (`animationsPaused()`), which leaves its birds frozen off-screen. The birds `<img>` layer flies on iPhone (1.1.141).
- `public/platform.js`: the `.sky-codex` box now holds only the picture + grass program and goes under the birds layer (`underBirds`); no SVG is moved in.
- Local WebKit test needs `upgrade-insecure-requests` removed (WebKit upgrades http://localhost); a throwaway proxy was used, nothing changed in the app.
- Validation: Node 22 check + tests; WebKit probe at 375px through the proxy: order picture → grass box → birds layer, grass drawn, birds move, no errors. Not verified on a real iPhone.

### 1.1.142: Swaying grass on phones without a frame (Claude) — in review
- Owner: after 1.1.141 the birds fly on iPhone but the grass doesn't sway like PC. Owner asked to add it.
- `public/platform.js`: on phones, after the picture + birds layer show, the stored phone page's own picture (`img#art`) and birds `<svg>` are placed in a `.sky-codex` box in this page, and its program runs from `GET /scene-asset/phone-script`. No frame, so iPhone doesn't freeze it. The grass canvas stays hidden until 8 frames are drawn (`.drawn`), so there is no black screen. PC keeps the frame.
- `lib/tenant-install.js`: `GET /scene-asset/phone-script` serves the phone page's first `<script>` as JavaScript (404 without a phone page). It runs with this site's rights; only the GearHub owner can upload that page.
- `public/platform.css`: `.sky-codex` layout. Files also: `public/platform.html`, `tests/site-scene.test.js`, version/cache files.
- Validation: Node 22 check + 297 tests. App browser 375px: picture at once, birds fly, grass sways, no frame, no errors; 1280px still the frame. Not verified on a real iPhone.

### 1.1.141: Phones show the picture and flying birds without the Codex frame (Claude) — in review
- Owner's iPhone recording (home-screen app): ~10 s dark screen while the Codex phone page loaded, then the birds stayed frozen inside the frame. Owner chose: phones without the frame (birds fly, picture at once); grass sways on PC only.
- `public/platform.js`: the `.sky-frame` is only created above 600px; phones keep `/scene-asset/phone` + `/scene-asset/phone-layer` (the zip upload already saves both). The phone page stays stored but is not shown.
- Files: `public/platform.js`, `public/platform.html`, `tests/site-scene.test.js`, version/cache files.
- Not verified on a real iPhone (no WebKit here); checked at 375px and 1280px in the app browser.

### 1.1.140: Codex background pages with their own program (Claude) — in review
- Task: Codex's new background zips (picture, birds SVG and a WebGL script that sways the grass) showed only the old still picture on skyshopmm.com. Continues the unmerged `claude/scene-page` branch (its server part is included here; its page part was never uploaded).
- `lib/site-scene.js`: kinds `page` / `phone-page` (whole HTML page, ≤10 MB). `lib/tenant-install.js`: `GET /scene-asset/state` and `/scene-asset/page|phone-page`, served with a CSP `sandbox allow-scripts` header, no outside requests, `frame-ancestors` = the site, no X-Frame-Options.
- `public/platform.js`: an iframe `.sky-frame` over the picture shows the page (phones: phone page, else the PC page unless the phone has its own picture). No `sandbox` attribute: WebKit leaves attribute-sandboxed frames blank; the CSP header sandboxes it. The zip upload keeps a page whole when it has a `<script>` and no outside `src`/`href`; otherwise that side's page is removed. The owner editor shows "Codex page" with a remove button. `public/platform.css`: frame placement matching the picture.
- Files: `lib/site-scene.js`, `lib/tenant-install.js`, `public/platform.js`, `public/platform.css`, `public/platform.html`, `tests/site-scene.test.js`, version/cache files.
- Validation: Node 22 `npm run check` and `npm test` passed (296 tests). Browser (local, `PLATFORM_ENABLED=true`, Codex's Golden_Mountain_PC and Phone_Grass pages saved straight into the local database): 1280px shows the PC page, 375px shows the phone page, birds and grass render, Sign in still opens, no failed requests. Not verified: the owner zip-upload button itself (needs an owner login), and on a real iPhone. The page is black for a few seconds while Codex's page draws its picture.

### 1.1.139: Excel row and cell selection (Codex) — in review
- Task: only a row-number click selects the whole row; a data-cell click selects that cell, and dragging selects a range.
- Cause addressed: pointer handling now resolves a clicked data cell before checking for a row header; the selection script cache key is bumped so deployed clients fetch the corrected behavior.
- Files: `public/excel-select.js`, `tests/excel-select.test.js`, version/cache files.
- Validation: Node 22 `npm run check` and `npm test` passed (294 tests); `node --check public/excel-select.js` passed. Browser verification was unavailable in this environment.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/211.

### 1.1.138: Excel gridlines on filled cells (Codex) — in review
- Task: restore visible cell lines in the Excel viewer, including on filled cells.
- Cause: cells without explicit workbook borders had their border colour changed to match the fill, hiding gridlines.
- Change: keep the viewer's light gridlines on unbordered edges while preserving explicit workbook and conditional-format borders.
- Files: `public/excel-map.js`, `tests/excel-library.test.js`, version/cache files.
- Validation: Node 22 checks and 294 tests passed. Chrome seller shop with the uploaded workbook at 375px and 1280px: INV sheet gridlines on filled cells, red workbook borders, select interactions, scroll/zoom and reload; no page errors. Original workbook used for browser verification.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/210.

### 1.1.137: Excel cell selection and row headers (Codex) — in review
- Task: only row-number taps select a whole row; cell taps select one cell and dragging selects a range.
- Cause: the cell pointerdown handler called selectRow, so all ordinary cell clicks selected a row and mouse dragging started from its first column.
- Change: cell-based anchors restored; phone hold (350 ms) then drag selects a range, quick swipes scroll, and two-finger gestures remain available to the existing zoom handler.
- Files: `public/excel-select.js`, `tests/excel-select.test.js`, version/cache files; no CSS changes.
- Validation: baseline Node 22 checks and 292 tests passed; final checks and all 293 tests passed. Chrome local seller shop at 375px and 1280px: actual cell/row clicks, mouse drag, touch hold-drag, phone swipe scrolling and reload passed without page errors. Temporary CSV fixture; physical iPhone and the owner's workbook not verified.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/209. Owner merges after green CI and deploys manually.

### 2026-10-23 — Claude — 1.1.136 Background zip: Codex single-HTML packages
- Owner: the phone zip from Codex was refused (PC zip worked). It holds only OPEN_ON_PHONE.html: the picture as a data: URI in `img#art` and the moving `<svg>` inline.
- `public/platform.js`: when a zip (or a picked .html) has no separate picture/SVG, `fromHtmlPackage` takes the data: picture and the first `<svg>` out of the HTML. For phones a wide picture is cut to 9:16 at the page's `#art` object-position (88% in Codex's file), so it matches Codex's preview. Checked with the real file: 528×938 picture + 9.5 KB SVG; phone page looks like the preview.
- Test in `tests/site-scene.test.js`.

### 2026-10-23 — Claude — 1.1.135 No broken-image icon on skyshopmm.com
- Live check after 1.1.134: with no moving layer uploaded, `/scene-asset/layer` returned 404 and Chrome drew a small broken-image icon at the top left.
- `lib/tenant-install.js`: a missing layer now returns an empty 1×1 transparent SVG. Test in `tests/site-scene.test.js`.

### 2026-10-23 — Claude — 1.1.134 GearHub owner uploads the skyshopmm.com background
- Owner wants to change the skyshopmm.com background himself, e.g. with the zip Codex makes (background.jpg + animated birds.svg).
- Owner also asked for phones: separate phone picture (`phone`) and phone layer (`phone-layer`); phones without their own use the PC files.
- `lib/site-scene.js` (new): picture (sharp → JPG ≤2600px) and optional moving SVG layer, kept in `platform_meta` "site-scene" and `<dataDir>/platform-media/scene/`. SVGs are cleaned (scripts, on* attributes, foreignObject, outside links removed; non-SVG refused).
- `lib/platform.js`: `POST/DELETE /api/platform/owner/scene/:kind` (picture|layer, owner only, 12 MB); `/owner` returns `scene`.
- `lib/tenant-install.js`: `GET /scene-asset/{picture,phone,layer,phone-layer}`; phone falls back to PC, no picture = built-in drawing. Files are sent directly (a redirect to the sandboxed SVG failed to load in Chrome). SVGs carry CSP `sandbox`; no-cache.
- `public/platform.html/.js/.css`: `<picture>` elements pick `/scene-asset/phone*` under 600px, else `/scene-asset/picture` + `/scene-asset/layer` on top. Owner page has "skyshopmm.com background / နောက်ခံပုံ" with PC and Phone parts, each with preview, Zip upload (opened in the browser; first picture + first SVG are uploaded), picture, SVG and reset buttons.
- Tests: `tests/site-scene.test.js`, `tests/platform.test.js` (owner-only upload), `tests/platform-scene.test.js`.

### 2026-10-23 — Claude — 1.1.133 PC top menu on every page
- Owner: on PC the top menu disappeared on Category (and other non-home pages), so it was hard to get back.
- `public/desktop.css`: at ≥851px the store header shows on every view and is sticky at the top; off the Home page the logo area matches Home (no banner artwork). `style.css` still hides it on phones (bottom menu there).
- Test: `tests/pc-top-nav.test.js`.

### 2026-10-23 — Claude — 1.1.132 skyshopmm.com top menu + Sign in pop-up
- Owner's picture: menu at the top right (Home, About, Service, Contact, Sign in); the shop form shows only after Sign in. About/Service/Contact content comes later (links are #about/#service/#contact for now).
- `public/platform.html`: `#site-nav` in the header (Home has `data-platform-link`, so updates.js does not add its own "My shop" link).
- `public/platform.js`: `body.visitor` when nobody is signed in; Sign in opens `#account` as a pop-up (`body.signin-open`), closed by ×, Esc or a tap outside. Signed-in applicants see their card as before.
- `public/platform.css`: menu, pop-up and phone layout (Sign in top right, links in a second row, scene full screen).
- Test: `tests/platform-scene.test.js`.

### 2026-10-23 — Claude — 1.1.131 Sunset scene on skyshopmm.com
- Owner (video of an illustrated landscape website): use that kind of background on skyshopmm.com instead of the plain one.
- `public/images/platform-scene.svg`: original drawing (not copied from the video): sunset sky, mountain range with a sunlit peak, lake, grass; clouds drift, birds fly, grass sways; motion stops with prefers-reduced-motion.
- `public/platform.html`/`platform.css`: shown only for visitors (`body.onboarding`); fixed full screen on PC, a top picture on phones with the card below it. Header text turns white over the scene. Shop owners' control pages are unchanged.
- Test: `tests/platform-scene.test.js`.

### 2026-10-23 — Claude — 1.1.130 skyshopmm.com opens "My shop"
- Owner: skyshopmm.com should land on /platform.html (Apply / Review / Approved).
- `server.js`: `GET /` redirects 302 to `/platform.html` (query kept) when `PLATFORM_ENABLED=true`. GearHub's own store is still at `/index.html`; `/shops/<slug>/` is unchanged.
- Test: `tests/root-to-platform.test.js`.

### 2026-10-23 — Claude — 1.1.129 Update no longer stops at 80%
- Owner: with the app open, "Updating… 80%" stayed until the app was closed and opened again.
- Cause (`public/updates.js`): `apply()` set `reloading=true`, then (new worker waiting) only posted `APPLY_UPDATE`. The `controllerchange` handler `reloadWhenSafe()` returns when `reloading` is true, so nothing reloaded.
- Fix: in that branch `apply()` reloads itself on `controllerchange`, or after 4 s if the switch never comes. `registration.update()` now times out after 15 s.
- Tests: new case in `tests/updates.test.js` (fails on the old code); cache tag in `tests/keep-category-draft.test.js`.

### 2026-10-23 — Claude — 1.1.128 Search bar + Excel folder button
- Owner's picture: a white search pill and a square folder button beside it; Excel opens only from that folder button, not from Settings.
- `public/index.html`: the search section holds `.search-pill` (SVG magnifier + `#search`) and `#excel-library-open.excel-folder-button` (folder icon). The top-bar Excel button and the Settings "Excel files" row are removed.
- `public/excel-library.js`: the folder button shows only in seller shops (`open.hidden=!slug`).
- `public/style.css` / `public/desktop.css`: pill and folder button styles (phone and PC).
- Tests: `tests/excel-library.test.js`, `tests/excel-auto-upload.test.js` (cache tag).

### 2026-10-23 — Claude — 1.1.127 Excel: selection visible on filled cells, pinch zoom out
- Owner: tapped selection did not show on many cells (BC, INV); INV could only zoom bigger.
- Cause: `cellStyle` wrote `background:` (shorthand), which removed the blue `background-image` of `.xs-sel` on every filled cell. Now `background-color:`.
- Zoom: `excel-map.js` has its own sheet zoom 30%–300% (two-finger pinch on phones, Ctrl+wheel / trackpad pinch on PC). Widths, row heights and fonts are drawn at the zoom; while pinching the table is scaled live, then redrawn keeping the scroll position. `#excel-grid{touch-action:pan-x pan-y}` + `gesturestart` preventDefault stop the page zoom inside the sheet.
- Tests in `tests/excel-library.test.js`.

### 2026-10-23 — Claude — 1.1.126 Excel viewer draws shapes and pictures
- Owner: INV row 28 totals (16,111,720, 38,251,500 PSM, DT, JSM, 831,682) were missing. They are Excel shapes linked to cells (`textlink="ERCK!AS206"`), not cell values.
- `public/excel-map.js`: `readDrawing` reads the sheet's drawing (shapes `sp` with fill/line/text and theme colours incl. lumMod/lumOff; pictures `pic` from xl/media). The saved linked value inside the shape is shown. `placeShapes` puts each shape inside the td under its top-left corner, so it scrolls and stays frozen with that cell; columns reached by shapes are drawn. The zip reader can now return a Blob (`read(name,true)`).
- `public/style.css`: freeze-pane z-index layers reworked (cells < frozen cols 10 < frozen rows 20 < corner 30 < row numbers 40 < letters 50); a shape's cell is lifted 5 in its layer (`.excel-shape-host`).
- Tests in `tests/excel-library.test.js`.

### 2026-10-23 — Claude — 1.1.125 Excel freeze panes start where Excel froze them
- Owner's photo: Excel shows INV from row 28 / column C (frozen at C28), the web showed row 1 and columns A-B.
- `public/excel-map.js`: the frozen area starts at the sheet view's `topLeftCell`; rows above and columns left of it are not shown (like Excel). Merges are cut at these lines. Frozen columns now stick when at least 120px is left to scroll (PC); on phones they scroll.
- Number formats: `?` shows as a space, so accounting zero `"-"??` shows `-` (was `-??`).
- Tests updated in `tests/excel-library.test.js` and `tests/excel-select.test.js`.

### 1.1.124: Select an Excel row from any cell (Codex) — in review
- Task: owner wants a complete blue row selection like Google Sheets, without needing to tap the left row number.
- Change: clicking or tapping any cell selects every visible cell in that row; clicking its row number still works. Mouse drag and Shift+click range selection remain available.
- Files: `public/excel-select.js`, version/cache files, `tests/excel-select.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/196
- Notes: Node 22 `npm run check && npm test` passed (279 tests). Interactive 375px/1280px browser checks are unavailable in this environment.

### 1.1.123: Reliable Excel full-row selection (Codex) — in review
- Task: tapping or clicking an Excel row number selects its complete visible row, like Google Sheets.
- Cause: the earlier code calculated the range from column headers, which is unreliable when the displayed row contains hidden columns or merged cells.
- Files: `public/excel-select.js`, cache/version files, `tests/excel-select.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/195
- Notes: Node 22 `npm run check && npm test` passed (279 tests). Interactive 375px/1280px browser checks are unavailable in this environment.

### 2026-10-23 — Claude — 1.1.122 Excel viewer looks like the original file
- Owner wants view-only Excel that looks exactly like the file in Excel.
- `public/excel-map.js`:
  - Reads conditional-format styles (`<dxfs>`, "automatic" colour = black) and each sheet's `<conditionalFormatting>`. Rules run by priority: formulas (refs, `$`, comparisons, `& + - * /`, OR/AND/NOT/ISBLANK/LEN/TRIM/UPPER/LOWER/ABS/ISNUMBER/IF), duplicate/unique, blanks/non-blanks, cellIs, containsText. Unknown formulas are skipped. This fixed the POLESTAR INV rows that were white-on-white.
  - Rows with `hidden="1"` are hidden even without `ht`. Hidden columns are left out completely (merges count only visible rows/columns; `data-c` stays the sheet index).
  - Freeze panes from `<pane state="frozen">`: frozen rows stick under the letters; frozen columns stick only when they use at most half the view (else they scroll, so phones can still move). A merge never crosses the freeze line.
- `public/style.css`: freeze-pane sticky rules at the end.
- Tests: `tests/excel-library.test.js` runs the formula engine; `tests/excel-select.test.js` header pattern updated.

### 1.1.121: Excel auto upload from the shop's Windows PC (Claude) — in review
- Task: the owner edits the Excel file every day on a Windows PC and wants it uploaded to the shop by itself, without visiting the site.
- How it works: in the shop's Excel panel the owner presses "Download PC auto upload". The server makes a per-shop upload key (only its SHA-256 is stored; a new key replaces the old one), and the browser builds a `.bat` file carrying it. Double-clicking the `.bat` once on the PC:
  - asks for the Excel file;
  - saves a PowerShell watcher in `%LOCALAPPDATA%\SkyShopExcelUpload`;
  - adds a hidden start-up entry in the Startup folder (no admin rights needed).
  The watcher checks every minute and uploads the file after each save, even while Excel has it open.
- Files:
  - `lib/platform-model.js`: `platform_upload_keys` table.
  - `lib/platform.js`:
    - `POST /api/platform/spreadsheets/auto-upload` takes the key in `X-Upload-Key`, needs no session or CSRF (it sits before the CSRF middleware), is rate limited, and replaces the shop's spreadsheet.
    - `GET/POST /shops/:id/upload-key` is for the owner only, through `shopFor`.
  - `public/excel-auto-upload.js` (new; builds the `.bat`).
  - `public/excel-library.js`: button and status.
  - `public/index.html`, `public/style.css`, SW shell, version files, `tests/excel-auto-upload.test.js`.
- PR: (this PR). Replaces #192, which clashed with #191 on version 1.1.120.
- Also fixes main: #191 (Codex) again pasted truncated tool output into `public/style.css` ("Warning: truncated output" at the top and "…2332 tokens truncated…" on line 390). About 9 KB of real CSS was lost, and #191's CI failed but it was merged. The lost CSS is restored from 50616fa; #191's one real CSS change (`#excel-grid tbody th[data-r]{cursor:pointer}`) is kept.
- Notes: the watcher sends `Origin` because `originGuard` blocks POSTs without one. Not run on a real Windows PC yet; the script was only reviewed.

### 1.1.120: Select a full Excel row (Codex) — in review
- Task: clicking or tapping an Excel row number selects the complete row, matching Google Sheets.
- Cause: `excel-select.js` accepted pointer events only from cells, so row headers were ignored.
- Files: `public/excel-select.js`, `public/style.css`, version/cache files, `tests/excel-select.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/191
- Notes: Node 22 `npm run check && npm test` passed (275 tests). Interactive browser verification at phone and PC widths was unavailable in this environment.

### 1.1.119: Cart on phones reaches the bottom edge (Claude) — completed
- Task: tapping Cart on a phone showed a dark band around the bottom nav's round corners and notch. The empty-cart drawer stopped 86 px above the bottom, so the dark overlay showed through.
- Files: `public/style.css` (phone: `#drawer` and the empty-cart drawer use `bottom:0`, with `padding-bottom:calc(96px + safe area)` so content stays above the nav), tags, version files, `tests/liquid-nav.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/190

### 1.1.118: Select cells in the Excel viewer (Claude) — completed
- Task: in the Excel viewer, cells could not be selected. Now they can be selected like a spreadsheet:
  - click or tap a cell (blue outline);
  - drag with the mouse, or Shift+click, to select a range (tinted, with the row numbers and column letters highlighted);
  - Ctrl/Cmd+C copies the range as rows and columns; Esc clears.
- Files:
  - `public/excel-select.js` (new).
  - `public/excel-map.js`: cells get `data-r`/`data-c` (plus `data-r2`/`data-c2` for merges); headers get `data-c`/`data-r`.
  - `public/style.css`: `.xs-sel`, `.xs-active`, `.xs-head`; no text dragging on a mouse.
  - Tags, version files, `tests/excel-select.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/188

### 1.1.117: Excel viewer top bar clean; every Excel file works offline (Claude) — completed
- Task: remove the blurred grey band at the top of the Excel full-screen viewer, and make every uploaded Excel file work offline automatically.
- Files:
  - `public/style.css`: white card, a 50 px white top bar, plain search input (no iOS shading), and the sheet starts below the bar.
  - `public/sw.js`: new `EXCEL_CACHE`. `/api/platform/spreadsheets/:id` is cache-first (each upload has a new id). `/api/platform/store/:slug/spreadsheets` is network-first with an offline copy.
  - `public/excel-library.js`: `keepOffline()` runs 3 s after every shop visit, when the phone comes back online and right after an upload. It saves the current file(s) and deletes old ones.
  - Tags, version files, `tests/excel-offline.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/187

### 1.1.116: PC product cards tilt with the mouse (Claude) — completed
- Task: the owner's video, PC only. Moving the mouse over a product card tilts it towards the pointer in 3D, lifts the photo forward (scale 1.1, follows the pointer) and moves a soft light with the pointer. Phones and touch screens get nothing.
- Files: `public/card-tilt.js` (new; only for `(hover:hover) and (pointer:fine) and (min-width:851px)` with a mouse pointer; resets when the mouse leaves), `public/desktop.css` (tilt styles inside the PC hover media block; off for reduced motion), tags and SW shell, version files, `tests/card-tilt.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/186

### 1.1.115: Opening picture always sharp; real Loading; Updating flowers finish (Claude) — completed
- Task: on a slow line the opening picture loaded slowly, stuttered, looked blurred or showed only blue. The owner wants:
  - the picture always sharp;
  - Loading that moves only when the line moves, and nothing at all on a fast line;
  - the Updating animation always played to the end, and repeated only on a slow line;
  - Settings → Refresh to show the same animation.
- Cause: the built-in pictures had no `?v=`, so the server sent `no-store` and every visit downloaded them again. The service worker was network-first for images, and the splash background was blue.
- Files:
  - `lib/tenant-install.js`: versioned pictures (`SPLASH_IMAGE_V`).
  - `public/sw.js`: the pictures are precached and served cache-first for `/images/skyshop-splash-*` and `/splash-asset/pc|phone`.
  - `public/skyshop-splash.js`:
    - the picture fades in only after `decode()`;
    - the counter moves on real steps only (15 / 70 / 70–99 / 100);
    - the Loading box shows only when slow;
    - the flowers continue across the reload (`gh-bloom-start`) and the screen leaves only at full bloom;
    - both pictures are saved for next time.
  - `public/skyshop-splash.css`: paper background, picture fade, Loading box visibility.
  - `public/updates.js`: reports `progress(40)` after `registration.update()`.
  - `public/settings.js`: Refresh shows the Updating screen.
  - Tags, version files and tests.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/185

### 1.1.114: Looping flower animation while Updating (Claude) — completed
- Task: the owner's video. While the app updates, a dark screen shows pink flowers growing (stems, leaves, grass, gold sparkles). The scene fades and grows again in a 6 s loop until 100%. It is drawn with SVG and the Web Animations API, so no video file is downloaded.
- Files: `public/skyshop-splash.js` (`bloom()` is called from `prepareUpdate`), `public/skyshop-splash.css` (dark background; the picture is hidden while updating), `lib/tenant-install.js` (`SPLASH_V`), sw tag, version files, tests.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/184
- Notes: the 0–100% counter is unchanged. Reduced motion shows the scene without movement.

### 1.1.113: "Updating…" counts 0–100% (Claude) — completed
- Task: the Updating screen showed a full bar with no number. Now it counts from 0%, and the shop opens only at 100%.
- Files:
  - `public/skyshop-splash.js`: `showUpdating()` counts up to 60% while the new version downloads, then to the step that `updates.js` reports (80%). It stores the number in `gh-update-splash:<scope>`, and the reloaded page continues from it.
  - `public/updates.js`: keeps the splash handle and reports `progress(80)` once the new worker is installed.
  - `lib/tenant-install.js` (`SPLASH_V`), tags in index/admin/sw, version files, tests.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/183

### 1.1.112: Press and drag along the phone bottom nav (Claude) — completed
- Task: the owner's recording (iPhone tab bar). Pressing the bottom nav and dragging left or right moves the bubble with the finger. The tab under the finger rises and shows its label, and letting go opens that tab. A plain tap works as before.
- Files: `public/liquid-nav.js` (pointer events; drag starts after 8 px; the bubble is clamped to the first and last tab; the leftover click is swallowed; `place()` pauses while dragging), `public/style.css` (`touch-action:none` on the nav, `.liquid-dragging` and `.liquid-hover` styles), tags and version files, `tests/liquid-nav.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/182

### 1.1.111: Phone bottom nav sits on the bottom edge (Claude) — completed
- Task: the floating bar left a gap under it where the page showed through. The bar now touches the bottom and both sides, keeps round top corners, and is white down to the screen edge (home-bar area included).
- Files: `public/style.css` (`left/right/bottom:0`, safe-area padding inside the bar, `border-radius:24px 24px 0 0`), tags and version files, `tests/liquid-nav.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/181

### 1.1.110: Opening screen shows 0–100% and never reveals an empty shop (Claude) — completed
- Task: show a 0–100% counter on the opening screen and open the shop only at 100%. If the shop cannot load (offline, server down), keep showing the picture and never the GearHub template without the shop's data.
- Files:
  - `public/skyshop-splash.js`: the counter follows real steps (page, shop data, first-screen pictures). It never passes 75% before the data arrives. The 12 s cap is removed. On failure it says Retrying and retries every 5 s and when the phone comes back online. A reload starts as a plain cover and shows the picture after 0.7 s.
  - `public/skyshop-splash.css`: counter styles.
  - `public/store.js`: sends `gearhub:store-shown` when `catalogLoaded` (live or saved offline copy) and `gearhub:store-failed` otherwise, and adds `window.GearHubStore.retry()`.
  - `lib/tenant-install.js` (`SPLASH_V`), tags, version files, tests.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/180

### 1.1.109: Phone bottom nav matches the owner's picture (Claude) — completed
- Task: make the open tab obvious, exactly like the owner's picture, without changing icon colours. The bar floats with round corners, the notch has smooth shoulders, and the open tab sits in a white bubble with a bold black label.
- Files: `public/style.css` (floating bar, SVG notch mask that moves with `--liquid-x` via `mask-composite`, white bubble, `#111` bold label, dark-mode versions), tags and version files, `tests/liquid-nav.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/179
- Notes: the owner said do nothing beyond the picture. Never change the icon colours (no line or black icons).

### 1.1.108: Phone bottom nav "liquid" animation (Claude) — completed
- Task: the owner's screen recording. On phones the open tab's icon rises into a round bubble that sits in a curved notch of the bar. Tapping another tab slides the bubble and the notch there (0.5 s), and the label shows only under the open tab.
- Files: `public/liquid-nav.js` (new; follows `.active` set by store.js and sets `--liquid-x` / `--liquid-lift`), `public/style.css` (phone-only `.mobile-bottom-nav.liquid` block, `@property --liquid-x`), `public/index.html` / `public/sw.js` tags, version files, `tests/liquid-nav.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/178
- Notes: the shop's white bar and colour icons are kept (the video has a dark bar). PC is unchanged; it uses the top navigation. Turned off for reduced motion.

### 1.1.107: Updating screen stays until the shop is ready; no double reload (Claude) — completed
- Task: during an update, and on reload, the page shook, and GearHub's template or other pictures flashed before the shop's own content. The owner wants a quiet "Updating…" picture (no sound) until everything is ready behind it.
- Cause: the splash left 0.8 s after `load`, before the shop's name, banner and products arrived. A reload had no cover at all. One update could reload twice (`apply()` and `controllerchange`).
- Files:
  - `public/skyshop-splash.js` holds the screen until `gearhub:store-shown` and the first-screen pictures have loaded (12 s cap). Update: "Updating…" picture, no sound, at least 1.2 s. Reload: a plain cover in the page colour.
  - `public/skyshop-splash.css`: quiet cover and a moving bar.
  - `public/store.js` sends `gearhub:store-shown` after `init()`.
  - `public/updates.js` reloads once and never reloads a page that already has the server's version.
  - `lib/tenant-install.js` (`SPLASH_V`), tags in index/admin/sw, version files, tests.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/177

### 1.1.106: Add-to-cart button animation (Claude) — completed
- Task: the owner's video. Tapping a product card's cart button rolls a cart in, drops a box into it and rolls it out (1.3 s). The button then becomes a green circle with a tick and a ring pulse (1.3 s), and returns to normal.
- Files: `public/store.js` (`playCartButton`, called from `addCart` after the stock check), `public/style.css` (`.cart-fx*` styles and `cart-fx-*` keyframes, top level for PC and phone), `public/index.html` / `public/sw.js` tags, version files, `tests/cart-button-animation.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/176
- Notes: the existing photo-flies-to-cart animation is kept. Turned off when the device asks for reduced motion. Only `.products .product .add` buttons animate; the small "+" in the category list is unchanged.

### 1.1.105: PC product cards lost their styles; CSS restored (Claude) — completed
- Task: on PC, product cards showed black squares for View photos / Add to cart and an unstyled quantity box.
- Cause: commit efd756f (1.1.102, Codex) pasted truncated tool output into `public/style.css`. The text "Warning: truncated output…" went in at the top, and "…131 tokens truncated…" replaced real lines, including the `}` that closes an `@media(max-width:850px)` block. Everything after it became phone-only.
- Files: `public/style.css` (restored from 7f682de; Codex's Excel search changes kept), `scripts/check-static.js` (fails on truncation text or unbalanced CSS braces), `tests/css-integrity.test.js`, `AGENTS.md` 9.11, version files.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/175

### 1.1.104: No unstyled page during a deploy; no dark title bar in the PC store app (Claude) — completed
- Task: while Render restarts during a deploy, the shop page showed without its styles (black icons, old nav). The installed PC store app also showed a dark title bar with the shop name.
- Files: `public/sw.js` (a failed or 5xx `.css`/`.js` uses a saved copy, matched with `ignoreSearch`; a 5xx page navigation opens the saved shop page), `lib/tenant-install.js` and `server.js` (store manifests get `display_override:["window-controls-overlay","standalone"]`; the admin manifest is unchanged), `public/desktop.css` (white drag strip in `display-mode:window-controls-overlay`), version files, `tests/safe-deploy-titlebar.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/174
- Notes: updates still reach people only after the owner deploys on Render. Merging alone changes nothing live. Already-installed apps pick up the new manifest when Chrome next checks it (can take up to a day), or after a reinstall.

### 1.1.103: PC store navigation in the top header (Claude) — completed
- Task: on PC (≥851px) Home / Category / Promotion / Cart / Settings sit in the top header with outline icons; the active page has a light-green pill. The language button beside the Excel icon is hidden on PC. Phones keep the bottom nav.
- Files: `public/index.html` (`<nav class="desktop-top-nav">`), `public/desktop.css`, `public/sw.js`, version files, `tests/desktop-top-nav.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/173
- Notes: the buttons reuse `data-store-view` / `data-store-action="open-cart"`, so `store.js` needs no change. The phone rule is `.nav .desktop-top-nav{display:none}` because `.nav nav{display:flex}` would otherwise win.

### 1.1.102: One Excel file and in-sheet search (Codex) — in review
- Task: keep only one uploaded Excel workbook per seller shop and let the owner search a sheet while it is open in the app.
- Cause: each upload inserted a new spreadsheet record, so the library rendered every previous file and had no search control for sheet rows.
- Files: `lib/platform.js` (safe, shop-scoped spreadsheet replacement; list only the newest file), `public/excel-map.js`, `public/style.css`, cache/version files, `tests/excel-library.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/172
- Notes: Node 22 `npm run check && npm test` passed (237 tests). Browser testing at 375px and 1280px was unavailable on this machine and must be completed before merging.

### 1.1.101: Plant icon and a continuous line beside "Add" rows (Claude) — completed
- Task: main categories use a plant (sprout) icon instead of a gear, and the green line beside "Add Child subcategory" / "Add Subcategory" was broken.
- Cause of the break: those Add rows have a 1px border, which moved their connector origin by 1px. Their `::before`/`::after` now use `left:calc(var(--cx) - 1px)` and `top:-12px`.
- Files: `public/admin.js` (`CATEGORY_GEAR` renamed to `CATEGORY_PLANT`, new SVG), `public/site-admin.css`, `public/admin.html`, `tests/category-tree.test.js`, plus the version files.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/170

### 1.1.100: Category editor as a tree (Claude) — completed
- Task: the owner wants the admin Product Categories editor to look exactly like their tree design: green gear square for main categories, green folder squares for sub/child categories, green connector lines, product-count pills ("1 product" / "N products"), and › (closed) / ⌄ (open) chevrons. "Add Child subcategory" / "Add Subcategory" are tree rows with a round green plus.
- Files: `public/admin.js` (`categoryRowMarkup`: icon span, count pill, chevron, add button markup), `public/site-admin.css` (tree block scoped to `#category-manager-rows`; the Myanmar name, the "Main category · N" line and the pencil are hidden; `grid-template-columns:minmax(0,1fr)` keeps rows on screen), `public/admin.html` (cache tags), `tests/category-tree.test.js`, plus the version files.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/169
- Notes: tapping a name still opens its editor; swipe-to-delete, the parent picker, + Subcategory and save are unchanged. Connector geometry uses `--cx` (line x) and `--mid` (row centre) per depth; keep them in sync if you change icon or row sizes.

### 1.1.99: Excel sheet opens full screen (Claude) — completed
- Task: the owner wants the opened sheet to fill the screen like Google Sheets on a phone, with only one back arrow in the top-left corner.
- `public/excel-map.js`: opening a sheet puts the modal in `.excel-fullscreen` (covers the store's bottom navigation). A floating `#excel-fs-back` leaves it, and closing the panel also leaves it. The table width is now set to the exact sum of column widths: before, the browser stretched column A, e.g. 149px instead of 40px for width 5. Filled cells hide gridlines unless they have their own border, like Excel/Sheets.
- `public/style.css`: full-screen rules. The title, status and the linking/import panel are hidden in full screen.
- Checked with the owner's real workbook (24 visible sheets, 565 rows on CB) at phone 375px and PC 1280px.
- Files: `public/excel-map.js`, `public/style.css`, `public/index.html`, `public/sw.js`, `tests/excel-library.test.js`, plus the version files.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/168
- Notes: the linking/import panel is not reachable in full screen. The owner said to do the remaining Excel work later.

### 1.1.98: Quiet seller splash during app updates (Codex) — in review
- Task: during an app update or refresh, keep the POLESTAR seller splash visible with `Updating…` so GearHub content never flashes. Update transitions do not play splash sound; normal app openings retain the configured splash sound.
- Files: `public/updates.js`, `public/skyshop-splash.js`, `public/skyshop-splash.css`, `lib/tenant-install.js`, cache/version files, and the splash regression test.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/167
- Notes: Node 22 local validation passed: `npm run check && npm test` (233 passing), plus syntax checks for both changed browser scripts. Browser verification is still required before merge.

### 1.1.97: Excel files open like a spreadsheet (Claude) — completed
- Task: the owner wants an uploaded workbook to look like Excel/Google Sheets in the app (owner screenshot: sheet tabs CB/PT/JN/BC/ERCK, column letters, row numbers, coloured cells, merged title row, dates like 1-Oct-26).
- `public/excel-map.js` was rewritten as a readable viewer. It reads the ZIP, workbook, sheet relations, theme colours (with tint), styles (fonts, fills, borders, alignment, number formats), shared strings, merged cells, column widths and row heights. It has tabs for every visible sheet (hidden sheets are skipped) and shows up to 1500 rows × 60 columns. The header row for linking is the first row with at least two values. Linking, import and owner access are unchanged.
- `public/style.css`: `.excel-sheet` grid (sticky letters and row numbers, gridlines), `.excel-tabs`, and a wider card while a sheet is open. Removed the 110px cell minimum inside the viewer.
- Files: `public/excel-map.js`, `public/style.css`, `public/index.html`, `public/sw.js`, `tests/excel-library.test.js`, plus the version files.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/166
- Notes: old binary `.xls` cannot be previewed (download only). Formulas show their saved value.

### AGENTS.md section 9: engineering rules (Claude) — completed
- Task: the owner asked to write down the mistakes from 1.1.84–1.1.95 so they are not repeated. `AGENTS.md` now has section 9: no direct pushes to main, `npm run check && npm test`, single-backslash regexes, `gearhub-shell-v85-<version>`, matching `?v=` tags in `sw.js`, `shop_id` scoping, no data-wiping imports, modal/`hidden` patterns, phone + PC browser tests, honest reports.
- Files: `AGENTS.md`, `AI_COLLABORATION.md` (docs only; no version bump).
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/165
- Notes: **Both agents: read AGENTS.md section 9 before every task.**

### 1.1.96: Excel View opens in the app, phones get Excel, import keeps unlinked data (Claude) — completed
- Task: the owner reported that "View" still downloaded the file (1.1.95), and asked for Excel on phones.
- Fixes:
  1. `public/excel-map.js` had double-escaped regexes again (`\\/`, `\\d`, `\\.csv`, `\\r?\\n`, `\\uFEFF`), a syntax error, so the preview never ran. Main also failed `every public/*.js file parses`.
  2. The import route's `UPDATE platform_products … WHERE id=?` was not scoped to `shop_id` (failed `tenant-isolation`). It also overwrote unlinked fields: stock became 0 and category became empty. Now it uses `COALESCE(?,col)` and `WHERE id=? AND shop_id=?`, so only linked, non-empty cells change.
  3. The GearHub owner can import into any shop (same as upload). Back restores the upload form only for people who saw it, and the file list hides while a sheet is open.
  4. Phones: Settings has an "Excel files" row (seller shops only) that opens the same panel. The column pickers use two columns on phones.
- Files: `public/excel-map.js`, `public/excel-library.js`, `public/index.html`, `public/style.css`, `public/sw.js`, `lib/platform.js`, `tests/excel-library.test.js`, plus the version files.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/164
- Notes: **Codex: inside JS regex literals, use single backslashes; run `npm run check && npm test` and open a PR; do not push to main.**

### 1.1.95: Map Excel columns to products (Codex) — completed
- Task: preview Excel data in-app and let the owner select column-to-product mappings before importing.
- Files: `lib/platform.js`, `public/excel-map.js`, `public/index.html`, `public/style.css`, plus release files.
- Notes: matching SKU updates a product; new SKU creates one.

### 1.1.94: Excel library accepts .xlsm (Claude) — completed
- Task: the owner's workbook `OCT-2026 (Excavator).xlsm` was greyed out in the file picker.
- Files: `lib/platform.js` (`spreadsheetFile` accepts `.xlsm` with a ZIP signature; the stored type now comes from the checked extension, not the browser, so an upload is never served as a web page), `public/index.html` (`accept` list), `tests/excel-library.test.js`, plus the version files.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/162
- Notes: the upload limit is still 10 MB per file, and it counts against the shop's storage.

### 1.1.93: Excel library fixed and usable in every shop (Claude) — completed
- 1.1.93 additions: the GearHub owner can upload Excel files to any shop (`excel-library.js` looks the shop up in `/api/platform/owner`; the server already allowed it), and visitors no longer see the upload form (`.excel-library-card form[hidden]{display:none}` in `style.css`, which overrode `hidden`).
- Task: the owner reported that the Excel icon from 1.1.91 did nothing.
- Three bugs: (1) `public/excel-library.js` had `/^\\/shops\\/…/` (double backslashes), a syntax error, so the whole script never ran. (2) The panel only removed `hidden`, but `.modal` is `display:none` until it also gets `.open`. (3) `GET /api/platform/store/:slug/spreadsheets` selected `created_at`, which `platform_files` does not have, so it failed with SQLITE_ERROR ("Platform temporarily unavailable").
- Files: `public/excel-library.js`, `lib/platform.js`, `public/index.html` and `public/sw.js` (`excel-library.js` tag), `tests/excel-library.test.js`, plus the version files.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/160 (1.1.92) and https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/161 (1.1.93)
- Notes: 1.1.91 went to `main` without a PR, so CI never ran; `npm run check` and the `every public/*.js file parses` test both failed on `main`. **Codex: always open a PR and wait for CI, and run `npm run check && npm test` locally first.** On phones the Excel icon is still hidden (1.1.91 design); only PC shows it.

### 1.1.91: Storefront Excel library (Codex) — completed
- Task: add an Excel icon beside the language button; shop owners can upload Excel files and visitors can open uploaded files.
- Files: `lib/platform.js`, `lib/platform-model.js`, `public/index.html`, `public/excel-library.js`, `public/style.css`, plus release files.
- Notes: uploads require the authenticated owner of that shop; every visitor can open an uploaded file. Files accept .xlsx, .xls and .csv up to 10 MB.

### 1.1.90: "+ Subcategory" inside the category edit panel (Claude) — completed
- Task: let the owner add a subcategory straight from a main category's edit panel, without expanding it first.
- Files: `public/admin.js` (edit actions get a `data-category-command="add-sub"` button: "＋ Subcategory" for main categories, "＋ Child subcategory" for subcategories, nothing at level 3; the category draft is now saved only when there are unsaved edits, and an empty draft is never restored, because an empty draft showed no categories and Save would have removed them), `public/admin.html`, `tests/category-add-sub-in-edit.test.js`, plus the version files.
- Also fixed: after 1.1.89, `public/sw.js` cached `style.css?v=…banner-top-1` while `index.html` loaded `…desktop-nav-logo-1`, so the `share-store` offline-shell test failed on main. `tests/category-banner-top.test.js` no longer pins a `style.css` tag.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/158
- Notes: **Codex: when you change a `?v=` tag in `index.html`, change the same one in `public/sw.js` (SHELL list), and run `npm test` before merging.**

### 1.1.89: Restore desktop home logo (Codex) — completed
- Task: show the shop logo and name again in the PC home navigation while keeping its navigation artwork hidden.
- Files: `public/style.css`, `public/index.html`, `public/sw.js`, `package.json`, `package-lock.json`, `tests/tenant-install.test.js`.
- Notes: phone navigation is unchanged.

### 1.1.88: Category page banner at the top (Claude) — completed
- Task: on the storefront Category tab, remove the category title (e.g. "Electrical Parts") above the banner so the banner sits at the top.
- Files: `public/style.css` (title and subtitle hidden outside products mode; the whole header row is hidden at ≤850px, where its search button was already hidden), `public/index.html` and `public/sw.js` (`style.css` cache tag), `tests/category-banner-top.test.js`, plus the version files.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/156 (replaces #155, which conflicted with Codex's 1.1.87)
- Notes: products mode (inside a category) is unchanged. `store.js` still sets the h2 text; it is just hidden.
- Also fixed again: 1.1.87 set `CACHE_NAME` to `gearhub-shell-v86-…`, which fails `npm run check` (`scripts/check-static.js` requires `gearhub-shell-v85-<version>`). **Codex: keep the `v85-` prefix and run `npm run check` before merging.**

### 1.1.87: Hide storefront navigation image on desktop (Codex) — completed
- Task: remove the navigation/profile banner image from the PC storefront only.
- Files: `public/style.css`, `public/index.html`, `public/sw.js`, `package.json`, `package-lock.json`, `tests/tenant-install.test.js`.
- Notes: the banner remains available on phone screens; desktop hides only the top navigation artwork.

### 1.1.86: New categories stay until saved (Claude) — completed
- Task: about 10–20 seconds after the owner added a new category (before Save), it disappeared.
- Cause: the 20-second order poll (`admin-extras.js` → `refreshAll()`) ends with `loadCategoryManager()`, which redrew the editor from the server and wiped unsaved rows.
- Files: `public/admin.js` (`loadCategoryManager` returns early while `window.__gearhubCategoryDirty` is set), `public/admin.html`, `tests/keep-category-draft.test.js`, plus the version files.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/153
- Notes: anything else that `refreshAll()` redraws must also respect unsaved edits.

### 1.1.85: App updates never reload under unsaved edits (Claude) — completed
- Task: while the owner was adding a new category, an app update (after a deploy) reloaded the page and threw them back to the dashboard.
- Files: `public/updates.js` (`blocked()` now also waits while an input, textarea or select is focused, or while `window.__gearhubCategoryDirty` is set), `public/admin.js` (`markCategoriesDirty()` on add, edit, parent pick, move and remove; cleared after a successful save), `public/admin.html`, `public/index.html`, `public/sw.js` (`updates.js` cache tag), `tests/keep-category-draft.test.js`, plus the version files.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/152 (replaces #151, which conflicted with Codex's 1.1.84)
- Notes: if you add another editor with unsaved state, set a similar flag and add it to `blocked()` in `updates.js`.
- Also fixed: `tests/tenant-install.test.js` still expected the old service worker cache name (`gearhub-shell-v85-1.1.83`), so it failed on main after 1.1.84. When you bump `CACHE_NAME` in `public/sw.js`, update that test too. Keep the `gearhub-shell-v85-<version>` prefix: `scripts/check-static.js` (CI) requires it, and the `v86` name broke CI.

### 1.1.84: Android launch screen uses the original round shop icon (Codex) — completed
- Task: remove the blue Android launch/background color and show the shop’s original logo as a round icon.
- Files: `lib/tenant-install.js`, `public/index.html`, `public/sw.js`, `package.json`, `package-lock.json`, `tests/tenant-install.test.js`.
- Notes: tenant manifests now use a white launch background; generated shop icons have transparent corners and a white circular face. Reinstall/update the Android app to refresh its launcher icon.

### 1.1.83: One add button in the category editor (Claude) — completed
- Task: remove the top "＋ Add Category" button. Keep only "+ Add Main Category" under the list.
- Files: `public/admin.html`, `public/admin.js` (its listener removed), `tests/one-add-category.test.js`, plus the version files.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/149
- Notes: `#add-category` no longer exists. Use `#add-main-category` (and the per-row "Add Subcategory").

### 1.1.82: Category save frees the editor at once (Claude) — completed
- Task: after **Save Categories**, Add/Save went dead until the whole page reloaded. On phones this took long, and a failed reload reported the save as failed.
- Files: `public/admin.js`, `public/admin.html`, `tests/category-save.test.js`, plus the version files.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/147
- Notes: after the PUT succeeds, `refreshAll()` runs in the background (`.catch(()=>{})`). Do not `await` it again inside the save handler.

### 1.1.81: Admins stay signed in (Claude) — completed
- Task: admins were sent back to login every 8 hours and during every deploy.
- Files: `server.js` (30-day `rolling` session, `SESSION_MAX_AGE`), `public/admin.js`, `public/tenant-admin.js` (wait up to ~2 minutes on a 5xx before showing login), `tests/stay-signed-in.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/146
- Notes: sessions are stored in SQLite (`sessions` table), so restarts keep them.

### 1.1.80: Parent category uses the Add Product picker (Claude) — completed
- Task: in the category editor, **Parent category** now opens the same picker as Add Product instead of a native `<select>`.
- Files: `public/category-picker.js` (new `window.GearHubCategoryPicker.open({...})`), `public/admin.js`, `tests/category-parent-picker.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/145
- Notes: options are `allowNone`, `mainSelectable` and `allowed(row)`. The Add Product behaviour (a main category can't be picked) is unchanged.

### 1.1.79: Phones tap a category to edit it (Claude) — completed
- Task: hide the ✎ button on phones (≤600px); tapping the category heading opens or closes its editor.
- Files: `public/admin.js`, `public/site-admin.css`, `tests/category-tap-edit.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/144

### 1.1.78: Order alerts reconnect by themselves (Claude) — completed
- Task: a device with notification permission that the server no longer knows (for example, after the domain change) is re-subscribed silently, unless alerts were turned off on purpose.
- Files: `public/admin-extras.js`, `tests/order-push.test.js`.
- PR: https://github.com/uoakkarkyaw2002-commits/gearhub-industrial/pull/143

## 2026-11-05 — Claude (account 1) — 1.1.329 bottom-bar press-and-drag back

- Owner: "Button navigation can no longer be pressed and dragged like before." Cause: fb-nav.css (1.1.309) hid the liquid bubble and froze the tab icons, so a drag had no visible feedback; style.css also gave the bar touch-action:manipulation, letting the browser take a sideways finger move.
- Fix (CSS only, public/fb-nav.css): bar touch-action:none; while .liquid-dragging the old bubble is drawn as the light green pill under the finger (no lag), the hovered icon grows a little; release opens that tab (existing liquid-nav.js logic, unchanged). Tap unchanged. PC unaffected (rules are inside max-width:850px).
- Files: public/fb-nav.css, public/index.html + public/sw.js (fb-nav tag, cache), package.json/lock, tests/tenant-install.test.js, new tests/nav-drag.test.js, mailbox.
- Verified: Node22 npm run check + npm test 495/495. WebKit iPhone 13 (390px) on local /shops/polestar/ (build 1.1.329): drag Home → Profile, pill centred on the finger mid-drag (x195 over Category), release opened Profile, plain tap still opens Home, no page errors. Real iPhone touch not verified.

## 2026-11-05 — Claude (account 1) — 1.1.330 Followers / Following lists

- Owner (Profile + Message screenshots): "Followers / Following cannot be seen; Message has no Followers list." The Profile only showed counts and Message → Followers only had a "View profile" button (the API had no list).
- New read-only route GET /api/platform/profile/:slug/people?list=followers|following (lib/shop-profile.js; no schema change; requested by the owner). Followers = people following the shop, named like comments (their own shop name + logo + link, SkyShopMM for the GearHub owner, else the Google name; never an email). Following = open shops the shop's owner follows. Max 500, newest first.
- New public/follow-list.js/.css (shared list). profile-menu.js: Followers / Following counts open a sheet with two tabs. noti-chat.js: Message → Followers shows the list (GearHub Home uses gearhub).
- Tests: tests/shop-profile.test.js (lists, no email, default list, 404). Node22 check + test 495/495. WebKit iPhone 13 local /shops/polestar/ as owner: Profile → Followers (Kaizen Beauty with logo + link, Ko Aung with initials), Following tab (Kaizen Beauty), Message → Followers same list; PC 1280 panel OK; no page errors. Real iPhone not verified.

## 2026-11-05 — Claude (account 1) — 1.1.331 background preload + App speed list

- Owner: "The app feels slow. Put a list in Settings comparing the fastest possible speed with the current speed" and "download in the background so it opens very fast when the user looks".
- New public/speed-warm.js/.css. (1) 4 s after the shop data is ready (fallback 9 s after load), when idle and not on Data saver / 2G: first photo of the first 30 products, then Discover (GearHubShops.warm, first 10 posts' photos + logos), then the Profile (GearHubProfileWarm, first 6 posts' photos). 3 photos at a time, low priority, same immutable URLs (browser cache). (2) Settings row "App speed" under Share My Store → sheet with Fastest / Now / Fast-OK-Slow for Internet speed, Server reply (best of 3 x /api/app-release), App opening, Products list, Photo download (Resource Timing), Discover, Profile, Background ready; Check again.
- shops-feed.js: warm() + Discover data kept 5 min (was 60 s) before reloading on open. profile-menu.js: window.GearHubProfileWarm. net-speed.js: window.GearHubNetSpeed {last,test,label}. No server/API/DB change.
- Tests: new tests/speed-warm.test.js; net-speed + shop-feed tag pins updated on purpose. Node22 check + test 496/496. WebKit iPhone 13 + PC 1280 local /shops/polestar/: warm finished (Discover 29 ms, Profile, 7/7 photos), Discover tab showed posts in ~94 ms, App speed sheet filled all 8 lines, no page errors. Local numbers are not real phone/Render numbers; live iPhone not verified.

## 2026-11-05 — Claude (account 1) — 1.1.332 AI helper robot

- Owner: "Add a small AI robot for questions and answers; every question about how to use this app must work; nothing unrelated may be asked."
- New public/ai-help.js/.css: a floating robot (existing images/product-ai-robot.png) above the phone bottom bar / bottom-right on PC, which opens a chat. It is free and runs on the phone (no paid AI, no server call, works offline): about 40 help entries in English + Myanmar (search, scan, Excel, category, promotion, cart, order, payment, Discover, comments, follow, Profile, posts, add product, Dashboard, chat, notifications, sign-in, install, language, theme, share QR, speed, offline, refresh, bottom bar, create shop, other shops, storage, photos, delete account). It matches keywords and answers in the question's language. Some answers have a button that opens the place. Anything else gets "I can only answer questions about using this app". Chips offer common questions. Hidden while searching or while another dialog is open.
- Tests: new tests/ai-help.test.js (app questions matched in both languages; capital of France / poem / weather / maths / joke refused; tags). Node22 check + test 497/497. WebKit iPhone 13 + PC 1280 local /shops/polestar/: robot sits above the bottom bar, order/home-screen answered, France refused, Open Cart button opened the cart, Myanmar question answered in Myanmar, no page errors. Real iPhone not verified.

## 2026-11-05 — Claude (account 1) — 1.1.333 AI helper fixes from the owner's iPhone

- Owner's iPhone screenshots: "Product ဘယ်လိုထည့်ရလဲ" and "App အသုံးပြုနည်း ပြောပြပါ" were refused; with the keyboard up, the page showed under the typing box.
- ai-help.js: keywords with spaces match when all their words are in the question in any order (mixed Myanmar/English). About 120 more phrasings (MORE map), plus new entries: editproduct (price/stock/edit/delete → Dashboard → Products, swipe to Recycle Bin) and myorder (order status → 🔔, 💬). While the keyboard is up (visualViewport), the dialog is set to the visible area (top/height), the chips hide, and there is no bottom safe-area padding.
- tests/ai-help.test.js: 18 more real questions + 4 more off-topic refusals. Node22 check + test 497/497. WebKit iPhone 13: both owner questions answered; keyboard emulated via innerHeight → dialog 0–664 = visual viewport, form ends at the keyboard top; restored after. A real iPhone keyboard is not verified.

## 2026-11-05 — Claude (account 1) — 1.1.334 AI helper: iPhone Myanmar mark order

- Owner's live iPhone (GearHub 1.1.333): "Product ဘယ်လိုထည့်လဲ" was still refused, and "Category အသုံးပြုနည်းပြောပြ" gave the general help list.
- Cause: the iPhone keyboard typed ထည့် as ထ ည ် ့ (103A before 1037), while the keywords use the canonical order (1037 103A). ai-help.js now NFC-normalizes the question and the keywords. The general "help" entry only answers when no topic matched.
- tests/ai-help.test.js: iPhone mark order, Category/Excel + "အသုံးပြုနည်း", "help me". Node22 check + test 497/497. Not checked on a real iPhone. Live check: skyshopmm.com/api/app-release = 1.1.329 (shops), preview=gearhub = 1.1.333.

## 2026-11-05 — Claude (account 1) — 1.1.335 AI helper Go step-by-step guide

- Owner: "After the answer add Go; pressing it shows step by step how to press."
- ai-help.js: answers with a guide (TOURS, 30 ids: addproduct, post, editcategory, profile, dashboard, editproduct, follow, search, scan, excel, clear, category, promotion, cart, order, discover, othershop, chat, noti, install, language, theme, share, speed, save, offline, refresh, nav) show a "Go ▶" button instead of the old open-place button. Go closes the chat. On each step the real button glows (.ai-tour-target outline + pulse), a 👆/👇 finger points at it, and a card shows "Step n / N", the text, Close and Next. Tapping the glowing button, or Next (which taps it), goes to the next step after 450 ms. Missing buttons (e.g. owner-only for buyers) are waited for 2.5 s, then the card says so. The card lives inside an open modal dialog when there is one (only it can be touched), with a fixed-position offset probe. While the guide runs, body.ai-touring hides the robot button.
- tests/ai-help.test.js: every guide belongs to an answer; key guides have 2+ steps. Node22 check + test 497/497. WebKit iPhone 13 local POLESTAR: owner "Product ဘယ်လိုထည့်လဲ" Go → Profile → + Add → Business (card inside the sheet dialog) → final text → Done; buyer install guide Profile → ☰ → Add to Home Screen; PC 1280 highlights the top-nav Profile; no page errors. Real iPhone not verified.

## 2026-11-05 — Claude (account 1) — 1.1.336 AI Assistant look from the owner's picture

- Owner's picture: the AI button is a woman assistant with a headset on a pale green rounded card; her bun rises above the card; a green chat bubble with ··· sits at the top right and a white pill with a green "AI" circle and "Assistant" sits below. Later: "I want the whole face and hair visible."
- Her photo was cut from the owner's screenshot with a scratchpad swift script: inside the card everything is kept; above it only the hair (ellipse, white removed with soft alpha). Files: public/images/assistant.png (button) and assistant-face.png (chat avatar, whole head including the bun, ?v=2). The card border/shadow, bubble and pill are CSS, sized from the picture (86x102 css px, right 13 px, bottom 84 px + safe area; PC scale 1.15). Chat avatars are rounded squares (object-fit contain) so nothing is cut. The texts say "AI Assistant".
- Compared side by side with the owner's picture at the same scale (scratchpad ai/cmp-big.png): the same layout, card, bubble and pill. The photo is soft because it comes from a screenshot. Node22 check passes; ai-help + tenant-install tests pass (full suite 497/497 before the avatar tweak). WebKit iPhone 13 + PC 1280, no page errors. Real iPhone not verified.
