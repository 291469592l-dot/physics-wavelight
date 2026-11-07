// 首页
(function(){
  var MB = window.MB;
  var CH = window.CHAPTERS || [];
  function esc(s){ return MB.esc(s); }

  function progressOf(ch){
    var total = 0, done = 0, ok = 0;
    (ch.codes || []).forEach(function(c){
      total++;
      var r = MB.store.q[c] || {};
      if (r.s === 1){ done++; ok++; }
      else if (r.s === 2){ done++; }
    });
    return {total: total, done: done, ok: ok};
  }

  function render(){
    var host = document.getElementById('grid');
    var h = '';
    var allTotal = 0, allDone = 0, allOk = 0;
    CH.forEach(function(ch){
      var p = progressOf(ch);
      allTotal += p.total; allDone += p.done; allOk += p.ok;
      var pct = p.total ? Math.round(p.done / p.total * 100) : 0;
      h += '<a class="card" href="' + ch.ch + '.html">' +
           '<div class="no">第 ' + parseInt(ch.no, 10) + ' 章 · ' + esc(ch.tag) + '</div>' +
           '<h3>' + esc(ch.cn) + '</h3>' +
           '<div class="sub">' + esc(ch.en) + '</div>' +
           '<div class="meter"><i style="width:' + pct + '%"></i></div>' +
           '<div class="foot"><span>共 ' + p.total + ' 题 · ' + esc(MB.LANGS[ch.lang].name) + '</span>' +
           '<span>' + (p.done ? p.done + ' 题已练' : '未开始') + '</span></div></a>';
    });
    host.innerHTML = h;
    document.getElementById('kpi-total').textContent = allTotal;
    document.getElementById('kpi-done').textContent = allDone;
    document.getElementById('kpi-ok').textContent = allOk;
    var wb = Object.keys(MB.store.wb || {}).length;
    document.getElementById('kpi-wb').textContent = wb;
  }

  function bind(){
    document.querySelectorAll('.seg button[data-lang]').forEach(function(b){
      var cur = MB.setting('lang');
      b.classList.toggle('on', (cur === undefined ? null : parseInt(cur,10)) === parseInt(b.getAttribute('data-lang'),10));
      b.addEventListener('click', function(){
        var v = parseInt(b.getAttribute('data-lang'), 10);
        MB.setting('lang', v);
        document.querySelectorAll('.seg button[data-lang]').forEach(function(x){ x.classList.remove('on'); });
        b.classList.add('on');
        MB.applyLang(v);
      });
    });
    var cur = MB.setting('lang');
    if (cur === undefined){ MB.setting('lang', 1); }
    MB.applyLang(MB.setting('lang'));
    var rb = document.getElementById('random');
    if (rb) rb.addEventListener('click', function(){
      var ch = CH[Math.floor(Math.random() * CH.length)];
      location.href = ch.ch + '.html?r=1';
    });
    var rs = document.getElementById('reset');
    if (rs) rs.addEventListener('click', function(){
      if (!confirm('清空全部练习记录？（收藏和生词本也会清空）')) return;
      localStorage.removeItem('mechbank.v2');
      location.reload();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ render(); bind(); });
  else { render(); bind(); }
})();