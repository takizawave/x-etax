'use strict';
const config = XEtaxConfig;
for (const [id, options] of [['layout',config.layouts],['skin',config.skins]]) {
  const select=document.getElementById(id);
  for(const [key,value] of Object.entries(options)){ const option=document.createElement('option');option.value=key;option.textContent=value.name;select.append(option); }
  select.value=id==='layout'?'portal':'official';
  select.addEventListener('change',()=>{document.getElementById('open').href=`preview.html?layout=${document.getElementById('layout').value}&skin=${document.getElementById('skin').value}`;});
}
document.getElementById('open').href='preview.html?layout=portal&skin=official';
config.presets.forEach((preset,index)=>{
  const card=document.createElement('a');card.className='card';card.href=`preview.html?layout=${preset.layout}&skin=${preset.skin}&writing=${preset.writing || 'native'}`;
  const frame=document.createElement('div');frame.className='frame';
  const iframe=document.createElement('iframe');iframe.src=`${card.getAttribute('href')}&mini=1`;iframe.loading='lazy';iframe.tabIndex=-1;iframe.setAttribute('aria-hidden','true');iframe.title=preset.name+' 見本';frame.append(iframe);
  const number=document.createElement('small');number.textContent=String(index+1).padStart(2,'0');
  const title=document.createElement('h3');title.textContent=preset.name;
  const description=document.createElement('p');description.textContent=config.skins[preset.skin].description;
  card.append(number,frame,title,description);
  for(const text of [config.layouts[preset.layout].name,config.skins[preset.skin].name]){const tag=document.createElement('span');tag.className='tag';tag.textContent=text;card.append(tag);}
  if(preset.writing){const tag=document.createElement('span');tag.className='tag';tag.textContent=config.writings[preset.writing].name;card.append(tag);}
  document.getElementById('gallery').append(card);
});
