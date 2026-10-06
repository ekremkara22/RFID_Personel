(async () => {
 const { chromium } = await import('playwright');
 const path = await import('node:path');
 const browser = await chromium.launch({ headless:true, channel:'msedge' });
 try {
  const page = await browser.newPage({viewport:{width:1600,height:1100},deviceScaleFactor:1.5});
  await page.goto('https://flodeska.com/login',{waitUntil:'networkidle'});
  await page.locator('input[type=email]').fill(process.env.FLODESKA_DEMO_EMAIL);
  await page.locator('input[type=password]').fill(process.env.FLODESKA_DEMO_PASSWORD);
  await page.getByRole('button',{name:'Panele giriş yap'}).click();
  await page.waitForURL('**/dashboard**');
  await page.waitForLoadState('networkidle');
  // All changes below affect this browser's DOM only. No records are saved.
  await page.route('**/*',route => ['GET','HEAD'].includes(route.request().method()) ? route.continue() : route.abort());
  await page.evaluate(() => {
   const find = name => document.querySelector(`[class*="${name}"]`);
   const all = name => [...document.querySelectorAll(`[class*="${name}"]`)];
   const names=['Deniz Yılmaz','Ece Demir','Mert Kaya','Selin Aydın','Arda Çelik','İpek Şahin','Can Yıldız','Duru Arslan','Eren Koç','Ada Deniz','Bora Akın','Elif Güneş','Ozan Erdem','Aslı Sezer','Kerem Tekin','Zeynep Ekin'];
   const departments=['Operasyon','Muhasebe','Yazılım','Üretim','Üretim','Tasarım','Teknik','Destek','Yazılım','Operasyon','Muhasebe','Destek','Muhasebe','Operasyon','Satış','Finans'];
   const late=[0,8,0,0,12,0,0,0,0,0,0,0,0,16,0,0];
   const breaks=[35,40,30,45,38,32,42,28,35,40,30,25,36,34,0,0];
   const rows=all('operationPersonRow');
   const replacements=new Map();
   rows.forEach((row,i)=> { const n=row.querySelector('strong'); if(n)replacements.set(n.textContent,names[i]); });
   const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
   let node;
   while(node=walker.nextNode()) {
    if(['SCRIPT','STYLE'].includes(node.parentElement?.tagName))continue;
    let t=node.textContent;
    for(const [oldName,newName] of replacements) if(oldName)t=t.split(oldName).join(newName);
    t=t.replaceAll('Termosa','Flodeska Demo').replaceAll('import2@termosa.com','demo@example.com').replaceAll('Giris-Cikis Dashboard','Operasyon Özeti').replaceAll('RFID PERSONEL TAKİP','FLODESKA').replaceAll('Veri Yönetim Paneli','Personel Takip Paneli');
    node.textContent=t;
   }
   rows.forEach((row,i)=> {
    row.querySelector('strong').textContent=names[i]; row.querySelector('strong').removeAttribute('title');
    row.querySelector('small').textContent=departments[i];
    row.querySelector('[class*="operationLateBar"]').style.width=(late[i]/60*100)+'%';
    row.querySelector('[class*="operationBreakBar"]').style.width=(breaks[i]/60*100)+'%';
    const lv=row.querySelector('[class*="operationLateValue"]');lv.textContent=late[i]+' dk';lv.removeAttribute('aria-label');
    const bv=row.querySelector('[class*="operationBreakValue"]');bv.textContent=breaks[i]+' dk';bv.removeAttribute('aria-label');
   });
   all('kpiValue').forEach((el,i)=>{el.querySelector('strong').textContent=[3,12,breaks.reduce((a,b)=>a+b,0)][i]});
   all('statusList').forEach(el=>{[...el.querySelectorAll('p')].forEach((p,i)=>{p.querySelector('strong').textContent=[14,11,3,2][i]})});
   const ring=find('donutCircle');ring.style.background='radial-gradient(circle at center,#fff 58%,transparent 59%),conic-gradient(#22c55e 0 68.75%,#f97316 68.75% 87.5%,#3b82f6 87.5% 100%)';
   all('staffStatusColumn').forEach((col,i)=>{
    const group=[names.slice(0,12),names.slice(12,14),names.slice(14)][i];
    col.querySelector('[class*="staffStatusHeading"] span').textContent=group.length;
    col.querySelector('[class*="staffNameList"]').innerHTML=group.map(n=>'<strong>'+n+'</strong>').join('');
   });
   // Replace supplementary data sections with synthetic content as well.
   for(const panel of all('operationReportPanel')) {
    const title=panel.querySelector('h2')?.textContent;
    if(title==='Geç Kalan Personeller'||title==='Mola Limitini Aşan Personeller') {
     const pill=panel.querySelector('[class*="countPill"]');if(pill)pill.textContent=title==='Geç Kalan Personeller'?'3':'2';
     const empty=panel.querySelector('[class*="emptyState"]');if(empty)empty.textContent=title==='Geç Kalan Personeller'?'Ece Demir · 8 dk    Arda Çelik · 12 dk    Aslı Sezer · 16 dk':'Selin Aydın · 45 dk    Can Yıldız · 42 dk';
    }
   }
   all('verticalBars').forEach((el,index)=> {
    const vals=index?[240,330,420,270,360]:[24,36,18,42,30];
    el.innerHTML='<div style="display:flex;align-items:end;gap:28px;height:170px;width:100%;padding:12px">'+vals.map((v,i)=>`<div style="flex:1;text-align:center;font-size:12px;color:#52647a"><b>${v} dk</b><div style="height:${v/Math.max(...vals)*110}px;background:${index?'#22b8a7':'#ed9651'};border-radius:5px 5px 0 0;margin:7px 12px"></div>${['Üretim','Operasyon','Yazılım','Muhasebe','Satış'][i]}</div>`).join('')+'</div>';
   });
   const badge=document.createElement('div');badge.textContent='TANITIM EKRANI · ÖRNEK VERİLER';badge.style.cssText='position:fixed;right:24px;bottom:16px;z-index:99999;background:#e9f5ff;color:#275e85;padding:8px 14px;border:1px solid #bddcf2;border-radius:8px;font:600 12px Arial;letter-spacing:.7px';document.body.appendChild(badge);
  });
  await page.screenshot({path:path.join(__dirname,'flodeska-operasyon-ozeti-demo.png')});
  await page.screenshot({path:path.join(__dirname,'flodeska-operasyon-tam-demo.png'),fullPage:true});
  const panel=page.locator('article').filter({has:page.getByRole('heading',{name:'Personel Geç Kalma ve Mola Süreleri',exact:true})});
  await panel.screenshot({path:path.join(__dirname,'flodeska-personel-grafikleri-demo.png')});
  console.log('Three anonymized screenshots saved. Live data unchanged.');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e.message);process.exitCode=1});
