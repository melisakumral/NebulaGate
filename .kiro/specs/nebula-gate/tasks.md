# Uygulama Planı: NebulaGate

## Genel Bakış

NebulaGate, Stellar Soroban blockchain üzerinde çalışan bir erişim kapısı sistemidir. Uygulama iki ana bileşenden oluşur: Rust ile yazılmış Soroban akıllı kontratı ve React + Tailwind CSS ile geliştirilmiş frontend arayüzü. Görevler; kontrat implementasyonu, frontend kurulumu, fingerprint modülü, Stellar SDK entegrasyonu, UI bileşenleri ve uçtan uca entegrasyon sırasıyla ilerler.

---

## Görevler

- [x] 1. Soroban Akıllı Kontratı — Temel Yapı ve Tip Tanımları
  - `contracts/hello-world/src/lib.rs` dosyasında `AccessResult`, `ContractError`, `AccessEntry` ve `DataKey` enum/struct tanımlarını yaz
  - `#[contracttype]`, `#[contracterror]` makrolarını ve `soroban_sdk` importlarını ekle
  - `RATE_LIMIT_MAX = 10` ve `RATE_LIMIT_TTL = 60` sabitlerini tanımla
  - `AccessGateContract` struct'ını ve `#[contract]` / `#[contractimpl]` bloklarını oluştur
  - _Gereksinimler: 1.1, 1.8, 8.2_

- [x] 2. Soroban Akıllı Kontratı — `access_gate` Fonksiyonu
  - [x] 2.1 `access_gate(env, caller, score)` fonksiyonunu implement et
    - `caller.require_auth()` ile imza doğrulamasını ekle
    - `score > 100` kontrolü ile `InvalidScore` hatasını döndür
    - Rate limiting mantığını `env.storage().temporary()` ile implement et (sayaç artırma + TTL)
    - Eşik kararlarını implement et: `score > 60` → `AccessGranted`, `score >= 30` → `PaymentRequired`, `score < 30` → `AccessDenied`
    - `AccessGranted` durumunda `AccessEntry { score, timestamp }` kaydını `env.storage().instance()` içine yaz
    - _Gereksinimler: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 8.1, 8.4_

  - [x] 2.2 `get_entry(env, caller)` fonksiyonunu implement et
    - `DataKey::Entry(caller)` anahtarıyla `env.storage().instance()` üzerinden kayıt sorgula
    - Kayıt yoksa `None` döndür
    - _Gereksinimler: 2.3, 2.4, 2.5_

- [x] 3. Soroban Kontratı — Birim Testler
  - [x] 3.1 `access_gate` için birim testler yaz
    - `score = 0`, `score = 29`, `score = 30`, `score = 60`, `score = 61`, `score = 100` sınır değerleri için örnek tabanlı testler
    - `score = 101` ve `score = u32::MAX` için `InvalidScore` hatası testi
    - `require_auth()` başarısız senaryosu için `AuthError` testi
    - _Gereksinimler: 1.4, 1.5, 1.6, 1.8_

  - [x] 3.2 `get_entry` için birim testler yaz
    - Kayıt olmayan adres için `None` döndüğünü doğrula
    - Başarılı erişim sonrası kaydın mevcut olduğunu doğrula
    - Aynı adresle iki kez erişim sonrası en güncel kaydın saklandığını doğrula
    - _Gereksinimler: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.3 Rate limiting birim testi yaz
    - Aynı adresten 10 çağrı sonrası 11. çağrının `RateLimitExceeded` döndürdüğünü doğrula
    - _Gereksinimler: 8.4_

- [ ] 4. Soroban Kontratı — Özellik Tabanlı Testler (proptest)
  - [ ]* 4.1 Özellik 1: Geçersiz skor reddi için proptest yaz
    - `score in (101u32..=u32::MAX)` aralığı için `access_gate` her zaman `InvalidScore` döndürmeli
    - **Özellik 1: Geçersiz Skor Reddi**
    - **Doğrular: Gereksinim 1.8, 8.2**

  - [ ]* 4.2 Özellik 2–4: Eşik tutarlılığı için proptest yaz
    - `score in 61u32..=100u32` → her zaman `AccessGranted`
    - `score in 30u32..=60u32` → her zaman `PaymentRequired`
    - `score in 0u32..=29u32` → her zaman `AccessDenied`
    - **Özellik 2: Eşik Tutarlılığı — Erişim İzni**
    - **Özellik 3: Eşik Tutarlılığı — Ödeme Gerekli**
    - **Özellik 4: Eşik Tutarlılığı — Erişim Reddi**
    - **Doğrular: Gereksinim 1.4, 1.5, 1.6**

  - [ ]* 4.3 Özellik 5: Depolama round-trip için proptest yaz
    - `score in 61u32..=100u32` için `access_gate` → `get_entry` → döndürülen skor çağrıdaki skorla eşleşmeli
    - **Özellik 5: Depolama Round-Trip**
    - **Doğrular: Gereksinim 1.7, 2.1, 2.3**

  - [ ]* 4.4 Özellik 6: Kayıt güncelleme tutarlılığı için proptest yaz
    - Aynı adresle birden fazla başarılı çağrı sonrası `get_entry` en son skoru döndürmeli
    - **Özellik 6: Kayıt Güncelleme Tutarlılığı**
    - **Doğrular: Gereksinim 2.2**

  - [ ]* 4.5 Özellik 7: Kayıtsız adres `None` döndürür için proptest yaz
    - Daha önce çağrı yapmamış adres için `get_entry` her zaman `None` döndürmeli
    - **Özellik 7: Kayıtsız Adres None Döndürür**
    - **Doğrular: Gereksinim 2.4**

  - [ ]* 4.6 Özellik 8: Rate limiting için proptest yaz
    - 60 saniye içinde 10'dan fazla çağrı yapıldığında 11. çağrı `RateLimitExceeded` döndürmeli
    - **Özellik 8: Rate Limiting**
    - **Doğrular: Gereksinim 8.4**

  - [ ]* 4.7 Özellik 11: İmzasız çağrı reddi için proptest yaz
    - `require_auth()` başarısız olduğunda her zaman `AuthError` döndürmeli
    - **Özellik 11: İmzasız Çağrı Reddi**
    - **Doğrular: Gereksinim 1.2, 1.3, 8.1**

- [ ] 5. Kontrat Kontrol Noktası — Tüm testlerin geçtiğini doğrula
  - Tüm testlerin geçtiğini doğrula, sorular varsa kullanıcıya sor.

- [x] 6. Frontend Proje Kurulumu
  - [x] 6.1 React + Vite + TypeScript projesi oluştur
    - `package.json` içine `react`, `react-dom`, `typescript`, `vite` bağımlılıklarını ekle
    - `tsconfig.json` ve `vite.config.ts` dosyalarını yapılandır
    - _Gereksinimler: 6.1, 7.1_

  - [x] 6.2 Tailwind CSS ve Lucide React kur ve yapılandır
    - `tailwind.config.js` içine `midnight`, `charcoal`, `sapphire`, `amber-gate` özel renklerini ekle
    - `backdropBlur.xs: '2px'` genişletmesini ekle
    - `index.css` içine Tailwind direktiflerini ekle
    - _Gereksinimler: 6.1, 6.2, 6.3, 6.5, 6.6_

  - [x] 6.3 Renk paleti ve global stil sabitlerini tanımla
    - `src/styles/colors.ts` dosyasında `colors` nesnesini oluştur (background, accent, text, status)
    - `src/styles/theme.ts` dosyasında glassmorphism kart stilini tanımla
    - _Gereksinimler: 6.1, 6.2, 6.3, 6.4_

  - [x] 6.4 Frontend durum modelini (`AppState`) tanımla
    - `src/types/index.ts` dosyasında `AppState`, `AccessResult`, `BrowserFingerprint`, `AuditHistoryEntry`, `AccessEntry` tip tanımlarını yaz
    - `AuditCardProps`, `ScoreGaugeProps`, `SecurityVerificationModalProps`, `AuditHistoryTableProps`, `AccessGrantedScreenProps`, `AccessDeniedScreenProps` arayüzlerini tanımla
    - _Gereksinimler: 4.3, 4.4, 4.5_

- [x] 7. Browser Fingerprinting Modülü
  - [x] 7.1 `collectFingerprint()` fonksiyonunu implement et
    - `src/lib/fingerprint.ts` dosyasını oluştur
    - User-Agent, WebGL renderer/vendor, Canvas hash, ekran çözünürlüğü, renk derinliği, piksel yoğunluğu, plugin listesi ve `navigator.webdriver` verilerini topla
    - `https://api.ipify.org` üzerinden IP adresini al; hata durumunda `null` döndür
    - Eksik veri için varsayılan değerler kullan
    - _Gereksinimler: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.8_

  - [x] 7.2 `calculateScore()` fonksiyonunu implement et
    - Ağırlık tablosuna göre pozitif sinyalleri topla (User-Agent +20, WebGL +20, Canvas +15, IP +15, Plugin +15, Ekran +10, Renk derinliği +5)
    - Negatif sinyalleri uygula (webdriver -50, WebGL yok -30, sıfır plugin -20)
    - `Math.max(0, Math.min(100, score))` ile 0–100 aralığına sıkıştır
    - _Gereksinimler: 3.7, 3.8, 3.9_

  - [x] 7.3 `detectHeadless()` fonksiyonunu implement et
    - `isWebdriver === true`, `hasWebGL === false` veya `pluginCount === 0` koşullarından herhangi biri doğruysa `true` döndür
    - _Gereksinimler: 3.9_

  - [ ]* 7.4 Özellik 9: Skor aralığı geçerliliği için fast-check testi yaz
    - Herhangi bir `BrowserFingerprint` verisi için `calculateScore` her zaman 0–100 döndürmeli
    - **Özellik 9: Skor Aralığı Geçerliliği**
    - **Doğrular: Gereksinim 3.7**

  - [ ]* 7.5 Özellik 10: Headless tespiti skoru düşürür için fast-check testi yaz
    - `isWebdriver=true`, `hasWebGL=false` veya `pluginCount=0` içeren parmak izi için `calculateScore` her zaman 30'un altında döndürmeli
    - **Özellik 10: Headless Tespiti Skoru Düşürür**
    - **Doğrular: Gereksinim 3.9**

- [x] 8. Stellar JS SDK ve Freighter Entegrasyonu
  - [x] 8.1 `connectWallet()` fonksiyonunu implement et
    - `src/lib/stellar.ts` dosyasını oluştur
    - `@stellar/freighter-api` ile `isConnected()` ve `getPublicKey()` çağrılarını implement et
    - Freighter yüklü değilse `FREIGHTER_NOT_INSTALLED` hatası fırlat
    - _Gereksinimler: 4.2, 6.14_

  - [x] 8.2 `callAccessGate()` fonksiyonunu implement et
    - `SorobanRpc.Server`, `Contract`, `TransactionBuilder` kullanarak kontrat çağrısı oluştur
    - `simulateTransaction` → `assembleTransaction` → `signTransaction` → `sendTransaction` akışını implement et
    - `parseAccessResult()` ile yanıtı `AccessResult` tipine dönüştür
    - `SOROBAN_RPC_URL`, `CONTRACT_ID`, `NETWORK_PASSPHRASE` sabitlerini tanımla
    - _Gereksinimler: 4.1, 4.2_

  - [x] 8.3 `callWithRetry()` ve `callAccessGateWithRetry()` fonksiyonlarını implement et
    - Exponential backoff ile maksimum 3 deneme
    - 3 deneme sonrası `NetworkError` mesajı fırlat
    - _Gereksinimler: 4.6_

  - [x] 8.4 `getEntry()` ve `sendPayment()` fonksiyonlarını implement et
    - `get_entry` kontrat fonksiyonunu sorgula; kayıt yoksa `null` döndür
    - XLM transferi için `TransactionBuilder` ile ödeme operasyonu oluştur
    - _Gereksinimler: 2.3, 5.3, 5.4_

  - [ ]* 8.5 Stellar SDK entegrasyonu için birim testler yaz
    - Freighter bağlantı/bağlantı kesme senaryolarını mock ile test et
    - Retry mantığını test et (ağ hatası simülasyonu)
    - _Gereksinimler: 4.6_

- [x] 9. UI Bileşenleri — AuditCard ve StatusLoader
  - [x] 9.1 `StatusLoader` bileşenini implement et
    - `src/components/StatusLoader.tsx` dosyasını oluştur
    - Yüksek hızlı dairesel loader animasyonu ekle
    - Sırasıyla "Analyzing Fingerprint...", "Checking Wallet History...", "Auditing x402 Eligibility..." metinlerini göster
    - _Gereksinimler: 6.8_

  - [x] 9.2 `AuditCard` bileşenini implement et
    - `src/components/AuditCard.tsx` dosyasını oluştur
    - Glassmorphism kart stilini uygula (`rgba(28,33,40,0.8)`, `backdrop-blur`, `border`, `rounded-2xl`, `box-shadow`)
    - `ShieldCheck`, `Fingerprint` Lucide ikonlarını ekle
    - "Scan My Identity" butonunu ekle; tıklandığında `StatusLoader` göster ve `collectFingerprint()` → `calculateScore()` → `connectWallet()` → `callAccessGateWithRetry()` akışını başlat
    - Tüm durum geçişlerini (`idle`, `scanning`, `scored`, `connecting_wallet`, `submitting`) animasyonlu geçişlerle yönet
    - _Gereksinimler: 6.7, 6.8, 6.12, 6.13_

- [x] 10. UI Bileşenleri — ScoreGauge
  - [x] 10.1 `ScoreGauge` bileşenini implement et
    - `src/components/ScoreGauge.tsx` dosyasını oluştur
    - SVG tabanlı dairesel gauge göstergesi oluştur
    - `score >= 70` → safir mavisi (`#2563eb`), `30 <= score < 70` → kehribar (`#f59e0b`), `score < 30` → kırmızı (`#dc2626`) renk mantığını uygula
    - `animated` prop ile smooth gradient geçiş animasyonu ekle
    - _Gereksinimler: 6.9, 7.6_

- [x] 11. UI Bileşenleri — SecurityVerificationModal
  - [x] 11.1 `SecurityVerificationModal` bileşenini implement et
    - `src/components/SecurityVerificationModal.tsx` dosyasını oluştur
    - Bankacılık uygulaması bildirimi görünümünde profesyonel popup tasarımı uygula
    - "HTTP 402: High-risk connection detected. Please pay a 0.1 XLM micro-fee to verify identity." metnini göster
    - `Lock`, `Cpu` Lucide ikonlarını ekle
    - "Confirm with Freighter" ve iptal butonlarını ekle; onay durumunda `sendPayment()` çağır
    - Kehribar rengi uyarı stilini uygula
    - _Gereksinimler: 5.1, 5.2, 5.3, 6.10, 7.7_

- [x] 12. UI Bileşenleri — AuditHistoryTable
  - [x] 12.1 `AuditHistoryTable` bileşenini implement et
    - `src/components/AuditHistoryTable.tsx` dosyasını oluştur
    - "Recent Attestations" başlıklı minimalist tablo oluştur
    - User (kısaltılmış adres), Score, Timestamp ve safir mavi checkmark içeren "Verified" badge sütunlarını ekle
    - `ShieldCheck` Lucide ikonu ile Verified badge'i oluştur
    - _Gereksinimler: 6.11, 7.8_

- [x] 13. AccessGrantedScreen ve AccessDeniedScreen
  - [x] 13.1 `AccessGrantedScreen` bileşenini implement et
    - `src/components/AccessGrantedScreen.tsx` dosyasını oluştur
    - Safir mavisi tema ile erişim onayı mesajı göster
    - `score` ve `address` prop'larını görüntüle
    - `ShieldCheck` Lucide ikonu ekle
    - _Gereksinimler: 4.3, 7.2_

  - [x] 13.2 `AccessDeniedScreen` bileşenini implement et
    - `src/components/AccessDeniedScreen.tsx` dosyasını oluştur
    - Erişim reddedildi mesajı ve yeniden deneme butonu ekle
    - `onRetry` callback'i ile `AuditCard`'a geri dön
    - _Gereksinimler: 4.5, 7.2_

- [x] 14. App.tsx — Durum Yönetimi ve Bileşen Birleştirme
  - [x] 14.1 `App.tsx` içinde `AppState` ile merkezi durum yönetimini implement et
    - `useState<AppState>` ile tüm uygulama durumunu yönet
    - `phase` değerine göre `AuditCard`, `AccessGrantedScreen`, `AccessDeniedScreen` bileşenlerini koşullu render et
    - Freighter yüklü değilse kurulum bağlantısını göster
    - Hata durumlarını (`AuthError`, `InvalidScore`, `RateLimitExceeded`, `NetworkError`) kullanıcıya uygun mesajlarla göster
    - Tüm durum geçişlerini animasyonlu geçişlerle sun
    - _Gereksinimler: 4.3, 4.4, 4.5, 4.6, 6.12, 6.13, 6.14_

- [ ] 15. Frontend Kontrol Noktası — Tüm testlerin geçtiğini doğrula
  - Tüm testlerin geçtiğini doğrula, sorular varsa kullanıcıya sor.

- [ ] 16. Frontend Özellik Tabanlı Testler (fast-check)
  - [ ]* 16.1 Özellik 9 için Vitest + fast-check testi yaz
    - `src/lib/__tests__/fingerprint.test.ts` dosyasını oluştur
    - Rastgele `BrowserFingerprint` verisi üretip `calculateScore` çıktısının 0–100 aralığında olduğunu doğrula
    - **Özellik 9: Skor Aralığı Geçerliliği**
    - **Doğrular: Gereksinim 3.7**

  - [ ]* 16.2 Özellik 10 için Vitest + fast-check testi yaz
    - Headless belirtisi içeren parmak izi için `calculateScore` çıktısının 30'un altında olduğunu doğrula
    - **Özellik 10: Headless Tespiti Skoru Düşürür**
    - **Doğrular: Gereksinim 3.9**

  - [ ]* 16.3 UI bileşenleri için snapshot testleri yaz
    - `AuditCard`, `ScoreGauge`, `SecurityVerificationModal`, `AuditHistoryTable` için Vitest + React Testing Library snapshot testleri
    - _Gereksinimler: 6.7, 6.9, 6.10, 6.11_

- [ ] 17. Uçtan Uca Entegrasyon ve Testnet Deploy
  - [ ] 17.1 Soroban kontratını testnet'e deploy et
    - `Cargo.toml` içinde `soroban-sdk` bağımlılığını ve `crate-type = ["cdylib"]` ayarını doğrula
    - `soroban contract build` ile kontratı derle
    - `soroban contract deploy --network testnet` ile testnet'e deploy et
    - Deploy edilen `CONTRACT_ID`'yi `src/lib/stellar.ts` içine güncelle
    - _Gereksinimler: 4.1_

  - [ ] 17.2 Testnet üzerinde uçtan uca akışı doğrula
    - Freighter ile gerçek imzalama akışını test et
    - `AccessGranted`, `PaymentRequired`, `AccessDenied` senaryolarını testnet üzerinde doğrula
    - XLM transferi başarı ve hata senaryolarını test et
    - _Gereksinimler: 4.1, 4.2, 4.3, 4.4, 4.5, 5.3, 5.4, 5.5_

- [ ] 18. Son Kontrol Noktası — Tüm testlerin geçtiğini doğrula
  - Tüm testlerin geçtiğini doğrula, sorular varsa kullanıcıya sor.

---

## Notlar

- `*` ile işaretli görevler isteğe bağlıdır; daha hızlı MVP için atlanabilir
- Her görev, izlenebilirlik için belirli gereksinimlere referans verir
- Kontrol noktaları artımlı doğrulama sağlar
- Özellik tabanlı testler evrensel doğruluk özelliklerini doğrular
- Birim testler belirli örnekleri ve sınır koşullarını doğrular
- Tüm parmak izi hesaplamaları istemci tarafında gerçekleşir; sunucuya veri gönderilmez
