'use strict';
(() => {
  if (!('serviceWorker' in navigator) || !location.protocol.startsWith('http')) return;
  const banner=document.getElementById('pwaUpdateBanner');
  const button=document.getElementById('applyPwaUpdate');
  let registration=null, reloading=false;
  const show=()=>{if(banner)banner.hidden=false;};
  const hide=()=>{if(banner)banner.hidden=true;};
  async function check(){
    try{if(!registration)registration=await navigator.serviceWorker.getRegistration('./');if(registration){await registration.update();if(registration.waiting&&navigator.serviceWorker.controller)show();}}
    catch(error){console.info('PWA update check deferred',error);}
  }
  if(button)button.addEventListener('click',()=>{
    if(registration&&registration.waiting){button.disabled=true;button.textContent='جارٍ التحديث…';registration.waiting.postMessage({type:'SKIP_WAITING'});}
  });
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(reloading)return;reloading=true;hide();window.location.reload();
  });
  async function init(){
    try{
      registration=await navigator.serviceWorker.getRegistration('./');
      if(!registration)return;
      if(registration.waiting&&navigator.serviceWorker.controller)show();
      registration.addEventListener('updatefound',()=>{
        const worker=registration.installing;if(!worker)return;
        worker.addEventListener('statechange',()=>{
          if(worker.state==='installed'&&navigator.serviceWorker.controller)show();
        });
      });
      await check();
      setInterval(()=>{if(document.visibilityState==='visible')check();},6*60*60*1000);
      document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check();});
    }catch(error){console.info('PWA update manager unavailable',error);}
  }
  if(document.readyState==='complete')init();else window.addEventListener('load',init,{once:true});
})();