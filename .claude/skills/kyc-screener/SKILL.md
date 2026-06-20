---
name: kyc-screener
description: KYC & şirket durum tespiti — şirket/kişi hakkında kamuya açık risk faktörlerini tara, yaptırım/dava/sahiplik/şeffaflık değerlendir. "KYC", "due diligence", "şirket tarama", "arka plan araştırması" dendiğinde tetiklenir.
---

# KYC Screener — Şirket / Kişi Durum Tespiti

Bir şirket veya kişi hakkında kamuya açık kaynaklardan KYC risk taraması yap.
Anthropic "KYC Screener" template'inin Claude-native karşılığı.

## Ne Zaman Tetiklenir
- "X şirketine due diligence yap"
- "Bu hissedar güvenilir mi?"
- "Hangi risk faktörleri var?"
- CLI: `kyc <şirket adı>` veya `kyc <ticker>`

## Girdi
- Şirket adı ve/veya ticker
- Ülke/yetki alanı (opsiyonel — eklenirse odaklı arama yapılır)
- Tarama seviyesi: **Hızlı** (5 dk) | **Standart** (15 dk) | **Derin** (30+ dk)

## Tarama Boyutları & Arama Sorguları

### 1. Şirket Kimliği
```
WebSearch: "<şirket> kuruluş tarihi yönetim kurulu CEO genel merkez"
WebSearch: "<şirket> <ticker> SEC EDGAR KAP kamuyu aydınlatma"
```
- Kuruluş tarihi, tescil ülkesi
- Yönetim kurulu ve üst yönetim (son 2 yıl değişim?)
- Bağlı şirketler, iştiraklerin haritası

### 2. Yaptırım & Kara Liste Taraması
```
WebSearch: "<şirket> sanctions OFAC SDN list EU sanctions"
WebSearch: "<şirket> yaptırım kara liste MASAK FinCEN"
```
- OFAC SDN listesi
- AB yaptırım listesi
- MASAK (Türkiye) uyarıları
- BM yaptırımları

### 3. Hukuki & Düzenleyici Geçmiş
```
WebSearch: "<şirket> dava mahkeme ceza SEC enforcement action"
WebSearch: "<şirket> BDDK SPK CMB investigation fine 2023 2024 2025"
```
- Aktif davalar
- Düzenleyici para cezaları (son 5 yıl)
- Vergi ihlali/kaçakçılık kayıtları
- Konkordato/iflas başvurusu

### 4. Şeffaflık & Sahiplik
```
WebSearch: "<şirket> major shareholders beneficial owner offshore"
WebSearch: "<şirket> PPP OpenCorporates Orbis corporate structure"
```
- Gerçek faydalanıcı
- Offshore holding yapısı
- Azınlık hissedar hakları
- Yıllık raporlarda açıklama kalitesi

### 5. Medya Taraması (Son 24 Ay)
```
WebSearch: "<şirket> corruption bribery fraud 2024 2025"
WebSearch: "<şirket> yolsuzluk rüşvet dolandırıcılık"
```
- Negatif haber sıklığı
- Kaynak güvenilirliği (ana akım vs sosyal medya)
- Kaynakların bağımsızlığı

## Risk Skoru Matrisi

| Boyut | Ağırlık | Skor (0-10) |
|---|---|---|
| Yaptırım | 30% | — |
| Hukuki | 25% | — |
| Şeffaflık | 20% | — |
| Yönetim | 15% | — |
| Medya | 10% | — |
| **Toplam** | 100% | — |

Toplam 0-3: Düşük Risk | 4-6: Orta | 7-10: Yüksek

## Rapor Çıktısı
`output/kyc-<şirket>-<YYYYMMDD>.md`:

```markdown
# KYC Tarama Raporu — <Şirket> (<tarih>)

## Genel Değerlendirme
Risk Seviyesi: 🟢 DÜŞÜK / 🟡 ORTA / 🔴 YÜKSEK
Toplam Skor: X/10
Tarama Derinliği: Hızlı / Standart / Derin

## Özet (3 satır)
...

## Tarama Boyutları

### Yaptırım Durumu
...

### Hukuki Geçmiş
...

### Şeffaflık
...

### Yönetim
...

### Medya

## Kırmızı Bayraklar
| # | Önem | Bulgu | Kaynak |
|---|---|---|---|

## Yeşil Bayraklar (olumlu göstergeler)
- ...

## Sınırlar & Uyarılar
- Sadece kamuya açık kaynaklar kullanıldı.
- Ticari veri tabanları (LexisNexis, Refinitiv World-Check) taranmadı.
- Bu rapor hukuki veya finansal tavsiye değildir.
- Tarih: <bugün>
```

## Kurallar
- Kaynak olmadan iddia yok — her bulgu için WebSearch sonuç URL'si ekle.
- "Bilgi bulunamadı" ≠ "temiz" — açıkça belirt.
- Kişilere yönelik taramada kişisel veri gizliliğine dikkat.

## Bağlı Dosyalar
- Subagent: `.claude/agents/news-sentiment.md` (medya tarama)
- Output: `output/kyc-<şirket>-<YYYYMMDD>.md`
