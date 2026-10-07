// Saved destination defaults belong to the selected child, like custom places.
function baseSetting(type,c=child()) { return data.baseTemplates?.[c.id]?.[type]; }
function baseName(type) { return baseSetting(type)?.name || DEST.find(d=>d.id===type)?.name || '외출'; }
function baseItems(type,c=child()) { return baseSetting(type,c)?.items || rules(type,c); }
function seasonForDate(date=new Date()){
 const month=date.getMonth()+1;
 return month>=3&&month<=5?'spring':month>=6&&month<=8?'summer':month>=9&&month<=11?'autumn':'winter';
}
function seasonalSceneMarkup(){
 const season=seasonForDate();
 return `<div class="home-scene" aria-hidden="true" data-season="${season}"><picture><source media="(prefers-reduced-motion: reduce)" srcset="images/walk-${season}.png"><img src="images/walk-${season}.gif" width="384" height="384" alt="" decoding="async"></picture></div>`;
}
function homeMarkup(c) {
 return `<div class="home-shell"><section class="home-meta" aria-label="아이 정보"><div class="child-row"><select id="child-picker" aria-label="함께 나가는 아이">${data.children.map(x=>`<option value="${esc(x.id)}" ${x.id===c.id?'selected':''}>${esc(x.name)} (${age(x.birth)}개월)</option>`).join('')}</select><button id="edit-child">정보 수정</button><button id="add-child">아이 추가</button></div></section>
 <section class="outing-section" aria-labelledby="outing-question"><h1 id="outing-question">어떤 외출인가요?</h1><details class="outing-dropdown" id="outing-picker"><summary>외출 선택</summary><div class="outing-options" aria-label="외출 종류">${DEST.map(d=>`<button data-dest="${d.id}">${esc(baseName(d.id))}</button>`).join('')}${data.places.some(p=>p.childId===c.id)?`<p>내 장소</p>${data.places.filter(p=>p.childId===c.id).map(p=>`<button data-place="${esc(p.id)}">${esc(p.name)}</button>`).join('')}`:''}</div></details></section>
 <div class="home-secondary">${draft()?'<button id="resume" class="resume-row">이전 준비물 불러오기</button>':''}<details class="saved-places"><summary>내 장소 관리</summary><button id="add-place">장소 추가</button>${data.places.filter(p=>p.childId===c.id).map(p=>`<div class="place-row"><button data-place="${esc(p.id)}">${esc(p.name)}</button><button data-edit-place="${esc(p.id)}">수정</button></div>`).join('')}</details></div>${seasonalSceneMarkup()}</div>`;
}
function renderHeaderTools(){document.getElementById('header-tools').innerHTML='';}
function bindHomeExtras(){
 document.getElementById('child-picker').onchange=e=>{data.active=e.target.value;save();render();};
 const picker=document.getElementById('outing-picker');
 picker.ontoggle=()=>{if(picker.open)requestAnimationFrame(()=>picker.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest'}));};
 picker.onkeydown=e=>{if(e.key==='Escape'){picker.open=false;picker.querySelector('summary').focus();}};
}
function mountListExtras(){
 const heading=app.querySelector('h1');
 const el=document.createElement('div');el.className='list-extras';
 el.innerHTML=`<details class="weather-settings"><summary><span id="weather-line">날씨 자동설정</span><span aria-hidden="true">⌄</span></summary><section id="live-weather" aria-label="날씨 설정"></section><div class="row weather-manual">${['normal','rain','hot','cold'].map(w=>`<button data-weather="${w}" aria-pressed="${data.weather===w}">${weatherLabel(w)}</button>`).join('')}</div></details><button id="edit-list-default" class="text-action">기본 준비물 수정</button>`;
 heading.after(el);
 el.querySelectorAll('[data-weather]').forEach(b=>b.onclick=()=>{window.AigoWeather?.manual();applyAutomaticWeather(b.dataset.weather);render();});
 el.querySelector('#edit-list-default').onclick=()=>editBase(draft().type);
 window.AigoWeather?.mount(applyAutomaticWeather);
}
let baseEdit=null;
function deleteChild(childId){
 const target=data.children.find(c=>c.id===childId);if(!target)return;
 if(!confirm(target.name+'의 아이 정보, 준비 중인 목록, 기본 준비물, 저장한 장소를 삭제할까요? 삭제하면 복구할 수 없어요.'))return;
 const before=JSON.parse(JSON.stringify(data));
 data.children=data.children.filter(c=>c.id!==childId);
 data.places=data.places.filter(p=>p.childId!==childId);
 delete data.drafts[childId];
 if(data.baseTemplates)delete data.baseTemplates[childId];
 if(data.active===childId||!data.children.some(c=>c.id===data.active))data.active=data.children[0]?.id||null;
 if(!save()){data=before;return;}
 editing=null;baseEdit=null;placeEditing=null;screen='home';render();toast('아이 정보를 삭제했어요.');
}
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
