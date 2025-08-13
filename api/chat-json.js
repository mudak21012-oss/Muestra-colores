<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Hoho3D – Rueda de Color + Ideas</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    body { margin:0; font-family:sans-serif; background:#0b0c0f; color:#fff; }
    header { padding:10px; background:#111317; }
    h1 { margin:0; font-size:18px; }
    .app { display:grid; grid-template-columns: 400px 1fr; gap:20px; padding:20px; }
    .left, .right { background:#111317; padding:15px; border-radius:10px; }
    #wheel { display:block; margin:0 auto; border-radius:8px; cursor:crosshair; }
    .current { margin-top:10px; font-size:14px; display:flex; align-items:center; gap:10px; }
    .sw { width:20px; height:20px; border:1px solid #333; }
    img.preview-img { width:100%; margin-top:10px; border-radius:8px; }
    .main-sw { width:100%; height:100px; border-radius:8px; }
    .meta { display:grid; grid-template-columns: 1fr 1fr; gap:5px; font-size:14px; margin-top:10px; }
    .ideas { margin-top:15px; padding:10px; background:#0f1218; border-radius:8px; font-size:14px; }
  </style>
</head>
<body>
<header>
  <h1>Hoho3D · Búsqueda por color</h1>
</header>

<main class="app">
  <section class="left">
    <div id="loading">Cargando catálogo...</div>
    <canvas id="wheel" width="360" height="360"></canvas>
    <div class="current">
      <div class="sw" id="sel-sw"></div>
      <div><strong>RGB:</strong> <span id="sel-rgb">—</span> · <strong>HEX:</strong> <span id="sel-hex">—</span></div>
    </div>
    <img id="preview-img" class="preview-img" alt="Vista previa" />
  </section>

  <section class="right">
    <div class="main-sw" id="main-sw"></div>
    <h2 id="main-name">—</h2>
    <div class="meta">
      <div><strong>Marca:</strong> <span id="main-brand">—</span></div>
      <div><strong>Tipo:</strong> <span id="main-type">—</span></div>
      <div><strong>Estilo:</strong> <span id="main-style">—</span></div>
      <div><strong>Temp:</strong> <span id="main-temp">—</span></div>
      <div><strong>Resist:</strong> <span id="main-strength">—</span></div>
      <div><strong>HEX:</strong> <span id="main-hex">—</span></div>
    </div>
    <a id="main-link" href="#" target="_blank">Abrir en tienda</a>
    <div class="ideas" id="main-ideas" style="display:none;"></div>
  </section>
</main>

<script>
const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTZ-GFIahnmzB09C1GWCvAs1PaNXmpN2_Ed5taWtseTRlqx0P8-ZKJ28TOsvziFOw/pub?output=tsv";

const clamp = (n,a,b) => Math.min(b,Math.max(a,n));
const norm = s => (s==null? '' : String(s).trim());
const SPLIT_RE = /\s*[,;|\n]\s*/g;
function normalizeHex(h){
  if (typeof h !== 'string') return null;
  const s = h.trim();
  const r3 = /^#?[0-9a-fA-F]{3}$/; const r6 = /^#?[0-9a-fA-F]{6}$/;
  if (r3.test(s)){ const p=s.replace('#',''); return '#'+p.split('').map(c=>c+c).join('').toLowerCase(); }
  if (r6.test(s)){ return '#'+s.replace('#','').toLowerCase(); }
  return null;
}
function hexToRgb(hex){ const h=hex.replace('#',''); return { r:parseInt(h.slice(0,2),16), g:parseInt(h.slice(2,4),16), b:parseInt(h.slice(4,6),16) }; }
function rgbToHex(r,g,b){ return '#'+[r,g,b].map(v=>clamp(Math.round(v),0,255).toString(16).padStart(2,'0')).join(''); }
function rgbFromHsv(h, s, v){
  if (s === 0) return {r:Math.round(v*255), g:Math.round(v*255), b:Math.round(v*255)};
  let i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - s * f);
  const t = v * (1 - s * (1 - f));
  i %= 6;
  let r,g,b;
  if (i===0){ r=v; g=t; b=p; }
  else if(i===1){ r=q; g=v; b=p; }
  else if(i===2){ r=p; g=v; b=t; }
  else if(i===3){ r=p; g=q; b=v; }
  else if(i===4){ r=t; g=p; b=v; }
  else { r=v; g=p; b=q; }
  return { r: Math.round(r*255), g: Math.round(g*255), b: Math.round(b*255) };
}

const wheel = document.getElementById('wheel');
const ctx = wheel.getContext('2d');
const CX = wheel.width/2, CY = wheel.height/2, R = 170;
let items = [];
let pool = [];
let lastRGB = null;
let dragging = false;

function drawWheel(){
  const img = ctx.createImageData(wheel.width, wheel.height);
  for(let y=0; y<wheel.height; y++){
    for(let x=0; x<wheel.width; x++){
      const dx = x - CX, dy = y - CY; const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist <= R){
        let angle = Math.atan2(dy, dx); if (angle < 0) angle += Math.PI*2;
        const hue = angle/(Math.PI*2), sat = dist/R; const {r,g,b} = rgbFromHsv(hue, sat, 1);
        const i = (y*wheel.width + x) * 4; img.data[i]=r; img.data[i+1]=g; img.data[i+2]=b; img.data[i+3]=255;
      }
    }
  }
  ctx.putImageData(img,0,0);
}

function colorDistance(a,b){ const dr=a.r-b.r, dg=a.g-b.g, db=a.b-b.b; return Math.sqrt(dr*dr+dg*dg+db*db); }

async function cargar(){
  document.getElementById('loading').style.display='block';
  try{
    const res = await fetch(sheetUrl, {cache:'no-store', mode:'cors'});
    let text = await res.text();
    text = text.replace(/^\uFEFF/, '').replace(/\r\n/g,'\n');
    const headLine = text.split('\n')[0];
    const delim = headLine.includes('\t') ? '\t' : ',';
    const rows = text.trim().split('\n').map(l=>l.split(delim));
    const headers = rows.shift().map(h=>h.replace(/^"(.*)"$/,'$1').trim().toLowerCase());
    const ix = k => headers.indexOf(k);
    const idx = {
      id: ix('id'), name: ix('name'), hex: ix('hex'), brand: ix('brand'),
      type: ix('type'), style: ix('style'), temp: ix('temp'),
      strength: ix('strength'), link: ix('link'), img: ix('img'), ideas: ix('ideas')
    };
    items = [];
    rows.forEach(r=>{
      const hex = normalizeHex(r[idx.hex]||''); if(!hex) return;
      const obj = {
        id: idx.id !== -1 ? norm(r[idx.id]) : '',
        name: norm(r[idx.name]),
        hex, rgb: hexToRgb(hex),
        brand: norm(r[idx.brand]),
        type: norm(r[idx.type]),
        style: norm(r[idx.style]),
        temp: norm(r[idx.temp]),
        strength: norm(r[idx.strength]),
        link: norm(r[idx.link]),
        img: norm(r[idx.img]),
        ideas: idx.ideas !== -1 ? norm(r[idx.ideas]).split(SPLIT_RE).filter(Boolean) : []
      };
      if (!obj.id) obj.id = `${obj.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${hex.replace('#','')}`;
      items.push(obj);
    });
    pool = items.slice();
  }catch(e){ console.error(e); }
  finally{ document.getElementById('loading').style.display='none'; }
}

function renderMainCard(a){
  if (!a) return;
  document.getElementById('main-sw').style.background = a.hex;
  document.getElementById('main-name').textContent = a.name;
  document.getElementById('main-brand').textContent = a.brand;
  document.getElementById('main-type').textContent = a.type;
  document.getElementById('main-style').textContent = a.style;
  document.getElementById('main-temp').textContent = a.temp;
  document.getElementById('main-strength').textContent = a.strength;
  document.getElementById('main-hex').textContent = a.hex;
  document.getElementById('main-link').href = a.link || '#';
  const prev = document.getElementById('preview-img');
  if (a.img){ prev.src = a.img; prev.style.display='block'; }
  else { prev.removeAttribute('src'); prev.style.display='none'; }
  const ideasBox = document.getElementById('main-ideas');
  if (a.ideas && a.ideas.length){
    ideasBox.style.display='block';
    ideasBox.innerHTML = `<strong>Ideas:</strong><ul>` + a.ideas.map(id=>`<li>${id}</li>`).join('') + `</ul>`;
  } else {
    ideasBox.style.display='none';
  }
}

function rankAndRenderBy(rgb){
  const ranked = pool.map(it=>({it, d: colorDistance(rgb, it.rgb)})).sort((a,b)=>a.d-b.d).slice(0,1).map(x=>x.it);
  renderMainCard(ranked[0]);
}

function updateFromPoint(clientX, clientY){
  const rect = wheel.getBoundingClientRect();
  const scaleX = wheel.width / rect.width;
  const scaleY = wheel.height / rect.height;
  const x = (clientX - rect.left) * scaleX;
  const y = (clientY - rect.top) * scaleY;
  const dx = x - CX, dy = y - CY; const dist = Math.sqrt(dx*dx+dy*dy);
  if (dist>R) return;
  let ang = Math.atan2(dy, dx); if (ang<0) ang += Math.PI*2;
  const hue = ang/(Math.PI*2), sat = dist/R; const {r,g,b} = rgbFromHsv(hue, sat, 1);
  const hex = rgbToHex(r,g,b);
  lastRGB = {r,g,b};
  document.getElementById('sel-rgb').textContent = `${r}, ${g}, ${b}`;
  document.getElementById('sel-hex').textContent = hex;
  document.getElementById('sel-sw').style.background = hex;
  rankAndRenderBy({r,g,b});
}

function onDown(e){ dragging=true; const p=e.touches? e.touches[0]: e; updateFromPoint(p.clientX,p.clientY); }
function onMove(e){ if(!dragging) return; const p=e.touches? e.touches[0]: e; updateFromPoint(p.clientX,p.clientY); }
function onUp(){ dragging=false; }

drawWheel();
window.addEventListener('DOMContentLoaded', async ()=>{ await cargar(); });
wheel.addEventListener('mousedown', onDown); window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
wheel.addEventListener('touchstart', onDown, {passive:false}); window.addEventListener('touchmove', onMove, {passive:false}); window.addEventListener('touchend', onUp);
</script>
</body>
</html>
