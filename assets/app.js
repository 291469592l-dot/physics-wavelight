// 章节练习页
(function(){
  var CH = window.__CH__;
  var MB = window.MB;
  var ORDER = ['mc','sq','lq','rq'];
  var TNAME = {mc:'选择题', sq:'短答题', lq:'长答题', rq:'阅读题'};
  var TCLS = {mc:'MC', sq:'SQ', lq:'LQ', rq:'RQ'};

  // 点击正文生词 → 收入/移出生词本
  var toastEl = null;
  function toast(msg){
    if (!toastEl){ toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function(){ toastEl.classList.remove('on'); }, 1400);
  }
  MB.onWord = function(w){
    if (MB.store.wb[w]){ delete MB.store.wb[w]; toast('已移出生词本：' + w); }
    else { MB.store.wb[w] = 1; toast('已加入生词本：' + w); }
    MB.save();
  };

  var qs = new URLSearchParams(location.search);
  var st = {
    type: qs.get('t') && ORDER.indexOf(qs.get('t')) >= 0 ? qs.get('t') : 'mc',
    idx: 0,
    ans: {},
    only: 'all',
    word: '',
    lang: MB.setting('lang')
  };
  if (st.lang === undefined || st.lang === null) st.lang = MB.defaultLang(CH.meta);
  st.lang = parseInt(st.lang, 10) || 0;

  function curList(){ return (CH.questions[st.type] || []); }
  function curQ(){ return curList()[st.idx]; }

  // ---------------- 渲染工具 ----------------
  function esc(s){ return MB.esc(s); }

  function fmtMath(t){
    var h = esc(t);
    h = h.replace(/\(([^()]*)\)\/\(([^()]*)\)/g, function(m,a,b){
      return '<span class="frac"><span class="num">' + a + '</span><span class="den">' + b + '</span></span>';
    });
    h = h.replace(/\^\{?([A-Za-z0-9+\-–]+)\}?/g, '<sup>' + '$1' + '</sup>');
    h = h.replace(/_\{?([A-Za-z0-9+\-–]+)\}?/g, '<sub>' + '$1' + '</sub>');
    return h;
  }

  // 把 OMML 线性化留下的 ^ / _ 记号转成真正的上下标（含撇号）
  function supify(html){
    html = html.replace(/\^\(([^()]*)\)/g, '<sup>($1)</sup>');
    html = html.replace(/\^[\u0027\u2018\u2019\u2032]/g, '\u2032');
    html = html.replace(/\^\{([^{}]*)\}/g, '<sup>$1</sup>');
    html = html.replace(/\^([A-Za-z0-9+\-\u2013\u2212\u00b0\u2032\u2033.]+)/g, '<sup>$1</sup>');
    html = html.replace(/_([A-Za-z0-9+\-\u2013\u2212]+)/g, '<sub>$1</sub>');
    html = html.replace(/<sup><\/sup>/g, '');
    return html;
  }

  function renderItems(items){
    var out = '';
    for (var i=0;i<items.length;i++){
      var it = items[i];
      if (it.t === 'math'){ out += flattenMath(it.v); continue; }
      if (it.t === 'i'){
        if (!it.src) continue;
        var w = it.w ? Math.round(it.w) : 0, h = it.h ? Math.round(it.h) : 0;
        var inline = (h && h <= 100) || (h && h <= 130 && w && w / Math.max(h, 1) > 2.2);
        var cls = inline ? 'eq' : 'fig';
        out += '<img class="' + cls + '" src="' + esc(it.src) + '"' +
               (cls === 'fig' && w ? ' width="' + w + '"' : '') + ' alt="" loading="lazy">';
        continue;
      }
      var body = (it.t === 'm') ? supify(fmtMath(it.v)) : supify(MB.gloss(it.v));
      if (it.sup) body = '<sup>' + body + '</sup>';
      else if (it.sub) body = '<sub>' + body + '</sub>';
      if (it.i) body = '<i>' + body + '</i>';
      if (it.b) body = '<b>' + body + '</b>';
      if (it.u) body = '<u>' + body + '</u>';
      out += body;
    }
    return out;
  }

  // 公式行（几乎没有中文/文字）不再重复显示中文，避免二次噪声

  // ---------- 分式显示方式（上下 / 斜杠） ----------
  MB.fracInline = (MB.setting('frac') !== 'stack');
  function splitTopMath(inner){
    var i = 0, depth = 0, firstEnd = -1;
    while (i < inner.length){
      if (inner.substr(i, 3) === '</m'){
        var e = inner.indexOf('>', i);
        if (e < 0) break;
        depth--; i = e + 1;
        if (depth <= 0 && firstEnd < 0){ firstEnd = i; break; }
        continue;
      }
      if (inner[i] === '<' && inner.substr(i, 2) === '<m'){
        var e2 = inner.indexOf('>', i);
        if (e2 < 0) break;
        depth++; i = e2 + 1; continue;
      }
      i++;
    }
    if (firstEnd <= 0) return null;
    return [inner.slice(0, firstEnd), inner.slice(firstEnd)];
  }
  function flattenMath(html){
    if (!MB.fracInline || !html || html.indexOf('<mfrac') < 0) return html;
    try {
      var box = document.createElement('div');
      box.innerHTML = html;
      var fracs = Array.prototype.slice.call(box.querySelectorAll('mfrac'));
      var NS = 'http://www.w3.org/1998/Math/MathML';
      for (var i = 0; i < fracs.length; i++){
        var fr = fracs[i];
        var kids = [];
        for (var j = 0; j < fr.childNodes.length; j++){
          if (fr.childNodes[j].nodeType === 1) kids.push(fr.childNodes[j]);
        }
        if (kids.length !== 2 || !fr.parentNode) continue;
        var row = box.ownerDocument.createElementNS(NS, 'mrow');
        row.appendChild(kids[0]);
        var slash = box.ownerDocument.createElementNS(NS, 'mo');
        slash.appendChild(box.ownerDocument.createTextNode('/'));
        row.appendChild(slash);
        row.appendChild(kids[1]);
        fr.parentNode.replaceChild(row, fr);
      }
      return box.innerHTML;
    } catch (e) {
      return html;
    }
  }

  function applyFrac(){
    var all = document.querySelectorAll('#fracbtn');
    for (var i = 1; i < all.length; i++) all[i].remove();
    document.body.classList.toggle('inlinefrac', MB.fracInline);
    var b = document.getElementById('fracbtn');
    if (b) b.textContent = MB.fracInline ? '分式：斜杠' : '分式：上下';
  }

  function mathDominated(p){
    var z = (p && p.zh) || '';
    var cjk = (z.match(/[\u4e00-\u9fff]/g) || []).length;
    if (cjk === 0) return true;                 // 纯公式/符号译文，没有信息量
    if (cjk / Math.max(1, z.length) < 0.18) return true;   // 基本是公式，中文只是零星两字
    return false;
  }

  function zhLine(p){
    if (!p || !p.zh) return '';
    var t = p.zh.trim();
    if (!/[A-Za-z0-9\u4e00-\u9fff]/.test(t)) return '';
    if (mathDominated(p)) return '';
    var zz = (p.zh || '').replace(/=\s*=/g, '=').replace(/[=+\-−×÷]\s*$/, '').trim();
    if (!zz) return '';
    return '<div class="zh">' + supify(fmtMath(zz)) + '</div>';
  }

  function tableInfo(t){
    var text = 0, imgs = 0;
    t.rows.forEach(function(r){ r.forEach(function(c){
      c.paras.forEach(function(p){ text += (p.text || '').replace(/\s/g,'').length; });
      (function walk(cell){
        cell.paras.forEach(function(p){ (p.items||[]).forEach(function(i){ if (i.t==='i') imgs++; }); });
        cell.tbl.forEach(function(x){ x.rows.forEach(function(r){ r.forEach(walk); }); });
      })(c);
    }); });
    return {text:text, imgs:imgs};
  }

  function renderCell(c, sol){
    var out = '';
    c.paras.forEach(function(p){
      if (!(p.text || '').trim() && !(p.items||[]).some(function(i){ return i.t==='i'; })) return;
      out += '<div class="pc">' + renderItems(p.items || []) + '</div>';
      out += zhLine(p);
    });
    c.tbl.forEach(function(t){ out += renderTable(t, !!sol); });
    return out;
  }

  function renderTable(t, sol){
    var info = tableInfo(t);
    if (sol && t.rows.length === 1 && t.rows[0].length === 1){
      return '<div class="solflat">' + renderCell(t.rows[0][0], true) + '</div>';
    }
    var cls = 'tbl';
    if (!sol && info.text < 30 && info.imgs > 0) cls += ' fig';
    if (sol) cls += ' sol';
    var h = '<table class="' + cls + '">';
    t.rows.forEach(function(r){
      h += '<tr>';
      r.forEach(function(c){ h += '<td>' + renderCell(c, sol) + '</td>'; });
      h += '</tr>';
    });
    return h + '</table>';
  }

  function splitLabel(items){
    // 把 "(a)\t..." 拆成编号 + 正文
    var ti = -1, tabPos = -1;
    for (var i=0;i<items.length;i++){
      if (items[i].t === 'x' && items[i].v && items[i].v.indexOf('\t') >= 0){ ti = i; tabPos = items[i].v.indexOf('\t'); break; }
    }
    if (ti < 0) return null;
    var head = items[ti].v.slice(0, tabPos).replace(/^\s+/, '');
    if (!/^\(?\s*([a-zA-Z]|[ivx]+|\d)\s*\)?$/.test(head)){
      var after = items[ti].v.slice(tabPos + 1);
      var m2 = after.match(/^\s*(\([a-zA-Z0-9]{1,4}\))\s*\t?\s*(.*)$/);
      if (!m2) return null;
      var r2 = items.slice(ti);
      r2[0] = Object.assign({}, items[ti], {v: m2[2]});
      if (!r2[0].v) r2.shift();
      return {label: m2[1], items: r2};
    }
    var rest = items.slice(ti);
    rest[0] = Object.assign({}, items[ti], {v: items[ti].v.slice(tabPos + 1)});
    if (!rest[0].v) rest.shift();
    return {label: head, items: rest};
  }

  function renderBlock(b, idx, titler){
    if (b.kind === 'skip') return '';
    if (b.kind === 'tbl') return renderTable(b, false);
    if (b.kind === 'opt'){
      return '<div class="opt" data-key="' + esc(b.key) + '">' +
             '<span class="key">' + esc(b.key) + '</span>' +
             '<span class="tx">' + renderItems(b.items) + '</span></div>' + zhLine(b);
    }
    if (b.kind === 'stmt'){
      return '<div class="stmt"><span class="n">(' + esc(b.n) + ')</span>' +
             '<span>' + renderItems(b.items) + '</span></div>' + zhLine(b);
    }
    if (b.kind === 'part'){
      var sp = splitLabel(b.items || []);
      if (sp){
        return '<div class="part"><span class="lbl">' + esc(sp.label) + '</span>' +
               '<span>' + renderItems(sp.items) + '</span></div>' + zhLine(b);
      }
      return '<div class="part"><span>' + renderItems(b.items) + '</span></div>' + zhLine(b);
    }
    var txt = (b.text || '').trim();
    var plain = (b.items||[]).every(function(i){ return i.t==='x'; });
    var isTitle = plain && txt.length > 2 && txt.length < 46 && /^[A-Z][^.!?]*$/.test(txt) && titler;
    return '<p class="para' + (isTitle ? ' title' : '') + '">' + renderItems(b.items || []) + '</p>' + zhLine(b);
  }

  // ---------------- 答案解析 ----------------
  function collectTexts(t, out){
    t.rows.forEach(function(r){ r.forEach(function(c){
      c.paras.forEach(function(p){ if ((p.text||'').trim()) out.push(p.text.trim()); });
      c.tbl.forEach(function(x){ collectTexts(x, out); });
    }); });
    return out;
  }
  function mcAnswer(q){
    if (!q.ans) return '';
    var arr = collectTexts(q.ans, []);
    for (var i=0;i<arr.length;i++){ if (/^[A-D]$/.test(arr[i])) return arr[i]; }
    return '';
  }

  // ---------------- 侧栏 ----------------
  function buildSidebar(){
    var all = CH.questions;
    var box = document.getElementById('qlist');
    var h = '';
    ORDER.forEach(function(tp){
      var arr = all[tp] || [];
      if (!arr.length) return;
      if (st.type !== tp) return;
      var shown = 0;
      h += '<div class="grp">' + TNAME[tp] + ' · ' + arr.length + ' 题</div>';
      arr.forEach(function(q, i){
        var rec = MB.store.q[q.code] || {};
        if (st.only === 'star' && !rec.star) return;
        if (st.only === 'todo' && rec.s) return;
        if (st.only === 'fail' && rec.s !== 2) return;
        shown++;
        var scls = rec.star ? 'st star' : (rec.s === 1 ? 'st ok' : (rec.s === 2 ? 'st no' : 'st'));
        h += '<div class="qitem' + (i === st.idx ? ' active' : '') + '" data-i="' + i + '">' +
             '<span class="no">' + (i+1) + '</span>' +
             '<span class="tt">' + esc(firstLine(q)) + '</span>' +
             '<span class="' + scls + '"></span></div>';
      });
      if (!shown) h += '<div style="padding:8px 10px;font-size:12.5px;color:#7b8794">没有符合条件的题目</div>';
    });
    box.innerHTML = h || '<div class="grp">暂无题目</div>';
    box.querySelectorAll('.qitem').forEach(function(el){
      el.addEventListener('click', function(){
        st.idx = parseInt(el.getAttribute('data-i'), 10);
        render();
        document.body.classList.remove('sbopen');
      });
    });
    var act = box.querySelector('.qitem.active');
    if (act && act.scrollIntoView) act.scrollIntoView({block:'nearest'});
  }

  function firstLine(q){
    var b = (q.body || []).find(function(x){
      if (x.kind !== 'p' && x.kind !== 'part') return false;
      var t = (x.text || '').replace(/\[img\]/g, '').trim();
      return t.length > 4;
    });
    if (!b) return q.zhTitle || q.code;
    return b.text.replace(/\[img\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 46);
  }

  // ---------------- 题目 ----------------
  function renderQuestion(){
    var q = curQ();
    var host = document.getElementById('content');
    if (!q){ host.innerHTML = '<div class="qcard"><div class="qbody"><p class="para">本章该题型暂无题目。</p></div></div>'; return; }

    var rec = MB.store.q[q.code] || {};
    var showAns = !!st.ans[q.code];
    var typeCn = TNAME[q.type] || q.type;
    var h = '';
    h += '<div class="qcard">';
    h += '<div class="qhead">';
    h += '<span class="badge ' + q.type + '">' + TCLS[q.type] + ' · ' + typeCn + '</span>';
    h += '<span class="code">' + esc(q.code) + '</span>';
    if (q.marks) h += '<span class="badge mk">' + esc(q.marks) + ' 分</span>';
    if (q.level) h += '<span class="badge lv">' + esc(levelCn(q.level)) + '</span>';
    h += '<span class="sp">';
    h += '<button class="btn sm" id="btnstar">' + (rec.star ? '★ 已收藏' : '☆ 收藏') + '</button>';
    h += '<button class="btn sm primary" id="btnans">' + (showAns ? '收起答案' : '查看答案') + '</button>';
    h += '</span></div>';

    h += '<div class="qbody">';
    (q.body || []).forEach(function(b, i){ h += renderBlock(b, i, i < 2); });
    h += '</div>';

    // 生词
    var words = [];
    var seen = {};
    (q.body || []).forEach(function(b){
      var texts = [];
      if (b.text) texts.push(b.text);
      if (b.kind === 'tbl'){
        collectTexts(b, []).forEach(function(x){ texts.push(x); });
      }
      texts.forEach(function(t){
        MB.wordsIn(t).forEach(function(w){ if (!seen[w[0]]){ seen[w[0]] = 1; words.push(w); } });
      });
    });
    if (words.length){
      h += '<details class="vocab"><summary>本题生词 <span class="cnt">' + words.length + ' 个 · 点击可加入生词本</span></summary><div class="vlist">';
      words.forEach(function(w){
        var inwb = !!MB.store.wb[w[0]];
        h += '<span class="vitem" data-w="' + esc(w[0]) + '"><b>' + esc(w[0]) + '</b><span>' + esc(w[1]) + '</span>' +
             '<em>' + esc(w[2] || '') + '</em> ' + (inwb ? '✔' : '＋') + '</span>';
      });
      h += '</div></details>';
    }

    // 答案
    if (q.ans){
      var ansLetter = q.type === 'mc' ? mcAnswer(q) : '';
      h += '<div class="answrap' + (showAns ? '' : ' hidden') + '" id="answrap">';
      h += '<div class="ansbar"><span class="h">参考答案 / SOLUTION</span>';
      if (ansLetter) h += '<span class="anskey">正确答案 ' + esc(ansLetter) + '</span>';
      h += '</div>';
      h += '<div class="ans">' + renderTable(q.ans, true) + '</div></div>';
    }

    // 自评
    h += '<div class="qfoot">';
    h += '<span class="qhint">做完后给自己记一笔：</span>';
    h += '<button class="btn sm' + (rec.s === 1 ? ' okbtn' : '') + '" id="btnok">我会做</button>';
    h += '<button class="btn sm' + (rec.s === 2 ? ' nobtn' : '') + '" id="btnno">还不会</button>';
    h += '</div>';

    h += '</div>';
    host.innerHTML = h;

    bindQuestion(q);
    updateNav();
  }

  function levelCn(l){
    return ({easy:'基础', avg:'中等', avg2:'中等', dif:'较难', hard:'较难', difficult:'较难'})[l] || l;
  }

  function bindQuestion(q){
    var ansLetter = q.type === 'mc' ? mcAnswer(q) : '';
    var selKey = null;

    document.getElementById('btnans').addEventListener('click', function(){
      st.ans[q.code] = !st.ans[q.code];
      var wrap = document.getElementById('answrap');
      if (wrap) wrap.classList.toggle('hidden', !st.ans[q.code]);
      this.textContent = st.ans[q.code] ? '收起答案' : '查看答案';
      if (st.ans[q.code]) markOptions();
    });
    document.getElementById('btnstar').addEventListener('click', function(){
      var rec = MB.getQ(q.code);
      rec.star = !rec.star;
      MB.save();
      this.textContent = rec.star ? '★ 已收藏' : '☆ 收藏';
      buildSidebar();
    });
    var bok = document.getElementById('btnok'), bno = document.getElementById('btnno');
    if (bok) bok.addEventListener('click', function(){ MB.setQ(q.code, 's', 1); render(); });
    if (bno) bno.addEventListener('click', function(){ MB.setQ(q.code, 's', 2); render(); });

    var opts = document.querySelectorAll('.opt');
    opts.forEach(function(el){
      el.addEventListener('click', function(){
        opts.forEach(function(o){ o.classList.remove('sel'); });
        el.classList.add('sel');
        selKey = el.getAttribute('data-key');
        if (st.ans[q.code]) markOptions(selKey, ansLetter);
      });
    });

    function markOptions(sel, right){
      sel = sel || selKey;
      right = right || ansLetter;
      if (!right) return;
      document.querySelectorAll('.opt').forEach(function(o){
        var k = o.getAttribute('data-key');
        o.classList.remove('right','wrong');
        if (k === right) o.classList.add('right');
        else if (k === sel) o.classList.add('wrong');
      });
    }

    document.querySelectorAll('.vitem').forEach(function(el){
      el.addEventListener('click', function(){
        var w = el.getAttribute('data-w');
        if (MB.store.wb[w]){ delete MB.store.wb[w]; el.innerHTML = el.innerHTML.replace('✔','＋'); }
        else { MB.store.wb[w] = 1; el.innerHTML = el.innerHTML.replace('＋','✔'); }
        MB.save();
      });
    });
  }

  // ---------------- 顶部 ----------------
  function chapterNav(){
    var list = window.CHAPTERS || [];
    var i = list.findIndex(function(c){ return c.ch === CH.meta.ch; });
    var prev = i > 0 ? list[i-1] : null;
    var next = (i >= 0 && i < list.length - 1) ? list[i+1] : null;
    var a = document.getElementById('chprev'), b = document.getElementById('chnext');
    if (a){ if (prev){ a.style.display=''; a.href = prev.ch + '.html'; a.title = prev.cn; } else a.style.display='none'; }
    if (b){ if (next){ b.style.display=''; b.href = next.ch + '.html'; b.title = next.cn; } else b.style.display='none'; }
  }

  function updateNav(){
    chapterNav();
    document.getElementById('ptitle').textContent = CH.meta.no + ' · ' + CH.meta.cn;
    document.getElementById('pcount').textContent = (st.idx + 1) + ' / ' + curList().length;
    var sel = document.getElementById('typeselect');
    if (sel) sel.value = st.type;
    document.querySelectorAll('.seg button').forEach(function(b){
      b.classList.toggle('on', parseInt(b.getAttribute('data-lang'), 10) === st.lang);
    });
  }

  function render(){
    buildSidebar();
    renderQuestion();
  }

  function goto(delta){
    var arr = curList();
    var n = st.idx + delta;
    if (n < 0 || n >= arr.length) return;
    st.idx = n;
    render();
    window.scrollTo({top:0, behavior:'smooth'});
  }

  // ---------------- 启动 ----------------
  function boot(){
    MB.applyLang(st.lang);
    applyFrac();
    var _fb = document.createElement('button');
    _fb.className = 'btn sm'; _fb.id = 'fracbtn'; _fb.type = 'button';
    _fb.addEventListener('click', function(){
      MB.fracInline = !MB.fracInline;
      MB.setting('frac', MB.fracInline ? 'inline' : 'stack');
      applyFrac(); render();
    });
    var _nb = document.querySelector('.navbtns');
    if (_nb) _nb.insertBefore(_fb, _nb.firstChild);
    applyFrac();
    document.getElementById('typeselect').innerHTML =
      ORDER.filter(function(t){ return (CH.questions[t]||[]).length; })
        .map(function(t){ return '<option value="' + t + '">' + TNAME[t] + ' (' + CH.questions[t].length + ')</option>'; }).join('');
    document.getElementById('typeselect').addEventListener('change', function(){
      st.type = this.value; st.idx = 0; render();
    });
    document.querySelectorAll('.seg button').forEach(function(b){
      b.addEventListener('click', function(){
        st.lang = parseInt(b.getAttribute('data-lang'), 10);
        MB.setting('lang', st.lang);
        MB.applyLang(st.lang);
    applyFrac();
    var _fb = document.createElement('button');
    _fb.className = 'btn sm'; _fb.id = 'fracbtn'; _fb.type = 'button';
    _fb.addEventListener('click', function(){
      MB.fracInline = !MB.fracInline;
      MB.setting('frac', MB.fracInline ? 'inline' : 'stack');
      applyFrac(); render();
    });
    var _nb = document.querySelector('.navbtns');
    if (_nb) _nb.insertBefore(_fb, _nb.firstChild);
    applyFrac();
        updateNav();
      });
    });
    document.getElementById('prev').addEventListener('click', function(){ goto(-1); });
    document.getElementById('next').addEventListener('click', function(){ goto(1); });
    document.getElementById('sbtoggle').addEventListener('click', function(){
      document.body.classList.toggle('sbopen');
    });
    document.querySelectorAll('.filters .chip[data-only]').forEach(function(b){
      b.addEventListener('click', function(){
        st.only = b.getAttribute('data-only');
        document.querySelectorAll('.filters .chip[data-only]').forEach(function(x){ x.classList.remove('on'); });
        b.classList.add('on');
        buildSidebar();
      });
    });
    var sb = document.getElementById('sbsearch');
    if (sb) sb.addEventListener('input', function(){
      var v = this.value.trim().toLowerCase();
      document.querySelectorAll('#qlist .qitem').forEach(function(el){
        var t = el.querySelector('.tt').textContent.toLowerCase();
        el.style.display = (!v || t.indexOf(v) >= 0) ? '' : 'none';
      });
    });

    document.addEventListener('keydown', function(e){
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft') goto(-1);
      else if (e.key === 'ArrowRight') goto(1);
      else if (e.key === 'a' || e.key === 'A'){
        var b = document.getElementById('btnans'); if (b) b.click();
      }
    });

    // 指定题号
    var qc = qs.get('q');
    if (qc){
      var t = qs.get('t');
      if (t && ORDER.indexOf(t) >= 0 && (CH.questions[t]||[]).length){
        var i = CH.questions[t].findIndex(function(x){ return x.code === qc; });
        if (i >= 0){ st.type = t; st.idx = i; }
      }
    }
    if (qs.get('r')){
      var chosen = ORDER.filter(function(t){ return (CH.questions[t]||[]).length; });
      st.type = chosen[Math.floor(Math.random() * chosen.length)];
      st.idx = Math.floor(Math.random() * CH.questions[st.type].length);
    }
    if (st.type && !(CH.questions[st.type]||[]).length){
      st.type = ORDER.filter(function(t){ return (CH.questions[t]||[]).length; })[0] || 'mc';
    }
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();