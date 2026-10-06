window.AigoImage=(()=>{
  let urls=[],generation=0;
  const font='-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  function wrap(ctx,text,width){let lines=[],line='';for(const char of Array.from(String(text))){if(char==='\n'){lines.push(line);line='';continue;}if(line&&ctx.measureText(line+char).width>width){lines.push(line);line=char;}else line+=char;}lines.push(line);return lines;}
  function cleanup(){urls.forEach(u=>URL.revokeObjectURL(u));urls=[];generation++;}
  async function create(snapshot){
    // All text uses system fonts; there is no remote font to wait for.
    const measure=document.createElement('canvas').getContext('2d');measure.font=`500 32px ${font}`;
    const rows=snapshot.items.map(i=>({...i,lines:wrap(measure,i.name,690)})).map(i=>({...i,height:Math.max(86,i.lines.length*44+34)}));
    const pages=[];let rowsOnPage=[],height=0;for(const row of rows){if(height+row.height>1400&&rowsOnPage.length){pages.push(rowsOnPage);rowsOnPage=[];height=0;}rowsOnPage.push(row);height+=row.height;}if(rowsOnPage.length||!pages.length)pages.push(rowsOnPage);
    const files=[];
    for(let n=0;n<pages.length;n++){
      const canvas=document.createElement('canvas');canvas.width=1080;
      measure.font=`600 44px ${font}`;const title=wrap(measure,snapshot.title+' 준비물',936);const header=160+title.length*56;canvas.height=header+pages[n].reduce((h,r)=>h+r.height,0)+130;
      const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#285d47';ctx.fillRect(0,0,1080,14);ctx.font=`500 25px ${font}`;ctx.fillText('아이랑 나가요 · 함께 챙기는 외출 준비',64,65);ctx.fillStyle='#233a2f';ctx.font=`600 44px ${font}`;title.forEach((line,i)=>ctx.fillText(line,64,125+i*56));ctx.font=`400 25px ${font}`;ctx.fillStyle='#59695f';ctx.fillText(`${snapshot.date} · 총 ${snapshot.items.length}개 항목 · 체크된 항목은 챙김 완료`,64,header-24);
      let y=header;for(const row of pages[n]){ctx.strokeStyle=row.checked?'#285d47':'#829487';ctx.lineWidth=3;ctx.strokeRect(64,y+24,30,30);if(row.checked){ctx.beginPath();ctx.moveTo(70,y+38);ctx.lineTo(78,y+47);ctx.lineTo(91,y+29);ctx.stroke();}ctx.font=`500 32px ${font}`;ctx.fillStyle=row.checked?'#718176':'#233a2f';row.lines.forEach((line,i)=>ctx.fillText(line,116,y+49+i*44));ctx.textAlign='right';ctx.fillStyle='#285d47';ctx.fillText(`${row.qty}개`,1016,y+49);ctx.textAlign='left';y+=row.height;ctx.beginPath();ctx.strokeStyle='#e0e6e1';ctx.lineWidth=1;ctx.moveTo(64,y);ctx.lineTo(1016,y);ctx.stroke();}
      ctx.font=`400 24px ${font}`;ctx.fillStyle='#64766a';ctx.fillText('이 목록대로 챙겨주세요.',64,canvas.height-62);ctx.textAlign='right';ctx.fillText(`${n+1} / ${pages.length}`,1016,canvas.height-62);
      const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('이미지를 만들지 못했어요.')),'image/png'));
      files.push(new File([blob],`outing-checklist-${n+1}.png`,{type:'image/png'}));
    }return files;
  }
  async function open(snapshot){
    document.getElementById('image-dialog')?.remove();cleanup();const current=generation;
    const dialog=document.createElement('dialog');dialog.id='image-dialog';dialog.setAttribute('aria-labelledby','image-heading');dialog.innerHTML='<div class="row between"><h2 id="image-heading">보낼 준비물 이미지</h2><button id="image-close">닫기</button></div><p id="image-status" class="sub" role="status">이미지를 만들고 있어요…</p><div id="image-actions"></div><div id="image-pages"></div>';
    document.body.append(dialog);dialog.addEventListener('close',()=>{cleanup();dialog.remove();});dialog.querySelector('#image-close').onclick=()=>dialog.close();dialog.showModal();
    try{const files=await create(snapshot);if(current!==generation)return;
      const status=dialog.querySelector('#image-status');status.textContent=files.length===1?'공유할 이미지를 확인하고 가족에게 보내세요.':`목록이 길어서 ${files.length}장으로 나눴어요. 모두 보내주세요.`;
      const actions=dialog.querySelector('#image-actions');const share=document.createElement('button');share.className='primary wide';share.textContent=files.length>1?'이미지 모두 공유하기':'이미지 공유하기';actions.append(share);
      let supported=false;try{supported=!!navigator.canShare?.({files});}catch{}
      share.hidden=!supported;if(!supported)status.textContent+=' 아래 이미지를 저장한 뒤 카톡에 첨부해주세요.';
      share.onclick=async()=>{try{await navigator.share({files});}catch(e){if(e.name!=='AbortError')status.textContent='공유창을 열지 못했어요. 이미지를 저장해 카톡에 첨부해주세요.';}};
      files.forEach((file,n)=>{const url=URL.createObjectURL(file);urls.push(url);const block=document.createElement('div');block.className='image-page';const img=document.createElement('img');img.src=url;img.alt=`${snapshot.title} 준비물 이미지 ${n+1}/${files.length}`;const link=document.createElement('a');link.href=url;link.download=file.name;link.className='download-image';link.textContent=files.length>1?`${n+1}번 이미지 저장`:'이미지 저장';block.append(img,link);dialog.querySelector('#image-pages').append(block);});
    }catch{if(current===generation)dialog.querySelector('#image-status').textContent='이미지 생성에 실패했어요. 닫고 다시 시도해주세요.';}
  }
  return {open,create};
})();
