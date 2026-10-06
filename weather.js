window.AigoWeather=(()=>{
  const cities={seoul:'서울',busan:'부산',incheon:'인천',daegu:'대구',daejeon:'대전',gwangju:'광주',ulsan:'울산',sejong:'세종',suwon:'수원',jeju:'제주'};
  let result=null,busy=false,message='',onWeather=()=>{},savedCity='',manual=false,selection=0,lastRequest=0;
  try{savedCity=localStorage.getItem('aigo_weather_city')||'';}catch{}
  function paint(){
    const text=busy?'현재 위치 · 날씨 확인 중…':manual?'현재 위치 · 직접 선택한 날씨 적용':result?`${cities[savedCity]||'현재 위치'} ${result.temp}°C · 준비물 자동 반영`:message?'현재 위치 · 날씨 조회 안 됨':'현재 위치 · 날씨 자동 설정';
    const brief=document.getElementById('weather-brief');if(brief)brief.textContent='☁';const line=document.getElementById('weather-line');if(line)line.textContent=text;
    const el=document.getElementById('live-weather');if(!el)return;
    el.innerHTML='<p id="weather-status" class="sub" role="status"></p><div class="row"><button id="locate-weather">현재 위치</button><select id="weather-city" aria-label="날씨 지역" style="flex:1;width:130px"><option value="">지역 선택</option>'+Object.entries(cities).map(([k,v])=>`<option value="${k}" ${savedCity===k?'selected':''}>${v}</option>`).join('')+'</select><button id="refresh-weather">새로고침</button></div><p class="sub">지역을 한 번 정하면 자동으로 확인해요. 현재 위치는 약 10km 단위로 조회하며 저장하지 않아요. 현재 날씨 기준 · <a href="https://openweathermap.org/" target="_blank" rel="noopener">OpenWeather</a></p>';
    document.getElementById('weather-status').textContent=busy?'날씨를 확인하고 있어요…':message||(result?`${result.description} · ${result.temp}°C (체감 ${result.feelsLike}°C) · ${new Date(result.observedAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})} 관측`:'날씨에 맞는 준비물을 자동으로 더하려면 지역을 선택해주세요.');
    for(const id of ['locate-weather','refresh-weather','weather-city'])document.getElementById(id).disabled=busy;
    document.getElementById('weather-city').onchange=e=>{savedCity=e.target.value;selection++;try{savedCity?localStorage.setItem('aigo_weather_city',savedCity):localStorage.removeItem('aigo_weather_city');}catch{}if(savedCity)load('city='+savedCity);else{result=null;onWeather('normal');paint();}};
    document.getElementById('refresh-weather').onclick=()=>savedCity?load('city='+savedCity):locate();document.getElementById('locate-weather').onclick=locate;
  }
  async function load(query){if(busy)return;busy=true;manual=false;const token=++selection;lastRequest=Date.now();message='';paint();const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
    try{const r=await fetch('/api/weather?'+query,{cache:'no-store',signal:controller.signal});const v=await r.json();if(!r.ok)throw Error(v.error||'날씨 조회에 실패했어요.');if(!Array.isArray(v.conditions)||!Number.isFinite(v.temp))throw Error('날씨 응답을 확인하지 못했어요.');if(token!==selection)return;result=v;onWeather(v.conditions.length?v.conditions.join('+'):'normal');}
    catch(e){if(token!==selection)return;message=e.name==='AbortError'?'날씨 응답이 늦어요. 직접 선택할 수 있어요.':'날씨를 불러오지 못했어요. 아래에서 직접 선택해주세요.';result=null;onWeather('normal');}
    finally{clearTimeout(timer);busy=false;paint();}
  }
  function locate(){if(!navigator.geolocation){message='지역을 직접 선택해주세요.';paint();return;}message='위치 권한을 확인하고 있어요…';paint();navigator.geolocation.getCurrentPosition(pos=>{savedCity='';try{localStorage.removeItem('aigo_weather_city');}catch{}load('lat='+(Math.round(pos.coords.latitude*10)/10)+'&lon='+(Math.round(pos.coords.longitude*10)/10));},()=>{message='위치를 확인할 수 없어요. 지역을 선택해주세요.';paint();},{timeout:10000,maximumAge:600000,enableHighAccuracy:false});}
  return {mount(callback){onWeather=callback;paint();},init(callback){onWeather=callback;if(savedCity&&cities[savedCity])load('city='+savedCity);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&!manual&&savedCity&&Date.now()-lastRequest>600000)load('city='+savedCity);});},manual(){selection++;manual=true;paint();}};
})();

