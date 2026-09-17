
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const TOKEN = process.env.TG_TOKEN || '';
const CHANNEL = process.env.TG_CHANNEL || '';
const ALERT = process.env.TG_ALERT || CHANNEL;
const MARKUP = parseFloat(process.env.MARKUP || '0') || 0;
const LAST = path.join(__dirname, '..', 'last.json');
const POSTER = 'file://' + path.join(__dirname, '..', 'poster.html');
const MAX_JUMP = 0.10;

function log(){ console.log(new Date().toISOString(), Array.prototype.join.call(arguments,' ')); }

async function tg(method, form){
  const r = await fetch('https://api.telegram.org/bot' + TOKEN + '/' + method, { method:'POST', body: form });
  const j = await r.json();
  if(!j.ok) throw new Error(method + ': ' + (j.description || 'failed'));
  return j;
}

async function say(chat, text){
  const f = new FormData();
  f.append('chat_id', chat);
  f.append('text', text);
  return tg('sendMessage', f);
}

async function getPrice(){
  if(process.env.PRICE_URL){
    const r = await fetch(process.env.PRICE_URL);
    const j = await r.json();
    const v = j.price || j.rate || j.value || j.XAUUSD || j.ask;
    if(typeof v === 'number' && v > 0) return v;
    throw new Error('PRICE_URL gave no usable number');
  }
  if(process.env.GOLDAPI_KEY){
    const r = await fetch('https://www.goldapi.io/api/XAU/USD', { headers: { 'x-access-token': process.env.GOLDAPI_KEY, 'Content-Type':'application/json' } });
    const j = await r.json();
    if(typeof j.price === 'number' && j.price > 0) return j.price;
    throw new Error('goldapi failed');
  }
  throw new Error('No price source. Set GOLDAPI_KEY or PRICE_URL.');
}

function readLast(){
  try { return JSON.parse(fs.readFileSync(LAST,'utf8')); } catch(e){ return null; }
}

function writeLast(oz){
  fs.writeFileSync(LAST, JSON.stringify({ oz: oz, at: new Date().toISOString() }, null, 1));
}

async function render(oz){
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-dev-shm-usage','--font-render-hinting=none'] });
  try{
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1400, deviceScaleFactor: 1 });
    await page.goto(POSTER + '?bare=1&oz=' + encodeURIComponent(oz), { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction('window.X && window.X.ready()', { timeout: 30000 });
    await page.evaluate(function(){ return document.fonts && document.fonts.ready; });
    await new Promise(function(r){ setTimeout(r, 1200); });
    await page.evaluate(function(){ window.X.draw(); });
    const dataUrl = await page.evaluate(function(){ return window.X.shot(); });
    return Buffer.from(dataUrl.split(',')[1], 'base64');
  } finally {
    await browser.close();
  }
}

function money(n){ return Math.round(n).toLocaleString('en-US'); }

function caption(oz){
  const dam = oz / 0.83;
  const chi = dam / 10;
  const kg = dam * 26.67;
  const d = new Date(Date.now() + 7*3600*1000);
  const KM = ['មករា','កុម្ភៈ','មីនា','មេសា','ឧសភា','មិថុនា','កក្កដា','សីហា','កញ្ញា','តុលា','វិច្ឆិកា','ធ្នូ'];
  return 'តម្លៃហាងឆេងមាសអន្តរជាតិ\n' + 'ថ្ងៃទី ' + d.getUTCDate() + ' ' + KM[d.getUTCMonth()] + ' ' + d.getUTCFullYear() + '\n' + 'មួយជី = $' + money(chi) + '\n' + 'មួយតម្លឹង = $' + money(dam) + '\n' + 'មួយអោន = $' + money(oz) + '\n' + 'មួយគីឡូ = $' + money(kg);
}

async function main(){
  if(!TOKEN || !CHANNEL) throw new Error('TG_TOKEN and TG_CHANNEL must be set.');
  const spot = await getPrice();
  const oz = Math.round((spot + MARKUP) * 100) / 100;
  log('spot', spot, 'posting', oz);
  const last = readLast();
  if(last && last.oz > 0){
    const jump = Math.abs(oz - last.oz) / last.oz;
    if(jump > MAX_JUMP){
      log('refusing to post, jump', (jump*100).toFixed(1));
      await say(ALERT, 'NOT POSTED. ' + last.oz + ' -> ' + oz + ' (' + (jump*100).toFixed(1) + '%)');
      process.exit(0);
    }
  }
  const jpg = await render(oz);
  log('rendered', jpg.length, 'bytes');
  const form = new FormData();
  form.append('chat_id', CHANNEL);
  form.append('caption', caption(oz));
  form.append('photo', new Blob([jpg], { type:'image/jpeg' }), 'gold.jpg');
  await tg('sendPhoto', form);
  log('sent');
  writeLast(oz);
}

main().catch(async function(e){
  console.error(e);
  try { if(TOKEN && ALERT) await say(ALERT, 'Gold poster failed: ' + e.message); } catch(_){}
  process.exit(1);
});
