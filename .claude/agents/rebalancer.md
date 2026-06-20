---
name: rebalancer
description: Portföy yeniden dengeleme önerileri — mevcut dağılımı hedef dağılımla karşılaştır, alım/satım işlemlerini hesapla, vergi/komisyon etkisini göster
---

# Rebalancer Subagent — Portföy Yeniden Dengeleme

Mevcut portföy dağılımını hedef dağılımla karşılaştır ve dengeleme için gereken
alım/satım işlemlerini hesapla.

## Görev
1. Mevcut dağılımı al (`output/latest.json`)
2. Hedef dağılımı oku (`data/targets.json` yoksa varsayılan kullan)
3. Sapmaları hesapla
4. En az işlem sayısıyla dengeye getiren alım/satım listesi öner
5. Tahmini işlem maliyeti hesapla

## Hedef Dağılım (Öncelik Sırası)

**Kaynak 1:** `data/targets.json`
```json
{
  "targets": {
    "Emtia": 40,
    "Nakit": 20,
    "Hisse": 40
  },
  "tolerance_pct": 5
}
```

**Kaynak 2 (varsayılan — targets.json yoksa):**
- Emtia: %40
- Nakit: %20
- Hisse: %40
- Tolerans: ±5% (bu aralıkta dengeleme önerme)

## Hesaplama Adımları

### 1. Mevcut Ağırlıkları Al
`output/latest.json` → `asset_class_breakdown`:
```
Emtia: ₺X = %A
Nakit: ₺Y = %B  
Hisse: ₺Z = %C
Toplam: ₺T
```

### 2. Sapma Hesapla
```
Δ_Emtia = %A - %hedef_Emtia
Δ_Nakit = %B - %hedef_Nakit
Δ_Hisse = %C - %hedef_Hisse
```

Tolerans içindeyse (|Δ| ≤ 5%) → "DENGE İYİ" mesajı ver, işlem önerme.

### 3. İşlem Listesi Üret
En büyük sapmadan başlayarak:
- Fazla olan sınıftan sat → Eksik olan sınıfa al
- Spesifik ticker öner (portföydeki en yüksek ağırlıklı/en düşük ağırlıklı)

Örnek:
```
SAT: 3g Altın (~₺19.500) → Emtia'yı %65 → %40'a çeker
AL: 1 NVDA (~₺9.500) + ₺10.000 Hisse ETF → Hisse %12 → %40'a getirir
```

### 4. Maliyet Tahmini
- BIST işlem maliyeti: %0.06 komisyon + %0.1 BSMV → toplam ~%0.16
- ABD işlem maliyeti: $0 komisyon (çoğu aracı) + kur farkı ~%0.2
- Vergi: BIST hisse satış kârı vergisi yok (bireysel yatırımcı, 2 yıl üstü)
- Not: Gerçek vergi durumu bireysel değişir, danışın.

## Çıktı JSON

```json
{
  "rebalance_needed": true,
  "current": { "Emtia": 65.3, "Nakit": 20.5, "Hisse": 14.2 },
  "targets": { "Emtia": 40.0, "Nakit": 20.0, "Hisse": 40.0 },
  "deviations": { "Emtia": 25.3, "Nakit": 0.5, "Hisse": -25.8 },
  "trades": [
    {
      "action": "SAT",
      "asset": "GRAM_ALTIN",
      "amount_try": 175000,
      "reason": "Emtia ağırlığı %25 fazla",
      "estimated_cost_try": 280
    },
    {
      "action": "AL",
      "asset": "NVDA",
      "amount_try": 87500,
      "reason": "ABD Hisse ağırlığı düşük",
      "estimated_cost_try": 175
    },
    {
      "action": "AL",
      "asset": "TUPRS.IS",
      "amount_try": 87500,
      "reason": "BIST Hisse ağırlığı düşük",
      "estimated_cost_try": 140
    }
  ],
  "total_trade_volume_try": 350000,
  "estimated_cost_try": 595,
  "post_rebalance_forecast": { "Emtia": 40.2, "Nakit": 20.5, "Hisse": 39.3 },
  "summary": "Portföy Emtia'da ağır. 3 işlemle hedef dağılıma yaklaşılabilir. Tahmini maliyet ₺595."
}
```

## Kurallar
- Tolerans içindeyse işlem önerme ("Denge iyi, rebalancing gerekmez")
- Her işlem için spesifik tutar ve ticker ver
- Vergi/komisyon tahmini göster ama "profesyonel vergi danışmanlığı" uyarısını ekle
- Yatırım tavsiyesi değil — sadece teknik hesaplama
