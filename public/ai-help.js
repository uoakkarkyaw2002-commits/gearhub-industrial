/* 1.1.332 owner: a small AI robot that answers questions about using this app — and nothing else.
   It runs on the phone itself (no paid AI service, no server call, works offline): the question is matched
   against the app's own help list in English and Myanmar; anything not about the app gets a polite "I can
   only help with this app". Answers can carry a button that opens the right place. */
(()=>{
 if(!document.querySelector('.mobile-bottom-nav'))return;
 const ui={en:{title:'AI Help',sub:'Ask how to use this app',hello:'Hi! I am the app helper robot 🤖 Ask me how to use this app — searching, ordering, Discover, Profile, chat, Settings and more.',
   placeholder:'Ask about this app…',send:'Send',close:'Close',open:'Ask the AI helper',
   only:'Sorry, I can only answer questions about using this app. Try one of these:',try:'You can ask:'},
  my:{title:'AI အကူ',sub:'App အသုံးပြုနည်း မေးပါ',hello:'မင်္ဂလာပါ။ App အကူ robot ပါ 🤖 ဒီ app ကို ဘယ်လိုသုံးရမလဲ မေးပါ — ရှာနည်း၊ မှာနည်း၊ Discover၊ Profile၊ Chat၊ Settings စသည်ဖြင့်။',
   placeholder:'App အကြောင်း မေးပါ…',send:'ပို့မယ်',close:'ပိတ်မယ်',open:'AI အကူကို မေးမယ်',
   only:'တောင်းပန်ပါတယ်၊ ဒီ app အသုံးပြုနည်းကိုပဲ ဖြေပေးနိုင်ပါတယ်။ ဒါတွေ မေးကြည့်ပါ:',try:'မေးလို့ရတာတွေ:'}};
 const pageMy=()=>document.documentElement.lang==='my';
 // [id, keywords, English answer, Myanmar answer, optional button {view|click, en, my}]
 const K=[
  ['hello',['hello','hi ','hey','good morning','မင်္ဂလာ','ဟယ်လို','ဟိုင်း','နေကောင်း'],'Hello! Ask me anything about using this app.','မင်္ဂလာပါ။ App အသုံးပြုနည်း ဘာမဆို မေးပါ။'],
  ['who',['who are you','what are you','your name','မင်းဘယ်သူ','နာမည်ဘယ်လို','ဘာလဲ မင်း','robot','ရိုဘော့','ai '],'I am the help robot of this app. I only answer questions about how to use this app.','ကျွန်တော်က ဒီ app ရဲ့ အကူ robot ပါ။ App အသုံးပြုနည်းကိုပဲ ဖြေပေးပါတယ်။'],
  ['search',['search','find','look for','sku','part no','ရှာ','ရှာဖွေ','ရှာချင်'],'1. Type the product name, SKU or Part No in the search bar at the top of Home.\n2. Results show at once.\n3. The green filter button on the left chooses Product or Excel.','1. Home အပေါ်က search bar မှာ ပစ္စည်းနာမည်၊ SKU ဒါမှမဟုတ် Part No ရိုက်ပါ။\n2. ရလဒ်တွေ ချက်ချင်း ပေါ်လာပါမယ်။\n3. ဘယ်ဘက်က အစိမ်းရောင် filter ခလုတ်နဲ့ Product / Excel ရွေးလို့ရပါတယ်။',{view:'home',en:'Go to Home',my:'Home သွားမယ်'}],
  ['clear',['trash','clear search','bin','delete search','ရှာတာဖျက်','အမှိုက်ပုံး','ရှင်း'],'To empty the search: tap the filter button and choose Trash — the bin clears what you typed.','ရှာထားတာကို ဖျက်ချင်ရင် filter ခလုတ် နှိပ်ပြီး Trash ကို ရွေးပါ — အမှိုက်ပုံးက ရိုက်ထားတာကို ရှင်းပေးပါတယ်။'],
  ['scan',['scan','camera','photo search','picture search','ကင်မရာ','ပုံနဲ့ရှာ','ဓာတ်ပုံနဲ့','စကန်'],'1. Tap the scan icon at the right end of the search bar.\n2. Allow the camera.\n3. Point it at the part — the matching products appear.','1. Search bar ညာဘက်ထိပ်က scan icon ကို နှိပ်ပါ။\n2. ကင်မရာ ခွင့်ပြုပါ။\n3. ပစ္စည်းကို ချိန်ပြပါ — တူတဲ့ ပစ္စည်းတွေ ပေါ်လာပါမယ်။'],
  ['excel',['excel','sheet','xlsx','spreadsheet','ဇယား','အက်ဆယ်'],'1. Tap the green filter button next to the search bar and choose Excel.\n2. Type what you look for — matching rows of the shop\'s Excel file show.\n3. Use ˄ ˅ to move between matches.\nShop owners upload Excel files in the Dashboard.','1. Search bar ဘေးက အစိမ်း filter ခလုတ် နှိပ်ပြီး Excel ရွေးပါ။\n2. ရှာချင်တာ ရိုက်ပါ — ဆိုင်ရဲ့ Excel ထဲက ကိုက်တဲ့ အတန်းတွေ ပေါ်ပါမယ်။\n3. ˄ ˅ နဲ့ တစ်ခုပြီး တစ်ခု ကြည့်ပါ။\nဆိုင်ပိုင်ရှင်က Dashboard မှာ Excel file တင်ပါတယ်။'],
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
  ['addproduct',['add product','new product','business','sell','product upload','ပစ္စည်းထည့်','ပစ္စည်းတင်','ရောင်း'],'Shop owner: Profile → + Add → Business. Fill in SKU, Part No, name, price, stock and photos, then Save. You can also use Dashboard → Add Product.','ဆိုင်ပိုင်ရှင်: Profile → + Add → Business။ SKU၊ Part No၊ နာမည်၊ ဈေး၊ လက်ကျန်နဲ့ ဓာတ်ပုံ ဖြည့်ပြီး Save နှိပ်ပါ။ Dashboard → Add Product ကနေလည်း ထည့်လို့ရပါတယ်။',{view:'profile',en:'Open Profile',my:'Profile ဖွင့်မယ်'}],
  ['editcategory',['add category','edit category','new category','sub category','category ထည့်','အမျိုးအစားထည့်'],'Shop owner: Profile → + Add → Category to add or edit main and sub categories.','ဆိုင်ပိုင်ရှင်: Profile → + Add → Category ကနေ Main / Sub အမျိုးအစား ထည့်၊ ပြင်ပါ။'],
  ['dashboard',['dashboard','admin','manage shop','orders list','စီမံ','ဒက်ရှ်ဘုတ်','အော်ဒါစာရင်း'],'Shop owner: Profile → Dashboard (crown). There you manage products, orders, Excel files, payment details and the shop\'s settings.','ဆိုင်ပိုင်ရှင်: Profile → Dashboard (သရဖူ)။ အဲဒီမှာ ပစ္စည်း၊ အော်ဒါ၊ Excel file၊ ငွေလွှဲ အချက်အလက်နဲ့ ဆိုင် setting တွေ စီမံပါတယ်။',{view:'profile',en:'Open Profile',my:'Profile ဖွင့်မယ်'}],
  ['chat',['chat','message','contact shop','ask shop','talk','စာပို့','မက်ဆေ့','ဆက်သွယ်','စကားပြော'],'Tap 💬 at the top right of Home, sign in with Google, then write to the shop. The shop owner sees all chats there and answers.','Home ညာဘက်ထိပ်က 💬 ကို နှိပ်၊ Google နဲ့ ဝင်ပြီး ဆိုင်ကို စာရေးပါ။ ဆိုင်ပိုင်ရှင်က အဲဒီမှာ chat အားလုံး မြင်ပြီး ပြန်ဖြေပါတယ်။'],
  ['noti',['notification','notifications','bell','alert','အသိပေး','ခေါင်းလောင်း','နိုတီ'],'Tap 🔔 at the top right of Home to see what happened (orders, likes, comments, follows, chats). Shop owners turn phone alerts on in Settings → Notifications.','Home ညာဘက်ထိပ်က 🔔 ကို နှိပ်ရင် ဖြစ်ခဲ့တာတွေ (အော်ဒါ၊ like၊ comment၊ follow၊ chat) ကြည့်လို့ရပါတယ်။ ဆိုင်ပိုင်ရှင်က ဖုန်း alert ကို Settings → Notifications မှာ ဖွင့်ပါ။'],
  ['signin',['sign in','log in','login','google','account','logout','sign out','ဝင်နည်း','ဝင်လို့','ဘယ်လိုဝင်','အကောင့်','လော့ဂ်'],'Tap Continue with Google when the app asks (to like, comment, chat or order). Your Google account is used; no new password is needed.','Like၊ comment၊ chat ဒါမှမဟုတ် မှာတဲ့အခါ app က မေးရင် Google နဲ့ ဝင်မယ် ကို နှိပ်ပါ။ Google account နဲ့ပဲ ဝင်တာမို့ password အသစ် မလိုပါ။'],
  ['install',['install','home screen','add app','download app','add to home','app ထည့်','အိုင်ကွန်','ဖုန်းထဲထည့်'],'Settings → Add to Home Screen.\niPhone: in Safari tap Share, then "Add to Home Screen".\nAndroid: in Chrome tap ⋮, then "Install app".','Settings → Add to Home Screen။\niPhone: Safari မှာ Share နှိပ်ပြီး "Add to Home Screen"။\nAndroid: Chrome မှာ ⋮ နှိပ်ပြီး "Install app"။'],
  ['language',['language','myanmar','burmese','english','ဘာသာ','မြန်မာလို','အင်္ဂလိပ်'],'Settings → Language → choose English or မြန်မာ.','Settings → Language → English ဒါမှမဟုတ် မြန်မာ ရွေးပါ။'],
  ['theme',['dark','light','theme','night mode','အမှောင်','အလင်း','အရောင်'],'Settings → Theme → Light or Dark.','Settings → Theme → Light ဒါမှမဟုတ် Dark ရွေးပါ။'],
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
  ['help',['help','how to use','what can','guide','အကူအညီ','ဘယ်လိုသုံး','သုံးနည်း','လမ်းညွှန်'],'I can help with: searching and scanning, Excel, categories, cart and ordering, payment, Discover, comments, following, Profile, adding products, chat, notifications and Settings. What would you like to do?','ရှာနည်း/scan၊ Excel၊ အမျိုးအစား၊ Cart နဲ့ မှာနည်း၊ ငွေပေးချေမှု၊ Discover၊ comment၊ follow၊ Profile၊ ပစ္စည်းထည့်နည်း၊ chat၊ အသိပေးချက်နဲ့ Settings တွေ ကူညီပေးနိုင်ပါတယ်။ ဘာလုပ်ချင်ပါသလဲ?']
 ];
 const chips={en:['How do I order?','How to search?','Add to Home Screen','How to follow a shop?','Add a product'],my:['ဘယ်လိုမှာရမလဲ?','ဘယ်လိုရှာရမလဲ?','ဖုန်းထဲ app ထည့်နည်း','ဆိုင်ကို follow လုပ်နည်း','ပစ္စည်းထည့်နည်း']};
 const isMy=s=>/[က-႟]/.test(s);
 // The best entry: every keyword found in the question counts its length; short English words must be whole words.
 // 1.1.333 owner's iPhone test: more ways people ask (Myanmar and English mixed). A keyword with spaces counts
 // when all its words are in the question, in any order and with other words between ("Product ဘယ်လိုထည့်ရလဲ").
 const MORE={addproduct:['product ထည့်','product တင်','product add','item ထည့်','ပစ္စည်း ထည့်','ပစ္စည်း တင်','ပစ္စည်းအသစ်','product အသစ်','ရောင်းချင်'],
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
  theme:['dark mode','အရောင် ပြောင်း'],
  category:['category ကြည့်','အမျိုးအစား ကြည့်']};
 for(const e of K)if(MORE[e[0]])e[1]=e[1].concat(MORE[e[0]]);
 const has=(text,word)=>isMy(word)||word.length>3?text.includes(word):new RegExp('(^|[^a-z])'+word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([^a-z]|$)').test(text);
 // The best entry: each keyword whose words are all in the question counts their length.
 function answer(q){
  // 1.1.334 owner's iPhone: its keyboard types some Myanmar marks in another order (ထည့် as ည + ် + ့);
  // NFC puts them in one order, so the same word always matches.
  const text=' '+q.normalize('NFC').toLowerCase().replace(/[?!.,،။၊]/g,' ').replace(/\s+/g,' ')+' ';
  let best=null,score=0,general=0;
  for(const e of K){let s=0;for(const k of e[1]){const words=k.normalize('NFC').toLowerCase().trim().split(/\s+/);if(words.every(w=>has(text,w)))s+=words.join('').length}
   // "How to use" words alone only give the general help; a topic in the same question wins ("Category အသုံးပြုနည်း").
   if(e[0]==='help'){general=s;continue}if(s>score){score=s;best=e}}
  if(score>=2)return best;
  return general>=2?K.find(e=>e[0]==='help'):null;
 }
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const robot='/images/product-ai-robot.png?v=1.1.193';
 const button=document.createElement('button');button.type='button';button.className='ai-help-button';
 button.innerHTML='<img src="'+robot+'" alt=""><i aria-hidden="true">?</i>';
 document.body.append(button);
 const box=document.createElement('dialog');box.className='ai-help';document.body.append(box);
 box.innerHTML='<header><img src="'+robot+'" alt=""><span><b></b><small></small></span><button type="button" class="ai-help-x">×</button></header><div class="ai-help-log" role="log" aria-live="polite"></div><div class="ai-help-chips"></div><form class="ai-help-form"><input type="text" autocomplete="off" maxlength="200" enterkeyhint="send"><button type="submit" aria-label=""><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11.5 20 4l-5.5 16-3-6.5z"/><path d="m11.5 13.5 4-4"/></svg></button></form>';
 const log=box.querySelector('.ai-help-log'),input=box.querySelector('input'),chipBox=box.querySelector('.ai-help-chips');
 function paint(){const u=ui[pageMy()?'my':'en'];button.setAttribute('aria-label',u.open);box.querySelector('header b').textContent=u.title;box.querySelector('header small').textContent=u.sub;box.querySelector('.ai-help-x').setAttribute('aria-label',u.close);input.placeholder=u.placeholder;box.querySelector('.ai-help-form button').setAttribute('aria-label',u.send);chipBox.innerHTML=chips[pageMy()?'my':'en'].map(c=>'<button type="button">'+esc(c)+'</button>').join('')}
 paint();new MutationObserver(paint).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 function say(who,text,action,my){
  const m=document.createElement('div');m.className='ai-help-msg '+who;
  m.innerHTML=(who==='bot'?'<img src="'+robot+'" alt="">':'')+'<p>'+esc(text).replace(/\n/g,'<br>')+(action?'<button type="button" class="ai-help-go">'+esc(my?action.my:action.en)+' →</button>':'')+'</p>';
  if(action)m.querySelector('.ai-help-go').onclick=()=>{box.close();if(action.view)window.showStoreView?.(action.view);else document.querySelector(action.click)?.click()};
  log.append(m);log.scrollTop=log.scrollHeight;
 }
 function ask(q){
  q=q.trim().slice(0,200);if(!q)return;say('me',q);
  const my=isMy(q)||(!/[a-z]/i.test(q)&&pageMy()),hit=answer(q);
  setTimeout(()=>{if(hit)say('bot',my?hit[3]:hit[2],hit[4],my);else say('bot',ui[my?'my':'en'].only)},250);
 }
 box.querySelector('.ai-help-form').addEventListener('submit',e=>{e.preventDefault();ask(input.value);input.value=''});
 chipBox.addEventListener('click',e=>{const b=e.target.closest('button');if(b)ask(b.textContent)});
 box.querySelector('.ai-help-x').onclick=()=>box.close();
 box.addEventListener('click',e=>{if(e.target===box)box.close()});
 button.addEventListener('click',()=>{if(!log.children.length)say('bot',ui[pageMy()?'my':'en'].hello);box.showModal();if(matchMedia('(pointer:fine)').matches)input.focus()});
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
 window.GearHubAiHelp={answer};
})();
