// Saved destination defaults belong to the selected child, like custom places.
function baseSetting(type,c=child()) { return data.baseTemplates?.[c.id]?.[type]; }
function baseName(type) { return baseSetting(type)?.name || DEST.find(d=>d.id===type)?.name || '외출'; }
function baseItems(type,c=child()) { return baseSetting(type,c)?.items || rules(type,c); }
function homeMarkup(c) {
  return `<div class="home-intro"><h1>어디로 나갈까요?</h1></div>
  <section class="destination-section" aria-labelledby="base-heading"><div class="section-heading"><h2 id="base-heading">기본 목적지</h2></div><div class="grid">${DEST.map(d=>`<div class="destination-card"><button class="tile" data-dest="${d.id}"><span class="icon">${d.icon}</span><strong>${esc(baseName(d.id))}</strong></button><button class="edit-default" data-edit-base="${d.id}" aria-label="${esc(baseName(d.id))} 기본 준비물 수정">수정</button></div>`).join('')}</div></section>
  <section class="my-places" aria-labelledby="places-heading"><div class="section-heading"><h2 id="places-heading">내 장소</h2><button id="add-place">＋ 추가</button></div>${data.places.filter(p=>p.childId===c.id).map(p=>`<div class="place-row"><button data-place="${esc(p.id)}"><strong>${esc(p.name)}</strong></button><button data-edit-place="${esc(p.id)}" aria-label="${esc(p.name)} 수정">수정</button></div>`).join('')||'<p class="empty-place">자주 가는 곳을 추가해보세요.</p>'}</section>
  ${draft()?'<button id="resume" class="wide">준비하던 목록 이어보기</button>':''}`;
}
function renderHeaderTools(c){const el=document.getElementById('header-tools');if(!el)return;el.innerHTML=`<select id="child-picker" aria-label="아이 선택">${data.children.map(x=>`<option value="${esc(x.id)}" ${x.id===c.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select><details id="weather-settings" class="weather-compact"><summary id="weather-brief" aria-label="날씨 설정">☁</summary><section id="live-weather" aria-label="날씨 설정"></section><div class="weather-manual"><div class="row">${['normal','rain','hot','cold'].map(w=>`<button data-weather="${w}" aria-pressed="${data.weather===w}">${weatherLabel(w)}</button>`).join('')}</div></div></details>`;el.querySelector('#child-picker').onchange=e=>{data.active=e.target.value;save();render();};el.querySelectorAll('[data-weather]').forEach(b=>b.onclick=()=>{data.weather=b.dataset.weather;window.AigoWeather?.manual();save();render();});window.AigoWeather?.mount(applyAutomaticWeather);}
let baseEdit=null;
function editBase(type) {baseEdit={type,name:baseName(type),items:baseItems(type).map(i=>({...i,checked:false}))};screen='base';render();window.scrollTo(0,0);}
function renderBaseEditor() {
  const b=baseEdit;
  app.innerHTML=`<button id="base-back">← 목적지 선택</button><h1>기본 준비물 수정</h1><p class="sub">${esc(child().name)}의 기본 목록이에요. 다음 외출부터 이 구성으로 시작해요.</p><label class="field">목적지 이름<input id="base-name" maxlength="40" value="${esc(b.name)}"></label><div class="panel">${b.items.map((i,n)=>`<div class="item"><strong>${esc(i.name)}</strong><div class="controls"><button data-base-minus="${n}" aria-label="${esc(i.name)} 수량 줄이기">−</button><span>${i.qty}개</span><button data-base-plus="${n}" aria-label="${esc(i.name)} 수량 늘리기">＋</button><button data-base-delete="${n}" aria-label="${esc(i.name)} 삭제">삭제</button></div></div>`).join('')}<form id="base-item-form" class="row" style="margin-top:12px"><input name="name" aria-label="기본 준비물 추가" placeholder="준비물 추가" required maxlength="80" style="flex:1;width:120px"><button>추가</button></form></div><button id="base-save" class="primary wide">기본 준비물 저장</button><p class="sub">날씨에 따른 준비물은 외출할 때 자동으로 더해져요.</p>`;
  document.getElementById('base-name').oninput=e=>b.name=e.target.value;
  bind('base-back',()=>{if(confirm('저장하지 않은 수정을 취소하고 돌아갈까요?')){screen='home';baseEdit=null;render();}});
  for(const action of ['minus','plus','delete'])app.querySelectorAll('[data-base-'+action+']').forEach(el=>el.onclick=()=>{const n=Number(el.dataset['base'+action[0].toUpperCase()+action.slice(1)]);if(action==='delete')b.items.splice(n,1);else b.items[n].qty=Math.max(1,Math.min(99,b.items[n].qty+(action==='plus'?1:-1)));renderBaseEditor();});
  document.getElementById('base-item-form').onsubmit=e=>{e.preventDefault();const name=new FormData(e.target).get('name').trim();if(!name)return;if(b.items.some(i=>i.name===name)){toast('이미 있는 준비물이에요.');return;}if(b.items.length>=150){toast('준비물은 150개까지 저장할 수 있어요.');return;}b.items.push(item(name,1,'custom','내가 정한 기본 준비물'));renderBaseEditor();};
  bind('base-save',()=>{if(!b.name.trim()){toast('목적지 이름을 입력해주세요.');return;}storeBase(b.type,b.name.trim(),b.items);if(save()){screen='home';baseEdit=null;render();toast('기본 준비물을 저장했어요.');}});
}
function storeBase(type,name,items){data.baseTemplates??={};data.baseTemplates[child().id]??={};data.baseTemplates[child().id][type]={name,items:items.filter(i=>i.kind!=='weather').map(i=>({...i,checked:false}))};}
function applyAutomaticWeather(w){
  data.weather=w;save();
  // Only refresh weather additions in a checklist opened during this session.
  const d=draft();if(d&&d.autoWeather&&d.createdAt>=appStartedAt&&d.weather!==w){const old=new Map(d.items.filter(i=>i.kind==='weather').map(i=>[i.name,i]));const base=d.items.filter(i=>i.kind!=='weather');const names=new Set(base.map(i=>i.name));d.items=[...base,...weatherItems(w).filter(i=>!names.has(i.name)).map(i=>old.get(i.name)||i)];d.weather=w;save();if(screen==='list')render();}
  if(screen==='home'){app.querySelectorAll('[data-weather]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.weather===w)));}
}

