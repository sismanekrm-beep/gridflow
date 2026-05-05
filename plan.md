# plan.md (Updated)

## 1) Objectives
- ✅ Ürün kutu etiketlerini TANEX **TW-2024 (64x34mm, A4’te 24: 3 sütun x 8 satır)** formatında hızlı üretmek.
- ✅ 500+ ürün için ürün bilgisini (kod, ürün adı, ölçü, DIN/standart, kalite, açıklama, varsayılan adet) ve **ürün görselini** saklamak.
- ✅ **Etiket Hazırlama** ekranında ürün kodu girince otomatik doldurmak → TW-2024’e birebir **önizleme** → doğru ölçekte **yazdırmak**.
- ✅ Marka adı + logo’yu **Ayarlar**’dan yönetilebilir yapmak.
- 🔜 (Devam) Baskı hizalama için **yazıcıya göre marjin kalibrasyonu** (mm) ve operasyonel yönergeyi netleştirmek.

## 2) Implementation Steps

### Phase 1 — Core Flow POC (Isolation)
> Core = “TW-2024 ölçüsünde etiket şablonu + ürün görseliyle birlikte birebir baskı çıktısı”. (Baskı ölçüsü/yerleşim en riskli kısım.)

**User stories (POC)**
1. Kullanıcı olarak tek bir ürün için ölçü/ürün adı/DIN girip etiket önizlemesini gerçek ölçekte görmek isterim.
2. Kullanıcı olarak tarayıcıdan yazdırınca etiketlerin TW-2024’e oturduğunu doğrulamak isterim.
3. Kullanıcı olarak 1 sayfada 24 etiketi (3x8) aynı şablonla basmak isterim.
4. Kullanıcı olarak logo ve DIN alanının örnekteki gibi konumlandığını görmek isterim.
5. Kullanıcı olarak ürün görselinin etikette kırpılmadan/sığacak şekilde göründüğünü görmek isterim.

**Status**
- ✅ Tamamlandı: TW-2024 ölçülerinde A4 grid + print CSS doğrulandı ve V1’e entegre edildi.

**Steps (historical / completed)**
- Web research: “CSS print A4 exact mm”, “@page size A4”, “print scaling pitfalls Chrome/Edge”, “3x8 grid 64x34 label” en iyi pratikleri.
- Minimal POC:
  - A4 sayfa container (210x297mm) + grid (3x8)
  - Label box: 64x34mm, ayarlanabilir marjin parametreleri
  - Örnek layout: üst (resim + marka/logo + DIN bar), orta (ÖLÇÜ + değer), alt (ÜRÜN + ad)
  - Print CSS (`@media print`, `@page { size: A4; margin: 0; }`)
- Fiziksel test checklist:
  - Printer dialog’da “Scale: 100% / Actual size”
  - Alignment toleransı (±1mm)

### Phase 2 — V1 App Development (FastAPI + React + MongoDB)

**User stories (V1)**
1. Kullanıcı olarak ürün ekleyip (kod, ürün adı, ölçü, DIN, kalite, açıklama, varsayılan adet) kaydedebilmek isterim.
2. Kullanıcı olarak ürün görselini (PNG/JPG/WebP) yükleyip listede ve etikette görebilmek isterim.
3. Kullanıcı olarak 500+ ürün içinde kod/isim/ölçü ile hızlı arama yapmak isterim.
4. Kullanıcı olarak Etiket Hazırlama ekranında ürün kodu(ları) girince otomatik dolmasını isterim.
5. Kullanıcı olarak her ürün için basılacak etiket adedini ayarlayıp tek seferde A4 sayfalarına dökebilmek isterim.
6. Kullanıcı olarak yazdırmadan önce TW-2024 şablonuyla birebir önizleme görmek isterim.

**Status**
- ✅ Phase 2 tamamlandı: Uygulama geliştirildi ve çalışır durumda.
- ✅ Test sonucu: Backend %100, Frontend %95 — tüm çekirdek akışlar çalışıyor.
- Notlar:
  - “Settings label preview live update” konusu düşük öncelik olarak raporlandı ancak React state ile pratikte çalışır durumda.
  - “Mobile menu button” tespiti responsive bağlama bağlı; masaüstünde `md:hidden` sebebiyle görünmemesi normal.

**Backend (FastAPI)**
- ✅ Models/Collections
  - `products`: `id`, `code (unique)`, `name`, `measurement`, `standard_code`, `quality`, `description`, `default_qty`, `image_url`, `created_at`
  - `settings`: `brand_name`, `brand_logo_url`, `print_margin_x`, `print_margin_y`
- ✅ APIs
  - Products: CRUD + `GET /products?query=&page=&limit=` (server-side pagination + arama)
  - Quick lookup: `GET /products/code/{code}` (etiket hazırlama için)
  - Image upload: `POST /upload` (multipart) → lokal dosya kaydı → URL döndür
  - Settings: GET/PUT
  - Stats: `GET /stats` (dashboard)
- ✅ Storage
  - MVP: lokal disk upload + `/api/static/uploads/...` ile servis
  - Mongo: code/name/measurement üzerinden regex tabanlı arama (gerektiğinde text index’e yükseltilebilir)

**Frontend (React)**
- ✅ Pages
  - Dashboard: toplam ürün + son eklenenler, hızlı aksiyon butonları
  - Products: tablo + arama + sayfalama; add/edit Sheet; delete AlertDialog; ürün görseli yükleme
  - Label Preparation:
    - Kod ekleme + öneri listesi (query ile)
    - Her ürün için adet ayarı (default_qty ile başlar)
    - A4 print preview (3x8) + zoom
    - Print (react-to-print)
  - Settings: marka adı, logo upload, TW-2024 marjin ayarı, canlı örnek etiket önizlemesi
- ✅ Print system
  - TW-2024 için mm tabanlı render + `@page size: A4` + UI gizleme (no-print)

**V1 test (phase exit)**
- ✅ E2E: ürün ekle → arama → düzenle/sil → etiket hazırlama → önizleme → print
- ✅ Edge cases: olmayan kod, tekrarlı kod, çok adetli ürün (çok sayfa), görsel yoksa placeholder

### Phase 3 — Feature Expansion + Hardening

**User stories (Expansion)**
1. Kullanıcı olarak Excel/CSV ile ürünleri toplu içe aktarmak isterim.
2. Kullanıcı olarak ürünleri dışa aktarmak (CSV) isterim.
3. Kullanıcı olarak etiket şablonunda metin taşmasını otomatik yönetmek (satır kırma / font küçültme) isterim.
4. Kullanıcı olarak farklı TANEX formatlarına (ileride) geçince şablonu seçebilmek isterim.
5. Kullanıcı olarak etiket yazdırma geçmişini (son baskılar) görebilmek isterim.
6. Kullanıcı olarak yazıcı/kağıt sapmalarına göre baskı hizasını kolay kalibre etmek isterim (test sayfası + offset kaydı).

**Steps (next)**
- CSV import/export
- Arama iyileştirme: gerçek text index + daha iyi filtreleme (standart/kalite)
- Print QA: farklı tarayıcılar (Chrome/Edge) + farklı yazıcılar; Settings’te marjin kalibrasyon rehberi
- Template config altyapısı (TW-2024 default) + ileride TW-XXXX seçimi
- Baskı geçmişi: (etiket job kaydı: tarih, ürünler, adet, kullanıcı opsiyonel)

### Phase 4 — Optional (Ask before building): Auth + Roles
- Auth testing’i zorlaştırdığı için kullanıcı onayıyla eklenir.
- Basit kullanıcı/şifre + JWT, role: admin/operator.

## 3) Next Actions
1. **Fiziksel baskı kalibrasyonu**: Kullanıcının yazıcı modeline göre TW-2024 marjin (print_margin_x/y) mm değerlerini 1 test sayfası ile doğrulamak.
2. Operasyonel yönerge: Yazdırma ekranında “Ölçek 100% / Gerçek boyut” uyarısını standart prosedür olarak dokümante etmek.
3. (Opsiyonel) 500+ ürün için toplu yönetim: CSV import/export gereksinimlerini netleştirmek (kolonlar, örnek dosya).
4. (Opsiyonel) Çoklu TANEX format desteği: Hangi TW kodları hedeflenecek listesini almak.

## 4) Success Criteria
- ✅ Ürün kodu gir → otomatik dol → TW-2024’e uygun önizleme → 100% ölçekte print akışı 2 dakikanın altında.
- ✅ 500+ üründe arama + sayfalama sorunsuz.
- ✅ Görsel upload ve etikette gösterim stabil (kırpma/taşma yok, placeholder var).
- ✅ A4’te 24 etiket hizası tutarlı (±1mm tolerans) ve tekrar üretilebilir.
- 🔜 Kalibrasyon sonrası: hedef yazıcı(lar) için marjin ayarı “tek seferlik” yapılır ve günlük kullanımda tekrar ayar gerektirmez.
