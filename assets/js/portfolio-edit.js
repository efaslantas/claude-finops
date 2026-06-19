// ⚙ Portföy Düzenle — formu /api/portfolio'dan doldur, satır ekle/çıkar, kaydet
(function(){
  var modal=document.getElementById('pf-modal');
  var rowsEl=document.getElementById('pf-rows');
  var msg=document.getElementById('pf-msg');
  if(!modal||!rowsEl)return;

  var TYPES=[['equity','Hisse'],['cash','Nakit'],['commodity','Emtia'],['crypto','Kripto'],['fund','Fon']];
  function sel(opts,val){return '<select class="pf-f" data-k="'+opts.k+'" style="background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:3px;padding:2px 4px;font-family:inherit;font-size:10px">'+
    opts.list.map(function(o){return '<option value="'+o[0]+'"'+(o[0]===val?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select>';}
  function inp(k,val,ph,w){return '<input class="pf-f" data-k="'+k+'" value="'+(val==null?'':String(val).replace(/"/g,'&quot;'))+'" placeholder="'+(ph||'')+'" style="width:'+(w||'100%')+';background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:3px;padding:3px 5px;font-family:inherit;font-size:10px">';}

  function row(h){
    h=h||{type:'equity',ccy:'USD'};
    var qtyVal=h.type==='cash'?h.amount:h.quantity;
    var tr=document.createElement('tr');
    tr.innerHTML='<td>'+inp('name',h.name||'','Ad')+'</td>'
      +'<td>'+sel({k:'type',list:TYPES},h.type||'equity')+'</td>'
      +'<td>'+inp('ticker',h.ticker||'','AAPL / GC=F / BTC-USD')+'</td>'
      +'<td style="text-align:right">'+inp('qty',qtyVal,'0',' 80px')+'</td>'
      +'<td>'+sel({k:'ccy',list:[['TRY','TRY'],['USD','USD'],['EUR','EUR'],['GBP','GBP']]},h.ccy||'USD')+'</td>'
      +'<td><button class="run-btn pf-del" style="padding:1px 7px;border-color:var(--red);color:var(--red)">×</button></td>';
    tr.querySelector('.pf-del').onclick=function(){tr.remove();};
    return tr;
  }
  function addRow(h){rowsEl.appendChild(row(h));}

  function load(){
    fetch('/api/portfolio').then(function(r){return r.json();}).then(function(d){
      rowsEl.innerHTML='';
      (d.holdings||[]).forEach(addRow);
      if(!(d.holdings||[]).length)addRow();
      var b=document.getElementById('pf-base');if(b&&d.base_currency)b.value=d.base_currency;
    }).catch(function(){rowsEl.innerHTML='';addRow();});
  }
  function open(){load();modal.style.display='flex';}
  function close(){modal.style.display='none';}

  function collect(){
    var out=[];
    [].slice.call(rowsEl.children).forEach(function(tr){
      var o={};tr.querySelectorAll('.pf-f').forEach(function(f){o[f.getAttribute('data-k')]=f.value.trim();});
      if(!o.name&&!o.ticker)return;
      var h={id:(o.ticker||o.name).toUpperCase().replace(/[^A-Z0-9_]/g,'_'),name:o.name||o.ticker,type:o.type,ccy:o.ccy};
      var q=parseFloat(String(o.qty).replace(',','.'))||0;
      if(o.type==='cash'){h.amount=q;}else{h.quantity=q;h.ticker=o.ticker;}
      if(o.type==='commodity'&&/GC=F|SI=F|gram/i.test(o.ticker+o.name))h.unit='gram';
      out.push(h);
    });
    return out;
  }
  function save(){
    var holdings=collect();
    if(!holdings.length){msg.textContent='En az bir varlık ekleyin.';return;}
    msg.textContent='Kaydediliyor + canlı fiyatlar çekiliyor…';
    fetch('/api/portfolio',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({base_currency:document.getElementById('pf-base').value,holdings:holdings})})
      .then(function(r){return r.json();}).then(function(d){
        if(d.error){msg.textContent='Hata: '+d.error;return;}
        msg.textContent='✓ Kaydedildi — net değer ₺'+(d.net_worth_try||0).toLocaleString('tr-TR')+' · yenileniyor…';
        // en sağlamı: sayfayı yenile → INIT güncel latest.json'ı yükler
        setTimeout(function(){location.reload();},1000);
      }).catch(function(e){msg.textContent='Hata: '+e;});
  }

  var btn=document.getElementById('edit-portfolio-btn');if(btn)btn.onclick=open;
  document.getElementById('pf-add').onclick=function(){addRow();};
  document.getElementById('pf-cancel').onclick=close;
  document.getElementById('pf-save').onclick=save;
  modal.addEventListener('click',function(e){if(e.target===modal)close();});
})();
