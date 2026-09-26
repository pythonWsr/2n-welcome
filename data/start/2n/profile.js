/* Primary input capability and layout are independent. No per-frame queries. */
(() => {
  const root=document.documentElement;
  const queries=['(pointer:fine)','(hover:hover)','(pointer:coarse)','(hover:none)'].map(q=>matchMedia(q));
  const debug=['localhost','127.0.0.1','terminal.local'].includes(location.hostname);
  const params=new URLSearchParams(location.search);
  const force=debug?(params.get('input')||(params.has('qa-touch')?'touch':null)):null;
  const profile={input:'desktop',layout:'wide'};
  function update() {
    const previous=profile.input;
    const [fine,hover,coarse,noHover]=queries.map(q=>q.matches);
    const touch=!(fine&&hover)&&(coarse||noHover||navigator.maxTouchPoints>0);
    profile.input=force==='touch'||force==='desktop'?force:touch?'touch':'desktop';
    profile.layout=innerWidth<=760?'compact':'wide';
    root.dataset.input=profile.input;root.dataset.layout=profile.layout;
    if(previous!==profile.input) dispatchEvent(new Event('2n:profile'));
  }
  window.TwoNProfile=profile;
  update();
  queries.forEach(q=>q.addEventListener('change',update));
  addEventListener('resize',()=>{
    profile.layout=innerWidth<=760?'compact':'wide';
    root.dataset.layout=profile.layout;
  },{passive:true});
})();
