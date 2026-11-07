// 词汇表 / 生词本
(function(){
  var MB = window.MB;
  var G = window.GLOSSARY || {};
  var list = Object.keys(G).map(function(k){ return {w:k, zh:G[k][0], pos:G[k][1], cat:G[k][2]}; });
  var CATNAME = {term:'物理术语', cmd:'题干指令词', common:'常用词', basic:'基础词'};
  var st = {cat:'all', q:'', tab:'all'};

  function esc(s){ return MB.esc(s); }

  function render(){
    var host = document.getElementById('vlist');
    var h = '';
    if (st.tab === 'wb'){
      var keys = Object.keys(MB.store.wb || {});
      if (!keys.length){ host.innerHTML = '<p style="color:#7b8794;font-size:14px">生词本还是空的。做题时点击任意英文单词即可加入。</p>'; return; }
      h = '<div class="wbg">';
      keys.forEach(function(k){
        var g = G[k];
        h += '<div class="wcard"><b>' + esc(k) + '</b><span>' + esc(g ? g[0] : '') + '</span>' +
             '<i>' + esc(g ? g[1] : '') + '</i></div>';
      });
      h += '</div>';
      host.innerHTML = h; return;
    }
    var q = st.q.toLowerCase();
    var arr = list.filter(function(x){
      if (st.cat !== 'all' && x.cat !== st.cat) return false;
      if (!q) return true;
      return x.w.indexOf(q) >= 0 || x.zh.indexOf(st.q) >= 0;
    });
    arr.sort(function(a,b){ return a.w < b.w ? -1 : 1; });
    h = '<div class="vgrid">';
    arr.forEach(function(x){
      h += '<div class="vcard"><div class="vw">' + esc(x.w) + '<i>' + esc(x.pos) + '</i>' +
           '<em>' + esc(CATNAME[x.cat] || '') + '</em></div>' +
           '<div class="vz">' + esc(x.zh) + '</div></div>';
    });
    h += '</div>';
    host.innerHTML = h;
    document.getElementById('vcount').textContent = arr.length + ' 个词条';
  }

  function bind(){
    document.querySelectorAll('.tabs button').forEach(function(b){
      b.addEventListener('click', function(){
        st.tab = b.getAttribute('data-tab');
        document.querySelectorAll('.tabs button').forEach(function(x){ x.classList.remove('on'); });
        b.classList.add('on');
        render();
      });
    });
    document.querySelectorAll('.cfilters button').forEach(function(b){
      b.addEventListener('click', function(){
        st.cat = b.getAttribute('data-cat');
        document.querySelectorAll('.cfilters button').forEach(function(x){ x.classList.remove('on'); });
        b.classList.add('on');
        render();
      });
    });
    document.getElementById('vsearch').addEventListener('input', function(){ st.q = this.value.trim(); render(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ bind(); render(); });
  else { bind(); render(); }
})();