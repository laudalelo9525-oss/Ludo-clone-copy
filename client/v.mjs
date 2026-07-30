import { chromium } from 'playwright';
const S='/tmp/claude-0/-home-user-Ludo-clone-copy/8b473465-38dc-5db7-acf9-7aa663e70c58/scratchpad';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
const p1=await c.newPage(), p2=await c.newPage();
const errs=[]; for(const p of [p1,p2]) p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
// Watch for the effect classes appearing at any point.
for(const p of [p1,p2]) await p.addInitScript(()=>{
  window.__fx={capture:0,home:0,win:0};
  new MutationObserver(ms=>{for(const m of ms){const el=m.target;
    if(el.classList?.contains('fx-capture'))window.__fx.capture++;
    if(el.classList?.contains('fx-home'))window.__fx.home++;
    if(el.classList?.contains('fx-win'))window.__fx.win++;}})
   .observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['class']});
});
await p1.goto('http://127.0.0.1:4211/',{waitUntil:'networkidle'});
await p2.goto('http://127.0.0.1:4211/',{waitUntil:'networkidle'});
await p1.waitForTimeout(1200);
let taps=0;
for(let i=0;i<260;i++){
  const a=(await p1.locator('#roll').isEnabled().catch(()=>false))?p1
        :(await p2.locator('#roll').isEnabled().catch(()=>false))?p2:null;
  if(!a){ await p1.waitForTimeout(150); continue; }
  await a.locator('#roll').click({timeout:2500}).catch(()=>{});
  await a.waitForTimeout(120);
  if(await a.locator('.pawn.movable').count()){
    await a.locator('.pawn.movable').first().click({force:true,timeout:2500}).catch(()=>{});
    taps++; await a.waitForTimeout(160);
  }
  const s=await p1.locator('.status').textContent().catch(()=>'');
  if(s && /win|over/i.test(s)) break;
}
const fx1=await p1.evaluate(()=>window.__fx), fx2=await p2.evaluate(()=>window.__fx);
console.log('taps:',taps,'| p1 fx:',JSON.stringify(fx1),'| p2 fx:',JSON.stringify(fx2));
console.log('status:',await p1.locator('.status').textContent());
console.log('errors:',errs.length?errs.slice(0,2):'none');
await p1.screenshot({path:`${S}/effects.png`});
await b.close();
