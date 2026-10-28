/* Ketvoice Glass Motion Adapter (vanilla HTML; no network or dependencies)
 * React port target: https://www.ui-layouts.com/components/liquid-glass
 * Progressive enhancement: CSS glass remains without JS. */
(function(){
  'use strict';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const fine=matchMedia('(hover: hover) and (pointer: fine)');
  const bar=document.querySelector('[data-liquid-glass]');
  if(!bar)return;
  // Deliberately custom to the static preview: UI Layouts itself is a React component.
  function setTheme(){
    const y=bar.getBoundingClientRect().top+bar.getBoundingClientRect().height*.5;
    let light=false;
    for(const sec of document.querySelectorAll('main section,main .proof')){
      const r=sec.getBoundingClientRect();
      if(r.top<=y&&r.bottom>=y){light=sec.classList.contains('light')||sec.classList.contains('details')||sec.classList.contains('download');break}
    }
    bar.classList.toggle('glass-on-light',light);
  }
  let raf=0;
  function scheduleTheme(){if(!raf)raf=requestAnimationFrame(()=>{raf=0;setTheme()})}
  addEventListener('scroll',scheduleTheme,{passive:true});addEventListener('resize',scheduleTheme,{passive:true});setTheme();
  if(reduced.matches||!fine.matches)return;
  bar.addEventListener('pointermove',e=>{
    const r=bar.getBoundingClientRect();const x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
    bar.style.setProperty('--light-x',(x*100).toFixed(1)+'%');
    bar.style.setProperty('--light-y',(y*100).toFixed(1)+'%');
    bar.style.setProperty('--glass-angle',Math.round(110+x*130)+'deg');
  },{passive:true});
  bar.addEventListener('pointerleave',()=>{bar.style.setProperty('--light-x','48%');bar.style.setProperty('--light-y','0%');bar.style.setProperty('--glass-angle','130deg')},{passive:true});
})();
