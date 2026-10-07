const cache=new Map();
const cities={seoul:'Seoul',busan:'Busan',incheon:'Incheon',daegu:'Daegu',daejeon:'Daejeon',gwangju:'Gwangju',ulsan:'Ulsan',sejong:'Sejong',suwon:'Suwon',jeju:'Jeju'};
module.exports=async function(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'지원하지 않는 요청입니다.'});}
  const q=req.query||{};let lat,lon;
  const city=typeof q.city==='string'?cities[q.city]:null;
  if(!city){if(typeof q.lat!=='string'||typeof q.lon!=='string'||!q.lat.trim()||!q.lon.trim())return res.status(400).json({error:'지역을 선택해주세요.'});lat=Number(q.lat);lon=Number(q.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return res.status(400).json({error:'위치가 올바르지 않습니다.'});lat=Math.round(lat*10)/10;lon=Math.round(lon*10)/10;}
  const key=process.env.OPENWEATHER_API_KEY;
  if(!key)return res.status(503).json({error:'날씨 연결을 준비 중이에요. 잠시 후 다시 시도해주세요.'});
  const cacheKey=city||`${lat},${lon}`,old=cache.get(cacheKey);if(old&&Date.now()-old.saved<600000)return res.status(200).json(old.data);
  async function get(path,params){const u=new URL('https://api.openweathermap.org/'+path);Object.entries({...params,appid:key}).forEach(([k,v])=>u.searchParams.set(k,v));const r=await fetch(u,{signal:AbortSignal.timeout(8000)});if(!r.ok){const e=new Error('upstream');e.status=r.status;throw e;}return r.json();}
  try{
    if(city){const locations=await get('geo/1.0/direct',{q:city+',KR',limit:1});if(!locations[0])return res.status(404).json({error:'지역을 찾지 못했어요.'});lat=locations[0].lat;lon=locations[0].lon;}
    const w=await get('data/2.5/weather',{lat,lon,units:'metric',lang:'kr'});
    if(!Number.isFinite(w.main?.temp)||!Number.isFinite(w.main?.feels_like)||!Number.isFinite(w.weather?.[0]?.id))throw Error('invalid response');
    const code=w.weather[0].id,feels=w.main.feels_like;
    const codes=w.weather.map(v=>v.id);
    const precipitation=codes.some(v=>v>=600&&v<700)?'snow':codes.some(v=>v>=200&&v<600)?'rain':'none';
    const conditions=[];if(code>=200&&code<600)conditions.push('rain');if(code>=600&&code<700||feels<=10)conditions.push('cold');if(feels>=28)conditions.push('hot');
    const value={temp:Math.round(w.main.temp),feelsLike:Math.round(feels),description:typeof w.weather[0].description==='string'?w.weather[0].description:'현재 날씨',conditions,precipitation,observedAt:Number.isFinite(w.dt)?w.dt*1000:Date.now(),checkedAt:Date.now(),source:'OpenWeather'};
    if(cache.size>=200)cache.delete(cache.keys().next().value);cache.set(cacheKey,{saved:Date.now(),data:value});return res.status(200).json(value);
  }catch(e){return res.status(502).json({error:e.status===401?'날씨 인증을 확인 중이에요. 키 활성화 후 다시 시도해주세요.':e.status===429?'날씨 요청이 많아요. 잠시 후 다시 시도해주세요.':'날씨를 가져오지 못했어요. 직접 선택해도 준비할 수 있어요.'});}
};

