window.AigoWeather=(()=>{
  const preferenceKey='aigo_location_choice';
  let choice='unknown';
  try{const saved=localStorage.getItem(preferenceKey);if(saved==='allowed'||saved==='denied')choice=saved;}catch{}
  let state={choice,status:'idle',precipitation:'none'},result=null,onWeather=()=>{};
  let active=null,sequence=0,lastRequest=0,manualMode=false,listening=false;
  const snapshot=()=>({...state});

  function paint(){
    const text=state.status==='loading'?'현재 위치 · 날씨 확인 중…':result?'현재 위치 '+result.temp+'°C · '+result.description:state.message||(state.choice==='denied'?'위치 없이 사용 중':'날씨 자동설정');
    const brief=document.getElementById('weather-brief');if(brief)brief.textContent='날씨 자동설정';
    const line=document.getElementById('weather-line');if(line)line.textContent=text;
    const el=document.getElementById('live-weather');if(!el)return;
    el.innerHTML='<p id="weather-status" class="sub" role="status"></p><div class="row"><button id="locate-weather">현재 위치 사용</button><button id="decline-weather">위치 없이 사용</button></div>';
    document.getElementById('weather-status').textContent=text;
    const locate=document.getElementById('locate-weather');locate.disabled=state.status==='loading';locate.onclick=requestLocation;
    document.getElementById('decline-weather').onclick=declineLocation;
  }
  function update(next){
    const previous=JSON.stringify(state);state={...next};paint();
    if(previous===JSON.stringify(state))return;
    try{if(typeof window.dispatchEvent==='function'&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('aigo:weather',{detail:snapshot()}));}catch{}
  }
  function remember(value){try{value==='unknown'?localStorage.removeItem(preferenceKey):localStorage.setItem(preferenceKey,value);}catch{}}
  function finish(request){
    clearTimeout(request.geoTimer);clearTimeout(request.fetchTimer);
    if(active===request)active=null;
    request.resolve(snapshot());
  }
  function cancel(){
    sequence++;
    if(!active)return;
    const request=active;active=null;
    clearTimeout(request.geoTimer);clearTimeout(request.fetchTimer);
    request.controller?.abort();return request;
  }
  const current=request=>active===request&&request.token===sequence&&state.choice==='allowed';
  function fail(request,message,denied=false){
    if(!current(request))return;
    result=null;if(denied)remember('denied');
    update({choice:denied?'denied':'allowed',status:'error',precipitation:'none',message});
    finish(request);onWeather('normal');
  }
  async function load(request,latitude,longitude){
    if(!current(request))return;
    clearTimeout(request.geoTimer);
    if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180){fail(request,'현재 위치를 확인하지 못했어요.');return;}
    // The API receives only a roughly 10 km area. Coordinates are never stored.
    const lat=Math.round(latitude*10)/10,lon=Math.round(longitude*10)/10;
    request.controller=new AbortController();
    request.fetchTimer=setTimeout(()=>{if(current(request)){request.controller.abort();fail(request,'날씨 응답이 늦어요. 다시 시도해주세요.');}},12000);
    let value;
    try{
      const response=await fetch('/api/weather?lat='+lat+'&lon='+lon,{cache:'no-store',signal:request.controller.signal});
      value=await response.json();
      if(!response.ok||!Number.isFinite(value.temp)||!Array.isArray(value.conditions)||value.conditions.some(v=>!['rain','cold','hot'].includes(v))||!['none','rain','snow'].includes(value.precipitation))throw Error('Invalid weather response');
    }catch(error){
      if(current(request))fail(request,error.name==='AbortError'?'날씨 응답이 늦어요. 다시 시도해주세요.':'날씨를 불러오지 못했어요. 위치 없이도 사용할 수 있어요.');
      return;
    }
    if(!current(request))return;
    result={temp:value.temp,description:typeof value.description==='string'?value.description:'현재 날씨'};
    update({choice:'allowed',status:'ready',precipitation:value.precipitation,...result});
    finish(request);onWeather(value.conditions.length?value.conditions.join('+'):'normal');
  }
  function requestLocation(){
    if(active)return active.promise;
    manualMode=false;remember('allowed');lastRequest=Date.now();
    let resolve;const promise=new Promise(done=>{resolve=done;});
    const request={token:++sequence,promise,resolve,controller:null,geoTimer:null,fetchTimer:null};active=request;
    result=null;update({choice:'allowed',status:'loading',precipitation:'none',message:'위치 권한을 확인하고 있어요…'});
    if(!navigator.geolocation){fail(request,'이 브라우저에서는 위치를 확인할 수 없어요.');return promise;}
    request.geoTimer=setTimeout(()=>fail(request,'위치 확인이 늦어요. 다시 시도해주세요.'),15000);
    // Call directly from the user's click so mobile browsers can show their prompt.
    try{navigator.geolocation.getCurrentPosition(
      position=>{if(current(request))load(request,position.coords?.latitude,position.coords?.longitude);},
      error=>fail(request,error?.code===1?'위치 사용이 허용되지 않았어요.':'현재 위치를 확인하지 못했어요. 위치 없이도 사용할 수 있어요.',error?.code===1),
      {timeout:10000,maximumAge:600000,enableHighAccuracy:false}
    );}catch{fail(request,'현재 위치를 확인하지 못했어요.');}
    return promise;
  }
  function declineLocation(){
    const cancelled=cancel();manualMode=false;result=null;remember('denied');
    update({choice:'denied',status:'idle',precipitation:'none'});cancelled?.resolve(snapshot());onWeather('normal');return snapshot();
  }
  function resetChoice(){
    const cancelled=cancel();manualMode=false;result=null;remember('unknown');
    update({choice:'unknown',status:'idle',precipitation:'none'});cancelled?.resolve(snapshot());onWeather('normal');return snapshot();
  }
  function setCallback(callback){if(typeof callback==='function')onWeather=callback;}
  return {
    snapshot,requestLocation,declineLocation,resetChoice,
    mount(callback){setCallback(callback);paint();},
    init(callback){
      setCallback(callback);const firstInit=!listening;
      if(!listening){document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&state.choice==='allowed'&&!manualMode&&!active&&Date.now()-lastRequest>=600000)requestLocation();});listening=true;}
      if(state.choice==='allowed'&&!manualMode&&state.status==='idle')requestLocation();else paint();
      if(firstInit&&state.choice==='denied')onWeather('normal');
    },
    manual(){const cancelled=cancel();manualMode=true;result=null;update({choice:state.choice,status:'idle',precipitation:'none'});cancelled?.resolve(snapshot());}
  };
})();

