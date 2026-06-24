window.onerror=function(msg,src,line){var el=document.getElementById('pipe-status');if(el)el.textContent='> JS ERR line '+line+': '+msg;};
(function(){
// JSON fetch: önce gerçek dosya, yoksa .sample (fresh clone / demo için).
// Örn. fetchJSON('output/latest.json') → latest.json yoksa latest.sample.json döner.
function fetchJSON(path){
  var bust='?t='+Date.now();
  return fetch(path+bust).then(function(r){if(!r.ok)throw 0;return r.json();})
    .catch(function(){return fetch(path.replace(/\.json$/,'.sample.json')+bust).then(function(r){return r.json();});});
}
window.fetchJSON=fetchJSON; // birden fazla IIFE scope'undan erişim için
// BASE = önceki analiz net-değeri (değişim referansı), FIXED = altın+TL nakit tabanı.
// İkisi de canlı veriden (latest.json) güncellenir; aşağıdakiler generik ilk-render fallback'i.
var BASE=700000, FIXED=325000;

function tick(){try{var d=new Date();var c=document.getElementById('clock');if(c)c.textContent=('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)+':'+('0'+d.getSeconds()).slice(-2);var h=document.getElementById('hdr-date');if(h)h.textContent=d.toISOString().split('T')[0];}catch(e){}}
tick();setInterval(tick,1000);

function fmt(n){return Math.round(n).toLocaleString('tr-TR');}
function num(n){return n.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});}

// AGENTS — WALL STREET TRADING FLOOR
var WF=5;
var baseAgents=[
  {n:'RISK DESK',    r:'intake analyst',  s:'#ffcc00',t:'sub'},
  {n:'FLOOR BOSS',   r:'CHIEF TRADER',    s:'#FF8800',t:'orch'},
  {n:'DATA FEED',    r:'quote feeder',    s:'#33CCFF',t:'sub'},
  {n:'COMPLIANCE',   r:'risk check',      s:'#b07be8',t:'sub'},
  {n:'SYNTHESIS',    r:'report desk',     s:'#ff66cc',t:'sub'}
];
var wfNames=['GOLD DESK','TUPRS PIT','ASELS PIT','TECH DESK','MEGA CAP','EUR DESK','FX SPOT','VOL DESK'];
function agentsList(){var a=baseAgents.slice();for(var i=0;i<WF;i++)a.push({n:wfNames[i%wfNames.length],r:'trader',s:'#33FF66',t:'wf'});return a;}

function buildFloor(){
  var A=agentsList(),html='';
  A.forEach(function(a,i){html+='<div class="agent" id="ag-'+i+'" title="'+a.r+'"><span class="ag-dot"></span>'+a.n+'</div>';});
  var fl=document.getElementById('floor');if(fl)fl.innerHTML=html;
  var wn=document.getElementById('wfn');if(wn)wn.textContent=WF;
}
document.getElementById('wf-inc').onclick=function(){WF=Math.min(8,WF+1);buildFloor();};
document.getElementById('wf-dec').onclick=function(){WF=Math.max(1,WF-1);buildFloor();};
buildFloor();

// AGENT BOOST — aktif ajanı vurgula (aşama → ajan index)
function stageAgents(i){var w=[];for(var k=0;k<WF;k++)w.push(5+k);return[[0],[1],[2],[2,3],w,[1,4]][i]||[];}
function boost(list){var A=agentsList();A.forEach(function(a,i){var el=document.getElementById('ag-'+i);if(el)el.classList.remove('boost');});(list||[]).forEach(function(i){var el=document.getElementById('ag-'+i);if(el)el.classList.add('boost');});}

// PIPELINE
var stageMsgs=['GİRDİ — portföy.json okunuyor','BECERİ — orkestrasyon başlatılıyor','BAĞLANTI — canlı fiyat çekiliyor','ALT-AJANLAR — çek & denetle','İŞ-AKIŞI — Nx araştırma paralel','ÇIKTI — rapor üretiliyor'];
var lns=[].slice.call(document.querySelectorAll('#pipe .ln'));
var pstat=document.getElementById('pipe-status');
var pt=[];
function pipeReset(){pt.forEach(clearTimeout);pt=[];lns.forEach(function(l){l.className='ln';l.querySelector('.st').textContent='[··]';});pstat.innerHTML='&gt; beklemede<span class="cur">_</span>';boost([]);}
function pipeRun(){
  pipeReset();
  lns.forEach(function(l,i){
    pt.push(setTimeout(function(){
      if(i>0){lns[i-1].className='ln done';lns[i-1].querySelector('.st').textContent='[OK]';}
      l.className='ln active';l.querySelector('.st').textContent='[>>]';
      var m=(i===4)?('İŞ-AKIŞI — '+WF+'x araştırma paralel'):stageMsgs[i];
      pstat.innerHTML='&gt; '+m+'...<span class="cur">_</span>';
      boost(stageAgents(i));
    },i*820+300));
  });
  pt.push(setTimeout(function(){
    var last=lns[lns.length-1];last.className='ln done';last.querySelector('.st').textContent='[OK]';
    pstat.innerHTML='&gt; pipeline complete → <span style="color:#33ff66">output ready</span><span class="cur">_</span>';
    boost([]);
    // reload output data after pipeline
    fetchJSON('output/latest.json')
      .then(function(d){
        updateDashboard(d);
        pstat.innerHTML='&gt; ✓ data yüklendi · <a href="output/latest.json" target="_blank" style="color:#33ccff;text-decoration:none">latest.json</a><span class="cur">_</span>';
      })
      .catch(function(){pstat.innerHTML='&gt; ✓ pipeline complete — <span style="color:#ff9500">data: output/latest.json mevcut</span><span class="cur">_</span>';});
  },lns.length*820+300));
}
// Hızlı fiyat yenileme (Python, LLM yok) — token harcamaz
function quickRefresh(){
  pstat.innerHTML='&gt; canlı fiyatlar çekiliyor...<span class="cur">_</span>';
  return fetch('/api/refresh',{method:'POST'}).then(function(r){return r.json();}).then(function(d){
    if(d.error){pstat.innerHTML='&gt; <span style="color:#ff4d4d">'+esc2(d.error)+'</span><span class="cur">_</span>';return;}
    window._watchlist=null;
    fetchJSON('output/watchlist.json').then(function(w){window._watchlist=w;}).catch(function(){});
    fetchJSON('output/latest.json').then(function(data){
      updateDashboard(data);
      if(window.loadHistory)window.loadHistory();
      pstat.innerHTML='&gt; ✓ <span style="color:#33ff66">fiyat yenilendi — ₺'+(d.net_worth_try||0).toLocaleString('tr-TR')+' ('+d.fetched+'/'+d.total+')</span><span class="cur">_</span>';
    });
  }).catch(function(){pstat.innerHTML='&gt; <span style="color:#ff9500">backend yok</span><span class="cur">_</span>';});
}

// TAM AI pipeline — server sinyal yazar, açık Claude watcher çalıştırır. Token harcar, ~1-4 dk.
var _pipePolling=null;
function startRealPipeline(){
  pipeRun(); // görsel animasyon
  pstat.innerHTML='&gt; AI analizi isteniyor...<span class="cur">_</span>';
  fetch('/api/run',{method:'POST'})
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.error){pstat.innerHTML='&gt; <span style="color:#ff9500">'+esc2(d.error)+'</span><span class="cur">_</span>';return;}
      if(_pipePolling)clearInterval(_pipePolling);
      var t0=Date.now();
      _pipePolling=setInterval(function(){
        var el=Math.round((Date.now()-t0)/1000);
        fetch('/api/status').then(function(r){return r.json();}).then(function(s){
          if(s.state==='done'||s.state==='error'){
            clearInterval(_pipePolling);
            if(s.state==='done'){
              window._watchlist=null;
              fetchJSON('output/watchlist.json').then(function(w){window._watchlist=w;}).catch(function(){});
              fetchJSON('output/latest.json').then(function(data){
                updateDashboard(data);
                if(window.loadHistory)window.loadHistory();
                pstat.innerHTML='&gt; ✓ <span style="color:#33ff66">'+esc2(s.message)+'</span> · <a href="output/latest.json" target="_blank" style="color:#33ccff;text-decoration:none">JSON</a><span class="cur">_</span>';
              });
            } else { pstat.innerHTML='&gt; <span style="color:#ff4d4d">'+esc2(s.message)+'</span><span class="cur">_</span>'; }
            return;
          }
          // hâlâ bekliyor: watcher ipucu
          var hint=(el>50)?' <span style="color:var(--text3)">(açık Claude session\'ında watcher çalışıyor mu?)</span>':'';
          pstat.innerHTML='&gt; <span style="color:#d29922">'+esc2(s.message||'bekleniyor')+'</span> · '+el+'s'+hint+'<span class="cur">_</span>';
          if(el>360){clearInterval(_pipePolling);pstat.innerHTML='&gt; <span style="color:#ff9500">zaman aşımı — watcher yok mu? Hızlı fiyat için fiyat-yenile kullan</span><span class="cur">_</span>';}
        }).catch(function(){clearInterval(_pipePolling);});
      },2000);
    })
    .catch(function(){pstat.innerHTML='&gt; <span style="color:#ff9500">backend yok — sadece görsel</span><span class="cur">_</span>';});
}
// Buton = TAM AI analizi (sinyal → açık Claude watcher → workflow). UI'dan tetiklenir.
// Önce anında hızlı fiyat yenile (kullanıcı hemen tepki görsün), sonra AI sinyalini gönder.
document.getElementById('pipe-run').onclick=function(){quickRefresh();startRealPipeline();};

// DASHBOARD UPDATE
function updateDashboard(data){
  // canlı referansları veriden güncelle (yoksa fallback'te kalır)
  if(data.prev_net_worth_try)BASE=data.prev_net_worth_try;
  try{var _alt=(data.asset_class_breakdown&&data.asset_class_breakdown['Emtia'])?data.asset_class_breakdown['Emtia'].value:0;
    var _tl=(data.holdings_with_prices||[]).reduce(function(s,h){return s+((h.type==='cash'&&(h.ccy||'TRY').toUpperCase()==='TRY')?(h.value_try||0):0);},0);
    if(_alt)FIXED=_alt+_tl;}catch(e){}
  try{var nw=data.net_worth_try||0;
    var chg=(nw-BASE)/BASE*100;
    var mnv=document.getElementById('ms-net-val');if(mnv)mnv.textContent='₺'+fmt(nw);
    // HERO bandı
    var hn=document.getElementById('hero-net');if(hn)hn.textContent='₺'+fmt(nw);
    var hu=document.getElementById('hero-usd');if(hu)hu.textContent='$'+fmt(data.net_worth_usd||0);
    var hp=document.getElementById('hero-pnl');if(hp){hp.textContent=(chg>=0?'▲ +':'▼ ')+fmt(nw-BASE)+' ₺';hp.style.color=chg>=0?'var(--green)':'var(--red)';}
    var hpp=document.getElementById('hero-pnl-pct');if(hpp){hpp.textContent=(chg>=0?'+':'')+chg.toFixed(2)+'% · önceki analize göre';hpp.style.color=chg>=0?'var(--green)':'var(--red)';}
  }catch(e){}
  // HERO: dağılım + kalite + tarih
  try{var ab=data.asset_class_breakdown||{};
    var e=(ab['Emtia']||{}).percentage||0,n=(ab['Nakit']||{}).percentage||0,h2=(ab['Hisse']||{}).percentage||0;
    var bar=document.getElementById('hero-alloc-bar');
    if(bar)bar.innerHTML='<i style="width:'+e+'%;background:var(--amber)"></i><i style="width:'+n+'%;background:var(--accent)"></i><i style="width:'+h2+'%;background:var(--green)"></i>';
    var he=document.getElementById('hero-emtia');if(he)he.textContent=' '+e.toFixed(0)+'%';
    var hnk=document.getElementById('hero-nakit');if(hnk)hnk.textContent=' '+n.toFixed(0)+'%';
    var hh=document.getElementById('hero-hisse');if(hh)hh.textContent=' '+h2.toFixed(0)+'%';
    var q2=data.quality_report||{};var hq=document.getElementById('hero-quality');
    if(hq)hq.textContent=(q2.successfully_fetched||0)+'/'+(q2.total_holdings||0);
    var ha=document.getElementById('hero-asof');
    if(ha)ha.textContent=(typeof data.timestamp==='string')?data.timestamp.slice(0,10):'—';
  }catch(e){}
  // RİSK ŞERİDİ
  try{var fnd=data.reviewer_findings||[];
    function sv(s){return ({KRITIK:'KRİTİK','KRİTİK':'KRİTİK',ONEMLI:'ÖNEMLİ','ÖNEMLİ':'ÖNEMLİ'})[s]||s;}
    var krit=fnd.filter(function(f){return sv(f.severity)==='KRİTİK';});
    var onem=fnd.filter(function(f){return sv(f.severity)==='ÖNEMLİ';});
    var pill=document.getElementById('risk-pill'),txt=document.getElementById('risk-txt');
    if(pill&&txt){
      if(!fnd.length){pill.className='risk-pill ok';pill.textContent='DENETİM';txt.textContent='AI bulguları bekleniyor (▶ ile analiz çalıştır)';}
      else if(krit.length){pill.className='risk-pill k';pill.textContent=krit.length+' KRİTİK';txt.textContent=(krit[0].issue||'').split(/[.:]/)[0];}
      else if(onem.length){pill.className='risk-pill o';pill.textContent=onem.length+' ÖNEMLİ';txt.textContent=(onem[0].issue||'').split(/[.:]/)[0];}
      else {pill.className='risk-pill ok';pill.textContent='✓ '+fnd.length+' BULGU';txt.textContent='Kritik/önemli risk yok';}
    }
  }catch(e){}
  try{var q=data.quality_report||{};
    var fetched=q.successfully_fetched||0,total=q.total_holdings||0;
    var lu=document.getElementById('last-update');if(lu){try{var ts=data.timestamp?new Date(data.timestamp):new Date();lu.textContent=('0'+ts.getHours()).slice(-2)+':'+('0'+ts.getMinutes()).slice(-2);}catch(e2){lu.textContent=new Date().toTimeString().slice(0,5);}}
  }catch(e){}
  try{
    var SEV_MAP={'KRITIK':'KRİTİK','KRİTİK':'KRİTİK','ONEMLI':'ÖNEMLİ','ÖNEMLİ':'ÖNEMLİ','ONERI':'ÖNERİ','ÖNERİ':'ÖNERİ','BILGI':'BİLGİ','BİLGİ':'BİLGİ'};
    function sevTR(s){return SEV_MAP[s]||s;}
    function sevCls(s){var n=sevTR(s);return n==='KRİTİK'?'alert':(n==='ÖNEMLİ'?'alert warn':'alert info');}
    function sevCol(s){var n=sevTR(s);return n==='KRİTİK'?'#ff4d4d':(n==='ÖNERİ'?'#ff9500':'#33ccff');}
  }catch(e){}
  try{var fxd=data.fx_rates||{usdtry:46.30,eurtry:53.53};
    var lur=document.getElementById('live-usd-rate');if(lur)lur.textContent=num(fxd.usdtry);
    var ler=document.getElementById('live-eur-rate');if(ler)ler.textContent=num(fxd.eurtry);
    // FX senaryo bacakları: her holding'in para birimine (ccy) göre grupla — USD/EUR/diğer(TRY-sabit)
    // (altın/kripto USD-bazlı işlem görür → ccy=USD ile doğru bacağa düşer)
    try{var _hp=data.holdings_with_prices||[];
      var usdLeg=0,eurLeg=0,tryLeg=0;
      for(var _i=0;_i<_hp.length;_i++){var _c=(_hp[_i].ccy||'TRY').toUpperCase(),_vv=_hp[_i].value_try||0;
        if(_c==='USD')usdLeg+=_vv;else if(_c==='EUR')eurLeg+=_vv;else tryLeg+=_vv;}
      if(usdLeg+eurLeg+tryLeg>0)_fxLegs={tryFixed:tryLeg,usdLeg:usdLeg,eurLeg:eurLeg,baseUsd:fxd.usdtry,baseEur:fxd.eurtry};
    }catch(e3){}
    if(typeof buildScenTable==='function')buildScenTable(fxd.usdtry,fxd.eurtry);
    // piyasa paneli başlık/dipnot — canlı kur + analiz tarihi
    var asof='';try{asof=(typeof data.timestamp==='string'&&data.timestamp.length>=10)?data.timestamp.slice(0,10):new Date().toLocaleDateString('en-CA');}catch(e2){}
    var du=document.getElementById('dax-usd');if(du)du.textContent=num(fxd.usdtry);
    var de=document.getElementById('dax-eur');if(de)de.textContent=num(fxd.eurtry);
    var da1=document.getElementById('dax-asof');if(da1)da1.textContent=asof;
    var da2=document.getElementById('dax-asof2');if(da2)da2.textContent=asof;
  }catch(e){}
  // AGENT BULGULARI (bottom p-findings panel — 3-column grid)
  try{var findings=data.reviewer_findings||[];
    var af=document.getElementById('agent-findings');
    var fc=document.getElementById('findings-count');
    if(af){
      if(findings.length===0){af.innerHTML='<div class="alert info" style="font-size:9px;grid-column:1/-1">&#10003; Bulgu yok</div>';}
      else{
        var fh='';
        findings.forEach(function(f,i){
          var col=sevCol(f.severity),lbl=sevTR(f.severity);
          var sevCls2=lbl==='KRİTİK'?'kritik':lbl==='ÖNEMLİ'?'onemli':lbl==='ÖNERİ'?'oneri':'bilgi';
          var txt=f.issue||'';
          // Başlık: iki nokta öncesi veya ilk 72 karakter
          var titleMatch=txt.match(/^([^:：\n]{6,72})[:：]/);
          var title=titleMatch?titleMatch[1].trim():(txt.length>75?txt.substring(0,72).trim()+'…':txt);
          // Detay: başlık çıkarıldıktan sonra kalan metin
          var detail=titleMatch?txt.substring(titleMatch[0].length).trim():txt;
          fh+='<div class="fc '+sevCls2+'" onclick="this.classList.toggle(\'open\')">'
            +'<div class="fc-head">'
            +'<span class="fc-sev" style="color:'+col+'">'+lbl+'</span>'
            +'<span class="fc-title">'+esc2(title)+'</span>'
            +(detail?'<span class="fc-arrow">&#9654;</span>':'')
            +'</div>'
            +(detail?'<div class="fc-body"><div class="fc-body-inner">'+esc2(detail)+'</div></div>':'')
            +'</div>';
        });
        af.innerHTML=fh;
      }
    }
    if(fc){
      var critN=findings.filter(function(f){return sevTR(f.severity)==='KRİTİK';}).length;
      var warnN=findings.filter(function(f){return sevTR(f.severity)==='ÖNEMLİ';}).length;
      var badge=findings.length?('· '+findings.length+' bulgu'+(critN?' · '+critN+' kritik':'')):'';
      fc.textContent=badge;
      fc.style.color=critN?'var(--red)':(warnN?'var(--amber)':'var(--text2)');
    }
    var rpst=document.getElementById('rp-status');
    if(rpst&&data.timestamp){try{var ts2=new Date(data.timestamp);rpst.innerHTML='<span style="font-size:8px">Son analiz: '+('0'+ts2.getHours()).slice(-2)+':'+('0'+ts2.getMinutes()).slice(-2)+' · '+findings.length+' bulgu</span>';}catch(e2){}}
  }catch(e){}
  try{var rc=document.getElementById('row-count');if(rc)rc.textContent=(data.holdings_with_prices||[]).length+' varlık';}catch(e){}

  // WATCHLIST + TICKER + ALL PANELS live update from pipeline data
  try{
    var hp=data.holdings_with_prices||[],fx=data.fx_rates||{};
    var nwv=data.net_worth_try||885000;
    function byId(arr,id){for(var i=0;i<arr.length;i++)if(arr[i].id===id)return arr[i];return null;}

    // F7 İZLEME LİSTESİ (#wl-rows) — portföy holdings + FX referansları, canlı (kişisel id varsaymaz)
    var wlBox=document.getElementById('wl-rows');
    if(wlBox){
      var wlH=hp.map(function(h){
        var pr=(h.price_try!=null?'₺'+num(h.price_try):(h.price!=null?num(h.price):'—'));
        return '<div class="wl-row"><span class="wl-ticker">'+esc2(h.name||h.id)+'</span><span class="wl-price">'+pr+'</span><span class="wl-chg">—</span></div>';
      }).join('');
      if(fx.usdtry)wlH+='<div class="wl-row"><span class="wl-ticker">USD/TRY</span><span class="wl-price">'+num(fx.usdtry)+'</span><span class="wl-chg">—</span></div>';
      if(fx.eurtry)wlH+='<div class="wl-row"><span class="wl-ticker">EUR/TRY</span><span class="wl-price">'+num(fx.eurtry)+'</span><span class="wl-chg">—</span></div>';
      wlBox.innerHTML=wlH;
    }

    var nwEl=document.getElementById('wl-net'),nwcEl=document.getElementById('wl-net-c');
    if(nwEl)nwEl.textContent='₺'+fmt(nwv);
    var chgPct=((nwv-BASE)/BASE*100);
    if(nwcEl){nwcEl.textContent=(chgPct>=0?'+':'')+chgPct.toFixed(1)+'%';nwcEl.className='wl-chg'+(chgPct<0?' dn':'');}

    // KAYAN TICKER (#ticker-track) — hisse/kripto/emtia holdings + FX referansları, canlı
    try{var _trk=document.getElementById('ticker-track');
      if(_trk){
        var _ti=hp.filter(function(h){return h.type==='equity'||h.type==='crypto'||h.type==='commodity';}).map(function(h){
          var cur=(h.ccy==='USD'?'$':(h.ccy==='EUR'?'€':'')),pr=(h.price!=null?num(h.price):(h.price_try!=null?num(h.price_try):'—'));
          return '<div class="ticker-item"><span class="sym">'+esc2(h.id)+'</span> <span class="val">'+cur+pr+'</span></div>';
        });
        if(fx.usdtry)_ti.push('<div class="ticker-item"><span class="sym">USD/TRY</span> <span class="val">'+num(fx.usdtry)+'</span></div>');
        if(fx.eurtry)_ti.push('<div class="ticker-item"><span class="sym">EUR/TRY</span> <span class="val">'+num(fx.eurtry)+'</span></div>');
        var _tj=_ti.join('');
        if(_tj)_trk.innerHTML=_tj+_tj; // kesintisiz kayma için iki kopya
      }
    }catch(e4){}

    // POZİSYONLAR tablosu (#holdings-rows) — hp dizisinden canlı doldur
    var hb=document.getElementById('holdings-rows');
    if(hb){
      var clsMap={commodity:'Emtia',cash:'Nakit',equity:'Hisse',crypto:'Kripto'};
      var rows=hp.map(function(h){
        var price=(h.price_try!=null?'₺'+num(h.price_try):(h.price!=null?num(h.price):'—'));
        var val=h.value_try||0;
        var wt=nwv?(val/nwv*100).toFixed(1):'0.0';
        var qty=(h.quantity!=null?num(h.quantity):(h.amount!=null?num(h.amount):'—'));
        return '<tr><td>'+esc2(h.name||h.id)+'</td><td style="text-align:right">'+qty+'</td><td style="text-align:right">'+price+'</td><td style="text-align:right">₺'+fmt(val)+'</td><td style="text-align:right">'+wt+'%</td><td style="text-align:right">'+esc2(clsMap[h.type]||h.type||'—')+'</td></tr>';
      }).join('');
      hb.innerHTML=rows||'<tr><td colspan="6" style="color:var(--text3);font-size:9px;padding:6px">Veri yok</td></tr>';
    }

    // F7 PİYASA TAKİP: portföy holdings (★) + izleme listesi, canlı
    if(typeof renderMarketWatch==='function')renderMarketWatch(data);

    function rp(id,v){var el=document.getElementById(id);if(el&&v!==undefined)el.textContent=v;}

    // F5 SENARYO: tablo + projeksiyon, hepsi canlı fiyat × senaryo çarpanı (tek kaynak)
    try{
      // Hisse/kripto için tek-tip bear/base/bull şoku (generic; tek hisseye özel analist hedefi varsaymaz)
      var SCEN_M=[0.85,1.08,1.30];
      var scenH=hp.filter(function(h){return h.type==='equity'||h.type==='crypto';});
      var tbl=document.getElementById('scen-rows-tbl');
      var staticV=nwv, projB=0,projBa=0,projBu=0;
      var rowsH='';
      scenH.forEach(function(h){
        var p=(h.price!=null?h.price:h.price_try); if(!p)return;
        var v=h.value_try||0;
        staticV-=v; // hisse/kripto-dışı (altın+nakit) sabit kalan
        projB+=v*SCEN_M[0]; projBa+=v*SCEN_M[1]; projBu+=v*SCEN_M[2];
        var cur=(h.ccy==='USD'?'$':(h.ccy==='EUR'?'€':''));
        function cell(mult,c){var pr=p*mult,pct=Math.round((mult-1)*100);return '<td style="text-align:right;color:'+c+'">'+cur+num(pr)+' <span style="font-size:8px">'+(pct>=0?'+':'')+pct+'%</span></td>';}
        rowsH+='<tr><td>'+esc2(h.name||h.id)+'</td>'
          +'<td style="text-align:right">'+cur+num(p)+'</td>'
          +cell(SCEN_M[0],'var(--red)')+cell(SCEN_M[1],'var(--amber)')+cell(SCEN_M[2],'var(--green)')+'</tr>';
      });
      if(tbl)tbl.innerHTML=rowsH||'<tr><td colspan="5" style="color:var(--text3);font-size:9px;padding:6px">Hisse/kripto pozisyonu yok</td></tr>';
      var bear=Math.round(staticV+projB),base=Math.round(staticV+projBa),bull=Math.round(staticV+projBu);
      var fmtK=function(v){return v>=1000000?'₺'+(v/1000000).toFixed(2)+'M':'₺'+fmt(v);};
      rp('scen-nw','~₺'+fmt(nwv));
      rp('scen-proj-bear',fmtK(bear));
      rp('scen-proj-bear-pct',(((bear-nwv)/nwv)*100).toFixed(1)+'%');
      rp('scen-proj-base',fmtK(base));
      rp('scen-proj-base-pct','+'+((base-nwv)/nwv*100).toFixed(1)+'%');
      rp('scen-proj-bull',fmtK(bull));
      rp('scen-proj-bull-pct','+'+((bull-nwv)/nwv*100).toFixed(1)+'%');
    }catch(e2){}

    // F6 DAĞILIM: allocation bars + döviz tablosu
    try{
      var acb=data.asset_class_breakdown||{};
      var ePct=(acb['Emtia']||{}).percentage||0;
      var nPct=(acb['Nakit']||{}).percentage||0;
      var hPct=(acb['Hisse']||{}).percentage||0;
      var eBar=document.getElementById('alloc-emtia-bar');if(eBar)eBar.style.width=ePct+'%';
      rp('alloc-emtia-pct',ePct.toFixed(1)+'%');
      var nBar=document.getElementById('alloc-nakit-bar');if(nBar)nBar.style.width=nPct+'%';
      rp('alloc-nakit-pct',nPct.toFixed(1)+'%');
      var hBar=document.getElementById('alloc-hisse-bar');if(hBar)hBar.style.width=hPct+'%';
      rp('alloc-hisse-pct',hPct.toFixed(1)+'%');
      // Döviz dağılımı satırları
      var usdEquityV=(nvdaH?nvdaH.value_try:0)+(googlH?googlH.value_try:0)+(usdH?usdH.value_try:0);
      var eurEquityV=(mbgH?mbgH.value_try:0)+(eurH?eurH.value_try:0);
      var tryTotalV=nwv-usdEquityV-eurEquityV;
      rp('alloc-try-val','₺'+fmt(Math.round(tryTotalV)));
      rp('alloc-try-pct',(tryTotalV/nwv*100).toFixed(1)+'%');
      rp('alloc-usd-amt','$'+(usdH?num(usdH.amount||0):'1.122,50'));
      rp('alloc-usd-try','₺'+fmt(Math.round(usdEquityV)));
      rp('alloc-usd-pct',(usdEquityV/nwv*100).toFixed(1)+'%');
      rp('alloc-eur-amt','€'+(eurH&&eurH.amount?num(eurH.amount):'0'));
      rp('alloc-eur-try','₺'+fmt(Math.round(eurEquityV)));
      rp('alloc-eur-pct',(eurEquityV/nwv*100).toFixed(1)+'%');
      rp('alloc-total','₺'+fmt(Math.round(nwv)));
      var warnEl=document.getElementById('alloc-warn');
      if(warnEl)warnEl.textContent='Tek-varlık riski: Altın %'+ePct.toFixed(1)+' — çeşitlendirme düşük';
      // SAĞ PANEL görsel mirror (rp2-*) — varlık sınıfı + döviz maruziyeti
      function setBar(id,pct,col){var b=document.getElementById(id+'-bar');if(b)b.style.width=Math.max(0,pct)+'%';var p=document.getElementById(id+'-pct');if(p)p.textContent=pct.toFixed(1)+'%';}
      setBar('rp2-emtia',ePct);setBar('rp2-nakit',nPct);setBar('rp2-hisse',hPct);
      var tryPct=tryTotalV/nwv*100,usdPct=usdEquityV/nwv*100,eurPct=eurEquityV/nwv*100;
      setBar('rp2-try',tryPct);setBar('rp2-usd',usdPct);setBar('rp2-eur',eurPct);
    }catch(e2){}
  }catch(e){}
}

// AUTO-REFRESH: pipeline her 5 dakikada bir otomatik çalışır
var AUTO_INTERVAL = 5 * 60; // saniye
var _autoSec = AUTO_INTERVAL;
var _autoRunning = false;
function _autoTick(){
  var cd = document.getElementById('auto-cd');
  var badge = document.getElementById('auto-badge');
  if(_autoRunning){
    if(cd) cd.textContent = '···';
    if(badge) badge.style.color = '#ff9500';
    return;
  }
  _autoSec--;
  if(_autoSec <= 0){
    _autoSec = AUTO_INTERVAL;
    _autoRunning = true;
    if(badge) badge.style.color = '#ff9500';
    if(cd) cd.textContent = '···';
    // canlı fiyat yenile (LLM yok)
    fetch('/api/refresh',{method:'POST'})
      .then(function(r){return r.json();})
      .then(function(){
        _autoRunning=false;
        if(badge) badge.style.color = '#5a6a7a';
        window._watchlist=null;
        fetchJSON('output/watchlist.json').then(function(w){window._watchlist=w;}).catch(function(){});
        fetchJSON('output/latest.json').then(function(d){if(d&&d.net_worth_try)updateDashboard(d);}).catch(function(){});
      })
      .catch(function(){_autoRunning=false;if(badge)badge.style.color='#5a6a7a';});
    return;
  }
  var m = Math.floor(_autoSec/60), s2 = _autoSec%60;
  if(cd) cd.textContent = m+':'+(s2<10?'0':'')+s2;
  if(badge) badge.style.color = _autoSec < 30 ? '#ff9500' : '#5a6a7a';
}
setInterval(_autoTick, 1000);

// ── PİYASA TAKİP (F7) — portföy + izleme listesi, canlı ──────────────────
// portföy holdings → piyasa eşlemesi (sembol, market, not)
var MW_PORT={
  TUPRS:{mkt:'BIST',  note:'portföyde · 100 lot'},
  ASELS:{mkt:'BIST',  note:'portföyde · 50 lot'},
  NVDA: {mkt:'NASDAQ',note:'portföyde · 5 adet · AI çipi'},
  GOOGL:{mkt:'NASDAQ',note:'portföyde · 2,5 adet · arama+AI'},
  MBG:  {mkt:'XETRA', note:'portföyde · 5 adet · EV geçiş'}
};
var MKT_CCY={BIST:'',NASDAQ:'$',XETRA:'€'};
function mwRow(sym,star,price,ccy,chg,note){
  var up=(chg==null)?null:(chg>=0);
  var arrow=(chg==null)?'▲':(up?'▲':'▼');
  var chgTxt=(chg==null)?'':(up?'+':'')+chg.toFixed(1).replace('.',',')+'%';
  var col=(chg==null)?'var(--green)':(up?'var(--green)':'var(--red)');
  var pStr=(price==null)?'<span style="color:var(--text3)">—</span>':ccy+num(price);
  return '<tr><td style="'+(star?'color:var(--accent);font-weight:600':'')+'">'+esc2(sym)+(star?' ★':'')+'</td>'
    +'<td style="text-align:right;color:'+col+'">'+pStr+'</td>'
    +'<td style="text-align:right;color:'+col+'">'+arrow+' '+chgTxt+'</td>'
    +'<td style="font-size:9px;color:var(--text3)">'+esc2(note||'')+'</td></tr>';
}
function renderMarketWatch(data){
  try{
    var hp=(data&&data.holdings_with_prices)||[];
    function byId(id){for(var i=0;i<hp.length;i++)if(hp[i].id===id)return hp[i];return null;}
    var buckets={BIST:'',NASDAQ:'',XETRA:''};
    // 1) portföy holdings (★) — canlı fiyat latest.json'dan
    Object.keys(MW_PORT).forEach(function(id){
      var h=byId(id),m=MW_PORT[id];if(!h)return;
      buckets[m.mkt]+=mwRow(id,true,h.price!=null?h.price:null,MKT_CCY[m.mkt],null,m.note);
    });
    // 2) izleme listesi (watchlist.json)
    if(window._watchlist&&window._watchlist.items){window._watchlist.items.forEach(function(w){
      var mk=w.market||w.mkt;
      if(buckets[mk]===undefined)return;
      buckets[mk]+=mwRow(w.sym,false,w.price,MKT_CCY[mk],(typeof w.chg_pct==='number'?w.chg_pct:null),w.note||'');
    });}
    var b1=document.getElementById('mw-bist'),b2=document.getElementById('mw-nasdaq'),b3=document.getElementById('mw-xetra');
    if(b1&&buckets.BIST)b1.innerHTML=buckets.BIST;
    if(b2&&buckets.NASDAQ)b2.innerHTML=buckets.NASDAQ;
    if(b3&&buckets.XETRA)b3.innerHTML=buckets.XETRA;
  }catch(e){}
}
// watchlist.json'u bir kez çek (yoksa .sample), gelince paneli tazele
fetchJSON('output/watchlist.json').then(function(d){
  window._watchlist=d;
  fetchJSON('output/latest.json').then(function(ld){renderMarketWatch(ld);}).catch(function(){renderMarketWatch({});});
}).catch(function(){});

// ── ANALİZ RAPORLARI (F9) ──────────────────────────────────────────────
var KIND_LBL={research:'ARAŞTIRMA',valuation:'DEĞERLEME',model:'MODEL',earnings:'KAZANÇ',net:'NET-DEĞER',portfolio:'SNAPSHOT',yearend:'YIL-SONU',de:'WATCHLIST'};
function esc2(s){return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function escAttr(s){return esc2(s).replace(/"/g,'&quot;');}
function fmtTime(ts){try{var d=new Date(ts*1000);return ('0'+d.getDate()).slice(-2)+'.'+('0'+(d.getMonth()+1)).slice(-2)+' '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);}catch(e){return '';}}
// kompakt markdown → html
function mdToHtml(md){
  var lines=md.split('\n'),out=[],i=0;
  function inline(t){return esc2(t).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/`(.+?)`/g,'<code>$1</code>');}
  while(i<lines.length){
    var l=lines[i];
    if(/^#{1,6}\s/.test(l)){var lv=l.match(/^#+/)[0].length;out.push('<h'+lv+'>'+inline(l.replace(/^#+\s*/,''))+'</h'+lv+'>');i++;continue;}
    if(/^\|/.test(l)){ // tablo
      var rows=[];while(i<lines.length&&/^\|/.test(lines[i])){rows.push(lines[i]);i++;}
      var html='<table>';rows.forEach(function(r,ri){
        if(/^\|[\s:|-]+\|?$/.test(r))return; // ayraç satırı
        var cells=r.split('|').slice(1,-1);var tag=(ri===0)?'th':'td';
        html+='<tr>'+cells.map(function(c){return '<'+tag+'>'+inline(c.trim())+'</'+tag+'>';}).join('')+'</tr>';
      });html+='</table>';out.push(html);continue;}
    if(/^[-*]\s/.test(l)){var items=[];while(i<lines.length&&/^[-*]\s/.test(lines[i])){items.push('<li>'+inline(lines[i].replace(/^[-*]\s/,''))+'</li>');i++;}out.push('<ul>'+items.join('')+'</ul>');continue;}
    if(l.trim()==='' ){i++;continue;}
    if(/^---+$/.test(l.trim())){i++;continue;}
    out.push('<p>'+inline(l)+'</p>');i++;
  }
  return out.join('');
}
var _reportsLoaded=false;
function loadReports(){
  var list=document.getElementById('reports-list'),cnt=document.getElementById('reports-count');
  if(!list)return;
  fetch('/api/reports').then(function(r){return r.json();}).then(function(d){
    var reps=(d.reports||[]);
    if(cnt)cnt.textContent='· '+reps.length+' rapor';
    if(!reps.length){list.innerHTML='<div class="alert info" style="font-size:9px;margin:6px">Henüz rapor yok. Bir skill çalıştır (ör. "NVDA araştır").</div>';return;}
    list.innerHTML=reps.map(function(r,idx){
      var k=KIND_LBL[r.kind]?r.kind:'net';
      return '<div class="rp-item" data-file="'+esc2(r.file)+'" data-idx="'+idx+'">'
        +'<span class="rp-kind '+k+'">'+(KIND_LBL[r.kind]||r.kind)+'</span>'
        +'<div class="rp-title">'+esc2(r.title)+'</div>'
        +'<div class="rp-meta">'+esc2(r.file)+' · '+fmtTime(r.mtime)+'</div></div>';
    }).join('');
    [].slice.call(list.querySelectorAll('.rp-item')).forEach(function(el){
      el.onclick=function(){
        [].slice.call(list.querySelectorAll('.rp-item')).forEach(function(x){x.classList.remove('sel');});
        el.classList.add('sel');openReport(el.getAttribute('data-file'));
      };
    });
    // ilk raporu otomatik aç
    var first=list.querySelector('.rp-item');if(first){first.classList.add('sel');openReport(first.getAttribute('data-file'));}
  }).catch(function(){list.innerHTML='<div class="alert warn" style="font-size:9px;margin:6px">Server yok — raporlar için ./start.sh ile başlat.</div>';});
}
function openReport(file){
  var view=document.getElementById('reports-view');if(!view)return;
  view.innerHTML='<div style="color:var(--text3);font-size:9px">Yükleniyor…</div>';
  fetch('output/'+encodeURIComponent(file)+'?t='+Date.now()).then(function(r){return r.text();}).then(function(t){
    view.innerHTML='<div class="md-body">'+mdToHtml(t)+'</div>';
  }).catch(function(){view.innerHTML='<div class="alert warn" style="font-size:9px">Rapor okunamadı: '+esc2(file)+'</div>';});
}
(function(){
  var btn=document.getElementById('reports-refresh');if(btn)btn.onclick=loadReports;
  // F9'a ilk tıklayışta yükle + periyodik tazele
  var f9=document.querySelector('.fkey[data-tgt="p-reports"]');
  if(f9)f9.addEventListener('click',function(){if(!_reportsLoaded){_reportsLoaded=true;loadReports();}});
  // sayfa açılışında bir kez dene (server varsa dolu gelir)
  setTimeout(loadReports,1500);
})();

// ── NET-DEĞER GEÇMİŞİ + TOKEN (F10) ──────────────────────────────────────
function loadHistory(){
  fetchJSON('output/history.json').then(function(h){
    var daily=(h.daily||[]).slice(), runs=h.runs||{pipeline_count:0,tokens:0,last:null};
    var hc=document.getElementById('hist-count');if(hc)hc.textContent='· '+daily.length+' gün';
    // KPI: güncel + dönem
    if(daily.length){
      var first=daily[0], last=daily[daily.length-1], prev=daily.length>1?daily[daily.length-2]:first;
      var cur=document.getElementById('hist-cur');if(cur)cur.textContent='₺'+fmt(last.net_worth_try);
      var dch=last.net_worth_try-prev.net_worth_try, dpct=prev.net_worth_try?dch/prev.net_worth_try*100:0;
      var cc=document.getElementById('hist-cur-chg');if(cc){cc.textContent=(dch>=0?'▲+':'▼')+fmt(Math.abs(dch))+' ('+(dch>=0?'+':'')+dpct.toFixed(1)+'%)';cc.style.color=dch>=0?'var(--green)':'var(--red)';}
      var rdiff=last.net_worth_try-first.net_worth_try, rpct=first.net_worth_try?rdiff/first.net_worth_try*100:0;
      var rg=document.getElementById('hist-range');if(rg){rg.textContent=(rdiff>=0?'+':'')+fmt(rdiff);rg.style.color=rdiff>=0?'var(--green)':'var(--red)';}
      var rd=document.getElementById('hist-range-days');if(rd)rd.textContent=(rdiff>=0?'+':'')+rpct.toFixed(1)+'% · '+daily.length+' gün';
      // HERO dönem kartı
      var hpd=document.getElementById('hero-period');if(hpd){hpd.textContent=(rdiff>=0?'+':'')+fmt(rdiff)+' ₺';hpd.style.color=rdiff>=0?'var(--green)':'var(--red)';}
      var hps=document.getElementById('hero-period-sub');if(hps)hps.textContent=(rdiff>=0?'+':'')+rpct.toFixed(1)+'% · '+daily.length+' gün';
      var x0=document.getElementById('hist-x0');if(x0)x0.textContent=first.date;
      var x1=document.getElementById('hist-x1');if(x1)x1.textContent=last.date;
      drawSparkline('hist-spark',daily,320,90,true);
      drawSparkline('hero-spark',daily,170,30,false); // hero mini trend
    }
    // tablo
    var tb=document.getElementById('hist-rows');
    if(tb){
      if(!daily.length){tb.innerHTML='<tr><td colspan="5" style="color:var(--text3);font-size:9px;padding:6px">Henüz geçmiş yok</td></tr>';}
      else{
        var rows='';
        for(var i=daily.length-1;i>=0;i--){
          var d=daily[i], pv=i>0?daily[i-1].net_worth_try:d.net_worth_try, dd=d.net_worth_try-pv;
          var col=dd>0?'var(--green)':(dd<0?'var(--red)':'var(--text3)');
          rows+='<tr><td>'+d.date+'</td><td style="text-align:right">₺'+fmt(d.net_worth_try)+'</td>'
            +'<td style="text-align:right;color:var(--text2)">$'+fmt(d.net_worth_usd||0)+'</td>'
            +'<td style="text-align:right;color:'+col+'">'+(i===0?'—':(dd>=0?'+':'')+fmt(dd))+'</td>'
            +'<td style="text-align:right;color:var(--text3);font-size:8px">'+(d.source||'')+'</td></tr>';
        }
        tb.innerHTML=rows;
      }
    }
    // token
    var tr=document.getElementById('tok-runs');if(tr)tr.textContent=runs.pipeline_count||0;
    var tt=document.getElementById('tok-total');if(tt)tt.textContent=(runs.tokens||0).toLocaleString('tr-TR');
    var ta=document.getElementById('tok-avg');if(ta)ta.textContent=runs.pipeline_count?Math.round(runs.tokens/runs.pipeline_count).toLocaleString('tr-TR'):'—';
    var tl=document.getElementById('tok-last');if(tl)tl.textContent='Son analiz: '+(runs.last?String(runs.last).slice(0,16).replace('T',' '):'—');
    // üst-bar token rozeti (her zaman görünür)
    var tk=runs.tokens||0;
    var tkStr=tk>=1000000?(tk/1000000).toFixed(2)+'M':tk>=1000?Math.round(tk/1000)+'K':String(tk);
    var bv=document.getElementById('tok-badge-val');if(bv)bv.textContent=tkStr+' token';
    var br=document.getElementById('tok-badge-runs');if(br)br.textContent=runs.pipeline_count||0;
  }).catch(function(){});
}
function drawSparkline(svgId,daily,W,H,dots){
  var svg=document.getElementById(svgId);if(!svg||!daily.length)return;
  var pad=dots?6:3;
  var vals=daily.map(function(d){return d.net_worth_try;});
  var mn=Math.min.apply(null,vals), mx=Math.max.apply(null,vals), rng=(mx-mn)||1;
  function X(i){return daily.length<2?W/2:pad+i*(W-2*pad)/(daily.length-1);}
  function Y(v){return H-pad-((v-mn)/rng)*(H-2*pad);}
  var pts=daily.map(function(d,i){return X(i)+','+Y(d.net_worth_try);}).join(' ');
  var up=vals[vals.length-1]>=vals[0], col=up?'#3fb950':'#f85149';
  var area='M'+pad+','+(H-pad)+' L'+daily.map(function(d,i){return X(i)+','+Y(d.net_worth_try);}).join(' L')+' L'+X(daily.length-1)+','+(H-pad)+' Z';
  var dotsH=dots?daily.map(function(d,i){return '<circle cx="'+X(i)+'" cy="'+Y(d.net_worth_try)+'" r="2.5" fill="'+col+'"/>';}).join(''):'';
  svg.innerHTML='<path d="'+area+'" fill="'+col+'" opacity="0.12"/>'
    +'<polyline points="'+pts+'" fill="none" stroke="'+col+'" stroke-width="'+(dots?2:1.5)+'"/>'+dotsH;
}
window.loadHistory=loadHistory; // diğer scope'lardan (fiyat-yenile/pipeline) erişim
(function(){var tb=document.getElementById('tok-badge');if(tb)tb.onclick=function(){if(typeof jumpTo==='function')jumpTo('p-history');loadHistory();};})();
(function(){
  var btn=document.getElementById('hist-refresh');if(btn)btn.onclick=loadHistory;
  var f10=document.querySelector('.fkey[data-tgt="p-history"]');
  if(f10)f10.addEventListener('click',loadHistory);
  setTimeout(loadHistory,1600);
})();

// FX CALCULATOR
// FX senaryo bacakları (updateDashboard canlı veriyle günceller; ilk-render fallback'i latest.json değerleri)
var _fxLegs={tryFixed:142450,usdLeg:660800,eurLeg:0,baseUsd:46.00,baseEur:53.00};
// senaryo çarpanları: baz kura göre −%10 / −%5 / baz / +%10 / +%20 / +%30
var SCEN_MULT=[-0.10,-0.05,0,0.10,0.20,0.30];

function buildScenTable(baseUsd,baseEur){
  var L=_fxLegs;
  baseUsd=baseUsd||L.baseUsd;baseEur=baseEur||L.baseEur;
  var baselineNet=L.tryFixed+L.usdLeg+L.eurLeg; // baz kurda net-değer
  var tbody=document.getElementById('scen-rows');
  if(!tbody)return;
  tbody.innerHTML='';
  SCEN_MULT.forEach(function(m){
    var u=baseUsd*(1+m);
    // EUR/TRY de aynı oranda hareket eder varsayımı (TL geneli zayıflar/güçlenir)
    var net=L.tryFixed+L.usdLeg*(1+m)+L.eurLeg*(1+m);
    var d=net-baselineNet;
    var isBase=(m===0);
    var col=d>500?'#33ff66':(d<-500?'#ff4d4d':'#7a8fa3');
    var diffTxt=isBase?'BAZ':(d>=0?'+':'')+Math.round(d/1000)+'K';
    var tr=document.createElement('tr');
    if(isBase)tr.style.background='#1a2847';
    tr.onmouseenter=function(){if(!isBase)this.style.background='#0d1933';};
    tr.onmouseleave=function(){this.style.background=isBase?'#1a2847':'transparent';};
    tr.innerHTML='<td style="padding:3px 4px;color:'+(isBase?'#e0e0e0':'#7a9ab0')+';font-weight:'+(isBase?'600':'400')+'">'+num(u)+(isBase?' ★':'')+'</td>'
      +'<td style="text-align:right;padding:3px 2px;color:'+(isBase?'#33ff66':'#7a9ab0')+'">₺'+Math.round(net/1000)+'K</td>'
      +'<td style="text-align:right;padding:3px 4px 3px 2px;color:'+(isBase?'#7a8fa3':col)+'">'+diffTxt+'</td>';
    tbody.appendChild(tr);
  });
}

buildScenTable();

// MARKET STATUS BAR
(function(){
  var mktData=[
    {dot:'md-bist', lbl:'ms-bist', oh:9,om:30, ch:17, cm:30, tz:3, label:'09:30-17:30 TRT'},
    {dot:'md-nyse', lbl:'ms-nyse', oh:9,om:30, ch:16, cm:0,  tz:-4, label:'09:30-16:00 ET'},
    {dot:'md-xetra',lbl:'ms-xetra',oh:9,om:0,  ch:17, cm:30, tz:2,  label:'09:00-17:30 CET'},
    {dot:'md-xau',  lbl:'ms-xau', oh:0,om:0,  ch:23, cm:59, tz:0,  label:'24s · Spot'}
  ];
  function isOpen(m){
    var utcNow=new Date();
    var localMin=utcNow.getUTCHours()*60+utcNow.getUTCMinutes()+m.tz*60;
    var day=utcNow.getUTCDay();
    if(day===0||day===6)return m.label==='24s · Spot'?true:false;
    var oMin=m.oh*60+m.om, cMin=m.ch*60+m.cm;
    return localMin>=oMin&&localMin<=cMin;
  }
  function updateMktBar(){
    mktData.forEach(function(m){
      var dot=document.getElementById(m.dot),lbl=document.getElementById(m.lbl);
      if(!dot||!lbl)return;
      var open=isOpen(m);
      dot.className='mkt-dot '+(open?'open':'closed');
      lbl.textContent=open?'● AÇIK · '+m.label:'○ KAPALI · '+m.label;
      lbl.style.color=open?'#33ff66':'#5a5a52';
    });
  }
  updateMktBar();
  setInterval(updateMktBar,60000);
})();

// SINGLE-PAGE MODE — tüm paneller görünür, F-tuşları scroll-to
function jumpTo(id){
  var el=document.getElementById(id);
  if(!el)return;
  el.scrollIntoView({behavior:'smooth',block:'start'});
  el.style.outline='1px solid var(--accent)';
  setTimeout(function(){el.style.outline='';},700);
}
// risk şeridi → bulgular paneline git + yükle
(function(){var rb=document.getElementById('risk-ribbon');if(rb)rb.onclick=function(){jumpTo('p-findings');};})();
var allPanelKeys={F2:'p-posn',F3:'p-news',F4:'p-bench',F5:'p-scen',F6:'p-alloc',F7:'p-dax',F8:'p-findings',F9:'p-reports',F10:'p-history',F11:'p-rebalance',F12:'p-cli'};
[].slice.call(document.querySelectorAll('.fkey')).forEach(function(k){
  k.onclick=function(){
    var tgt=k.getAttribute('data-tgt');
    if(tgt)jumpTo(tgt);
    [].slice.call(document.querySelectorAll('.fkey')).forEach(function(f){f.classList.remove('active');});
    k.classList.add('active');
    setTimeout(function(){k.classList.remove('active');},700);
  };
});
document.addEventListener('keydown',function(e){
  var id=allPanelKeys[e.key];
  if(id){e.preventDefault();jumpTo(id);}
});

// MINI CLI
(function(){
  var co=document.getElementById('cli-out'),cc=document.getElementById('cli-cmd'),ct=document.getElementById('cli-term');
  if(!cc)return;
  var hist=[],hi=-1;
  function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function cl(html,color){var d=document.createElement('div');if(color)d.style.color=color;d.innerHTML=html;co.appendChild(d);}
  var CMDS={
    help:function(){cl('Komutlar:','#ff9500');cl('&nbsp;&nbsp;ls · pwd · whoami · date · skills · cat CLAUDE.md · portfolio · clear');},
    ls:function(){cl('<span style="color:#33ccff">.claude/</span>&nbsp;&nbsp;<span style="color:#33ccff">data/</span>&nbsp;&nbsp;<span style="color:#33ccff">output/</span>&nbsp;&nbsp;finops-terminal-ultimate.html&nbsp;&nbsp;CLAUDE.md');},
    pwd:function(){cl('/home/user/claude-finops');},
    whoami:function(){cl('user');},
    date:function(){cl(new Date().toString());},
    skills:function(){cl('finops-agent · earnings-reviewer · market-researcher · valuation-reviewer · model-builder','#33ff66');cl('statement-auditor · gl-reconciler · month-end-closer · kyc-screener · pitch-builder · meeting-preparer','#fac775');},
    portfolio:function(){cl('Net Worth: &#8378;700.000 | $15.217','#33ff66');cl('Altin: 50g | USD: $1.000 | TL: &#8378;100.000 | NVDA: 4 | GOOGL: 2 | TUPRS: 100lot | ASELS: 50lot | MBG: 5','#7a8fa3');},
    cat:function(arg){if(arg==='CLAUDE.md'){cl('# claude-finops — FinOps Agent Lab','#ff9500');cl('Skill + Connector + Subagent sandbox.');}else{cl('cat: '+esc(arg||'')+': dosya bulunamadi','#ff4d4d');}},
    clear:function(){co.innerHTML='';}
  };
  function cliRun(raw){var t=raw.trim();cl('<span style="color:#33ff66">&#10148;</span> <span style="color:#33ccff">~/claude-finops</span> '+esc(t));if(!t)return;hist.push(t);hi=hist.length;var parts=t.split(/\s+/),c=parts[0],arg=parts.slice(1).join(' ');if(CMDS[c])CMDS[c](arg);else cl('zsh: command not found: '+esc(c),'#ff4d4d');if(ct)ct.scrollTop=ct.scrollHeight;}
  cc.addEventListener('keydown',function(e){if(e.key==='Enter'){cliRun(cc.value);cc.value='';}else if(e.key==='ArrowUp'){if(hi>0){hi--;cc.value=hist[hi];}e.preventDefault();}else if(e.key==='ArrowDown'){if(hi<hist.length-1){hi++;cc.value=hist[hi];}else{hi=hist.length;cc.value='';}e.preventDefault();}});
  // CLI panelinin herhangi bir yerine tıkla → input'a odaklan (yazmak için)
  var cliPanel=document.getElementById('p-cli');
  if(cliPanel)cliPanel.addEventListener('click',function(){cc.focus();});
  // F12 KLİ çipine tıklayınca da odaklan
  var f12=document.querySelector('.fkey[data-tgt="p-cli"]');
  if(f12)f12.addEventListener('click',function(){setTimeout(function(){cc.focus();},250);});
})();

// ── F3 HABERLER ──────────────────────────────────────────────────────────────
(function(){
  var out=document.getElementById('news-out');
  var inp=document.getElementById('news-ticker');
  var btn=document.getElementById('news-load');
  if(!out||!btn) return;

  function sentimentLabel(ts){
    var ago=Date.now()/1000-ts;
    return ago<86400?'YENİ':ago<604800?'7G':'ESKİ';
  }
  function renderNews(d){
    if(!d||!d.articles||!d.articles.length){
      out.innerHTML='<div class="alert info" style="font-size:9px;grid-column:1/-1">Haber bulunamadı ya da API erişim hatası.</div>';
      return;
    }
    var html='';
    d.articles.forEach(function(a){
      var ts=a.providerPublishTime||0;
      var date=ts?new Date(ts*1000).toISOString().slice(0,10):'?';
      var badge=sentimentLabel(ts);
      var bcolor=badge==='YENİ'?'var(--green)':badge==='7G'?'var(--amber)':'var(--text3)';
      html+='<div style="background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:8px 10px">'
        +'<div style="font-size:8px;color:var(--text3);display:flex;justify-content:space-between;margin-bottom:4px">'
        +'<span>'+esc2(a.publisher||'')+'</span>'
        +'<span style="color:'+bcolor+'">'+badge+' · '+date+'</span></div>'
        +'<div style="font-size:10px;line-height:1.4;color:var(--text)">'+esc2(a.title||'')+'</div>'
        +(a.link&&/^https?:\/\//i.test(a.link)?'<div style="margin-top:4px"><a href="'+escAttr(a.link)+'" target="_blank" rel="noopener noreferrer" style="font-size:8px;color:var(--accent)">Oku →</a></div>':'')
        +'</div>';
    });
    out.innerHTML=html;
    out.style.display='grid';
  }

  function load(){
    var ticker=(inp&&inp.value.trim())||'NVDA';
    out.innerHTML='<div class="alert info" style="font-size:9px;grid-column:1/-1">Haberler yükleniyor: '+esc2(ticker||'')+'…</div>';
    fetch('/api/news?ticker='+encodeURIComponent(ticker))
      .then(function(r){return r.json();}).then(renderNews)
      .catch(function(){out.innerHTML='<div class="alert" style="font-size:9px;grid-column:1/-1">API erişim hatası — server çalışıyor mu?</div>';});
  }

  btn.addEventListener('click',load);
  if(inp)inp.addEventListener('keydown',function(e){if(e.key==='Enter')load();});
  // F3 paneli açılınca otomatik yükle
  var f3=document.querySelector('.fkey[data-tgt="p-news"]');
  if(f3)f3.addEventListener('click',function(){setTimeout(load,300);});
})();

// ── F4 ENDEKS ─────────────────────────────────────────────────────────────────
(function(){
  var btn=document.getElementById('bench-load');
  if(!btn) return;

  function fmtRet(v){
    if(v===null||v===undefined)return '<span style="color:var(--text3)">—</span>';
    var c=v>=0?'var(--green)':'var(--red)';
    return '<span style="color:'+c+';font-weight:700">'+(v>=0?'+':'')+v.toFixed(2)+'%</span>';
  }
  function fmtAlpha(a,b){
    if(a===null||a===undefined||b===null||b===undefined)return '<span style="color:var(--text3)">Yetersiz veri</span>';
    var alpha=parseFloat(a)-parseFloat(b);
    var c=alpha>=0?'var(--green)':'var(--red)';
    return '<span style="color:'+c+';font-weight:700">'+(alpha>=0?'+':'')+alpha.toFixed(2)+'%</span>';
  }

  function render(d){
    var pf=d.portfolio_return_try_pct;
    var b=d.benchmarks||{};
    var pfEl=document.getElementById('bench-pf');
    var bistEl=document.getElementById('bench-bist');
    var spEl=document.getElementById('bench-sp');
    var goldEl=document.getElementById('bench-gold');
    var abEl=document.getElementById('bench-alpha-bist');
    var asEl=document.getElementById('bench-alpha-sp');
    if(pfEl)pfEl.innerHTML=fmtRet(pf);
    if(bistEl)bistEl.innerHTML=fmtRet(b.BIST100&&b.BIST100.return_pct);
    if(spEl)spEl.innerHTML=fmtRet(b.SP500&&b.SP500.return_pct);
    if(goldEl)goldEl.innerHTML=fmtRet(b.GOLD&&b.GOLD.return_pct);
    if(abEl)abEl.innerHTML=fmtAlpha(pf,b.BIST100&&b.BIST100.return_pct);
    if(asEl)asEl.innerHTML=fmtAlpha(pf,b.SP500&&b.SP500.return_pct);
  }

  function load(){
    ['bench-pf','bench-bist','bench-sp','bench-gold','bench-alpha-bist','bench-alpha-sp'].forEach(function(id){
      var el=document.getElementById(id);if(el)el.innerHTML='<span style="color:var(--text3)">…</span>';
    });
    fetch('/api/benchmark?days=30')
      .then(function(r){return r.json();}).then(render)
      .catch(function(){var n=document.getElementById('bench-note');if(n)n.textContent='API erişim hatası.';});
  }

  btn.addEventListener('click',load);
  var f4=document.querySelector('.fkey[data-tgt="p-bench"]');
  if(f4)f4.addEventListener('click',function(){setTimeout(load,300);});
})();

// ── F11 REBALANS + ALARMLAR ───────────────────────────────────────────────────
(function(){
  var rbBtn=document.getElementById('rebalance-load');
  var rbRows=document.getElementById('rebalance-rows');
  var rbSumm=document.getElementById('rebalance-summary');
  var rbTrades=document.getElementById('rebalance-trades');
  var rbTradeList=document.getElementById('rebalance-trade-list');

  function renderRebalance(d){
    if(d.error){if(rbSumm)rbSumm.textContent=d.error;return;}
    if(rbSumm)rbSumm.textContent=d.summary||'';
    var cur=d.current||{},tgt=d.targets||{},dev=d.deviations||{};
    var html='';
    Object.keys(tgt).forEach(function(cls){
      var c=cur[cls]||0,t=tgt[cls]||0,dv=dev[cls]||0;
      var inTol=Math.abs(dv)<=d.tolerance_pct;
      var dvColor=inTol?'var(--green)':dv>0?'var(--amber)':'var(--accent)';
      var badge=inTol?'<span style="color:var(--green)">✓</span>'
        :(dv>0?'<span style="color:var(--amber)">SAT</span>':'<span style="color:var(--accent)">AL</span>');
      html+='<tr><td>'+esc2(cls)+'</td>'
        +'<td style="text-align:right">'+c.toFixed(1)+'%</td>'
        +'<td style="text-align:right">'+t.toFixed(1)+'%</td>'
        +'<td style="text-align:right;color:'+dvColor+'">'+(dv>=0?'+':'')+dv.toFixed(1)+'%</td>'
        +'<td>'+badge+'</td></tr>';
    });
    if(rbRows)rbRows.innerHTML=html||'<tr><td colspan="5" style="color:var(--text3)">Veri yok</td></tr>';
    if(d.trades&&d.trades.length&&rbTrades&&rbTradeList){
      rbTrades.style.display='block';
      rbTradeList.innerHTML=d.trades.map(function(t){
        var c=t.action==='SAT'?'var(--red)':'var(--green)';
        return '<div style="display:flex;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid var(--border);font-size:9px">'
          +'<span style="color:'+c+';font-weight:700;min-width:28px">'+esc2(t.action)+'</span>'
          +'<span style="color:var(--text2)">'+esc2(t.class||'')+'</span>'
          +'<span style="color:'+c+'">%'+Math.abs(t.delta_pct).toFixed(1)+'</span>'
          +'<span style="margin-left:auto;color:var(--text3)">~₺'+Math.round(t.amount_try).toLocaleString('tr-TR')+'</span>'
          +'<span style="color:var(--text3);font-size:8px;max-width:160px">'+esc2(t.reason||'')+'</span>'
          +'</div>';
      }).join('');
    } else if(rbTrades) rbTrades.style.display='none';
  }

  function loadRebalance(){
    if(rbSumm)rbSumm.textContent='Hesaplanıyor…';
    fetch('/api/rebalance')
      .then(function(r){return r.json();}).then(renderRebalance)
      .catch(function(){if(rbSumm)rbSumm.textContent='API erişim hatası.';});
  }

  if(rbBtn)rbBtn.addEventListener('click',loadRebalance);
  var f11=document.querySelector('.fkey[data-tgt="p-rebalance"]');
  if(f11)f11.addEventListener('click',function(){setTimeout(loadRebalance,300);});

  // ── Alarmlar ──
  var alarmList=document.getElementById('alarm-list');
  var alarmAdd=document.getElementById('alarm-add');
  var alarmTicker=document.getElementById('alarm-ticker');
  var alarmDir=document.getElementById('alarm-dir');
  var alarmPrice=document.getElementById('alarm-price');
  var _alarms=[];

  function renderAlarms(){
    if(!alarmList)return;
    if(!_alarms.length){alarmList.innerHTML='<div style="color:var(--text3)">Henüz alarm yok — yukarıdan ekle</div>';return;}
    alarmList.innerHTML=_alarms.map(function(a,i){
      var arrow=a.dir==='above'?'▲':'▼';
      return '<div style="display:flex;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid var(--border);font-size:9px">'
        +'<span style="color:var(--accent);font-weight:700;min-width:60px">'+esc2(a.ticker||'')+'</span>'
        +'<span style="color:var(--amber)">'+arrow+' '+a.price+'</span>'
        +'<span style="margin-left:auto;cursor:pointer;color:var(--red)" data-del="'+i+'">×</span></div>';
    }).join('');
    alarmList.querySelectorAll('[data-del]').forEach(function(el){
      el.addEventListener('click',function(){_alarms.splice(+el.getAttribute('data-del'),1);saveAlarms();renderAlarms();});
    });
  }

  function saveAlarms(){
    fetch('/api/alerts',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({alerts:_alarms})}).catch(function(){});
  }

  if(alarmAdd){
    alarmAdd.addEventListener('click',function(){
      var tk=(alarmTicker&&alarmTicker.value.trim())||'';
      var dir=(alarmDir&&alarmDir.value)||'above';
      var pr=parseFloat((alarmPrice&&alarmPrice.value)||'0');
      if(!tk||!pr){return;}
      _alarms.push({ticker:tk.toUpperCase(),dir:dir,price:pr});
      if(alarmTicker)alarmTicker.value='';if(alarmPrice)alarmPrice.value='';
      saveAlarms();renderAlarms();
    });
  }

  // Kaydedilmiş alarmları yükle
  fetch('/api/alerts').then(function(r){return r.json();}).then(function(d){
    _alarms=(d.alerts||[]);renderAlarms();
  }).catch(function(){});
})();

// INIT — canlı veriyi dene (yoksa .sample), o da yoksa generik minimal fallback
setTimeout(function(){
  fetchJSON('output/latest.json')
    .then(function(d){updateDashboard(d);})
    .catch(function(){
      updateDashboard({net_worth_try:0,net_worth_usd:0,prev_net_worth_try:0,
        fx_rates:{usdtry:46.00,eurtry:53.00},
        quality_report:{successfully_fetched:0,total_holdings:0},
        reviewer_findings:[{severity:'BİLGİ',issue:'Henüz veri yok. ⚙ Portföy Düzenle ile başlayın ya da AI analizini çalıştırın.'}],
        holdings_with_prices:[]
      });
    });
},200);

})();
