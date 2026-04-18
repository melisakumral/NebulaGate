# Gereksinimler Belgesi

## Giriş

NebulaGate, Stellar Soroban blockchain platformu üzerinde çalışan, bot hesaplarını engellemek için x402 (HTTP 402 Payment Required) protokolünü kullanan akıllı bir erişim kapısı sistemidir. Sistem; tarayıcı parmak izi verilerini toplayarak bir AI güvenlik skoru hesaplar, bu skoru Soroban akıllı kontratına iletir ve skora göre erişime izin verir, mikro ödeme talep eder veya erişimi tamamen reddeder. Derin gece mavisi ve kömür grisi arka plan üzerine safir mavisi ve kehribar vurgu renkleriyle tasarlanmış profesyonel bir React/Tailwind arayüzü ile kullanıcıya görsel geri bildirim sağlar.

---

## Sözlük

- **AccessGate**: Erişim kararlarını veren Soroban akıllı kontratı.
- **AI_Scorer**: Tarayıcı parmak izi verilerini toplayıp güvenlik skoru hesaplayan frontend bileşeni.
- **BotDetector**: Fingerprint verilerini analiz ederek bot olasılığını değerlendiren modül.
- **PaymentGateway**: x402 protokolü ile XLM mikro ödeme talebini simüle eden bileşen.
- **StorageManager**: Başarılı girişleri ve skorları `env.storage()` içine kaydeden kontrat bileşeni.
- **UI_Layer**: Kullanıcıya görsel geri bildirim sağlayan React/Tailwind arayüz katmanı.
- **Fingerprint**: Kullanıcının tarayıcısına özgü tanımlayıcı veri kümesi (User-Agent, WebGL, IP vb.).
- **AI Güvenlik Skoru**: 0–100 arasında bir tam sayı; yüksek skor güvenilir kullanıcıyı, düşük skor bot şüphesini ifade eder.
- **x402 Protokolü**: HTTP 402 Payment Required yanıtını temel alan, erişim öncesi mikro ödeme talep eden protokol.
- **XLM**: Stellar ağının yerel para birimi (Lumen).
- **require_auth()**: Soroban kontratında çağıran adresin imzasını doğrulayan yerleşik fonksiyon.
- **Eşik Skoru (Threshold)**: Erişim kararını belirleyen skor sınırı; varsayılan olarak 60 (düşük eşik) ve 30 (red eşiği).

---

## Gereksinimler

### Gereksinim 1: Soroban Akıllı Kontratı — Erişim Kapısı Fonksiyonu

**Kullanıcı Hikayesi:** Bir sistem yöneticisi olarak, yalnızca güvenilir kullanıcıların sisteme erişmesini istiyorum; böylece bot saldırılarını ve yetkisiz erişimleri engelleyebilirim.

#### Kabul Kriterleri

1. THE AccessGate SHALL `access_gate(env, caller, score)` imzasına sahip bir public fonksiyon sunmak.
2. WHEN `access_gate` fonksiyonu çağrıldığında, THE AccessGate SHALL `require_auth()` ile çağıranın Stellar adres imzasını doğrulamak.
3. IF imza doğrulaması başarısız olursa, THEN THE AccessGate SHALL işlemi iptal etmek ve `AuthError` döndürmek.
4. WHEN `score` parametresi 60'ın üzerinde olduğunda, THE AccessGate SHALL erişime izin vermek ve `AccessGranted` sonucunu döndürmek.
5. WHEN `score` parametresi 30 ile 60 arasında (30 dahil, 60 hariç) olduğunda, THE AccessGate SHALL x402 mantığıyla mikro ödeme talebi simülasyonu başlatmak ve `PaymentRequired` sonucunu döndürmek.
6. WHEN `score` parametresi 30'un altında olduğunda, THE AccessGate SHALL erişimi reddetmek ve `AccessDenied` sonucunu döndürmek.
7. WHEN erişim başarıyla verildiğinde, THE StorageManager SHALL çağıranın adresini, skorunu ve zaman damgasını `env.storage()` içine kaydetmek.
8. THE AccessGate SHALL `score` parametresini yalnızca 0–100 aralığında kabul etmek; bu aralık dışındaki değerler için `InvalidScore` hatası döndürmek.

---

### Gereksinim 2: Soroban Kontratı — Depolama ve Sorgulama

**Kullanıcı Hikayesi:** Bir sistem yöneticisi olarak, geçmiş erişim kayıtlarını sorgulamak istiyorum; böylece güvenlik denetimi yapabilir ve şüpheli aktiviteleri izleyebilirim.

#### Kabul Kriterleri

1. THE StorageManager SHALL her başarılı erişim için `(caller_address, score, timestamp)` üçlüsünü `env.storage().instance()` içine kaydetmek.
2. WHEN aynı adres birden fazla kez başarıyla erişim sağladığında, THE StorageManager SHALL en güncel kaydı saklamak ve önceki kaydın üzerine yazmak.
3. THE AccessGate SHALL `get_entry(env, caller)` fonksiyonu ile belirli bir adresin son erişim kaydını döndürmek.
4. IF sorgulanan adres için kayıt bulunamazsa, THEN THE AccessGate SHALL `None` değeri döndürmek.
5. THE StorageManager SHALL depolama anahtarı olarak çağıranın Stellar adresini kullanmak.

---

### Gereksinim 3: Siber Güvenlik Katmanı — Tarayıcı Parmak İzi Toplama

**Kullanıcı Hikayesi:** Bir güvenlik sistemi olarak, kullanıcının tarayıcı özelliklerini toplamak istiyorum; böylece bot ile gerçek kullanıcı arasındaki farkı tespit edebileyim.

#### Kabul Kriterleri

1. THE AI_Scorer SHALL kullanıcının User-Agent bilgisini toplamak.
2. THE AI_Scorer SHALL kullanıcının WebGL renderer ve vendor bilgilerini toplamak.
3. THE AI_Scorer SHALL kullanıcının IP adresini harici bir servis aracılığıyla tespit etmek.
4. THE AI_Scorer SHALL tarayıcının Canvas parmak izini hesaplamak.
5. THE AI_Scorer SHALL ekran çözünürlüğü, renk derinliği ve piksel yoğunluğu bilgilerini toplamak.
6. THE AI_Scorer SHALL tarayıcıda yüklü eklenti (plugin) sayısını ve listesini toplamak.
7. WHEN tüm parmak izi verileri toplandığında, THE AI_Scorer SHALL bu verileri 0–100 arasında bir AI güvenlik skoru olarak hesaplamak.
8. IF herhangi bir parmak izi verisi toplanamıyorsa, THEN THE AI_Scorer SHALL eksik veriyi varsayılan bir değerle doldurmak ve skoru buna göre düşürmek.
9. THE BotDetector SHALL headless tarayıcı belirtilerini (navigator.webdriver, eksik WebGL, sıfır plugin) tespit etmek ve skoru 30'un altına düşürmek.

---

### Gereksinim 4: Siber Güvenlik Katmanı — Kontrat Entegrasyonu

**Kullanıcı Hikayesi:** Bir frontend geliştiricisi olarak, hesaplanan AI skorunu Soroban kontratına göndermek istiyorum; böylece erişim kararı zincir üzerinde alınabilsin.

#### Kabul Kriterleri

1. WHEN AI güvenlik skoru hesaplandığında, THE AI_Scorer SHALL skoru Stellar JS SDK aracılığıyla `access_gate` kontrat fonksiyonuna iletmek.
2. THE AI_Scorer SHALL kontrat çağrısını kullanıcının Stellar cüzdanı (Freighter veya benzeri) ile imzalamak.
3. WHEN kontrat `AccessGranted` döndürdüğünde, THE UI_Layer SHALL kullanıcıya erişim onayı mesajı göstermek.
4. WHEN kontrat `PaymentRequired` döndürdüğünde, THE PaymentGateway SHALL x402 protokolü uyarısını ve gerekli XLM miktarını kullanıcıya göstermek.
5. WHEN kontrat `AccessDenied` döndürdüğünde, THE UI_Layer SHALL kullanıcıya erişim reddedildi mesajı göstermek ve yeniden deneme seçeneği sunmak.
6. IF kontrat çağrısı ağ hatası nedeniyle başarısız olursa, THEN THE AI_Scorer SHALL en fazla 3 kez yeniden denemek ve ardından `NetworkError` mesajı göstermek.

---

### Gereksinim 5: x402 Mikro Ödeme Simülasyonu

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, orta düzey güvenlik skorum varsa mikro ödeme yaparak sisteme erişmek istiyorum; böylece meşru kullanıcılar engellenmeden sistemi kullanabilsin.

#### Kabul Kriterleri

1. WHEN `PaymentRequired` durumu tetiklendiğinde, THE PaymentGateway SHALL gerekli XLM miktarını (varsayılan: 0.1 XLM) kullanıcıya göstermek.
2. THE PaymentGateway SHALL ödeme talebini HTTP 402 yanıt kodu semantiğiyle simüle etmek.
3. WHEN kullanıcı ödemeyi onayladığında, THE PaymentGateway SHALL XLM transferini Stellar ağı üzerinden gerçekleştirmek.
4. WHEN XLM transferi başarıyla tamamlandığında, THE AccessGate SHALL erişime izin vermek ve kaydı `env.storage()` içine kaydetmek.
5. IF XLM transferi başarısız olursa, THEN THE PaymentGateway SHALL kullanıcıya hata mesajı göstermek ve ödeme adımını yeniden sunmak.
6. THE PaymentGateway SHALL ödeme miktarını yapılandırılabilir tutmak; varsayılan değer 0.1 XLM olmak üzere kontrat sahibi tarafından güncellenebilmek.

---

### Gereksinim 6: Kullanıcı Arayüzü — Profesyonel Güvenlik Temalı UI

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, sistemin beni taradığını görsel olarak görmek istiyorum; böylece güvenlik sürecinin işlediğini anlayabileyim.

#### Kabul Kriterleri

1. THE UI_Layer SHALL derin gece mavisi (midnight navy) ve kömür grisi (charcoal grey) arka plan renkleriyle karanlık (dark mode) bir React/Tailwind arayüzü sunmak; neon yeşil veya kırmızı renk paleti kullanmamak.
2. THE UI_Layer SHALL ana vurgu rengi olarak canlı safir mavisi (sapphire blue) kullanmak; bu renk aksiyon butonları ve başarı durumları için uygulanmak.
3. THE UI_Layer SHALL ikincil vurgu rengi olarak sıcak kehribar/turuncu (amber/orange) kullanmak; bu renk uyarı durumları ve 402 hataları için uygulanmak.
4. THE UI_Layer SHALL tüm tipografiyi beyaz renkte sunmak; monospace veya terminal estetiğinden kaçınmak.
5. THE UI_Layer SHALL Lucide icon kütüphanesinden `ShieldCheck`, `Cpu`, `Fingerprint` ve `Lock` ikonlarını kullanmak.
6. THE UI_Layer SHALL tüm kartlarda yumuşak gölgeler (subtle shadows) ve geniş yuvarlatılmış köşeler (rounded-2xl) uygulamak.
7. THE UI_Layer SHALL merkezi bir `AuditCard` bileşeni sunmak; bu bileşen glassmorphism kart tasarımına sahip olmak ve "Scan My Identity" butonu içermek.
8. WHEN "Scan My Identity" butonuna tıklandığında, THE UI_Layer SHALL yüksek hızlı dairesel bir loader animasyonu göstermek ve sırasıyla "Analyzing Fingerprint...", "Checking Wallet History...", "Auditing x402 Eligibility..." metinlerini görüntülemek; matrix kodu animasyonu kullanmamak.
9. WHEN AI skoru hesaplandığında, THE UI_Layer SHALL `ScoreGauge` bileşeniyle skoru modern ve şık bir gauge göstergesi üzerinde sunmak; 70 ve üzeri skorlar için safir mavisi, 30–60 arası skorlar için kehribar rengi smooth gradient uygulamak.
10. WHEN kontrat `PaymentRequired` döndürdüğünde, THE UI_Layer SHALL `SecurityVerificationModal` bileşenini bankacılık uygulaması bildirimi görünümünde profesyonel bir popup olarak göstermek; popup "HTTP 402: High-risk connection detected. Please pay a 0.1 XLM micro-fee to verify identity." metnini ve "Confirm with Freighter" butonunu içermek.
11. THE UI_Layer SHALL `AuditHistoryTable` bileşeniyle "Recent Attestations" başlıklı minimalist bir tablo sunmak; tablo User, Score, Timestamp ve safir mavi checkmark içeren "Verified" badge sütunlarını içermek.
12. THE UI_Layer SHALL tüm durum geçişlerini (tarama, ödeme, onay, red) animasyonlu geçişlerle sunmak.
13. THE UI_Layer SHALL mobil ve masaüstü ekran boyutlarında düzgün görüntülenmek (responsive tasarım).
14. WHERE Freighter cüzdanı yüklü değilse, THE UI_Layer SHALL kullanıcıya Freighter kurulum bağlantısını göstermek.

---

### Gereksinim 7: v0.dev Tasarım Promptu Çıktısı

**Kullanıcı Hikayesi:** Bir frontend geliştiricisi olarak, v0.dev ile hızlıca UI prototipi oluşturmak istiyorum; böylece tasarım sürecini hızlandırabileyim.

#### Kabul Kriterleri

1. THE UI_Layer SHALL v0.dev ile üretilebilecek bir React/Tailwind bileşen yapısına sahip olmak.
2. THE UI_Layer SHALL aşağıdaki bileşenleri içermek: `AuditCard`, `ScoreGauge`, `SecurityVerificationModal`, `AuditHistoryTable`, `AccessGrantedScreen`, `AccessDeniedScreen`.
3. THE UI_Layer SHALL renk paleti olarak derin gece mavisi ve kömür grisi arka plan, safir mavisi birincil vurgu ve kehribar/turuncu ikincil vurgu tonlarını kullanmak; neon yeşil (#00ff41) ve kırmızı (#ff0040) renkleri kullanmamak.
4. THE UI_Layer SHALL beyaz tipografi kullanmak; terminal veya matrix estetiğine özgü monospace font kullanmamak.
5. THE UI_Layer SHALL `AuditCard` bileşenini glassmorphism efektli kart ve "Scan My Identity" butonu ile tasarlamak; buton tıklandığında dairesel loader ve sıralı durum metinleri göstermek.
6. THE UI_Layer SHALL `ScoreGauge` bileşenini safir mavisinden kehribara smooth gradient geçişli modern bir gauge olarak tasarlamak.
7. THE UI_Layer SHALL `SecurityVerificationModal` bileşenini bankacılık uygulaması bildirimi görünümünde, "HTTP 402: High-risk connection detected. Please pay a 0.1 XLM micro-fee to verify identity." metni ve "Confirm with Freighter" butonu ile tasarlamak.
8. THE UI_Layer SHALL `AuditHistoryTable` bileşenini "Recent Attestations" başlıklı, User, Score, Timestamp ve safir mavi "Verified" badge sütunlarına sahip minimalist bir tablo olarak tasarlamak.
9. THE UI_Layer SHALL Lucide icon kütüphanesinden `ShieldCheck`, `Cpu`, `Fingerprint` ve `Lock` ikonlarını kullanmak.

---

### Gereksinim 8: Güvenlik ve Hata Yönetimi

**Kullanıcı Hikayesi:** Bir sistem yöneticisi olarak, sistemin hatalı veya kötü niyetli girdilere karşı dayanıklı olmasını istiyorum; böylece güvenlik açıkları oluşmasın.

#### Kabul Kriterleri

1. THE AccessGate SHALL kontrat çağrısında `require_auth()` doğrulamasını her zaman gerçekleştirmek; doğrulama atlanamaz olmak.
2. IF `score` parametresi 0–100 aralığı dışında bir değer içeriyorsa, THEN THE AccessGate SHALL işlemi reddetmek ve `InvalidScore` hatası döndürmek.
3. THE AI_Scorer SHALL parmak izi verilerini asla sunucuya göndermemek; tüm hesaplama istemci tarafında (client-side) gerçekleşmek.
4. THE AccessGate SHALL aynı adresten 60 saniye içinde 10'dan fazla çağrı geldiğinde `RateLimitExceeded` hatası döndürmek.
5. IF kontrat çağrısı beklenmedik bir hata ile sonuçlanırsa, THEN THE AccessGate SHALL hatayı loglamak ve `InternalError` döndürmek.
