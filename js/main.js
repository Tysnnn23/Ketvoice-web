(()=>{
 'use strict';
 const CONFIG={repo:'Tysnnn23/Ketvoice',discordInvite:'https://discord.gg/FyKjAXHvfY',activeListenersEndpoint:'https://xodklrunqlzyeiqtovgx.supabase.co/functions/v1/ketvoice-api/listeners'};
 const $=(s)=>document.querySelector(s), $$=(s)=>[...document.querySelectorAll(s)];
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const screens={
  player:{title:'Music, up close.',desc:'Immersive player, right down to the last detail.',src:'assets/player.webp',name:'THE PLAYER',shade:'radial-gradient(ellipse 50% 66% at 55% 47%,#65747e 0%,#29343d 40%,#131a23 86%)'},
  lyrics:{title:'Every word, in time.',desc:'See the lyrics move with your music.',src:'assets/lyrics.webp',name:'LIVE LYRICS',shade:'radial-gradient(ellipse 50% 66% at 55% 47%,#6a737b 0%,#343c40 40%,#15191d 86%)'},
  home:{title:'Your music, your space.',desc:'Everything you love, all in one place.',src:'assets/home.webp',name:'LISTEN NOW',shade:'radial-gradient(ellipse 50% 66% at 55% 47%,#b8c3cf 0%,#6c7e8d 40%,#283440 86%)'},
  artist:{title:'Meet the artists.',desc:'More of the music you love.',src:'assets/artist.webp',name:'ARTISTS',shade:'radial-gradient(ellipse 50% 66% at 55% 47%,#71707d 0%,#424354 40%,#181b25 86%)'}
 };
 let current='player';
 function swapIn(el,klass){el.classList.remove(klass);void el.offsetWidth;el.classList.add(klass)}
 function setScreen(key,focus=false){if(!screens[key]||current===key)return;current=key;const x=screens[key],dev=$('#screen-device');dev.classList.add('changing');$$('.screen-tab').forEach((tab,i)=>{const active=tab.dataset.screen===key;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1});$$('.stage-pagination [data-screen]').forEach(b=>{const active=b.dataset.screen===key;b.classList.toggle('on',active);b.setAttribute('aria-selected',String(active))});
  const counter=$('#screen-counter'),title=$('#screen-title'),desc=$('#screen-description'),stage=$('#experience-stage');
  counter.innerHTML=String(Object.keys(screens).indexOf(key)+1).padStart(2,'0')+' / 04 &nbsp; '+x.name;swapIn(counter,'counter-swap');
  title.innerHTML=x.title;swapIn(title,'screen-title-swap');
  desc.textContent=x.desc;swapIn(desc,'screen-desc-swap');
  stage.style.background=x.shade;swapIn(stage,'sweep');
  setTimeout(()=>{const im=$('#screen-img');im.src=x.src;im.alt='Ketvoice '+x.name.toLowerCase()+' real Android screenshot';dev.classList.remove('changing')},reduce?0:190);if(focus){$('.screen-tab[data-screen="'+key+'"]').focus()}}
 $$('.screen-tab').forEach(btn=>{btn.addEventListener('click',()=>setScreen(btn.dataset.screen));btn.addEventListener('keydown',e=>{if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;e.preventDefault();const keys=Object.keys(screens),i=keys.indexOf(btn.dataset.screen),next=keys[(i+(e.key==='ArrowRight'?1:keys.length-1))%keys.length];setScreen(next,true)})});
 $$('.stage-pagination [data-screen]').forEach(b=>b.addEventListener('click',()=>setScreen(b.dataset.screen)));
 const toggle=$('#menu-toggle'),mobile=$('#mobile-menu');toggle.addEventListener('click',()=>{const open=mobile.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close navigation':'Open navigation')});mobile.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{mobile.classList.remove('open');toggle.setAttribute('aria-expanded','false')}));
 let toastTimer;function toast(m){const el=$('#toast');el.textContent=m;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),4000)}
 $$('.discord-action').forEach(btn=>btn.addEventListener('click',()=>{if(/^https:\/\//.test(CONFIG.discordInvite))window.open(CONFIG.discordInvite,'_blank','noopener,noreferrer');else toast('Add your Discord invite URL in CONFIG.discordInvite to enable this button.')}));
 const sections=$$('main section[id]');let scheduled=false,lastY=scrollY;
 function scrollUpdate(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{const y=scrollY,doc=document.documentElement;doc.style.setProperty('--progress',Math.min(1,y/Math.max(1,doc.scrollHeight-innerHeight)));$('#topbar').classList.toggle('scrolled',y>30);
  // Topbar fades away while scrolling down and returns as soon as the user
  // scrolls up; never hidden while the mobile menu is open.
  const dz=y-lastY;lastY=y;const hz=$('.header-zone'),menuOpen=$('#mobile-menu').classList.contains('open');
  if(hz){if(!menuOpen&&y>430&&dz>6)hz.classList.add('idle');else if(dz<-6||y<=430||menuOpen)hz.classList.remove('idle')}
  const toTop=$('#to-top');if(toTop)toTop.classList.toggle('show',y>700);
  const fade=Math.max(0,1-y/190);$('#hero-waves').style.opacity=fade;$('#hero-glow').style.opacity=fade;$$('.hero-waves path').forEach(n=>n.style.animationPlayState=y>230?'paused':'running');for(const s of sections){const r=s.getBoundingClientRect();if(r.top<innerHeight*.32&&r.bottom>120){$$('.nav-links a').forEach(a=>a.classList.toggle('active',a.hash==='#'+s.id));break}}scheduled=false})};window.addEventListener('scroll',scrollUpdate,{passive:true});scrollUpdate();
 const toTopBtn=$('#to-top');if(toTopBtn)toTopBtn.addEventListener('click',()=>{scrollTo({top:0,behavior:reduce?'auto':'smooth'})});
 if('IntersectionObserver'in window){const obs=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target)}})},{threshold:.075,rootMargin:'0px 0px -25px 0px'});$$('.reveal,.reveal-group').forEach(x=>obs.observe(x))}else $$('.reveal,.reveal-group').forEach(x=>x.classList.add('visible'));
 if(!reduce){let pointerTick=false;const glow=$('#hero-glow');$('.hero').addEventListener('pointermove',e=>{if(pointerTick)return;pointerTick=true;requestAnimationFrame(()=>{const r=$('.hero').getBoundingClientRect();const px=(e.clientX-r.left)/r.width-.5;const py=(e.clientY-r.top)/r.height-.5;glow.style.transform='translate('+px*30+'px,'+py*25+'px)';pointerTick=false})},{passive:true})}

 const format=new Intl.NumberFormat('en-US');
 // Counts a number from the current displayed value to the next one with an
 // out-cubic ease; overlapping updates simply restart the tween.
 function animateNumber(el,next){
  if(!el)return;
  const cur=parseInt((el.textContent||'').replace(/[^0-9]/g,''),10)||0;
  if(reduce||cur===next){el.textContent=format.format(next);return}
  el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');
  const t0=performance.now(),dur=900;
  function frame(t){const p=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-p,3);
   el.textContent=format.format(Math.round(cur+(next-cur)*e));
   if(p<1)requestAnimationFrame(frame)}
  requestAnimationFrame(frame)}async function api(path){const r=await fetch('https://api.github.com/repos/'+CONFIG.repo+path,{headers:{Accept:'application/vnd.github+json'}});if(!r.ok)throw Error('HTTP '+r.status);return r.json()}
  // Downloads always follow the latest STABLE release (/releases/latest excludes
  // prereleases and drafts). If the API is unreachable or rate limited, the buttons
  // fall back to the releases/latest page, which GitHub keeps current by itself.
  const LATEST_PAGE='https://github.com/'+CONFIG.repo+'/releases/latest';
  const store={get(k,ttl){try{const v=JSON.parse(localStorage.getItem(k)||'null');return v&&Date.now()-v.t<ttl?v.d:null}catch(e){return null}},set(k,d){try{localStorage.setItem(k,JSON.stringify({t:Date.now(),d}))}catch(e){}}};
  const apkUrl=(assets,quest)=>((assets||[]).find(a=>/\.apk$/i.test(a.name||'')&&/quest/i.test(a.name)===quest)||{}).browser_download_url;
  function showRelease(r){const rv=$('#release-version');if(rv&&r.tag)rv.textContent='Latest release: '+r.tag;const a=$('#android-apk'),q=$('#quest-apk');if(a)a.href=r.android||LATEST_PAGE;if(q)q.href=r.quest||LATEST_PAGE}
  async function updateLatest(){let r=store.get('kv-latest',60000);if(!r){const rel=await api('/releases/latest');r={tag:rel.tag_name,android:apkUrl(rel.assets,false),quest:apkUrl(rel.assets,true)};store.set('kv-latest',r)}showRelease(r)}
  async function updateStats(){let s=store.get('kv-stats',180000);if(!s){const releases=[];for(let p=1;p<=5;p++){const r=await api('/releases?per_page=100&page='+p);releases.push(...r);if(r.length<100)break}let count=0;for(const rel of releases)for(const a of rel.assets||[])if(/\.apk$/i.test(a.name||''))count+=Number(a.download_count||0);s={count,releases:releases.length};store.set('kv-stats',s)}animateNumber($('#stat-downloads'),s.count);$('#downloads-caption').textContent='APK downloads · '+s.releases+' releases'}
  async function updateGitHub(){const cached=store.get('kv-stats',180000);if(cached){animateNumber($('#stat-downloads'),cached.count);$('#downloads-caption').textContent='APK downloads · '+cached.releases+' releases'}try{await updateLatest()}catch(e){showRelease({});console.info('GitHub releases unavailable; download buttons use the latest-release page.')}try{await updateStats()}catch(e){console.info('GitHub download statistics unavailable.')}}
 async function updateListeners(){
   if(!CONFIG.activeListenersEndpoint||listenersBusy)return;listenersBusy=true;
   try{
    const r=await fetch(CONFIG.activeListenersEndpoint,{cache:'no-store'});
    if(!r.ok)throw Error('Listener API offline');
    const json=await r.json();
    const n=json.activeListeners??json.count;
    if(!Number.isInteger(n)||n<0)throw Error('Invalid count');
    animateNumber($('#stat-listeners'),n);
    const np=json.nowPlaying||null,box=$('#now-playing');
    if(np&&np.title){
     const titleEl=$('#np-title'),changed=!!titleEl.textContent&&titleEl.textContent!==np.title;
     titleEl.textContent=np.title;
     $('#np-artist').textContent=np.artist||'';
     const cov=$('#np-cover');
     if(np.cover){if(cov.getAttribute('src')!==np.cover){cov.classList.add('swap');cov.src=np.cover;setTimeout(()=>cov.classList.remove('swap'),260)}cov.hidden=false}else{cov.removeAttribute('src');cov.hidden=true}
     if(box.hidden||changed){box.hidden=false;box.classList.remove('tick');void box.offsetWidth;box.classList.add('tick')}
     $('#listeners-caption').textContent='Listening right now: '+np.title+(np.artist?' — '+np.artist:'');
    }else{box.hidden=true;$('#listeners-caption').textContent='Anonymous recent active listeners'}
    listenerFailures=0;
   }catch(e){
    listenerFailures++;
    $('#listeners-caption').textContent='Activity tracking temporarily unavailable';
   }finally{listenersBusy=false}
  }
  // "Listening Now" refreshes every 10 s without reloading the page. Requests
  // never overlap (in-flight flag), pause while the tab is hidden, and back off
  // to one call per minute after repeated failures instead of hammering a
  // struggling API. One single interval for the whole page life: no leaks.
  let listenersBusy=false,listenerFailures=0;
  function scheduleListeners(){
   if(!CONFIG.activeListenersEndpoint)return;
   setInterval(()=>{
    if(document.hidden)return;
    // After 3 consecutive failures, poll at most once per minute.
    if(listenerFailures>=3&&Date.now()-(updateListeners.lastFail||0)<60000)return;
    const wasBusy=listenersBusy;
    updateListeners();
    if(!wasBusy&&listenerFailures>=3)updateListeners.lastFail=Date.now();
   },10000);
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateListeners()});
  }
  updateGitHub();updateListeners();scheduleListeners();
})();