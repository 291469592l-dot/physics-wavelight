// 公共：存储、词汇表、渲染工具
(function(){
  window.MB = window.MB || {};
  var MB = window.MB;

  var KEY = 'mechbank.v2';
  var store = {};
  try { store = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch(e){ store = {}; }
  if (!store.q) store.q = {};
  if (!store.set) store.set = {};
  if (!store.wb) store.wb = {};

  MB.store = store;
  MB.save = function(){ try{ localStorage.setItem(KEY, JSON.stringify(store)); }catch(e){} };
  MB.getQ = function(code){ return store.q[code] || (store.q[code] = {}); };
  MB.setQ = function(code, k, v){ var q = MB.getQ(code); q[k] = v; MB.save(); };
  MB.setting = function(k, v){
    if (v === undefined) return store.set[k];
    store.set[k] = v; MB.save(); return v;
  };

  MB.esc = function(s){
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  };

  // ---------- 词汇表 ----------
  var G = window.GLOSSARY || {};
  var single = {}, multi = [];
  Object.keys(G).forEach(function(k){
    var lk = k.toLowerCase();
    if (lk.indexOf(' ') >= 0) multi.push(lk);
    else single[lk] = G[k];
  });
  multi.sort(function(a,b){ return b.length - a.length; });
  var ESCRE = new RegExp('[\\\\^$.*+?()[\\]{}|]', 'g');
  var reParts = multi.map(function(k){ return k.replace(ESCRE, '\\$&'); });
  var MASTER = new RegExp('(' + reParts.join('|') + ')|([A-Za-z][A-Za-z\'-]*)', 'gi');

  var SUF = ['s','es','ed','ing','ly','er','est','ies','ied','d'];
  function lookup(word){
    var w = String(word).toLowerCase();
    if (single[w]) return single[w];
    if (G[w]) return G[w];
    for (var i=0;i<SUF.length;i++){
      var s = SUF[i];
      if (w.length > s.length + 2 && w.slice(-s.length) === s){
        var base = w.slice(0, -s.length);
        if (single[base]) return single[base];
        if (s === 'ies' || s === 'ied'){ if (single[base + 'y']) return single[base+'y']; }
        if (s === 'ed' || s === 'ing'){
          if (single[base+'e']) return single[base+'e'];
          if (base.length > 2 && base.slice(-1) === base.slice(-2,-1) && single[base.slice(0,-1)]) return single[base.slice(0,-1)];
        }
      }
    }
    return null;
  }
  MB.lookup = lookup;

  MB.gloss = function(text){
    if (!text) return '';
    var out = '', last = 0, m;
    MASTER.lastIndex = 0;
    while ((m = MASTER.exec(text)) !== null){
      out += MB.esc(text.slice(last, m.index));
      var w = m[0];
      var hit = lookup(w);
      if (hit){
        out += '<span class="gw cat-' + (hit[2] || 'common') + '" data-w="' + MB.esc(w.toLowerCase()) + '">' + MB.esc(w) +
               '<span class="zc">' + MB.esc(hit[0]) + '</span></span>';
      } else {
        out += MB.esc(w);
      }
      last = m.index + w.length;
      if (m.index === MASTER.lastIndex) MASTER.lastIndex++;
    }
    out += MB.esc(text.slice(last));
    return out;
  };

  MB.wordsIn = function(text){
    var res = [], seen = {}, m;
    MASTER.lastIndex = 0;
    while ((m = MASTER.exec(text || '')) !== null){
      var hit = lookup(m[0]);
      if (hit){
        var k = m[0].toLowerCase();
        if (!seen[k]){ seen[k] = 1; res.push([k, hit[0], hit[2] || '']); }
      }
    }
    return res;
  };

  MB.LANGS = [
    {id:0, name:'中文优先',  desc:'中文大字、英文小字，先看懂意思'},
    {id:1, name:'中英对照',  desc:'英文正常显示，下面给出中文译文'},
    {id:2, name:'关键词助读',desc:'只用英文，生词后面自动标出中文'},
    {id:3, name:'全英文',    desc:'纯英文阅读，生词点击/悬停查询'}
  ];
  MB.defaultLang = function(meta){ return (meta && meta.lang != null) ? meta.lang : 1; };
  MB.applyLang = function(n){
    document.body.classList.remove('lang0','lang1','lang2','lang3');
    document.body.classList.add('lang' + n);
    var el = document.getElementById('langmeta');
    if (el && MB.LANGS[n]) el.textContent = MB.LANGS[n].name;
  };

  // ---------- 气泡 ----------
  var tip;
  MB.tip = function(html, x, y){
    if (!tip){ tip = document.createElement('div'); tip.id = 'tip'; document.body.appendChild(tip); }
    tip.innerHTML = html;
    tip.classList.add('on');
    var r = tip.getBoundingClientRect();
    var left = Math.min(Math.max(8, x - r.width/2), window.innerWidth - r.width - 8);
    var top = y - r.height - 10;
    if (top < 8) top = y + 16;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  };
  MB.untip = function(){ if (tip) tip.classList.remove('on'); };

  document.addEventListener('click', function(e){
    var t = e.target.closest ? e.target.closest('.gw') : null;
    if (t){
      var hit = lookup(t.getAttribute('data-w'));
      MB.untip();
      if (hit && MB.onWord) MB.onWord(t.getAttribute('data-w'), hit);
      e.stopPropagation();
    }
  });
  document.addEventListener('mouseover', function(e){
    var t = e.target.closest ? e.target.closest('.gw') : null;
    if (!t) return;
    var w = t.getAttribute('data-w'), hit = lookup(w);
    if (!hit) return;
    var r = t.getBoundingClientRect();
    MB.tip('<b>' + MB.esc(w) + '</b> <i>' + MB.esc(hit[1]) + '</i><br>' + MB.esc(hit[0]), r.left + r.width/2, r.top);
  });
  document.addEventListener('mouseout', function(e){
    var t = e.target.closest ? e.target.closest('.gw') : null;
    if (t) MB.untip();
  });
})();