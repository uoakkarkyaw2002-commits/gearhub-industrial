/* 1.1.332 owner: a small AI robot that answers questions about using this app — and nothing else.
   It runs on the phone itself (no paid AI service, no server call, works offline): the question is matched
   against the app's own help list in English and Myanmar; anything not about the app gets a polite "I can
   only help with this app". Answers can carry a button that opens the right place. */
(()=>{
 if(!document.querySelector('.mobile-bottom-nav'))return;
 const ui={en:{title:'AI Assistant',sub:'Ask how to use this app',hello:'Hi! I am the AI Assistant 👋 Ask me how to use this app — searching, ordering, Discover, Profile, chat, Settings and more.',
   placeholder:'Ask about this app…',send:'Send',close:'Close',open:'Ask the AI helper',
   only:'Sorry, I can only answer questions about using this app. Try one of these:',try:'You can ask:'},
  my:{title:'AI Assistant',sub:'App အသုံးပြုနည်း မေးပါ',hello:'မင်္ဂလာပါ။ AI Assistant ပါ 👋 ဒီ app ကို ဘယ်လိုသုံးရမလဲ မေးပါ — ရှာနည်း၊ မှာနည်း၊ Discover၊ Profile၊ Chat၊ Settings စသည်ဖြင့်။',
   placeholder:'App အကြောင်း မေးပါ…',send:'ပို့မယ်',close:'ပိတ်မယ်',open:'AI အကူကို မေးမယ်',
   only:'တောင်းပန်ပါတယ်၊ ဒီ app အသုံးပြုနည်းကိုပဲ ဖြေပေးနိုင်ပါတယ်။ ဒါတွေ မေးကြည့်ပါ:',try:'မေးလို့ရတာတွေ:'}};
 const pageMy=()=>document.documentElement.lang==='my';
 // [id, keywords, English answer, Myanmar answer, optional button {view|click, en, my}]
 const K=[
  ['hello',['hello','hi ','hey','good morning','မင်္ဂလာ','ဟယ်လို','ဟိုင်း','နေကောင်း'],'Hello! Ask me anything about using this app.','မင်္ဂလာပါ။ App အသုံးပြုနည်း ဘာမဆို မေးပါ။'],
  ['who',['who are you','what are you','your name','မင်းဘယ်သူ','နာမည်ဘယ်လို','ဘာလဲ မင်း','robot','ရိုဘော့','ai '],'I am the AI Assistant of this app. I only answer questions about how to use this app.','ကျွန်မက ဒီ app ရဲ့ AI Assistant ပါ။ App အသုံးပြုနည်းကိုပဲ ဖြေပေးပါတယ်။'],
  ['search',['search','find','look for','sku','part no','ရှာ','ရှာဖွေ','ရှာချင်'],'1. Type the product name, SKU or Part No in the search bar at the top of Home.\n2. Results show at once.\n3. The green filter button on the left chooses Product or Excel.','1. Home အပေါ်က search bar မှာ ပစ္စည်းနာမည်၊ SKU ဒါမှမဟုတ် Part No ရိုက်ပါ။\n2. ရလဒ်တွေ ချက်ချင်း ပေါ်လာပါမယ်။\n3. ဘယ်ဘက်က အစိမ်းရောင် filter ခလုတ်နဲ့ Product / Excel ရွေးလို့ရပါတယ်။',{view:'home',en:'Go to Home',my:'Home သွားမယ်'}],
  ['clear',['trash','clear search','bin','delete search','ရှာတာဖျက်','အမှိုက်ပုံး','ရှင်း'],'To empty the search: tap the filter button and choose Trash — the bin clears what you typed.','ရှာထားတာကို ဖျက်ချင်ရင် filter ခလုတ် နှိပ်ပြီး Trash ကို ရွေးပါ — အမှိုက်ပုံးက ရိုက်ထားတာကို ရှင်းပေးပါတယ်။'],
  ['scan',['scan','camera','photo search','picture search','ကင်မရာ','ပုံနဲ့ရှာ','ဓာတ်ပုံနဲ့','စကန်'],'1. Tap the scan icon at the right end of the search bar.\n2. Allow the camera.\n3. Point it at the part — the matching products appear.','1. Search bar ညာဘက်ထိပ်က scan icon ကို နှိပ်ပါ။\n2. ကင်မရာ ခွင့်ပြုပါ။\n3. ပစ္စည်းကို ချိန်ပြပါ — တူတဲ့ ပစ္စည်းတွေ ပေါ်လာပါမယ်။'],
  ['excel',['excel','sheet','xlsx','spreadsheet','ဇယား','အက်ဆယ်'],'1. Tap the green filter button next to the search bar and choose Excel.\n2. Type what you look for — matching rows of the shop\'s Excel file show.\n3. Use ˄ ˅ to move between matches.\nShop owners upload Excel files in the Dashboard.','1. Search bar ဘေးက အစိမ်း filter ခလုတ် နှိပ်ပြီး Excel ရွေးပါ။\n2. ရှာချင်တာ ရိုက်ပါ — ဆိုင်ရဲ့ Excel ထဲက ကိုက်တဲ့ အတန်းတွေ ပေါ်ပါမယ်။\n3. ˄ ˅ နဲ့ တစ်ခုပြီး တစ်ခု ကြည့်ပါ။\nဆိုင်ပိုင်ရှင်က Dashboard မှာ Excel file တင်ပါတယ်။'],
  /* 1.1.407 owner: the assistant knows the credit (receivables) list and can open it. */
  ['debtlist',['debt','debts','credit list','receivable','receivables','who owes','owes me','outstanding','unpaid','အကြွေး','ကြွေးကျန်','ကြွေးရ','ငွေကြွေး','အကြွေးရရန်'],'The credit list ("တစ်ဦးချင်းစီ အကြွေးရရန်ရှိ စာရင်း") is in the shop\'s Excel file, on the STM sheet, under the invoice rows. It lists each customer with the total amount owed, the percentage, and how much belongs to PSM, DT and JSM.\nTap the button below and I will open the Excel file on the STM sheet at that list.\nOn the STM sheet, the ⬇ button in front of an invoice number saves that invoice as a picture.','"တစ်ဦးချင်းစီ အကြွေးရရန်ရှိ စာရင်း" က ဆိုင်ရဲ့ Excel ဖိုင်ထဲ STM sheet မှာ၊ invoice တွေရဲ့ အောက်ဘက်မှာ ရှိပါတယ်။ ဖောက်သည်တစ်ယောက်ချင်းစီရဲ့ အကြွေးစုစုပေါင်း၊ ရာခိုင်နှုန်း၊ PSM / DT / JSM အလိုက် ပမာဏ ပါပါတယ်။\nအောက်ကခလုတ်ကို နှိပ်ရင် Excel ဖိုင်ကို STM sheet မှာ အဲဒီစာရင်းဆီ တိုက်ရိုက် ဖွင့်ပေးပါမယ်။\nSTM sheet မှာ invoice နံပါတ်ရှေ့က ⬇ ခလုတ်ကို နှိပ်ရင် အဲဒီ invoice ကို ပုံအဖြစ် သိမ်းပေးပါတယ်။',{run:'debt',en:'Open the credit list',my:'အကြွေးစာရင်း ဖွင့်မယ်'}],
  ['category',['category','categories','collection','type of','အမျိုးအစား','ကဏ္ဍ','ကက်တဂိုရီ'],'Tap the four-squares icon in the bottom bar to see all categories, then tap one to see its products.','အောက်ခြေ bar က လေးကွက် icon ကို နှိပ်ရင် အမျိုးအစား အားလုံး ပေါ်ပါတယ်။ တစ်ခု နှိပ်ရင် အဲဒီ ပစ္စည်းတွေ ပေါ်ပါမယ်။',{view:'category',en:'Open Category',my:'Category ဖွင့်မယ်'}],
  ['promotion',['promotion','discount','sale','offer','deal','လျှော့ဈေး','ပရိုမိုးရှင်း','ပရိုမို','အထူး'],'Tap the green Promotion banner on Home to see the special deals.','Home က အစိမ်းရောင် Promotion banner ကို နှိပ်ရင် အထူးလျှော့ဈေးတွေ ကြည့်လို့ရပါတယ်။',{view:'promotion',en:'Open Promotion',my:'Promotion ဖွင့်မယ်'}],
  ['cart',['cart','basket','add to cart','ခြင်း','ဈေးခြင်း','စျေးခြင်း','ထည့်ထား'],'1. Open a product and tap Add to cart.\n2. The cart icon in the bottom bar shows how many items you have.\n3. Tap it to see, change or remove items.','1. ပစ္စည်းကို ဖွင့်ပြီး Add to cart နှိပ်ပါ။\n2. အောက်ခြေ bar က ခြင်းတောင်း icon မှာ ပစ္စည်း အရေအတွက် ပြပါတယ်။\n3. အဲဒါကို နှိပ်ရင် ကြည့်၊ ပြင်၊ ဖယ်လို့ ရပါတယ်။',{click:'.mobile-bottom-nav .bottom-nav-cart',en:'Open Cart',my:'Cart ဖွင့်မယ်'}],
  ['order',['order','checkout','buy','purchase','place order','how to buy','အော်ဒါ','မှာချင်','မှာယူ','မှာနည်း','ဘယ်လိုမှာ','ဝယ်ချင်','ဝယ်နည်း','ဘယ်လိုဝယ်'],'1. Add products to the cart and open the Cart.\n2. Tap Checkout and fill in your name, phone and delivery address.\n3. Transfer the money to the shop\'s bank / mobile account shown on the page.\n4. Type the transaction reference and upload a photo of the receipt (required).\n5. Tap Place order — the shop checks the payment and confirms.','1. ပစ္စည်းတွေကို ခြင်းထဲ ထည့်ပြီး Cart ဖွင့်ပါ။\n2. အော်ဒါတင်ရန် နှိပ်ပြီး အမည်၊ ဖုန်း၊ ပို့ရမယ့် လိပ်စာ ဖြည့်ပါ။\n3. စာမျက်နှာမှာ ပြထားတဲ့ ဆိုင်ရဲ့ ဘဏ်/မိုဘိုင်း account ကို ငွေလွှဲပါ။\n4. Transaction reference ရိုက်ပြီး ငွေလွှဲပြေစာ ဓာတ်ပုံ တင်ပါ (မဖြစ်မနေ)။\n5. အော်ဒါတင်မည် နှိပ်ပါ — ဆိုင်က ငွေလွှဲ စစ်ပြီး အတည်ပြုပေးပါမယ်။',{click:'.mobile-bottom-nav .bottom-nav-cart',en:'Open Cart',my:'Cart ဖွင့်မယ်'}],
  ['cantorder',['cannot order','can\'t order','order not working','order button','မှာလို့မရ','အော်ဒါတင်လို့မရ','နှိပ်လို့မရ','မရဘူး'],'If Place order cannot be pressed: check that every field and the receipt photo are filled in. If the page shows no bank / payment details, the shop has not added them yet — ask the shop with 💬 at the top.','အော်ဒါတင်မည် နှိပ်လို့ မရရင် အကွက်တွေနဲ့ ပြေစာ ဓာတ်ပုံ အကုန် ဖြည့်ပြီးပြီလား စစ်ပါ။ ဘဏ်/ငွေလွှဲ အချက်အလက် မပေါ်ရင် ဆိုင်က မထည့်ရသေးလို့ပါ — အပေါ်က 💬 နဲ့ ဆိုင်ကို မေးပါ။'],
  ['payment',['pay','payment','kbz','wave','aya','cb pay','transfer','receipt','ငွေလွှဲ','ငွေပေး','ပြေစာ','ငွေချေ'],'Payment is by bank or mobile transfer to the shop\'s account shown at checkout. After paying, type the transaction reference and upload the receipt photo, then place the order.','ငွေပေးချေမှုက အော်ဒါတင်တဲ့နေရာမှာ ပြထားတဲ့ ဆိုင်ရဲ့ ဘဏ်/မိုဘိုင်း account ကို ငွေလွှဲတာပါ။ လွှဲပြီးရင် transaction reference ရိုက်၊ ပြေစာ ဓာတ်ပုံ တင်ပြီး အော်ဒါတင်ပါ။'],
  ['discover',['discover','feed','post','posts','compass','trending','new arrival','ပို့စ်','ဒစ်စကာဗာ','သံလိုက်'],'Tap the compass in the bottom bar. Feed shows every shop\'s posts; Following shows the shops you follow; Trending and New Arrivals sort them. Tap ❤ to like, 💬 to comment, the bookmark to save, Buy Now to order.','အောက်ခြေ bar က သံလိုက်အိမ်မြှောင် icon ကို နှိပ်ပါ။ Feed မှာ ဆိုင်အားလုံးရဲ့ post တွေ၊ Following မှာ follow ထားတဲ့ ဆိုင်တွေ၊ Trending / New Arrivals နဲ့ စီကြည့်လို့ရပါတယ်။ ❤ နဲ့ like၊ 💬 နဲ့ comment၊ bookmark နဲ့ သိမ်း၊ Buy Now နဲ့ မှာပါ။',{view:'shops',en:'Open Discover',my:'Discover ဖွင့်မယ်'}],
  ['like',['like a post','like button','likes','unlike','heart','❤','လိုက်ခ်','နှလုံး'],'Tap ❤ under a post to like it (sign in with Google the first time). Tap again to unlike.','Post အောက်က ❤ ကို နှိပ်ရင် like ပါတယ် (ပထမဆုံး Google နဲ့ ဝင်ရပါမယ်)။ ထပ်နှိပ်ရင် ပြန်ဖြုတ်ပါတယ်။'],
  ['comment',['comment','reply','sticker','မန့်','ကွန်မန့်','ပြန်ဖြေ','စတစ်ကာ'],'1. Tap 💬 under a post and write your comment — you can add a sticker or a photo.\n2. Tap Reply under a comment to answer it.\n3. Press and hold your own comment for Delete / Edit / Copy.','1. Post အောက်က 💬 နှိပ်ပြီး comment ရေးပါ — sticker ဒါမှမဟုတ် ဓာတ်ပုံ ထည့်လို့ရပါတယ်။\n2. Comment အောက်က Reply နဲ့ ပြန်ဖြေပါ။\n3. ကိုယ့် comment ကို ဖိထားရင် Delete / Edit / Copy ပေါ်ပါတယ်။'],
  ['save',['saved','bookmark','save post','သိမ်း','သိမ်းထား'],'Tap the bookmark under a post to save it. See all saved posts in Settings → Saved.','Post အောက်က bookmark ကို နှိပ်ရင် သိမ်းပါတယ်။ သိမ်းထားတာ အကုန် Settings → Saved မှာ ကြည့်ပါ။'],
  ['follow',['follow','follower','followers','following','ဖော်လို','ဖောလို'],'Open a shop\'s Profile and tap Follow. Tap the Followers or Following numbers on a Profile to see the people. Message → Followers also lists them.','ဆိုင်ရဲ့ Profile ဖွင့်ပြီး Follow နှိပ်ပါ။ Profile ပေါ်က Followers / Following ဂဏန်းကို နှိပ်ရင် လူစာရင်း ပေါ်ပါတယ်။ Message → Followers မှာလည်း ကြည့်လို့ရပါတယ်။',{view:'profile',en:'Open Profile',my:'Profile ဖွင့်မယ်'}],
  ['profile',['profile','my page','ပရိုဖိုင်','ကိုယ့်စာမျက်နှာ'],'Tap the person icon at the right of the bottom bar. ☰ at the top left opens Settings; the shop owner\'s pencil at the top right edits the photo, name, caption and details.','အောက်ခြေ bar ညာဘက်ဆုံးက လူပုံ icon ကို နှိပ်ပါ။ ဘယ်ဘက်ထိပ်က ☰ က Settings ဖွင့်ပါတယ်။ ဆိုင်ပိုင်ရှင်အတွက် ညာဘက်ထိပ်က ခဲတံနဲ့ ပုံ၊ နာမည်၊ caption၊ အချက်အလက် ပြင်ပါတယ်။',{view:'profile',en:'Open Profile',my:'Profile ဖွင့်မယ်'}],
  ['post',['personal post','write post','new post','upload photo','ပို့စ်တင်','post တင်','ဓာတ်ပုံတင်'],'Shop owner: Profile → + Add → Personal. Write text, add photos and tap Post. It shows on your Profile and in Discover.','ဆိုင်ပိုင်ရှင်: Profile → + Add → Personal။ စာရေး၊ ဓာတ်ပုံထည့်ပြီး တင်မယ် နှိပ်ပါ။ ကိုယ့် Profile နဲ့ Discover မှာ ပေါ်ပါမယ်။',{view:'profile',en:'Open Profile',my:'Profile ဖွင့်မယ်'}],
  ['addproduct',['add product','new product','business','sell product','sell my','start selling','how to sell','product upload','ပစ္စည်းထည့်','ပစ္စည်းတင်','ပစ္စည်း ရောင်း','ရောင်းချင်','ရောင်းဖို့','ရောင်းရန်','ဘယ်လို ရောင်း'],'Shop owner: Profile → + Add → Business. Fill in SKU, Part No, name, price, stock and photos, then Save. You can also use Dashboard → Add Product.','ဆိုင်ပိုင်ရှင်: Profile → + Add → Business။ SKU၊ Part No၊ နာမည်၊ ဈေး၊ လက်ကျန်နဲ့ ဓာတ်ပုံ ဖြည့်ပြီး Save နှိပ်ပါ။ Dashboard → Add Product ကနေလည်း ထည့်လို့ရပါတယ်။',{view:'profile',en:'Open Profile',my:'Profile ဖွင့်မယ်'}],
  ['editcategory',['add category','edit category','new category','sub category','category ထည့်','အမျိုးအစားထည့်'],'Shop owner: Profile → + Add → Category to add or edit main and sub categories.','ဆိုင်ပိုင်ရှင်: Profile → + Add → Category ကနေ Main / Sub အမျိုးအစား ထည့်၊ ပြင်ပါ။'],
  ['dashboard',['dashboard','admin','manage shop','orders list','စီမံ','ဒက်ရှ်ဘုတ်','အော်ဒါစာရင်း'],'Shop owner: Profile → Dashboard (crown). There you manage products, orders, Excel files, payment details and the shop\'s settings.','ဆိုင်ပိုင်ရှင်: Profile → Dashboard (သရဖူ)။ အဲဒီမှာ ပစ္စည်း၊ အော်ဒါ၊ Excel file၊ ငွေလွှဲ အချက်အလက်နဲ့ ဆိုင် setting တွေ စီမံပါတယ်။',{view:'profile',en:'Open Profile',my:'Profile ဖွင့်မယ်'}],
  ['chat',['chat','message','contact shop','ask shop','talk','စာပို့','မက်ဆေ့','ဆက်သွယ်','စကားပြော'],'Tap 💬 at the top right of Home, sign in with Google, then write to the shop. The shop owner sees all chats there and answers.','Home ညာဘက်ထိပ်က 💬 ကို နှိပ်၊ Google နဲ့ ဝင်ပြီး ဆိုင်ကို စာရေးပါ။ ဆိုင်ပိုင်ရှင်က အဲဒီမှာ chat အားလုံး မြင်ပြီး ပြန်ဖြေပါတယ်။'],
  ['noti',['notification','notifications','bell','alert','အသိပေး','ခေါင်းလောင်း','နိုတီ'],'Tap 🔔 at the top right of Home to see what happened (orders, likes, comments, follows, chats). Shop owners turn phone alerts on in Settings → Notifications.','Home ညာဘက်ထိပ်က 🔔 ကို နှိပ်ရင် ဖြစ်ခဲ့တာတွေ (အော်ဒါ၊ like၊ comment၊ follow၊ chat) ကြည့်လို့ရပါတယ်။ ဆိုင်ပိုင်ရှင်က ဖုန်း alert ကို Settings → Notifications မှာ ဖွင့်ပါ။'],
  ['signin',['sign in','log in','login','google','account','logout','sign out','ဝင်နည်း','ဝင်လို့','ဘယ်လိုဝင်','အကောင့်','လော့ဂ်'],'Tap Continue with Google when the app asks (to like, comment, chat or order). Your Google account is used; no new password is needed.','Like၊ comment၊ chat ဒါမှမဟုတ် မှာတဲ့အခါ app က မေးရင် Google နဲ့ ဝင်မယ် ကို နှိပ်ပါ။ Google account နဲ့ပဲ ဝင်တာမို့ password အသစ် မလိုပါ။'],
  ['install',['install','home screen','add app','download app','add to home','app ထည့်','အိုင်ကွန်','ဖုန်းထဲထည့်'],'Settings → Add to Home Screen.\niPhone: in Safari tap Share, then "Add to Home Screen".\nAndroid: in Chrome tap ⋮, then "Install app".','Settings → Add to Home Screen။\niPhone: Safari မှာ Share နှိပ်ပြီး "Add to Home Screen"။\nAndroid: Chrome မှာ ⋮ နှိပ်ပြီး "Install app"။'],
  ['language',['language','myanmar','burmese','english','ဘာသာ','မြန်မာလို','အင်္ဂလိပ်'],'Settings → Language → choose English or မြန်မာ.','Settings → Language → English ဒါမှမဟုတ် မြန်မာ ရွေးပါ။'],
  ['theme',['dark','light','theme','night mode','အမှောင်','အလင်း','dark mode','light mode'],'Settings → Theme → Light or Dark.','Settings → Theme → Light ဒါမှမဟုတ် Dark ရွေးပါ။'],
  ['share',['share','qr','link','ဝေမျှ','လင့်','ကျူအာ'],'Settings → Share My Store shows the shop\'s QR code and link. Customers scan the QR with their phone camera; Save QR image keeps it in Photos.','Settings → Share My Store မှာ ဆိုင်ရဲ့ QR နဲ့ link ပါတယ်။ ဝယ်သူက ဖုန်းကင်မရာနဲ့ QR ကို scan ဖတ်ပါ။ Save QR image နဲ့ Photos ထဲ သိမ်းလို့ရပါတယ်။'],
  ['speed',['slow','speed','fast','loading','lag','နှေး','မြန်မြန်','လေးနေ','ကြာနေ'],'Settings → App speed compares the fastest speed with your speed now. The wifi badge under the logo shows your internet. The app downloads Discover, Profile and photos in the background so they open at once.','Settings → App speed မှာ အမြန်ဆုံးနဲ့ အခု speed ကို နှိုင်းယှဉ် ပြပါတယ်။ Logo အောက်က wifi badge က internet speed ပြပါတယ်။ Discover၊ Profile နဲ့ ပုံတွေကို နောက်ကွယ်မှာ ကြို download ထားလို့ ချက်ချင်း ပွင့်ပါတယ်။'],
  ['offline',['offline','no internet','without internet','internet မရှိ','အင်တာနက်မရှိ','လိုင်းမရှိ'],'The shop is saved on your phone, so products and photos you saw still open without internet (the Offline sign in Settings → Storage shows it). Ordering, chat and likes need internet.','ဆိုင်ကို ဖုန်းထဲ သိမ်းထားလို့ ကြည့်ဖူးတဲ့ ပစ္စည်းနဲ့ ပုံတွေ internet မရှိလည်း ပွင့်ပါတယ် (Settings → Storage က Offline မှာ ပြပါတယ်)။ မှာတာ၊ chat၊ like ကတော့ internet လိုပါတယ်။'],
  ['refresh',['refresh','reload','update','new version','not updated','ပြန်ဖွင့်','အသစ်','ရီဖရက်'],'Pull down on Home to refresh, or tap Home (or Discover) again in the bottom bar. New app versions come by themselves.','Home ကို အောက်ဆွဲရင် refresh ဖြစ်ပါတယ်။ ဒါမှမဟုတ် အောက်ခြေ bar က Home (Discover) ကို ထပ်နှိပ်ပါ။ App version အသစ်တွေ အလိုလို ရောက်လာပါတယ်။'],
  ['nav',['bottom bar','navigation','tabs','drag','swipe bar','ခလုတ်','အောက်ခြေ','ဆွဲ'],'The bottom bar: Home, Discover, Category, Cart, Profile. Tap one, or press and slide your finger along the bar and let go on the one you want.','အောက်ခြေ bar: Home၊ Discover၊ Category၊ Cart၊ Profile။ တစ်ခု နှိပ်ပါ၊ ဒါမှမဟုတ် bar ပေါ် ဖိပြီး လက်ကို ရွှေ့ဆွဲ၊ လိုချင်တဲ့ အပေါ်မှာ လက်လွှတ်ပါ။'],
  ['createshop',['create shop','open shop','new shop','my own shop','start selling','ဆိုင်ဖွင့်','ဆိုင်လုပ်','ကိုယ်ပိုင်ဆိုင်'],'1. Open skyshopmm.com.\n2. Tap Continue with Google.\n3. Type your shop name and tap Create your shop.\nYour shop opens at once, then add products from the Profile.','1. skyshopmm.com ကို ဖွင့်ပါ။\n2. Google နဲ့ ဝင်မယ် နှိပ်ပါ။\n3. ဆိုင်နာမည် ရိုက်ပြီး Create your shop နှိပ်ပါ။\nဆိုင် ချက်ချင်း ပွင့်ပါမယ်၊ ပြီးရင် Profile ကနေ ပစ္စည်း ထည့်ပါ။'],
  ['othershop',['other shop','another shop','visit shop','shopping','တခြားဆိုင်','အခြားဆိုင်','ဆိုင်တွေ'],'In Discover tap a shop\'s name or logo to visit it. Its Home, Category and Profile open inside this app; tap the exit button in the bottom bar to come back.','Discover မှာ ဆိုင်နာမည် ဒါမှမဟုတ် logo ကို နှိပ်ရင် အဲဒီဆိုင်ကို ရောက်ပါတယ်။ အဲဒီဆိုင်ရဲ့ Home၊ Category၊ Profile ဒီ app ထဲမှာပဲ ပွင့်ပါတယ်။ ပြန်လာချင်ရင် အောက်ခြေ bar က ထွက်ခလုတ် နှိပ်ပါ။',{view:'shops',en:'Open Discover',my:'Discover ဖွင့်မယ်'}],
  ['storage',['storage','server storage','space','mb','gb','သိုလှောင်','နေရာ'],'Shop owner: Settings → Server Storage shows how much of the shop\'s space is used and free.','ဆိုင်ပိုင်ရှင်: Settings → Server Storage မှာ ဆိုင်ရဲ့ နေရာ ဘယ်လောက်သုံးပြီး ဘယ်လောက်ကျန်လဲ ပြပါတယ်။'],
  ['photo',['photo','picture','image','gallery','zoom','download photo','ဓာတ်ပုံ','ပုံကြီး','ပုံသိမ်း'],'Tap a product photo to see it big; swipe for the next one. The download button saves the photos to your phone.','ပစ္စည်းပုံကို နှိပ်ရင် ပုံကြီး ကြည့်လို့ရပါတယ်။ ဘေးဆွဲရင် နောက်ပုံ။ Download ခလုတ်နဲ့ ဖုန်းထဲ သိမ်းလို့ရပါတယ်။'],
  ['delete',['delete account','remove account','close account','အကောင့်ဖျက်'],'To delete your account, open skyshopmm.com/delete-account.html and follow the steps there.','Account ဖျက်ချင်ရင် skyshopmm.com/delete-account.html ကို ဖွင့်ပြီး အဆင့်တွေ လုပ်ပါ။'],
  ['editproduct',['edit product','change price','change stock','delete product','remove product','ဈေးပြင်','ဈေးနှုန်းပြင်','product ပြင်','product ဖျက်','ပစ္စည်း ပြင်','ပစ္စည်း ဖျက်','stock ပြင်','ဈေး ပြင်','လက်ကျန် ပြင်','price ပြင်'],'Shop owner: Profile → Dashboard → Products. Tap the product, change the price, stock, photos or text and Save. To delete one, swipe it left into the Recycle Bin (you can bring it back from there).','ဆိုင်ပိုင်ရှင်: Profile → Dashboard → Products။ ပစ္စည်းကို နှိပ်ပြီး ဈေး၊ လက်ကျန်၊ ပုံ၊ စာ ပြင်ပြီး Save နှိပ်ပါ။ ဖျက်ချင်ရင် ဘယ်ဘက်ကို ဆွဲပြီး Recycle Bin ထဲ ထည့်ပါ (အဲဒီကနေ ပြန်ယူလို့ရပါတယ်)။',{view:'profile',en:'Open Profile',my:'Profile ဖွင့်မယ်'}],
  ['myorder',['my order','my orders','order status','where is my order','order arrive','delivery','အော်ဒါ ရောက်','order ရောက်','ပစ္စည်း ရောက်','ပို့ပေး','delivery ဘယ်တော့'],'After you order, the shop checks your payment and confirms the order. Updates come in 🔔 at the top of Home. For delivery questions, write to the shop with 💬.','မှာပြီးရင် ဆိုင်က ငွေလွှဲ စစ်ပြီး အော်ဒါကို အတည်ပြုပါတယ်။ အသိပေးချက်တွေ Home အပေါ်က 🔔 မှာ ရောက်လာပါတယ်။ ပို့ဆောင်ရေး မေးချင်ရင် 💬 နဲ့ ဆိုင်ကို စာရေးပါ။'],
  // 1.1.337 owner: questions about this shop and this account are answered from the real data on the page.
  ['countproducts',['how many product','how many item','number of product','product count','product ဘယ်နှစ်','ပစ္စည်း ဘယ်နှစ်','ဘယ်နှစ်ခု','ပစ္စည်း ဘယ်လောက်','product ဘယ်လောက်','item ဘယ်နှစ်'],'',''],
  ['countfollowers',['how many follower','followers ဘယ်နှစ်','follower ဘယ်နှစ်','follower ဘယ်လောက်','followers ဘယ်လောက်','ဖော်လိုဝါ ဘယ်နှစ်','how many post','post ဘယ်နှစ်'],'',''],
  ['cartnow',['cart ဘာရှိ','cart ထဲ ရှိ','ခြင်း ဘာရှိ','ခြင်းထဲ ရှိ','in my cart','cart ထဲ ဘာ','cart ထဲ ဘယ်နှစ်','ခြင်းထဲ ဘာ','ခြင်းထဲ ဘယ်နှစ်','what is in my cart','cart ဘယ်လောက်','total price','စုစုပေါင်း'],'',''],
  ['check',['error','errors','problem','issue','wrong','not working','check my','check my account','account check','health','အမှား','ပြဿနာ','အဆင်မပြေ','ဘာဖြစ်နေ','အကောင့် error','account error','account စစ်','အကောင့် စစ်','စစ်ပေး'],'',''],
  ['whoami',['my account','who am i','which account','signed in as','logged in','ငါ့ အကောင့်','ကျွန်တော့် အကောင့်','ကျွန်မ အကောင့်','ဘယ် အကောင့်','ဝင်ထား'],'',''],
  ['version',['version','app version','latest version','ဗားရှင်း','update ရှိ'],'',''],
  // 1.1.338 owner: "make the free assistant as good as it can be" — more answers about the whole app.
  ['hero',['hero image','hero picture','banner image','homepage banner','home banner','cover image','change banner','home picture','ဘန်နာ','hero ပုံ','hero image','ပင်မပုံ','ပင်မ ပုံ','အပေါ်ဆုံး ပုံ','home ပုံ','banner ပုံ','banner ပြောင်း','hero ပြောင်း'],'Shop owner: the Home banner (Hero) is set in Dashboard → Frontend Appearance & Content → Hero / Homepage Banner. Upload up to 5 pictures — they change by themselves — then Save.','ဆိုင်ပိုင်ရှင်: Home ပေါ်က banner (Hero) ကို Dashboard → Frontend Appearance & Content → Hero / Homepage Banner မှာ ပြောင်းပါတယ်။ ပုံ ၅ ပုံအထိ တင်လို့ရပြီး အလိုလို ပြောင်းပြီး ပြပါတယ်။ ပြီးရင် Save နှိပ်ပါ။',{view:'profile',en:'Open Profile',my:'Profile ဖွင့်မယ်'}],
  ['usershow',['ဈေး ဖျောက်','ဈေး ဖျောက်ချင်','ဈေး ဝှက်','stock ဝှက်','user show','visitors see','what customers see','hide price','hide stock','hide sku','show price','ဈေး မပြ','ဈေးဖျောက်','stock မပြ','stock ဖျောက်','ဝယ်သူ မြင်','ဝယ်သူတွေ မြင်','user show'],'Shop owner: Dashboard → User show. Choose what visitors see on each product: SKU, Part No, Price, Stock, Description and how many photos.','ဆိုင်ပိုင်ရှင်: Dashboard → User show။ ဝယ်သူတွေ ပစ္စည်းမှာ ဘာမြင်ရမလဲ ရွေးပါ: SKU၊ Part No၊ ဈေး၊ လက်ကျန်၊ အကြောင်းအရာ၊ ပုံအရေအတွက်။',{view:'profile',en:'Open Profile',my:'Profile ဖွင့်မယ်'}],
  ['lowstock',['low stock','out of stock','stock alert','running out','sold out','stock နည်း','ပစ္စည်းကုန်','ပစ္စည်း ကုန်','လက်ကျန်နည်း','လက်ကျန် နည်း','ကုန်တော့','stock alert'],'Shop owner: Dashboard → Low stock alerts lists the products that are running out. Change the stock of a product in Dashboard → Products.','ဆိုင်ပိုင်ရှင်: Dashboard → Low stock alerts မှာ ကုန်တော့မယ့် ပစ္စည်းတွေ ပေါ်ပါတယ်။ လက်ကျန် ပြင်ချင်ရင် Dashboard → Products မှာ ပြင်ပါ။'],
  ['confirmorder',['order confirm','confirm လုပ်','အော်ဒါ confirm','confirm order','approve order','confirm payment','approve payment','accept order','verify payment','အော်ဒါ အတည်ပြု','ငွေ အတည်ပြု','order အတည်ပြု','ငွေလွှဲ စစ်','order လက်ခံ','အော်ဒါ လက်ခံ','ပြေစာ စစ်'],'Shop owner: Dashboard → Orders & payment. Open the order, look at the receipt photo and the transaction reference, then confirm the payment. The customer gets the update in 🔔.','ဆိုင်ပိုင်ရှင်: Dashboard → Orders & payment။ အော်ဒါကို ဖွင့်ပြီး ပြေစာ ဓာတ်ပုံနဲ့ transaction reference ကို ကြည့်၊ ငွေလွှဲ မှန်ရင် အတည်ပြုပါ။ ဝယ်သူက 🔔 မှာ သိရပါမယ်။',{view:'profile',en:'Open Profile',my:'Profile ဖွင့်မယ်'}],
  ['cancelorder',['cancel order','cancel my order','delete order','deleted orders','cancelled order','အော်ဒါ ဖျက်','order ဖျက်','order cancel','အော်ဒါ cancel','အော်ဒါ ပယ်ဖျက်','မှာတာ ပယ်'],'To cancel an order, write to the shop with 💬 before it is confirmed. Shop owner: cancelled and deleted orders are kept in Dashboard → Deleted orders.','အော်ဒါ ပယ်ချင်ရင် မအတည်ပြုခင် 💬 နဲ့ ဆိုင်ကို ပြောပါ။ ဆိုင်ပိုင်ရှင်: ပယ်ဖျက်/ဖျက်ထားတဲ့ အော်ဒါတွေကို Dashboard → Deleted orders မှာ သိမ်းထားပါတယ်။'],
  ['recycle',['ဖျက်ထားတဲ့ ပစ္စည်း','ဖျက်လိုက်တဲ့ ပစ္စည်း','ဖျက်မိ','ပြန်ယူချင်','recycle bin','recycle','restore product','deleted product','bring back','undelete','ပြန်ယူ','ဖျက်ထားတာ ပြန်','ပြန်ထည့်','ပြန်ရ','recycle bin'],'Shop owner: deleted products go to the Recycle Bin (Dashboard → Recycle Bin). Open it and restore a product to bring it back.','ဆိုင်ပိုင်ရှင်: ဖျက်လိုက်တဲ့ ပစ္စည်းတွေက Recycle Bin (Dashboard → Recycle Bin) ထဲ ရောက်ပါတယ်။ အဲဒီမှာ restore နှိပ်ရင် ပြန်ရပါတယ်။'],
  ['contactus',['contact us','customer service','support','phone number','call us','hotline','helpdesk','ဆက်သွယ်ရန်','ဖုန်းနံပါတ်','ဖုန်း နံပါတ်','ဖုန်းခေါ်','ကူညီမယ့်သူ','အကူအညီ ဖုန်း','support ဖုန်း'],'Settings → Contact us shows the support phone number: 09-766472432. For questions about a product or an order, write to that shop with 💬.','Settings → Contact us မှာ support ဖုန်းနံပါတ် 09-766472432 ပေါ်ပါတယ်။ ပစ္စည်း ဒါမှမဟုတ် အော်ဒါအကြောင်း မေးချင်ရင် အဲဒီဆိုင်ကို 💬 နဲ့ စာရေးပါ။'],
  ['aboutapp',['what is skyshopmm','what is gearhub','about this app','about app','what is this app','what does this app do','skyshopmm ဆိုတာ','gearhub ဆိုတာ','app ဆိုတာ ဘာ','ဒီ app ဆိုတာ'],'SkyShopMM (GearHub) is an app where every shop has its own page: customers search products, order and pay by transfer, follow shops, comment and chat; shop owners manage products, orders, Excel files and their profile.','SkyShopMM (GearHub) ဆိုတာ ဆိုင်တိုင်းမှာ ကိုယ်ပိုင်စာမျက်နှာရှိတဲ့ app ပါ: ဝယ်သူက ပစ္စည်းရှာ၊ မှာ၊ ငွေလွှဲပေးချေ၊ ဆိုင်ကို follow၊ comment၊ chat လုပ်နိုင်ပြီး ဆိုင်ပိုင်ရှင်က ပစ္စည်း၊ အော်ဒါ၊ Excel file နဲ့ Profile ကို စီမံပါတယ်။'],
  ['sku',['what is sku','what is part no','sku meaning','part number','sku ဆိုတာ','sku ဘာလဲ','part no ဆိုတာ','part no ဘာလဲ'],'SKU is the shop\'s own product code; Part No is the maker\'s part number. You can search with either one in the search bar.','SKU ဆိုတာ ဆိုင်ရဲ့ ကိုယ်ပိုင် ပစ္စည်းကုဒ်၊ Part No ဆိုတာ ထုတ်လုပ်သူရဲ့ ပစ္စည်းနံပါတ်ပါ။ ရှာတဲ့အခါ တစ်ခုခုနဲ့ ရှာလို့ရပါတယ်။'],
  ['backup',['backup','back up','restore data','data safe','lost data','အရန်သိမ်း','backup ကူး','data ပျောက်','data ပြန်'],'The server backs up the data automatically every day. The GearHub owner can also press Run backup now in Settings → Server Storage.','Server က data ကို နေ့တိုင်း အလိုအလျောက် backup လုပ်ပါတယ်။ GearHub ပိုင်ရှင်က Settings → Server Storage မှာ Run backup now ကိုလည်း နှိပ်လို့ရပါတယ်။'],
  ['pc',['on pc','on computer','desktop','laptop','computer version','web version','pc version','ကွန်ပျူတာ','pc မှာ','laptop မှာ','ဝက်ဘ်'],'On a computer the same app opens in the browser (skyshopmm.com) with a top menu: Home, Discover, Category, Promotion, Cart and Profile. You can install it as an app from the browser, too.','ကွန်ပျူတာမှာ browser (skyshopmm.com) ထဲက အတူတူ app ပါပဲ၊ အပေါ်မှာ menu ရှိပါတယ်: Home၊ Discover၊ Category၊ Promotion၊ Cart၊ Profile။ Browser ကနေ app အဖြစ် install လုပ်လို့လည်း ရပါတယ်။'],
  ['fee',['price of app','app price','how much does it cost','is it free','free to use','subscription','monthly fee','plan price','အခမဲ့လား','အခမဲ့','ဈေးဘယ်လောက်ကျ','လစဉ်ကြေး','ကုန်ကျစရိတ်','ကျသင့်ငွေ'],'I do not have price or plan details. For plans and fees, call 09-766472432 (Settings → Contact us).','Plan နဲ့ ကျသင့်ငွေ အချက်အလက် ကျွန်မမှာ မရှိပါဘူး။ ဖုန်း 09-766472432 (Settings → Contact us) ကို ဆက်သွယ်ပါ။'],
  ['feedback',['report a bug','bug','feedback','suggestion','complain','complaint','report problem','တိုင်ကြား','အကြံပြု','အကြံဉာဏ်','bug တွေ့','ပြဿနာ တိုင်'],'To report a problem or send an idea, call 09-766472432 (Settings → Contact us). For a problem with an order or a product, write to the shop with 💬.','ပြဿနာ တိုင်ကြားချင်ရင် ဒါမှမဟုတ် အကြံပေးချင်ရင် 09-766472432 (Settings → Contact us) ကို ဆက်သွယ်ပါ။ အော်ဒါ ဒါမှမဟုတ် ပစ္စည်းပြဿနာဆိုရင် ဆိုင်ကို 💬 နဲ့ စာရေးပါ။'],
  ['safety',['is it safe','is it secure','privacy','my data','safe to use','trust','လုံခြုံ','လုံခြုံလား','privacy','ကိုယ်ရေးအချက်အလက်','data လုံခြုံ'],'You sign in with your Google account (the app never sees your Google password). Shop photos and files stay in the shop\'s own storage, and you can delete your account at skyshopmm.com/delete-account.html.','Google account နဲ့ ဝင်တာပါ (သင့် Google password ကို app က မမြင်ရပါ)။ ဆိုင်ရဲ့ ပုံနဲ့ file တွေက ဆိုင်ရဲ့ ကိုယ်ပိုင် storage ထဲမှာ ရှိပြီး skyshopmm.com/delete-account.html မှာ account ကို ဖျက်လို့ရပါတယ်။'],
  ['sendimage',['screenshot','send photo','send picture','send image','upload screenshot','look at my screen','see my screen','ပုံပို့','ပုံ ပို့','ပုံပြပြီး','screenshot ပို့','ပုံကြည့်ပြီး','ပုံ ဖတ်'],'I cannot read pictures yet. Please type what you see (for example the words on the screen), or send the screenshot to the shop with 💬.','ကျွန်မက ပုံကို မဖတ်နိုင်သေးပါဘူး။ မြင်ရတာကို စာနဲ့ ရိုက်ပြပါ (ဥပမာ screen ပေါ်က စာလုံးတွေ)၊ ဒါမှမဟုတ် screenshot ကို 💬 နဲ့ ဆိုင်ကို ပို့ပါ။'],
  // 1.1.339 owner: "release the update" — the assistant shows the real state and points at the button; only the owner's own tap releases it.
  ['releaseupdate',['confirm update','release update','update release','update ကို release','release လုပ်','release လိုက်','shop updates','shop update','update နှိပ်','update တင်','ဆိုင်အားလုံး update','ဆိုင်တွေ update','update ပေး','new version release','version အသစ် release','ဆိုင်အားလုံး ပြောင်း'],'',''],
  // 1.1.340 owner: remember the owner's to-dos and remind them; check whether a "something is wrong" claim is true.
  ['todolist',['my to-do','my todo','to-do list','todo list','task list','my tasks','what should i do','what to do today','reminders','လုပ်စရာ','လုပ်ရမယ့် အလုပ်','ဒီနေ့ ဘာလုပ်ရ','သတိပေးချက်','သတိပေးထားတာ'],'',''],
  ['todoadd',['remind me','add to-do','add todo','add task','new task','remember to','to-do:','todo:','မှတ်ထား','မှတ်ပေး','အမှတ်ရအောင်','မမေ့အောင်','သတိပေးပါ','သတိပေးပေး'],'',''],
  ['claim_add',['product ထည့်လို့ မရ','ပစ္စည်း ထည့်လို့ မရ','product မထည့်','ပစ္စည်း မထည့်','ပစ္စည်း မတင်','ထည့်လို့မရ','တင်လို့ မရ','add product မရ','cannot add product','cannot add a product','can\'t add product','cant add product','unable to add product','product ထည့်မရ','add မရ','save မရ','save လို့ မရ','သိမ်းလို့ မရ'],'',''],
  ['claim_missing',['ပစ္စည်း မပေါ်','product မပေါ်','ပစ္စည်း မမြင်','product မမြင်','products not showing','items not showing','nothing shows','no products showing','ပစ္စည်း ပျောက်','ပစ္စည်း မတွေ့'],'',''],
  ['claim_photo',['ပုံတင်လို့ မရ','ပုံ တင်လို့ မရ','ပုံ မတက်','ဓာတ်ပုံ မတက်','ပုံ upload မရ','photo upload fail','photo not uploading','cannot upload photo','upload မရ','ပုံ မတင်'],'',''],
  ['claim_alert',['noti မလာ','alert မလာ','notification မလာ','notifications not coming','no alert','no notification','အသိပေး မလာ','အော်ဒါ alert မလာ','phone alert မလာ'],'',''],
  ['claim_login',['login မရ','ဝင်လို့မရ','ဝင်လို့ မရ','sign in မရ','cannot sign in','cannot log in','can\'t log in','can\'t sign in','google ဝင်မရ','ဝင်မရ'],'',''],
  ['whatsell',['what do you sell','what does this shop sell','what does the shop sell','what do you have','what products','what are you selling','what is sold here','ဘာရောင်း','ဘာတွေရောင်း','ဘာတွေ ရောင်း','ဒီဆိုင်က ဘာ','ဆိုင်က ဘာတွေ','ဘာပစ္စည်း','ဘယ်လို ပစ္စည်းတွေ','ဘာတွေ ရှိလဲ ဆိုင်','ရောင်းတာ ဘာ'],'',''],
  ['help',['help','how to use','what can','guide','အကူအညီ','ဘယ်လိုသုံး','သုံးနည်း','လမ်းညွှန်'],'I can help with: searching and scanning, Excel, categories, cart and ordering, payment, Discover, comments, following, Profile, adding products, chat, notifications and Settings. What would you like to do?','ရှာနည်း/scan၊ Excel၊ အမျိုးအစား၊ Cart နဲ့ မှာနည်း၊ ငွေပေးချေမှု၊ Discover၊ comment၊ follow၊ Profile၊ ပစ္စည်းထည့်နည်း၊ chat၊ အသိပေးချက်နဲ့ Settings တွေ ကူညီပေးနိုင်ပါတယ်။ ဘာလုပ်ချင်ပါသလဲ?']
 ];
 const chips={en:['How do I order?','How to search?','Add to Home Screen','How to follow a shop?','Add a product'],my:['ဘယ်လိုမှာရမလဲ?','ဘယ်လိုရှာရမလဲ?','ဖုန်းထဲ app ထည့်နည်း','ဆိုင်ကို follow လုပ်နည်း','ပစ္စည်းထည့်နည်း']};
 const isMy=s=>/[က-႟]/.test(s);
 // The best entry: every keyword found in the question counts its length; short English words must be whole words.
 // 1.1.333 owner's iPhone test: more ways people ask (Myanmar and English mixed). A keyword with spaces counts
 // when all its words are in the question, in any order and with other words between ("Product ဘယ်လိုထည့်ရလဲ").
 const MORE={debtlist:['အကြွေး ကြည့်','အကြွေး စာရင်း','အကြွေး ဘယ်','ကြွေး ကျန်','ဘယ်သူ ကြွေး','ဘယ်သူတွေ ကြွေး','ကြွေး စာရင်း','ကြွေး ကြည့်'],addproduct:['product ထည့်','product တင်','product add','item ထည့်','ပစ္စည်း ထည့်','ပစ္စည်း တင်','ပစ္စည်းအသစ်','product အသစ်','ရောင်းချင်'],
  help:['အသုံးပြုနည်း','အသုံးပြု','ဘယ်လိုသုံး','သုံးရ','ဘာတွေလုပ်လို့ရ','ဘာလုပ်လို့ရ','app ပြောပြ','what can i do','features','how does this app'],
  order:['order တင်','order လုပ်','order ဘယ်လို','အော်ဒါ တင်','ဘယ်လို ဝယ်','မှာ ယူ','ဝယ် ချင်'],
  search:['ဘယ်လို ရှာ','ပစ္စည်း ရှာ','product ရှာ','search လုပ်','ရှာ မတွေ့'],
  cart:['ခြင်း ထည့်','cart ထည့်','cart ထဲ','cart ဖျက်'],
  post:['post ထည့်','post တင်','post ရေး','ပို့စ် တင်','ပုံ တင်'],
  editcategory:['category ထည့်','category အသစ်','category ပြင်','အမျိုးအစား ထည့်','အမျိုးအစား အသစ်','အမျိုးအစား ပြင်'],
  follow:['ဖော်လို လုပ်','follow လုပ်','follow ဘယ်လို','ဖော်လို ဘယ်လို'],
  install:['app ထည့်','home screen ထည့်','ဖုန်း app','app install','app download','app အဖြစ်','app သွင်း'],
  chat:['ဆိုင် စာ','ဆိုင် စကား','message ပို့','chat လုပ်','ဆိုင်ကို မေး'],
  payment:['ငွေ လွှဲ','ပိုက်ဆံ ပေး','ငွေ ချေ','kpay','k pay','wave pay'],
  createshop:['ဆိုင် ဖွင့်','ဆိုင် အသစ်','ဆိုင်လုပ်ချင်','shop ဖွင့်','shop create','shop လုပ်'],
  excel:['excel ရှာ','excel တင်','excel upload','excel ထည့်'],
  scan:['ပုံ ရှာ','ဓာတ်ပုံ ရှာ','scan ဖတ်'],
  discover:['post ကြည့်','post တွေ','ဆိုင်တွေ post'],
  profile:['change logo','change name','edit profile','change photo','profile picture','profile ပြင်','ပရိုဖိုင် ပြင်','နာမည် ပြင်','logo ပြင်','logo ပြောင်း','profile ပုံ','caption'],
  signin:['google ဝင်','login ဝင်','account ဝင်','ဝင် မရ'],
  language:['မြန်မာ ပြောင်း','english ပြောင်း','ဘာသာ ပြောင်း','language ပြောင်း'],
  noti:['noti','အသိပေး ချက်'],
  dashboard:['order စာရင်း','အော်ဒါ ကြည့်','admin ဝင်','order ကြည့်'],
  share:['link ပို့','qr ထုတ်','ဆိုင် link','share လုပ်'],
  delete:['account ဖျက်','အကောင့် ဖျက်'],
  speed:['app လေး','app နှေး','speed ကြည့်'],
  offline:['internet မရှိ','အင်တာနက် မရှိ','line မရှိ'],
  promotion:['ဈေးလျှော့','promotion ထည့်'],
  refresh:['update မဖြစ်','refresh လုပ်','ပြန် load'],
  photo:['ပုံ ကြည့်','ပုံ download','ပုံ သိမ်း','photo ကြည့်'],
  comment:['comment ဖျက်','comment ပြင်','comment ရေး','မန့် ဖျက်'],
  like:['like လုပ်','like ပေး'],
  save:['post သိမ်း','save လုပ်'],
  theme:['dark mode'],
  category:['category ကြည့်','အမျိုးအစား ကြည့်']};
 Object.assign(MORE,{
  cantorder:['order မရ','အော်ဒါ မရ','အော်ဒါ မတင်','မှာလို့ မရ','place order မရ','နှိပ်လို့ မရ','အော်ဒါတင်လို့ မရ','checkout မရ','order တင်လို့ မရ','order မတင်'],
  whoami:(MORE.whoami||[]).concat(['ငါက ဘယ်သူ','ငါ ဘယ်သူ','ကျွန်တော် ဘယ်သူ','ကျွန်မ ဘယ်သူ','ကျွန်တော်က ဘယ်သူ','ကျွန်မက ဘယ်သူ','ငါ့ နာမည်','ကျွန်တော့် နာမည်','ကျွန်မ နာမည်','ငါဘာလဲ','ဘယ် email','ဘယ် gmail']),
  countfollowers:(MORE.countfollowers||[]).concat(['user ဘယ်လောက်','user ဘယ်နှစ်','users ဘယ်','customer ဘယ်နှစ်','customers ဘယ်','ဝယ်သူ ဘယ်နှစ်','ဝယ်သူ ဘယ်လောက်','လူ ဘယ်နှစ်','how many user','how many customer','how many people','ဖောလိုဝါ ဘယ်']),
  countproducts:(MORE.countproducts||[]).concat(['ပစ္စည်း ဘယ်နှစ်မျိုး','ပစ္စည်းစုစုပေါင်း','စုစုပေါင်း ပစ္စည်း','total product','total item']),
  profile:(MORE.profile||[]).concat(['change shop name','rename shop','shop name ပြင်','ဆိုင်နာမည် ပြင်','ဆိုင်နာမည် ပြောင်း','shop name ပြောင်း','ဆိုင် logo','ဆိုင် ပုံ ပြောင်း','ကိုယ်ပုံ ပြောင်း','profile photo ပြောင်း','cover photo']),
  signin:(MORE.signin||[]).concat(['password','forgot password','password မေ့','စကားဝှက်','စကား ဝှက်']),
  install:(MORE.install||[]).concat(['icon ထည့်','shortcut','app ပြန်ထည့်','app ပျောက်','phone မှာ app']),
  cart:(MORE.cart||[]).concat(['cart ထဲက ဖယ်','ခြင်းထဲက ဖယ်','ပစ္စည်း ဖယ်','အရေအတွက် ပြင်','quantity']),
  payment:(MORE.payment||[]).concat(['bank account','bank details','account number','transfer မရ','ငွေလွှဲ မရ','ဘဏ် နံပါတ်','payment details','bank နံပါတ်','kbz pay','wave money']),
  dashboard:(MORE.dashboard||[]).concat(['sales','total sales','income','revenue','ရောင်းရငွေ','ရောင်းအား','ဝင်ငွေ','အော်ဒါ ဘယ်နှစ်ခု','order ဘယ်နှစ်'])
 });
 for(const e of K)if(MORE[e[0]])e[1]=e[1].concat(MORE[e[0]]);
 const has=(text,word)=>isMy(word)||word.length>3?text.includes(word):new RegExp('(^|[^a-z])'+word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([^a-z]|$)').test(text);
 // The best entry: each keyword whose words are all in the question counts their length.
 // 1.1.340 owner: unrelated -> do not answer; unsure -> say so politely and send them to a person. Never guess.
 const APPISH=/(app|shop|store|product|item|order|cart|price|stock|account|login|sign|photo|picture|post|profile|dashboard|category|payment|bank|excel|chat|notif|alert|update|version|ဆိုင်|ပစ္စည်း|အော်ဒါ|ဈေး|အကောင့်|ပုံ|ဝင်|ငွေ|လက်ကျန်|ခြင်း|မှာ|ဝယ်|ရောင်း|အသိပေး|ဘာသာ|ဖုန်း)/i;
 const isAppish=q=>APPISH.test(q.normalize('NFC'));
 function unknownText(q,my){
  if(!isAppish(q))return my?'တောင်းပန်ပါတယ်၊ ကျွန်မက ဒီ app အကြောင်းပဲ ဖြေပေးနိုင်ပါတယ်။ ဒီမေးခွန်းကိုတော့ မသိလို့ မဖြေတော့ပါဘူး 🙏 App အကြောင်း ဘာမဆို မေးပါ။':'Sorry, I can only answer questions about this app. I do not know about this one, so I will not guess 🙏 Ask me anything about the app.';
  return my?'တောင်းပန်ပါတယ်၊ ဒါကို ကျွန်မ သေချာ မသိသေးပါဘူး။ မှားပြောမိမှာစိုးလို့ မဖြေတော့ပါဘူး 🙏 ဆိုင်ကို 💬 နဲ့ မေးကြည့်ပါ၊ ဒါမှမဟုတ် Contact us 09-766472432 ကို ဆက်သွယ်ပါ။':'Sorry, I am not sure about this one yet, and I do not want to tell you something wrong 🙏 Please ask the shop with 💬, or call Contact us 09-766472432.';
 }
 // When nothing matches exactly, find the topics that share the most words with the question ("did you mean").
 const LABELS={debtlist:['Credit list (who owes)','အကြွေးစာရင်း'],order:['How do I order?','ဘယ်လိုမှာရမလဲ?'],search:['How to search?','ဘယ်လိုရှာရမလဲ?'],scan:['Scan with the camera','ကင်မရာနဲ့ scan လုပ်နည်း'],excel:['Excel files','Excel ရှာနည်း'],category:['Categories','အမျိုးအစား'],promotion:['Promotion','Promotion'],cart:['Cart','Cart'],payment:['Payment','ငွေပေးချေနည်း'],discover:['Discover','Discover'],comment:['Comments','Comment'],follow:['Follow a shop','ဆိုင် follow နည်း'],profile:['Change profile / logo / name','Profile / logo / နာမည် ပြင်နည်း'],post:['Write a post','Post တင်နည်း'],addproduct:['Add a product','ပစ္စည်းထည့်နည်း'],editproduct:['Edit or delete a product','ပစ္စည်း ပြင်/ဖျက်နည်း'],editcategory:['Add a category','Category ထည့်နည်း'],dashboard:['Dashboard','Dashboard'],hero:['Change the Home banner (Hero)','Home banner (Hero) ပြောင်းနည်း'],usershow:['What visitors see (User show)','User show'],confirmorder:['Confirm an order','အော်ဒါ အတည်ပြုနည်း'],recycle:['Recycle Bin','Recycle Bin'],chat:['Chat with a shop','ဆိုင်ကို chat လုပ်နည်း'],noti:['Notifications','အသိပေးချက်'],install:['Add to Home Screen','ဖုန်းထဲ app ထည့်နည်း'],language:['Change language','ဘာသာပြောင်းနည်း'],theme:['Dark / Light','Dark / Light'],share:['Share my store (QR)','QR ဝေမျှနည်း'],createshop:['Open my own shop','ဆိုင်ဖွင့်နည်း'],speed:['App speed','App speed'],contactus:['Contact us','ဆက်သွယ်ရန်'],check:['Check my account','အကောင့် စစ်ပေးပါ'],todolist:['My to-do list','လုပ်စရာ စာရင်း'],releaseupdate:['Release the update to all shops','Update ကို ဆိုင်အားလုံးကို release လုပ်နည်း'],signin:['Sign in','Google နဲ့ ဝင်နည်း']};
 const STOP=new Set(['ဘယ်လို','ရမလဲ','ပါသလဲ','လို့ရ','လို့ရလား','ချင်တယ်','ချင်','နည်း','ဘာလဲ','ရှိလဲ','ကို','မှာ','တွေ','တာ','how','what','where','the','this','that','with','from','your','have','does','can','not','app']);
 function near(q){
  const text=' '+q.normalize('NFC').toLowerCase()+' ',out=[];
  for(const e of K){if(!LABELS[e[0]])continue;let n=0;const seen=new Set();
   for(const k of e[1])for(const w of k.normalize('NFC').toLowerCase().split(/\s+/)){if(seen.has(w)||STOP.has(w))continue;const len=[...w].length;if(len<(isMy(w)?3:4))continue;if(text.includes(w)){seen.add(w);n+=len}}
   if(n)out.push([n,e[0]])}
  return out.filter(x=>x[0]>=12).sort((a,b)=>b[0]-a[0]).slice(0,3).map(x=>x[1]);
 }
 function answer(q){
  // 1.1.334 owner's iPhone: its keyboard types some Myanmar marks in another order (ထည့် as ည + ် + ့);
  // NFC puts them in one order, so the same word always matches.
  const text=' '+q.normalize('NFC').toLowerCase().replace(/[?!.,،။၊]/g,' ').replace(/\s+/g,' ')+' ';
  if(parseTodo(q)?.type==='add')return K.find(e=>e[0]==='todoadd');
  const L=[...text.replace(/[\s?!.,၊။]/g,'')].length;
  let best=null,score=0,general=0;
  for(const e of K){let s=0;for(const k of e[1]){const words=k.normalize('NFC').toLowerCase().trim().split(/\s+/);if(words.every(w=>has(text,w)))s+=words.join('').length}
   // "How to use" words alone only give the general help; a topic in the same question wins ("Category အသုံးပြုနည်း").
   if(e[0]==='hello'&&L>16)s=0;
   if(s&&e[0].startsWith('claim_'))s+=8;
   if(e[0]==='help'){general=s;continue}if(s>score){score=s;best=e}}
  // A long question that only shares one short word with an answer is not that answer.
  if(best&&score>=2&&(score>=6||L<=20))return best;
  return general>=2&&(general>=6||L<=20)?K.find(e=>e[0]==='help'):null;
 }
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const robot='/images/assistant-face.png?v=3';
 const button=document.createElement('button');button.type='button';button.className='ai-help-button';
 // 1.1.336 owner's picture: the assistant on a card, a chat bubble and the "AI Assistant" pill.
 button.innerHTML='<span class="ai-help-card" aria-hidden="true"></span><img class="ai-help-person" src="/images/assistant.png?v=2" alt=""><span class="ai-help-bubble" aria-hidden="true"></span><span class="ai-help-pill" aria-hidden="true"><b>AI</b>Assistant</span>';
 document.body.append(button);
 const box=document.createElement('dialog');box.className='ai-help';document.body.append(box);
 box.innerHTML='<header><img src="'+robot+'" alt=""><span><b></b><small></small></span><button type="button" class="ai-help-x">×</button></header><div class="ai-help-log" role="log" aria-live="polite" tabindex="-1" autofocus></div><div class="ai-help-chips"></div><form class="ai-help-form"><input type="text" autocomplete="off" maxlength="200" enterkeyhint="send"><button type="submit" aria-label=""><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11.5 20 4l-5.5 16-3-6.5z"/><path d="m11.5 13.5 4-4"/></svg></button></form>';
 const log=box.querySelector('.ai-help-log'),input=box.querySelector('input'),chipBox=box.querySelector('.ai-help-chips');
 let todoCount=0,autoCache=[],autoAt=0;
 function paint(){const u=ui[pageMy()?'my':'en'];button.setAttribute('aria-label',u.open);box.querySelector('header b').textContent=u.title;box.querySelector('header small').textContent=u.sub;box.querySelector('.ai-help-x').setAttribute('aria-label',u.close);input.placeholder=u.placeholder;box.querySelector('.ai-help-form button').setAttribute('aria-label',u.send);chipBox.innerHTML=(todoCount?'<button type="button" class="ai-help-todochip">📝 '+(pageMy()?'လုပ်စရာ ':'To-do ')+todoCount+'</button>':'')+chips[pageMy()?'my':'en'].map(c=>'<button type="button">'+esc(c)+'</button>').join('')}
 paint();new MutationObserver(paint).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 // 1.1.344 owner: the chat with the assistant is remembered (on this phone and, when signed in, on the server).
 const CHATKEY='gh-ai-chat';let hist=[],histT=0,restoring=false,histTimer=0;
 try{const l=JSON.parse(localStorage.getItem(CHATKEY)||'null');if(l&&Array.isArray(l.items)){hist=l.items;histT=Number(l.t)||0}}catch{}
 const histSave=()=>{histT=Date.now();const v={t:histT,items:hist.slice(-80)};try{localStorage.setItem(CHATKEY,JSON.stringify(v))}catch{}clearTimeout(histTimer);histTimer=setTimeout(()=>window.GearHubUserData?.put('ai-chat',v),1500)};
 function paintHist(){restoring=true;log.innerHTML='';for(const m of hist)say(m.w,m.text,m.id?(K.find(e=>e[0]===m.id)||[])[4]||null:null,m.my,m.id);restoring=false}
 async function syncChat(){
  const srv=await window.GearHubUserData?.get('ai-chat');
  if(srv&&Array.isArray(srv.items)&&srv.items.length&&(Number(srv.t)||0)>histT){hist=srv.items;histT=Number(srv.t);try{localStorage.setItem(CHATKEY,JSON.stringify(srv))}catch{}if(log.children.length)paintHist()}
  else if(hist.length&&histT>(Number(srv?.t)||0))window.GearHubUserData?.put('ai-chat',{t:histT,items:hist.slice(-80)});
 }

 // 1.1.407: actions that go to a place inside the shop's Excel file. "debt" opens the shop's workbook on the STM sheet and
 // jumps to the credit list ("တစ်ဦးချင်းစီ အကြွေးရရန်ရှိ စာရင်း").
 async function runAction(name,my){
  if(name!=='debt')return;
  const note=t=>say('bot',t,null,my),slug=(location.pathname.match(/^\/shops\/([^/]+)/)||[])[1];
  try{
   if(!slug||!window.GearHubExcelViewer)throw Error('none');
   const list=(await (await fetch('/api/platform/store/'+encodeURIComponent(slug)+'/spreadsheets',{credentials:'same-origin'})).json()).files||[];
   const file=list.find(f=>/\.xls[xm]$/i.test(f.name));
   if(!file)return note(my?'ဒီဆိုင်မှာ Excel ဖိုင် မတင်ထားသေးပါဘူး။':'This shop has no Excel file yet.');
   const ok=await window.GearHubExcelViewer.open(file.url,file.name,'STM','အကြွေးရရန်ရှိ');
   if(ok===false)throw Error('open');
  }catch{note(my?'Excel ကို မဖွင့်နိုင်ပါဘူး။ Search bar ဘေးက filter ခလုတ်ကနေ Excel files ကို ဖွင့်ပြီး STM sheet ကို ရွေးပါ။':'I could not open the Excel file. Use the filter button next to the search bar, open Excel files and choose the STM sheet.')}
 }
 function say(who,text,action,my,id){
  if(!restoring){hist.push({w:who,text,id:id||'',my:Boolean(my)});histSave()}
  const m=document.createElement('div');m.className='ai-help-msg '+who;const guide=id&&TOURS[id];
  m.innerHTML=(who==='bot'?'<img src="'+robot+'" alt="">':'')+'<p>'+esc(text).replace(/\n/g,'<br>')+(guide?'<button type="button" class="ai-help-go ai-help-tour">Go ▶</button>':action?'<button type="button" class="ai-help-go">'+esc(my?action.my:action.en)+' →</button>':'')+'</p>';
  if(guide)m.querySelector('.ai-help-go').onclick=()=>{box.close();startTour(guide,my)};
  else if(action)m.querySelector('.ai-help-go').onclick=()=>{box.close();if(action.run)return runAction(action.run,my);if(action.view)window.showStoreView?.(action.view);else document.querySelector(action.click)?.click()};
  log.append(m);log.scrollTop=log.scrollHeight;
 }
 // 1.1.335 owner: "Go" under an answer shows on the real screen, one step at a time, what to press: the button
 // glows, a finger points at it, a card says what to do. Tapping the glowing button (or Next) goes on.
 const H='[data-store-view="home"]',D='[data-store-view="shops"]',C='[data-store-view="category"]',P='[data-store-view="profile"]',CART='.mobile-bottom-nav .bottom-nav-cart,#cart-open',MENU='#profile-menu-open';
 const s=(sel,en,my)=>[sel,en,my],openP=s(P,'Tap Profile.','Profile ကို နှိပ်ပါ။'),menu=s(MENU,'Tap ☰ to open Settings.','Settings ဖွင့်ဖို့ ☰ ကို နှိပ်ပါ။'),add=s('.profile-add','Tap + Add.','+ Add ကို နှိပ်ပါ။');
 const TOURS={
  addproduct:[openP,add,s('.profile-choice[data-pm="work"]','Tap Business.','Business ကို နှိပ်ပါ။'),s(null,'Fill in SKU, Part No, name, price, stock and photos, then tap Save.','SKU၊ Part No၊ နာမည်၊ ဈေး၊ လက်ကျန်၊ ဓာတ်ပုံ ဖြည့်ပြီး Save နှိပ်ပါ။')],
  post:[openP,add,s('.profile-choice[data-pm="personal"]','Tap Personal.','Personal ကို နှိပ်ပါ။'),s(null,'Write your text, add photos and tap Post.','စာရေး၊ ဓာတ်ပုံထည့်ပြီး တင်မယ် နှိပ်ပါ။')],
  editcategory:[openP,add,s('.profile-choice[data-pm="category"]','Tap Category.','Category ကို နှိပ်ပါ။'),s(null,'Add or rename main and sub categories, then save.','Main / Sub အမျိုးအစား ထည့်၊ ပြင်ပြီး သိမ်းပါ။')],
  profile:[openP,s('.profile-edit','Tap the pencil.','ခဲတံကို နှိပ်ပါ။'),s(null,'Change the photo, name, caption or details and tap Save.','ပုံ၊ နာမည်၊ caption၊ အချက်အလက် ပြင်ပြီး Save နှိပ်ပါ။')],
  dashboard:[openP,s('.profile-dashboard','Tap Dashboard.','Dashboard ကို နှိပ်ပါ။')],
  editproduct:[openP,s('.profile-dashboard','Tap Dashboard.','Dashboard ကို နှိပ်ပါ။'),s(null,'Open Products, tap the product, change it and Save. Swipe left to move it to the Recycle Bin.','Products ဖွင့်၊ ပစ္စည်းကို နှိပ်၊ ပြင်ပြီး Save နှိပ်ပါ။ ဘယ်ဘက်ဆွဲရင် Recycle Bin ထဲ ရောက်ပါတယ်။')],
  follow:[openP,s('.profile-home-counts [data-list="followers"]','Tap Followers to see who follows.','Followers ကို နှိပ်ရင် follow ထားသူတွေ ကြည့်လို့ရပါတယ်။'),s(null,'To follow another shop, open its Profile and tap Follow.','တခြားဆိုင်ကို follow ချင်ရင် အဲဒီဆိုင်ရဲ့ Profile ဖွင့်ပြီး Follow နှိပ်ပါ။')],
  search:[s(H,'Tap Home.','Home ကို နှိပ်ပါ။'),s('#search','Tap the search bar and type the name, SKU or Part No.','Search bar ကို နှိပ်ပြီး နာမည်၊ SKU ဒါမှမဟုတ် Part No ရိုက်ပါ။')],
  scan:[s(H,'Tap Home.','Home ကို နှိပ်ပါ။'),s('.photo-scan-button','Tap the scan button.','Scan ခလုတ်ကို နှိပ်ပါ။'),s(null,'Allow the camera and point it at the part.','ကင်မရာ ခွင့်ပြုပြီး ပစ္စည်းကို ချိန်ပြပါ။')],
  excel:[s(H,'Tap Home.','Home ကို နှိပ်ပါ။'),s('.search-filter-button','Tap the green filter button.','အစိမ်း filter ခလုတ်ကို နှိပ်ပါ။'),s('.search-filter-menu [data-scope="excel"]','Choose Excel.','Excel ကို ရွေးပါ။'),s('#search','Type what you look for; ˄ ˅ move between matches.','ရှာချင်တာ ရိုက်ပါ။ ˄ ˅ နဲ့ တစ်ခုပြီးတစ်ခု ကြည့်ပါ။')],
  clear:[s('.search-filter-button','Tap the green filter button.','အစိမ်း filter ခလုတ်ကို နှိပ်ပါ။'),s('.search-filter-menu [data-scope="trash"]','Choose Trash.','Trash ကို ရွေးပါ။')],
  category:[s(C,'Tap Category.','Category ကို နှိပ်ပါ။'),s(null,'Tap a category to see its products.','အမျိုးအစား တစ်ခု နှိပ်ရင် ပစ္စည်းတွေ ပေါ်ပါမယ်။')],
  promotion:[s(H,'Tap Home.','Home ကို နှိပ်ပါ။'),s('.home-promo','Tap the Promotion banner.','Promotion banner ကို နှိပ်ပါ။')],
  cart:[s(H,'Tap Home.','Home ကို နှိပ်ပါ။'),s('#products [data-store-action="add-cart"]','Tap Add to cart on a product.','ပစ္စည်းတစ်ခုရဲ့ Add to cart ကို နှိပ်ပါ။'),s(CART,'Tap the cart.','ခြင်းတောင်းကို နှိပ်ပါ။'),s(null,'Here you change amounts or remove items.','ဒီမှာ အရေအတွက် ပြင်၊ ဖယ်လို့ရပါတယ်။')],
  order:[s(CART,'Tap the cart.','ခြင်းတောင်းကို နှိပ်ပါ။'),s('#go-checkout','Tap Checkout. (Empty cart? Add a product first.)','အော်ဒါတင်ရန် ကို နှိပ်ပါ။ (ခြင်းထဲ ဘာမှမရှိရင် ပစ္စည်း အရင်ထည့်ပါ။)'),s(null,'Fill in name, phone and address, transfer the money, type the reference, add the receipt photo and tap Place order.','အမည်၊ ဖုန်း၊ လိပ်စာ ဖြည့်၊ ငွေလွှဲ၊ reference ရိုက်၊ ပြေစာ ဓာတ်ပုံ ထည့်ပြီး အော်ဒါတင်မည် နှိပ်ပါ။')],
  discover:[s(D,'Tap Discover.','Discover ကို နှိပ်ပါ။'),s(null,'Scroll the posts: ❤ like, 💬 comment, bookmark to save, Buy Now to order.','Post တွေ ဆွဲကြည့်ပါ: ❤ like၊ 💬 comment၊ bookmark နဲ့ သိမ်း၊ Buy Now နဲ့ မှာ။')],
  othershop:[s(D,'Tap Discover.','Discover ကို နှိပ်ပါ။'),s(null,'Tap a shop\'s name or logo on a post to visit it.','Post ပေါ်က ဆိုင်နာမည် ဒါမှမဟုတ် logo ကို နှိပ်ရင် အဲဒီဆိုင် ရောက်ပါတယ်။')],
  chat:[s('.nc-button[data-nc="chat"]','Tap 💬.','💬 ကို နှိပ်ပါ။'),s(null,'Sign in with Google if asked, then write to the shop.','မေးရင် Google နဲ့ ဝင်ပြီး ဆိုင်ကို စာရေးပါ။')],
  noti:[s('.nc-button[data-nc="noti"]','Tap 🔔.','🔔 ကို နှိပ်ပါ။')],
  install:[openP,menu,s('#home-screen-action','Tap Add to Home Screen.','Add to Home Screen ကို နှိပ်ပါ။')],
  language:[openP,menu,s('[data-language-choice="my"]','Choose English or မြန်မာ here.','ဒီမှာ English ဒါမှမဟုတ် မြန်မာ ရွေးပါ။')],
  theme:[openP,menu,s('[data-theme-choice="dark"]','Choose Light or Dark here.','ဒီမှာ Light ဒါမှမဟုတ် Dark ရွေးပါ။')],
  share:[openP,menu,s('#share-store-action','Tap Share My Store.','Share My Store ကို နှိပ်ပါ။')],
  speed:[openP,menu,s('#app-speed-action','Tap App speed.','App speed ကို နှိပ်ပါ။')],
  save:[openP,menu,s('#saved-posts-action','Tap Saved.','Saved ကို နှိပ်ပါ။')],
  offline:[openP,menu,s('#offline-status','This shows if the shop is saved for offline use.','ဒါက ဆိုင်ကို offline အတွက် သိမ်းပြီးလား ပြပါတယ်။')],
  refresh:[s(H,'Tap Home again to reload (or pull the page down).','ပြန် load ဖို့ Home ကို ထပ်နှိပ်ပါ (ဒါမှမဟုတ် စာမျက်နှာကို အောက်ဆွဲပါ)။')],
  hero:[openP,s('.profile-dashboard','Tap Dashboard, then follow the steps in my answer.','Dashboard ကို နှိပ်ပါ၊ ပြီးရင် အဖြေထဲက အဆင့်တွေအတိုင်း လုပ်ပါ။')],
  usershow:[openP,s('.profile-dashboard','Tap Dashboard, then follow the steps in my answer.','Dashboard ကို နှိပ်ပါ၊ ပြီးရင် အဖြေထဲက အဆင့်တွေအတိုင်း လုပ်ပါ။')],
  lowstock:[openP,s('.profile-dashboard','Tap Dashboard, then follow the steps in my answer.','Dashboard ကို နှိပ်ပါ၊ ပြီးရင် အဖြေထဲက အဆင့်တွေအတိုင်း လုပ်ပါ။')],
  confirmorder:[openP,s('.profile-dashboard','Tap Dashboard, then follow the steps in my answer.','Dashboard ကို နှိပ်ပါ၊ ပြီးရင် အဖြေထဲက အဆင့်တွေအတိုင်း လုပ်ပါ။')],
  recycle:[openP,s('.profile-dashboard','Tap Dashboard, then follow the steps in my answer.','Dashboard ကို နှိပ်ပါ၊ ပြီးရင် အဖြေထဲက အဆင့်တွေအတိုင်း လုပ်ပါ။')],
  releaseupdate:[openP,menu,[ '#shop-release-confirm','This button sends the new version to every shop. Tap Confirm update yourself.','ဒီခလုတ်က ဆိုင်အားလုံးကို version အသစ် ပို့ပါတယ်။ Confirm update ကို ကိုယ်တိုင် နှိပ်ပါ။',true]],
  nav:[s('.mobile-bottom-nav','Press on the bar, slide your finger and let go on the tab you want.','Bar ပေါ် ဖိ၊ လက်ကို ရွှေ့ပြီး လိုချင်တဲ့ tab ပေါ်မှာ လွှတ်ပါ။')]
 };
 const tour={steps:null,i:0,el:null,my:false};
 const card=document.createElement('div');card.className='ai-tour-card';card.setAttribute('role','dialog');
 const finger=document.createElement('div');finger.className='ai-tour-finger';finger.setAttribute('aria-hidden','true');
 const shown=el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden'};
 const find=sel=>[...document.querySelectorAll(sel)].find(shown)||null;
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 function endTour(){document.body.classList.remove('ai-touring');tour.steps=null;tour.el?.classList.remove('ai-tour-target');tour.el=null;card.remove();finger.remove();removeEventListener('scroll',place,true);removeEventListener('resize',place)}
 function startTour(steps,my){endTour();document.body.classList.add('ai-touring');tour.steps=steps;tour.my=my;addEventListener('scroll',place,true);addEventListener('resize',place);go(0)}
 // The card and finger live in an open dialog when there is one (only it can be touched then).
 function place(){
  if(!tour.steps)return;const host=document.querySelector('dialog[open]:not(.ai-help)')||document.body;
  if(card.parentNode!==host){host.append(card);host.append(finger)}
  const probe=document.createElement('i');probe.style.cssText='position:fixed;left:0;top:0;width:0;height:0';host.append(probe);const o=probe.getBoundingClientRect();probe.remove();
  const vh=innerHeight,vw=innerWidth,cw=Math.min(vw-24,360);card.style.width=cw+'px';
  const el=tour.el&&tour.el.isConnected&&shown(tour.el)?tour.el:null;finger.hidden=!el;
  if(!el){card.style.left=Math.round((vw-cw)/2-o.left)+'px';card.style.top=Math.round(vh/2-card.offsetHeight/2-o.top)+'px';return}
  const r=el.getBoundingClientRect(),low=r.top+r.height/2>vh*.55,ch=card.offsetHeight;
  finger.textContent=low?'👇':'👆';
  finger.style.left=Math.round(r.left+r.width/2-17-o.left)+'px';finger.style.top=Math.round((low?r.top-44:r.bottom+6)-o.top)+'px';
  const top=low?Math.max(8,r.top-52-ch):Math.min(vh-ch-8,r.bottom+52);
  card.style.left=Math.round(Math.min(vw-cw-12,Math.max(12,r.left+r.width/2-cw/2))-o.left)+'px';card.style.top=Math.round(top-o.top)+'px';
 }
 async function go(i){
  if(!tour.steps)return;tour.el?.classList.remove('ai-tour-target');tour.el=null;tour.i=i;
  const steps=tour.steps,my=tour.my;if(i>=steps.length)return endTour();
  const [sel,en,mm]=steps[i];let el=null;
  if(sel){for(let k=0;k<25&&!(el=find(sel));k++)await wait(100);if(!tour.steps||tour.i!==i)return}
  const last=i===steps.length-1;
  card.innerHTML='<small>'+(my?'အဆင့် ':'Step ')+(i+1)+' / '+steps.length+'</small><p>'+esc(my?mm:en)+(sel&&!el?'<em>'+esc(my?'ဒီခလုတ်ကို ဒီစာမျက်နှာမှာ မတွေ့ပါ (ဆိုင်ပိုင်ရှင်အတွက်ပဲ ဖြစ်နိုင်ပါတယ်)။':'This button is not on this screen (it may be for the shop owner only).')+'</em>':'')+'</p><div><button type="button" data-tour="end">'+(my?'ပိတ်မယ်':'Close')+'</button><button type="button" data-tour="next">'+(last&&!el?(my?'ပြီးပြီ ✓':'Done ✓'):(my?'ရှေ့ဆက် ▶':'Next ▶'))+'</button></div>';
  if(el){tour.el=el;el.classList.add('ai-tour-target');el.scrollIntoView({block:'center',behavior:'smooth'})}
  place();setTimeout(place,350);setTimeout(place,800);
 }
 card.addEventListener('click',e=>{const b=e.target.closest('[data-tour]');if(!b)return;e.stopPropagation();if(b.dataset.tour==='end')return endTour();if(tour.el&&!tour.steps[tour.i][3])tour.el.click();else go(tour.i+1)});
 // Tapping the glowing button itself goes to the next step once the app has reacted.
 document.addEventListener('click',e=>{if(!tour.steps||!tour.el||card.contains(e.target)||!tour.el.contains(e.target))return;const i=tour.i;setTimeout(()=>{if(tour.steps&&tour.i===i)go(i+1)},450)},true);
 // Real data: the shop's products / categories / cart / payment details (store.js), the signed-in account and the
 // shop profile (existing APIs, read only). Nothing is sent anywhere new.
 const slugNow=()=>(location.pathname.match(/^\/shops\/([a-z0-9-]{1,80})\//)||[])[1]||'gearhub';
 const getJSON=async url=>{const r=await fetch(url,{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw Error(r.status);return r.json()};
 const list=()=>{try{return typeof products!=='undefined'&&Array.isArray(products)?products:[]}catch{return []}};
 const cats=()=>{try{return typeof categories!=='undefined'&&Array.isArray(categories)?categories:[]}catch{return []}};
 const cartNow=()=>{try{return typeof cart!=='undefined'&&cart?cart:{}}catch{return {}}};
 const payReady=()=>{try{return typeof config!=='undefined'&&Boolean(config?.bankName&&config?.bankAccountNumber)}catch{return false}};
 const shopName=()=>document.querySelector('#settings-profile-hero [data-site-brand-name]')?.textContent?.trim()||document.querySelector('.home-profile-banner [data-site-brand-name]')?.textContent?.trim()||'';
 const num=n=>Number(n||0).toLocaleString('en-US');
 async function me(){try{return await getJSON('/api/platform/me')}catch{return null}}
 // ----- 1.1.340: to-dos (this phone) and claim checks -----
 const TKEY=()=>'gh-ai-todos:'+slugNow();
 const loadT=()=>{try{const v=JSON.parse(localStorage.getItem(TKEY())||'[]');return Array.isArray(v)?v:[]}catch{return []}};
 const saveT=v=>{const items=v.slice(-60),t=Date.now();try{localStorage.setItem(TKEY(),JSON.stringify(items));localStorage.setItem(TKEY()+':t',String(t))}catch{}window.GearHubUserData?.put('ai-todos-'+slugNow(),{t,items})};
 async function syncTodos(){
  const key='ai-todos-'+slugNow(),srv=await window.GearHubUserData?.get(key);let lt=0;try{lt=Number(localStorage.getItem(TKEY()+':t'))||0}catch{}
  if(srv&&Array.isArray(srv.items)&&(Number(srv.t)||0)>lt){try{localStorage.setItem(TKEY(),JSON.stringify(srv.items));localStorage.setItem(TKEY()+':t',String(srv.t))}catch{}refreshTodos(true)}
  else if(lt>(Number(srv?.t)||0))window.GearHubUserData?.put(key,{t:lt,items:loadT()});
 }
 // "remind me to add the Hero picture" / "မှတ်ထား: ပစ္စည်းသစ် တင်ရန်" -> add; "done 2" / "ပြီးပြီ 2" -> done; "delete task 2" -> delete.
 function parseTodo(q){
  const t=q.normalize('NFC').trim(),low=t.toLowerCase(),n=(low.match(/(\d{1,3})/)||[])[1];
  if(n&&/(done|finished|completed|ပြီးပြီ|ပြီးသွားပြီ|လုပ်ပြီး)/.test(low)&&!/(to-?do|task).*(add|new)/.test(low))return {type:'done',n:Number(n)};
  if(n&&/(delete|remove|ဖျက်)/.test(low)&&/(to-?do|task|လုပ်စရာ|မှတ်)/.test(low))return {type:'del',n:Number(n)};
  if(/(remind me|add (a )?(to-?do|task)|new task|remember to|to-?do:|မှတ်ထား|မှတ်ပေး|အမှတ်ရအောင်|မမေ့အောင်|သတိပေး(ပါ|ပေး))/.test(low)){
   const text=t.replace(/remind me( to)?|add (a )?(to-?do|task)( to| for)?|new task|remember to|to-?do\s*[:：]|မှတ်ထား(ပေး)?(ပါ)?|မှတ်ပေး(ပါ)?|အမှတ်ရအောင်|မမေ့အောင်|သတိပေး(ပါ|ပေး)?/gi,' ').replace(/^[\s:：,.၊။\-–]+|[\s:：,.၊။\-–]+$/g,'').replace(/\s+/g,' ');
   return {type:'add',text:text.slice(0,140)}}
  return null;
 }

 // Real things that need the owner's attention (owner of this shop, or the GearHub owner on GearHub).
 async function autoTodos(force){
  if(!force&&Date.now()-autoAt<20000)return autoCache;
  const out=[],add=(en,my,fixEn,fixMy)=>out.push({en,my,fixEn,fixMy});
  try{
   const d=await me();if(!d?.user){autoCache=[];autoAt=Date.now();return autoCache}
   const slug=slugNow(),manager=d.isOwner||(d.shop&&d.shop.slug===slug);
   if(manager){
    if(!payReady())add('Add your payment details (bank / mobile account)','ငွေလွှဲ အချက်အလက် (ဘဏ်/မိုဘိုင်း account) ထည့်ရန်','Dashboard → Shop contact & payment','Dashboard → Shop contact & payment');
    if(!list().length&&typeof products!=='undefined')add('Add your first product','ပထမဆုံး ပစ္စည်း ထည့်ရန်','Profile → + Add → Business','Profile → + Add → Business');
    try{const st=await (typeof storefrontFetch==='function'?storefrontFetch('/api/storage'):fetch('/api/storage')).then(r=>r.ok?r.json():null);if(st&&st.capacityBytes&&st.usedBytes/st.capacityBytes>=.9)add('Storage is almost full','Storage နီးပါး ပြည့်နေပြီ','Delete photos or files you do not need','မလိုတဲ့ ပုံ/file ဖျက်ပါ')}catch{}
    if('Notification' in window&&Notification.permission!=='granted')add('Turn on phone alerts for new orders','အော်ဒါအသစ် သိဖို့ ဖုန်း alert ဖွင့်ရန်','Settings → Notifications','Settings → Notifications');
    try{const prof=await getJSON('/api/platform/profile/'+encodeURIComponent(slug));if(prof?.canPost&&!(prof.about?.caption))add('Write a caption for your store','ဆိုင်အတွက် caption ရေးရန်','Profile → pencil','Profile → ခဲတံ')}catch{}
    if(d.isOwner){try{const r=await fetch('/api/admin/app-release',{credentials:'same-origin',cache:'no-store'});if(r.ok){const a=await r.json();if(a.pending)add('Release the update to all shops (GearHub '+a.deployedVersion+', shops '+a.sellerVersion+')','Update ကို ဆိုင်အားလုံးကို release လုပ်ရန် (GearHub '+a.deployedVersion+'၊ ဆိုင်တွေ '+a.sellerVersion+')','Settings → Shop updates → Confirm update','Settings → Shop updates → Confirm update')}}catch{}}
   }
  }catch{}
  autoCache=out;autoAt=Date.now();return out;
 }
 async function refreshTodos(force){
  const auto=await autoTodos(force),own=loadT().filter(x=>!x.done);
  todoCount=auto.length+own.length;
  if(todoCount>0)button.dataset.n=String(Math.min(todoCount,9));else delete button.dataset.n;
  paint();return {auto,own};
 }
 function todoText(my,auto,all){
  const own=all;let n=0;const L=[];
  own.forEach((x,i)=>L.push((x.done?'✔ ':(i+1)+'. ')+(x.done?'':'')+x.text+(x.done?' ('+(my?'ပြီးပြီ':'done')+')':'')));
  const pending=own.filter(x=>!x.done).length+auto.length;
  if(!pending&&!own.length)return my?'လုပ်စရာ မရှိပါဘူး ✅\n\nအသစ်ထည့်ချင်ရင် "မှတ်ထား: ..." လို့ ရေးပါ (ဥပမာ "မှတ်ထား: ပစ္စည်းသစ် ၁၀ ခု တင်ရန်")။':'You have nothing to do ✅\n\nTo add a note, write "remind me to ..." (for example "remind me to add 10 new products").';
  const head=pending?(my?'လုပ်စရာ '+pending+' ခု ရှိပါတယ်:':'You have '+pending+' thing(s) to do:'):(my?'လုပ်စရာအားလုံး ပြီးပါပြီ ✅':'Everything is done ✅');
  const mine=own.length?'\n\n📝 '+(my?'ကိုယ်တိုင် မှတ်ထားတာ':'Your notes')+'\n'+L.join('\n'):'';
  const sys=auto.length?'\n\n⚠️ '+(my?'App က စစ်တွေ့တာ':'Found by the app')+'\n'+auto.map(a=>'• '+(my?a.my:a.en)+' — '+(my?a.fixMy:a.fixEn)).join('\n'):'';
  return head+mine+sys+'\n\n'+(my?'ပြီးရင် "ပြီးပြီ 1" လို့ ရေးပါ။ ဖျက်ချင်ရင် "ဖျက် task 1"။ (မှတ်ထားတာတွေ ဒီဖုန်းထဲမှာပဲ သိမ်းပါတယ်၊ ⚠️ ကတော့ ပြင်ပြီးရင် အလိုလို ပျောက်ပါတယ်။)':'When done write "done 1". To delete write "delete task 1". (Your notes are kept on this phone; ⚠️ items disappear by themselves once fixed.)');
 }
 // A verdict about something the user says is wrong: TRUE (the problem is real, with the reason) or FALSE (not found).
 function verdict(my,real,why,fine,hint){
  const head=real===null?(my?'❓ သေချာ မစစ်နိုင်ပါဘူး':'❓ I cannot be sure'):real?(my?'✅ မှန်ပါတယ် — ပြဿနာ တကယ်ရှိပါတယ်':'✅ True — the problem is real'):(my?'❌ မှားနေပါတယ် — ကျွန်မ စစ်တာ ပြဿနာ မတွေ့ပါ':'❌ Not true — I checked and found no problem');
  const L=[head];if(why.length)L.push('',...why.map(x=>'⚠️ '+x));if(fine.length)L.push('',...fine.map(x=>'✅ '+x));if(hint)L.push('',hint);
  return L.join('\n');
 }
 const storageState=async()=>{try{const st=await (typeof storefrontFetch==='function'?storefrontFetch('/api/storage'):fetch('/api/storage')).then(r=>r.ok?r.json():null);return st&&st.capacityBytes?{pc:Math.round(st.usedBytes/st.capacityBytes*100)}:null}catch{return null}};
 const BOT=(my,a,b)=>my?b:a;
 const LIVE={
  async whatsell(my){
   const ps=list(),cs=cats(),name=shopName();
   if(!ps.length)return my?'ပစ္စည်းစာရင်း မရောက်သေးပါ (internet စစ်ပြီး ခဏနေ ပြန်မေးပါ)။':'The product list has not loaded yet (check the internet and ask again in a moment).';
   const lab=c=>{try{return typeof categoryLabel==='function'?categoryLabel(c):(c.category_en||c.name||'')}catch{return c.category_en||c.name||''}};
   const names=[...new Set(cs.map(lab).filter(Boolean))].slice(0,8),nm=p=>{try{return typeof productName==='function'?productName(p):(p.name_en||p.name||'')}catch{return p.name_en||p.name||''}};
   const sample=ps.slice(0,3).map(nm).filter(Boolean);
   return (my?(name||'ဒီဆိုင်')+' မှာ ပစ္စည်း '+num(ps.length)+' ခု ရှိပါတယ်။':(name||'This shop')+' has '+num(ps.length)+' products.')+(names.length?'\n\n'+(my?'အမျိုးအစားတွေ: ':'Categories: ')+names.join('၊ '):'')+(sample.length?'\n\n'+(my?'ဥပမာ: ':'For example: ')+sample.join(' · '):'')+'\n\n'+(my?'ရှာချင်ရင် Home ရဲ့ search bar မှာ နာမည် ဒါမှမဟုတ် SKU ရိုက်ပါ။':'To look for something, type a name or SKU in the search bar on Home.');
  },
  async todolist(my){const r=await refreshTodos(true);return todoText(my,r.auto,loadT())},
  async todoadd(my,q){const c=parseTodo(q||'');
   if(c?.type==='done'||c?.type==='del')return LIVE.todocmd(my,c);
   if(!c||c.type!=='add'||c.text.length<2)return my?'ဘာကို မှတ်ထားရမလဲ ပြောပါ။ ဥပမာ: "မှတ်ထား: ပစ္စည်းသစ် ၁၀ ခု တင်ရန်"':'What should I note? For example: "remind me to add 10 new products".';
   const t=loadT();t.push({id:Date.now(),text:c.text,done:false,at:Date.now()});saveT(t);await refreshTodos(true);
   return (my?'မှတ်ထားပြီးပါပြီ 📝 "'+c.text+'"\nApp ဖွင့်တိုင်း ကျွန်မ ပုံပေါ်က နံပါတ်နီလေးနဲ့ သတိပေးပါမယ်။ ပြီးရင် "ပြီးပြီ '+t.length+'" လို့ ရေးပါ။':'Noted 📝 "'+c.text+'"\nI will remind you with a red number on my picture whenever you open the app. When done, write "done '+t.length+'".')},
  async todocmd(my,c){const t=loadT(),i=c.n-1;
   if(!t[i])return my?'နံပါတ် '+c.n+' မရှိပါဘူး။ "လုပ်စရာ" လို့ ရေးပြီး စာရင်း ကြည့်ပါ။':'There is no item '+c.n+'. Write "my to-do" to see the list.';
   if(c.type==='del'){const g=t.splice(i,1)[0];saveT(t);await refreshTodos(true);return (my?'ဖျက်ပြီးပါပြီ: ':'Deleted: ')+g.text}
   t[i].done=true;saveT(t);const r=await refreshTodos(true);
   return (my?'ကောင်းပါတယ် ✅ ပြီးပြီ: ':'Good ✅ Done: ')+t[i].text+'\n'+(todoCount?(my?'ကျန်တာ '+todoCount+' ခု ရှိပါသေးတယ်။':todoCount+' left.'):(my?'လုပ်စရာ အားလုံး ပြီးပါပြီ 🎉':'Everything is done 🎉'))},
  async claim_add(my){
   const d=await me(),why=[],fine=[];
   if(!d)return verdict(my,null,[],[],BOT(my,'Could not reach the server — try again in a moment.','Server ကို မရောက်ပါ — ခဏနေ ပြန်စမ်းပါ။'));
   if(navigator.onLine===false)why.push(BOT(my,'No internet.','Internet မရှိပါ။'));
   if(!d.user)why.push(BOT(my,'You are not signed in — only the shop owner can add products. Sign in with Google.','Google နဲ့ မဝင်ရသေးပါ — ပစ္စည်းထည့်ခွင့်က ဆိုင်ပိုင်ရှင်ပဲ ရှိပါတယ်။ Google နဲ့ ဝင်ပါ။'));
   else{let can=null;try{const pr=await getJSON('/api/platform/profile/'+encodeURIComponent(slugNow()));can=Boolean(pr.canPost)}catch{}
    if(can===false)why.push(BOT(my,'This account ('+(d.user.email||'')+') is not the owner of this shop, so Add is not available. Sign in with the shop owner\'s Google account.','ဒီ account ('+(d.user.email||'')+') က ဒီဆိုင်ရဲ့ ပိုင်ရှင် မဟုတ်လို့ Add မရပါဘူး။ ဆိုင်ပိုင်ရှင်ရဲ့ Google account နဲ့ ဝင်ပါ။'));
    else if(can)fine.push(BOT(my,'You are signed in as the owner of this shop, so you may add products.','ဒီဆိုင်ရဲ့ ပိုင်ရှင်အဖြစ် ဝင်ထားလို့ ပစ္စည်းထည့်ခွင့် ရှိပါတယ်။'))}
   const st=await storageState();if(st){if(st.pc>=100)why.push(BOT(my,'The shop storage is full (100%) — delete photos or files first.','ဆိုင်ရဲ့ storage ပြည့်နေပါပြီ (100%) — ပုံ/file တချို့ အရင် ဖျက်ပါ။'));else fine.push(BOT(my,'Storage has room ('+st.pc+'% used).','Storage နေရာ ကျန်ပါတယ် ('+st.pc+'% သုံးပြီး)။'))}
   const real=why.length>0;
   return verdict(my,real,why,fine,real?null:BOT(my,'Everything I can check is fine. Then check the form itself: SKU, name, price and category must be filled, and photos should be JPG/PNG/WebP. Tap Go ▶ on "How to add a product" if you want the steps.','ကျွန်မ စစ်လို့ရတာတွေ ပုံမှန်ပါ။ ဒါဆို form ကိုယ်တိုင်ကို စစ်ပါ: SKU၊ နာမည်၊ ဈေး၊ Category ဖြည့်ထားရမယ်၊ ပုံက JPG/PNG/WebP ဖြစ်ရမယ်။ အဆင့်တွေ လိုရင် "ပစ္စည်းထည့်နည်း" လို့ မေးပြီး Go ▶ နှိပ်ပါ။'))},
  async cantorder(my){
   const why=[],fine=[];
   if(navigator.onLine===false)why.push(BOT(my,'No internet.','Internet မရှိပါ။'));
   if(!payReady())why.push(BOT(my,'This shop has not added payment details (bank / mobile account), so ordering is not possible. Ask the shop with 💬.','ဒီဆိုင်က ငွေလွှဲ အချက်အလက် (ဘဏ်/မိုဘိုင်း account) မထည့်ရသေးလို့ မှာလို့ မရပါဘူး။ 💬 နဲ့ ဆိုင်ကို မေးပါ။'));else fine.push(BOT(my,'Payment details are set.','ငွေလွှဲ အချက်အလက် ရှိပါတယ်။'));
   if(!Object.values(cartNow()).some(n=>n>0))why.push(BOT(my,'Your cart is empty — add a product first.','ခြင်းထဲ ဘာမှ မရှိသေးပါ — ပစ္စည်း အရင်ထည့်ပါ။'));else fine.push(BOT(my,'Your cart has items.','ခြင်းထဲ ပစ္စည်း ရှိပါတယ်။'));
   const real=why.length>0;
   return verdict(my,real,why,fine,real?null:BOT(my,'Everything I can check is fine. Fill in name, phone, address, the transaction reference and the receipt photo (required), then tap Place order.','ကျွန်မ စစ်လို့ရတာတွေ ပုံမှန်ပါ။ အမည်၊ ဖုန်း၊ လိပ်စာ၊ transaction reference နဲ့ ပြေစာ ဓာတ်ပုံ (မဖြစ်မနေ) အကုန်ဖြည့်ပြီး အော်ဒါတင်မည် နှိပ်ပါ။'))},
  async claim_missing(my){
   const why=[],fine=[],typed=(document.getElementById('search')?.value||'').trim(),n=list().length;
   if(navigator.onLine===false)why.push(BOT(my,'No internet — the list may not have loaded.','Internet မရှိပါ — စာရင်း မရောက်သေးနိုင်ပါ။'));
   if(!n)why.push(BOT(my,'No products have loaded on this screen yet (the shop may have none, or the connection is slow).','ဒီ screen မှာ ပစ္စည်း မရောက်သေးပါ (ဆိုင်မှာ မရှိသေးတာ ဒါမှမဟုတ် လိုင်းနှေးတာ ဖြစ်နိုင်ပါတယ်)။'));else fine.push(BOT(my,n+' products are loaded.','ပစ္စည်း '+n+' ခု ရောက်နေပါတယ်။'));
   if(typed)why.push(BOT(my,'The search box still has "'+typed+'", which hides other products — clear it.','Search box ထဲမှာ "'+typed+'" ရှိနေလို့ တခြားပစ္စည်းတွေ ပျောက်နေပါတယ် — ဖျက်ပါ။'));
   const cat=document.getElementById('category-filter')||document.querySelector('#products-section select');
   const real=why.length>0;return verdict(my,real,why,fine,real?null:BOT(my,'Products are showing. Pull the page down to refresh if you still do not see them.','ပစ္စည်းတွေ ပေါ်နေပါတယ်။ မမြင်သေးရင် စာမျက်နှာကို အောက်ဆွဲပြီး refresh လုပ်ပါ။'))},
  async claim_photo(my){
   const why=[],fine=[];
   if(navigator.onLine===false)why.push(BOT(my,'No internet.','Internet မရှိပါ။'));
   const st=await storageState();if(st){if(st.pc>=100)why.push(BOT(my,'The shop storage is full (100%), so new photos cannot be saved.','ဆိုင်ရဲ့ storage ပြည့်နေလို့ ပုံအသစ် သိမ်းလို့ မရပါ။'));else fine.push(BOT(my,'Storage has room ('+st.pc+'% used).','Storage နေရာ ကျန်ပါတယ် ('+st.pc+'% သုံးပြီး)။'))}
   const real=why.length>0;return verdict(my,real,why,fine,real?null:BOT(my,'No cause found on my side. Photos must be JPG, PNG or WebP; very large photos are made smaller by the app. Try one photo, and check the phone\'s own storage and camera permission.','ကျွန်မဘက်က အကြောင်းရင်း မတွေ့ပါ။ ပုံက JPG၊ PNG ဒါမှမဟုတ် WebP ဖြစ်ရမယ်၊ ပုံကြီးရင် app က သေးအောင် လုပ်ပေးပါတယ်။ တစ်ပုံချင်း စမ်းကြည့်ပါ၊ ဖုန်းရဲ့ storage နဲ့ ကင်မရာ ခွင့်ပြုချက်ကိုလည်း စစ်ပါ။'))},
  async claim_alert(my){
   const why=[],fine=[],ios=/iphone|ipad|ipod/i.test(navigator.userAgent||''),standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
   if(ios&&!standalone)why.push(BOT(my,'On iPhone, alerts only work in the app added to the Home Screen, not in Safari.','iPhone မှာ alert က Safari မှာ မရပါ — Home Screen ကို ထည့်ထားတဲ့ app ထဲမှာပဲ ရပါတယ်။'));
   if('Notification' in window){const p=Notification.permission;
    if(p==='denied')why.push(BOT(my,'Alerts are blocked in the phone settings — allow notifications for this app there.','ဖုန်း setting မှာ alert ကို ပိတ်ထားပါတယ် — အဲဒီမှာ ဒီ app အတွက် notification ကို ခွင့်ပြုပါ။'));
    else if(p==='default')why.push(BOT(my,'Alerts are not turned on yet — switch on Settings → Notifications.','Alert မဖွင့်ရသေးပါ — Settings → Notifications ကို ဖွင့်ပါ။'));
    else fine.push(BOT(my,'Notification permission is allowed.','Notification ခွင့်ပြုချက် ရထားပါတယ်။'))}
   else why.push(BOT(my,'This browser does not support alerts — add the app to the Home Screen.','ဒီ browser က alert မပံ့ပိုးပါ — app ကို Home Screen ထဲ ထည့်ပါ။'));
   const real=why.length>0;return verdict(my,real,why,fine,real?null:BOT(my,'Permission is fine. Make sure the Notifications switch in Settings is On, and the phone is not in a focus / silent mode.','ခွင့်ပြုချက် ပုံမှန်ပါ။ Settings ထဲက Notifications switch ဖွင့်ထားလား၊ ဖုန်းက Focus / silent mode မဖြစ်နေလား စစ်ပါ။'))},
  async claim_login(my){
   const d=await me();if(!d)return verdict(my,null,[],[],BOT(my,'Could not reach the server — try again in a moment.','Server ကို မရောက်ပါ — ခဏနေ ပြန်စမ်းပါ။'));
   if(d.user)return verdict(my,false,[],[BOT(my,'You are already signed in as '+(d.user.name||'')+' ('+(d.user.email||'')+').',(d.user.name||'')+' ('+(d.user.email||'')+') နဲ့ ဝင်ထားပြီးသားပါ။')],BOT(my,'If a page still asks you to sign in, reload it.','Page တစ်ခုက ဝင်ဖို့ ဆက်တောင်းရင် reload လုပ်ပါ။'));
   return verdict(my,true,[BOT(my,'You are not signed in on this screen.','ဒီ screen မှာ မဝင်ရသေးပါ။')],[],BOT(my,'Tap Continue with Google when the app asks. In the installed app the sign-in opens in the browser and returns here; if it does not return, open the app again.','App က မေးတဲ့အခါ Google နဲ့ ဝင်မယ် ကို နှိပ်ပါ။ Install ထားတဲ့ app မှာ browser ပွင့်ပြီး ပြန်လာပါမယ်၊ မပြန်လာရင် app ကို ပြန်ဖွင့်ပါ။'));},
  async countproducts(my){const n=list().length,c=cats().length,name=shopName();
   if(!n)return my?'ပစ္စည်းစာရင်း မရောက်သေးပါ (internet စစ်ပြီး ခဏနေ ပြန်မေးပါ)။':'The product list has not loaded yet (check the internet and ask again in a moment).';
   return my?(name?name+' ':'ဒီဆိုင်')+'မှာ ပစ္စည်း '+num(n)+' ခု ရှိပါတယ်'+(c?'၊ အမျိုးအစား '+num(c)+' ခုနဲ့ပါ':'')+'။':(name||'This shop')+' has '+num(n)+' products'+(c?' in '+num(c)+' categories':'')+'.'},
  async countfollowers(my){try{const d=await getJSON('/api/platform/profile/'+encodeURIComponent(slugNow()));
   return my?'Followers '+num(d.followers)+' ယောက်၊ Following '+num(d.following)+'၊ Posts '+num(d.posts)+' ခု ရှိပါတယ်။':'Followers: '+num(d.followers)+' · Following: '+num(d.following)+' · Posts: '+num(d.posts)+'.'}
   catch{return my?'အခု မစစ်နိုင်ပါ (internet စစ်ပါ)။':'I cannot check right now (check the internet).'}},
  async cartnow(my){const c=cartNow(),rows=Object.entries(c).filter(([,q])=>q>0);if(!rows.length)return my?'ခြင်းထဲမှာ ဘာမှ မရှိသေးပါ။':'Your cart is empty.';
   let total=0,count=0;for(const [id,q] of rows){const p=list().find(x=>x.id===Number(id));count+=q;if(p)total+=Number(p.price||0)*q}
   return my?'ခြင်းထဲမှာ ပစ္စည်း '+num(count)+' ခု ('+rows.length+' မျိုး) ရှိပြီး စုစုပေါင်း '+num(total)+' Ks ပါ။':'Your cart has '+num(count)+(count===1?' item':' items')+' ('+rows.length+(rows.length===1?' kind':' kinds')+'), total '+num(total)+' Ks.'},
  async whoami(my){const d=await me();if(!d)return my?'အခု မစစ်နိုင်ပါ (internet စစ်ပါ)။':'I cannot check right now (check the internet).';
   if(!d.user)return my?'Google နဲ့ မဝင်ရသေးပါ။ Like၊ comment၊ chat၊ မှာဖို့ ဝင်ဖို့ လိုပါတယ်။':'You are not signed in. You need Google sign-in to like, comment, chat and order.';
   const own=d.shop&&d.shop.slug===slugNow(),role=d.isOwner?(my?'SkyShopMM ပိုင်ရှင်':'SkyShopMM owner'):own?(my?'ဒီဆိုင်ရဲ့ ပိုင်ရှင်':'owner of this shop'):d.shop?(my?(d.shop.name||'')+' ဆိုင်ရဲ့ ပိုင်ရှင်':'owner of '+(d.shop.name||'a shop')):(my?'ဝယ်သူ':'customer');
   return my?(d.user.name||'')+' ('+(d.user.email||'')+') နဲ့ ဝင်ထားပါတယ်။ အခန်းကဏ္ဍ: '+role+'။':'Signed in as '+(d.user.name||'')+' ('+(d.user.email||'')+'). Role: '+role+'.'},
  async releaseupdate(my){
   let d=null;try{const r=await fetch('/api/admin/app-release',{credentials:'same-origin',cache:'no-store'});if(r.ok)d=await r.json()}catch{}
   if(!d)return my?'Update ကို ဆိုင်အားလုံးဆီ release လုပ်တာ GearHub ပိုင်ရှင်ပဲ လုပ်ခွင့်ရှိပါတယ် (GearHub ရဲ့ Settings → Shop updates)။ ဒီ account နဲ့ မမြင်ရပါဘူး။':'Releasing an update to all shops is for the GearHub owner only (GearHub Settings → Shop updates). This account cannot see it.';
   const state=my?(d.pending?'GearHub '+d.deployedVersion+' ဖြစ်ပြီး ဆိုင်တွေက '+d.sellerVersion+' မှာ ရှိနေပါသေးတယ် — release စောင့်နေပါတယ်။':'ဆိုင်အားလုံး နောက်ဆုံး version ('+d.sellerVersion+') မှာ ရှိပါတယ် — release လုပ်စရာ မရှိပါ။'):(d.pending?'GearHub is on '+d.deployedVersion+' but the shops are still on '+d.sellerVersion+' — the release is waiting.':'All shops are already on the latest version ('+d.sellerVersion+') — nothing to release.');
   return state+(d.pending?(my?'\n\nဒီခလုတ်က ဆိုင်အားလုံးကို တစ်ပြိုင်နက် ပြောင်းစေတာမို့ ကျွန်မက ကိုယ်စား မနှိပ်ပါဘူး။ Go ▶ ကို နှိပ်ရင် ဘယ်နေရာမှာလဲ ပြပေးပါမယ် — Confirm update ကို ကိုယ်တိုင် နှိပ်ပါ။':'\n\nThis sends the new version to every shop at once, so I do not press it for you. Tap Go ▶ and I will show you where — tap Confirm update yourself.'):'')},
  async version(my){const d=await me(),now=document.querySelector('meta[name="gearhub-build-version"]')?.content||'',latest=d?.release?.version||'';
   const fresh=!latest||latest===now;return my?'အခု version '+now+(fresh?' — နောက်ဆုံး version ပါ။':' — version အသစ် '+latest+' ရှိပါတယ်။ App ကို ပိတ်ပြီး ပြန်ဖွင့်ပါ။'):'This is version '+now+(fresh?' — the latest.':' — version '+latest+' is ready. Close and reopen the app.')},
  // A check of the things that most often go wrong, with what to do.
  async check(my){const L=[],ok=(en,mm)=>L.push('✅ '+(my?mm:en)),bad=(en,mm)=>L.push('⚠️ '+(my?mm:en));
   if(navigator.onLine===false)bad('No internet — saved pages still open; ordering, chat and likes need internet.','Internet မရှိပါ — သိမ်းထားတာတွေ ပွင့်ပေမယ့် မှာ၊ chat၊ like အတွက် internet လိုပါတယ်။');else ok('Internet is on.','Internet ရှိပါတယ်။');
   const d=await me();
   if(!d)bad('Could not reach the server — try again in a moment.','Server ကို မရောက်ပါ — ခဏနေ ပြန်စမ်းပါ။');
   else{
    if(d.user)ok('Signed in as '+(d.user.name||d.user.email)+'.',(d.user.name||d.user.email)+' နဲ့ ဝင်ထားပါတယ်။');else bad('Not signed in — tap Continue with Google when you like, comment, chat or order.','Google နဲ့ မဝင်ရသေးပါ — like၊ comment၊ chat၊ မှာတဲ့အခါ Google နဲ့ ဝင်မယ် နှိပ်ပါ။');
    const now=document.querySelector('meta[name="gearhub-build-version"]')?.content||'',latest=d.release?.version||'';
    if(latest&&now&&latest!==now)bad('A new version ('+latest+') is ready — close and reopen the app.','Version အသစ် ('+latest+') ရှိပါတယ် — app ကို ပိတ်ပြီး ပြန်ဖွင့်ပါ။');else ok('The app is up to date ('+now+').','App က နောက်ဆုံး version ('+now+') ပါ။');
    const manager=d.isOwner||(d.shop&&d.shop.slug===slugNow());
    if(!payReady())bad(manager?'Payment details (bank / mobile account) are missing — customers cannot order. Add them in Dashboard → Shop contact & payment.':'This shop has not added payment details yet, so ordering is not possible — ask the shop with 💬.',manager?'ငွေလွှဲ အချက်အလက် (ဘဏ်/မိုဘိုင်း account) မထည့်ရသေးပါ — ဝယ်သူတွေ မှာလို့ မရပါ။ Dashboard → Shop contact & payment မှာ ထည့်ပါ။':'ဒီဆိုင်က ငွေလွှဲ အချက်အလက် မထည့်ရသေးလို့ မှာလို့ မရသေးပါ — 💬 နဲ့ ဆိုင်ကို မေးပါ။');else ok('Payment details are set, so orders can be placed.','ငွေလွှဲ အချက်အလက် ရှိလို့ မှာလို့ ရပါတယ်။');
    if(!list().length)bad(manager?'The shop has no products yet — add them from Profile → + Add → Business.':'No products are showing yet.',manager?'ဆိုင်မှာ ပစ္စည်း မရှိသေးပါ — Profile → + Add → Business ကနေ ထည့်ပါ။':'ပစ္စည်း မပေါ်သေးပါ။');else ok(num(list().length)+' products are showing.','ပစ္စည်း '+num(list().length)+' ခု ပေါ်နေပါတယ်။');
    if(manager){
     try{const st=await (typeof storefrontFetch==='function'?storefrontFetch('/api/storage'):fetch('/api/storage')).then(r=>r.ok?r.json():null);
      if(st&&st.capacityBytes){const pc=Math.round(st.usedBytes/st.capacityBytes*100);(pc>=90?bad:ok)('Storage '+pc+'% used.','Storage '+pc+'% သုံးပြီးပါပြီ။'+(pc>=90?' နေရာ နည်းနေပါပြီ — မလိုတဲ့ ပုံ/file ဖျက်ပါ။':''))}}catch{}
     if('Notification' in window&&Notification.permission!=='granted')bad('Phone alerts are off — turn them on in Settings → Notifications to hear new orders.','ဖုန်း alert ပိတ်ထားပါတယ် — အော်ဒါအသစ် သိဖို့ Settings → Notifications မှာ ဖွင့်ပါ။');
    }
   }
   const problems=L.filter(x=>x.startsWith('⚠️')).length;
   return (problems?(my?'စစ်ကြည့်ပြီးပါပြီ — သတိထားရမှာ '+problems+' ခု ရှိပါတယ်:':'Checked — '+problems+' thing(s) need attention:'):(my?'စစ်ကြည့်ပြီးပါပြီ — ပြဿနာ မရှိပါ:':'Checked — no problems found:'))+'\n'+L.join('\n')}
 };
 function ask(q){
  q=q.trim().slice(0,200);if(!q)return;say('me',q);
  // 1.1.342 owner: answer in Myanmar unless the question was typed in English only.
  const my=isMy(q)||!/[a-z]/i.test(q),hit=answer(q);
  const cmd=parseTodo(q);
  if(cmd&&(cmd.type==='done'||cmd.type==='del')&&loadT()[cmd.n-1]){const wait=document.createElement('div');wait.className='ai-help-msg bot';wait.innerHTML='<img src="'+robot+'" alt=""><p>…</p>';log.append(wait);LIVE.todocmd(my,cmd).then(text=>{wait.remove();say('bot',text,null,my,'todolist')});return}
  if(hit&&LIVE[hit[0]]){const wait=document.createElement('div');wait.className='ai-help-msg bot';wait.innerHTML='<img src="'+robot+'" alt=""><p>…</p>';log.append(wait);log.scrollTop=log.scrollHeight;
   LIVE[hit[0]](my,q).catch(()=>my?'အခု မစစ်နိုင်ပါ။':'I cannot check right now.').then(text=>{wait.remove();say('bot',text,null,my,hit[0])});return}
  setTimeout(()=>{if(hit)return say('bot',my?hit[3]:hit[2],hit[4],my,hit[0]);
   const guess=near(q);
   if(!guess.length||!isAppish(q))return say('bot',unknownText(q,my));
   say('bot',my?'ကျွန်မ သေချာ မနားလည်ပါဘူး။ ဒါတွေထဲက တစ်ခုလား?':'I am not sure I understood. Did you mean one of these?');
   const box=document.createElement('div');box.className='ai-help-suggest';box.innerHTML=guess.map(id=>'<button type="button" data-q="'+esc(LABELS[id][my?1:0])+'">'+esc(LABELS[id][my?1:0])+'</button>').join('');
   log.append(box);log.scrollTop=log.scrollHeight;
   box.onclick=e=>{const b=e.target.closest('button');if(b){box.remove();ask(b.dataset.q)}}},250);
 }
 box.querySelector('.ai-help-form').addEventListener('submit',e=>{e.preventDefault();ask(input.value);input.value=''});
 chipBox.addEventListener('click',e=>{const b=e.target.closest('button');if(b)ask(b.classList.contains('ai-help-todochip')?'လုပ်စရာ စာရင်း':b.textContent)});
 box.querySelector('.ai-help-x').onclick=()=>box.close();
 box.addEventListener('click',e=>{if(e.target===box)box.close()});
 // 1.1.337 owner's words: the first greeting, in Myanmar with English under it.
 const GREETING='မင်္ဂလာပါ။ SkyShopMM မှ နွေးထွေးစွာ ကြိုဆိုပါတယ်။\n\nကျွန်မက သင့်ရဲ့ AI Assistant ပါ။\n\nပစ္စည်းရှာဖွေခြင်း၊ ဈေးဝယ်ခြင်း၊ ဆိုင်ဖွင့်ခြင်းနဲ့ App အသုံးပြုပုံတွေကို လွယ်ကူမြန်ဆန်စွာ ကူညီပေးဖို့ အသင့်ရှိနေပါတယ်။\n\nသိချင်တာ၊ အခက်အခဲရှိတာတွေကို အချိန်မရွေး လွတ်လပ်စွာ မေးမြန်းနိုင်ပါတယ်။\n\nဒီနေ့ ဘာများကူညီပေးရမလဲ?\n\n—\n\nHello! A warm welcome from SkyShopMM.\n\nI am your AI Assistant.\n\nI am here to help you quickly and easily with finding products, shopping, opening a shop and using the app.\n\nFeel free to ask anything you want to know, or about any problem, at any time.\n\nHow can I help you today?';
 button.addEventListener('click',()=>{if(!log.children.length){if(hist.length)paintHist();else say('bot',GREETING)}box.showModal();if(matchMedia('(pointer:fine)').matches)input.focus();
  // 1.1.340 owner: remind the owner of what is waiting — once a day in the chat, and always as the red number on my picture.
  refreshTodos(true).then(r=>{const day=new Date().toISOString().slice(0,10);let seen='';try{seen=localStorage.getItem('gh-ai-todo-day:'+slugNow())||''}catch{}
   if(todoCount>0&&seen!==day&&box.open){try{localStorage.setItem('gh-ai-todo-day:'+slugNow(),day)}catch{}say('bot',todoText(true,r.auto,loadT()),null,true,'todolist')}})});
 box.addEventListener('close',()=>{refreshTodos(true)});
 addEventListener('gearhub:data-ready',()=>setTimeout(()=>{syncTodos();syncChat();refreshTodos(true)},5000));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshTodos(false)});
 setTimeout(()=>refreshTodos(false),9000);
 // 1.1.333 owner's iPhone: while the keyboard is up the chat fits exactly in the space above it (no gap
 // with the page showing under the typing box, header kept on screen).
 const vv=window.visualViewport;
 function fit(){
  if(!vv||!box.open)return;
  const keyboard=innerHeight-vv.height>120;
  box.classList.toggle('ai-help-kb',keyboard);
  if(keyboard){box.style.top=Math.round(vv.offsetTop)+'px';box.style.height=Math.round(vv.height)+'px';box.style.bottom='auto'}
  else box.style.top=box.style.height=box.style.bottom='';
 }
 if(vv){vv.addEventListener('resize',fit);vv.addEventListener('scroll',fit)}
 input.addEventListener('focus',()=>setTimeout(fit,50));input.addEventListener('blur',()=>setTimeout(fit,50));
 box.addEventListener('close',()=>{box.classList.remove('ai-help-kb');box.style.top=box.style.height=box.style.bottom=''});
 window.GearHubAiHelp={answer,near,parseTodo,unknown:unknownText,labels:LABELS,tours:TOURS,startTour,ids:K.map(e=>e[0])};
})();
