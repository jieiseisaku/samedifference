/* =========================================================
   sd_debug.js — ノータッチ運用の記録係（デバッグモード）

   既定は無効。URL に ?debug=1 を付けると有効になり、その設定は
   localStorage に残る（?debug=0 で解除）。無効のあいだは記録も保存も
   行わないので、本番と同じファイルのまま運用できる。

   記録先は localStorage。ページごと（C=control / L / R）に別の枠へ書くため、
   3ページが同時に書いても互いを壊さない。取り出しは control 画面の
   「ログを保存」で3ページ分をまとめて1つのテキストにする。

   ページが落ちても記録は localStorage に残る。1秒ごとに生存時刻を
   上書きしているので、次に開いたときに「いつ落ちたか」が分かる。

   重み: '.' 通常 / '?' 注意 / '!' 異常
   ========================================================= */
(function(){
  const KEY = 'sd_dbg';
  const CHUNK_MAX = 180000;    // 1枠あたりの文字数
  const CHUNK_KEEP = 40;       // 保持する枠の数（超えたら古い順に捨てる）

  function ls(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function lsSet(k, v){ try{ localStorage.setItem(k, v); return true; }catch(e){ return false; } }
  function lsDel(k){ try{ localStorage.removeItem(k); }catch(e){} }

  /* ---- 役割はファイル名から決める ---- */
  const file = (location.pathname.split('/').pop() || '').toLowerCase();
  const ROLE = window.SD_DEBUG_ROLE
    || (file.indexOf('display_l') === 0 ? 'L'
     : (file.indexOf('display_r') === 0 ? 'R' : 'C'));

  /* ---- 有効・無効 ---- */
  const q = new URLSearchParams(location.search);
  let on;
  if (q.has('debug')){ on = q.get('debug') !== '0'; lsSet(KEY+'_on', on ? '1' : '0'); }
  else on = ls(KEY+'_on') === '1';

  /* ---- 保存の枠 ---- */
  const mKey = KEY+'_meta_'+ROLE;
  let meta = { base: 0, top: 0 };
  try{ const m = JSON.parse(ls(mKey) || 'null'); if (m && typeof m.top === 'number') meta = m; }catch(e){}
  function cKey(r, i){ return KEY+'_c_'+r+'_'+i; }

  let buf = [];
  function flush(){
    if (!on || !buf.length) return;
    const add = buf.join('\n') + '\n';
    buf = [];
    let cur = ls(cKey(ROLE, meta.top)) || '';
    if (cur.length && cur.length + add.length > CHUNK_MAX){ meta.top++; cur = ''; }
    if (!lsSet(cKey(ROLE, meta.top), cur + add)){
      while (meta.base < meta.top){                     // 容量が尽きたら古い枠を捨てて入れ直す
        lsDel(cKey(ROLE, meta.base)); meta.base++;
        if (lsSet(cKey(ROLE, meta.top), cur + add)) break;
      }
    }
    while (meta.top - meta.base >= CHUNK_KEEP){ lsDel(cKey(ROLE, meta.base)); meta.base++; }
    lsSet(mKey, JSON.stringify(meta));
  }

  function fmt(d){
    if (d == null) return '';
    if (typeof d !== 'object') return String(d);
    const out = [];
    for (const k in d){
      let v = d[k];
      if (v === undefined || v === null) continue;
      if (typeof v === 'number') v = Number.isInteger(v) ? v : Math.round(v*1000)/1000;
      out.push(k+'='+String(v).replace(/[\s\t\n]+/g,' '));
    }
    return out.join(' ');
  }

  let bus = null;
  try{ bus = new BroadcastChannel('same_difference_dbg'); }catch(e){}

  const counts = { '.':0, '?':0, '!':0 };
  const hooks = [];

  function push(tag, data, sev){
    sev = sev || '.';
    counts[sev] = (counts[sev] || 0) + 1;
    const line = Date.now()+'\t'+ROLE+'\t'+sev+'\t'+tag+'\t'+fmt(data);
    buf.push(line);
    for (let i = 0; i < hooks.length; i++){ try{ hooks[i](line, sev); }catch(e){} }
    if (bus && ROLE !== 'C'){ try{ bus.postMessage({ type:'dbgline', line, sev, side:ROLE }); }catch(e){} }
    if (sev !== '.' || buf.length > 60) flush();
  }

  /* 同じ種類が短時間に続いたら伏せる。7時間ぶんの記録を1種類で埋めさせない。 */
  const RATE_WIN = 10000, RATE_MAX = 25;
  const rate = {};
  function ev(tag, data, sev){
    if (!on) return;
    const now = Date.now();
    let r = rate[tag];
    if (!r || now - r.t0 > RATE_WIN){
      if (r && r.muted) push('連発', { 種類: tag, 件数: r.n, 秒: RATE_WIN/1000 }, '!');
      r = rate[tag] = { t0: now, n: 0, muted: 0 };
    }
    r.n++;
    if (r.n > RATE_MAX){
      if (!r.muted){ r.muted = 1; push('連発開始', { 種類: tag, 上限: RATE_MAX }, '!'); }
      return;
    }
    push(tag, data, sev);
  }

  /* ---- 生存確認と、時計の飛び（固まり・スリープ）の検出 ---- */
  let stateFn = null;
  let lastTick = Date.now();
  if (on){
    setInterval(()=>{
      const now = Date.now();
      const late = now - lastTick - 1000;
      lastTick = now;
      if (late > 800) ev('lag', { ms: late }, late > 3000 ? '!' : '?');
      let s = '';
      try{ s = stateFn ? String(stateFn()) : ''; }catch(e){}
      lsSet(KEY+'_alive_'+ROLE, now + (s ? '|'+s : ''));
    }, 1000);
    setInterval(flush, 2000);
  }

  function iso(t){
    const d = new Date(Number(t));
    const p = (n)=> String(n).padStart(2,'0');
    return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '
         + p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds())
         + '.'+String(d.getMilliseconds()).padStart(3,'0');
  }
  function hms(ms){
    const s = Math.max(0, Math.round(ms/1000));
    return Math.floor(s/3600)+'時間'+String(Math.floor(s/60)%60).padStart(2,'0')+'分'+String(s%60).padStart(2,'0')+'秒';
  }

  /* ---- 起動時：前回が正常に閉じたかどうかを見る ---- */
  function boot(){
    const prev = ls(KEY+'_alive_'+ROLE);
    const bye = Number(ls(KEY+'_bye_'+ROLE) || 0);
    ev('boot', { url: location.pathname.split('/').pop() + location.search });
    if (prev){
      const t = Number(String(prev).split('|')[0]) || 0;
      if (t && (!bye || bye < t - 2000)){
        ev('落ちた形跡', { last: iso(t), state: String(prev).split('|')[1] || '', 経過ms: Date.now() - t }, '!');
      }
    }
    lsDel(KEY+'_bye_'+ROLE);
  }

  addEventListener('pagehide', ()=>{ if(!on) return; ev('bye', {}); flush(); lsSet(KEY+'_bye_'+ROLE, Date.now()); });
  addEventListener('error', (e)=> ev('jsエラー', { msg: String(e.message||'').slice(0,160), at: String(e.filename||'').split('/').pop()+':'+e.lineno }, '!'));
  addEventListener('unhandledrejection', (e)=> ev('未処理', { msg: String(e.reason).slice(0,160) }, '!'));

  /* ---- 取り出し ---- */
  function readRole(r){
    let m = { base:0, top:0 };
    try{ const j = JSON.parse(ls(KEY+'_meta_'+r) || 'null'); if (j && typeof j.top === 'number') m = j; }catch(e){}
    let s = '';
    for (let i = m.base; i <= m.top; i++) s += (ls(cKey(r, i)) || '');
    return s;
  }
  function bytes(){
    let n = 0;
    ['C','L','R'].forEach(r => { n += readRole(r).length; });
    return n;
  }
  function collect(){
    flush();
    const lines = [];
    ['C','L','R'].forEach(r => readRole(r).split('\n').forEach(l => { if (l) lines.push(l); }));
    lines.sort((a,b)=> Number(a.split('\t')[0]) - Number(b.split('\t')[0]));
    return lines;
  }
  function pretty(l){
    const p = l.split('\t');
    return iso(p[0])+'  '+p[1]+' '+p[2]+' '+p[3]+'  '+(p[4]||'');
  }
  function report(){
    const lines = collect();
    const bad = lines.filter(l => l.split('\t')[2] !== '.');
    const t0 = lines.length ? Number(lines[0].split('\t')[0]) : Date.now();
    const t1 = lines.length ? Number(lines[lines.length-1].split('\t')[0]) : Date.now();
    const tags = {};
    lines.forEach(l => { const p = l.split('\t'); const k = p[1]+'  '+p[2]+' '+p[3]; tags[k] = (tags[k]||0)+1; });
    const out = [];
    out.push('same difference — デバッグログ');
    out.push('期間: '+iso(t0)+' 〜 '+iso(t1)+'（'+hms(t1-t0)+'）');
    out.push('記録 '+lines.length+'件　異常(!) '+lines.filter(l=>l.split('\t')[2]==='!').length
            +'件　注意(?) '+lines.filter(l=>l.split('\t')[2]==='?').length+'件');
    ['C','L','R'].forEach(r=>{
      const a = ls(KEY+'_alive_'+r);
      if (a) out.push('最終生存 '+r+': '+iso(String(a).split('|')[0])+'　'+(String(a).split('|')[1]||''));
    });
    out.push('');
    out.push('― 内訳 ―');
    Object.keys(tags).sort().forEach(k => out.push('  '+k+' × '+tags[k]));
    out.push('');
    out.push('― 異常・注意（'+bad.length+'件）―');
    bad.slice(0, 3000).forEach(l => out.push('  '+pretty(l)));
    if (bad.length > 3000) out.push('  …他 '+(bad.length-3000)+'件');
    out.push('');
    out.push('― 全記録 ―');
    lines.forEach(l => out.push(pretty(l)));
    return out.join('\n');
  }
  function download(){
    const text = report();
    const d = new Date();
    const p = (n)=> String(n).padStart(2,'0');
    const name = 'sd_debug_'+d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'_'+p(d.getHours())+p(d.getMinutes())+'.txt';
    const url = URL.createObjectURL(new Blob([text], { type:'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    setTimeout(()=> URL.revokeObjectURL(url), 8000);
    return name;
  }
  function clear(){
    ['C','L','R'].forEach(r=>{
      let m = { base:0, top:0 };
      try{ const j = JSON.parse(ls(KEY+'_meta_'+r) || 'null'); if (j && typeof j.top === 'number') m = j; }catch(e){}
      for (let i = m.base; i <= m.top; i++) lsDel(cKey(r, i));
      lsDel(KEY+'_meta_'+r); lsDel(KEY+'_alive_'+r); lsDel(KEY+'_bye_'+r);
    });
    meta = { base:0, top:0 }; buf = [];
    counts['.'] = counts['?'] = counts['!'] = 0;
  }

  window.SDDBG = {
    on, role: ROLE, bus, counts,
    ev, flush, collect, report, download, clear, bytes, iso, hms,
    onLine(f){ hooks.push(f); },
    set state(fn){ stateFn = fn; },
    get state(){ return stateFn; }
  };
  if (on) boot();
})();
