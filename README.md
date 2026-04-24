# NebulaGate

AI-driven browser fingerprinting + x402 Payment Required protocol to block bots and verify human identity on Stellar Soroban.

## Deploy Bilgileri

| | |
|---|---|
| **Network** | Stellar Testnet |
| **Contract ID** | `CDPH6H6M7BXY27KGWOK7QFOQVJNE3ZM4UE45VQ54TXQJQ7FWVBQAAWU5` |
| **WASM Hash** | `f210af7360624ec9b9dc662f7df59b51d700f21c7bb9ff0570f0cbbd625218f8` |
| **Deploy Tarihi** | 24 Nisan 2026 |
| **Deploy Hesabı** | `GBSNYFN4EHCWSY36SRHEJLUEVHMQDGEOUZQ4DH44DU45XEFTJUP2ODCW` |

**Explorer:**
- [Kontrat](https://stellar.expert/explorer/testnet/contract/CDPH6H6M7BXY27KGWOK7QFOQVJNE3ZM4UE45VQ54TXQJQ7FWVBQAAWU5)
- [Deploy TX](https://stellar.expert/explorer/testnet/tx/27f41b48ceebcce58ffbc799a4a092f909ad7b1d948af0792e38d6e7f96b67de)

## Kontrat Fonksiyonları

| Fonksiyon | Açıklama |
|---|---|
| `initialize(admin, xlm_token)` | Kontratı başlatır |
| `access_gate(caller, score)` | Erişim kararı verir (AccessGranted / PaymentRequired / AccessDenied) |
| `get_entry(caller)` | Son erişim kaydını sorgular |
| `register_user(user, display_name, pin_hash)` | Kullanıcı profili kaydeder |
| `get_user_profile(user)` | Kullanıcı profilini sorgular |
| `subscribe(user)` | 5 XLM karşılığı 30 günlük Premium abonelik |
| `is_premium(user)` | Premium durumunu kontrol eder |
| `get_subscription(user)` | Abonelik detaylarını sorgular |

## Kurulum

```bash
# Frontend bağımlılıklarını yükle
cd frontend
npm install

# Geliştirme sunucusunu başlat
npm run dev
```

## Teknoloji Stack

- **Frontend:** React 18 + TypeScript + Tailwind CSS + Vite
- **Smart Contract:** Rust + Soroban SDK 22.0.0
- **Blockchain:** Stellar Testnet
- **Cüzdan:** Freighter
