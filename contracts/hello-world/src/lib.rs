#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    Address, Env, String, token,
};

// ─── Sabitler ──────────────────────────────────────────────────────────────

const RATE_LIMIT_MAX: u32 = 10;
// ~30 gün: 30 * 24 * 60 * 60 / 5 = 518_400 ledger (5s/ledger)
const SUBSCRIPTION_DURATION_LEDGERS: u32 = 518_400;
// 5 XLM = 50_000_000 stroops
const SUBSCRIPTION_PRICE_STROOPS: i128 = 50_000_000;

// ─── Tipler ────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub enum AccessResult {
    AccessGranted,
    PaymentRequired,
    AccessDenied,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum ContractError {
    AuthError            = 1,
    InvalidScore         = 2,
    RateLimitExceeded    = 3,
    InternalError        = 4,
    InsufficientPayment  = 5,
    AlreadySubscribed    = 6,
}

#[contracttype]
#[derive(Clone)]
pub struct AccessEntry {
    pub score: u32,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct SubscriptionEntry {
    pub expires_at_ledger: u32,
    pub subscribed_at: u64,
}

/// Kullanıcı profili — display_name + SHA-256 pin_hash
#[contracttype]
#[derive(Clone)]
pub struct UserProfile {
    pub display_name: String,
    pub pin_hash: String,   // SHA-256(PIN) — ham PIN asla saklanmaz
    pub registered_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Entry(Address),
    RateLimit(Address),
    Subscription(Address),
    UserProfile(Address),
    Admin,
    XlmToken,
}

// ─── Kontrat ───────────────────────────────────────────────────────────────

#[contract]
pub struct AccessGateContract;

#[contractimpl]
impl AccessGateContract {

    // ── Başlatma: admin ve XLM token adresini kaydet ───────────────────
    pub fn initialize(env: Env, admin: Address, xlm_token: Address) {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::XlmToken, &xlm_token);
    }

    // ── Abonelik: 5 XLM öde, 30 gün Premium kazan ─────────────────────
    pub fn subscribe(
        env: Env,
        user: Address,
    ) -> Result<SubscriptionEntry, ContractError> {
        user.require_auth();

        // Mevcut abonelik kontrolü
        let sub_key = DataKey::Subscription(user.clone());
        if let Some(existing) = env.storage().instance().get::<DataKey, SubscriptionEntry>(&sub_key) {
            if existing.expires_at_ledger > env.ledger().sequence() {
                return Err(ContractError::AlreadySubscribed);
            }
        }

        // XLM token adresi
        let xlm_token: Address = env
            .storage()
            .instance()
            .get(&DataKey::XlmToken)
            .unwrap_or_else(|| panic!("Not initialized"));

        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic!("Not initialized"));

        // 5 XLM transferi: user → admin (treasury)
        let token_client = token::Client::new(&env, &xlm_token);
        token_client.transfer(&user, &admin, &SUBSCRIPTION_PRICE_STROOPS);

        // Abonelik kaydı
        let entry = SubscriptionEntry {
            expires_at_ledger: env.ledger().sequence() + SUBSCRIPTION_DURATION_LEDGERS,
            subscribed_at: env.ledger().timestamp(),
        };
        env.storage().instance().set(&sub_key, &entry);

        Ok(entry)
    }

    // ── Abonelik durumu sorgula ────────────────────────────────────────
    pub fn get_subscription(
        env: Env,
        user: Address,
    ) -> Option<SubscriptionEntry> {
        let key = DataKey::Subscription(user);
        env.storage().instance().get(&key)
    }

    // ── Abonelik aktif mi? ─────────────────────────────────────────────
    pub fn is_premium(env: Env, user: Address) -> bool {
        let key = DataKey::Subscription(user);
        if let Some(sub) = env.storage().instance().get::<DataKey, SubscriptionEntry>(&key) {
            return sub.expires_at_ledger > env.ledger().sequence();
        }
        false
    }

    // ── Ana erişim kapısı ──────────────────────────────────────────────
    pub fn access_gate(
        env: Env,
        caller: Address,
        score: u32,
    ) -> Result<AccessResult, ContractError> {
        caller.require_auth();

        if score > 100 {
            return Err(ContractError::InvalidScore);
        }

        // Rate limiting
        let rate_key = DataKey::RateLimit(caller.clone());
        let call_count: u32 = env.storage().temporary().get(&rate_key).unwrap_or(0);
        if call_count >= RATE_LIMIT_MAX {
            return Err(ContractError::RateLimitExceeded);
        }
        env.storage().temporary().set(&rate_key, &(call_count + 1));
        env.storage().temporary().extend_ttl(&rate_key, 12, 12);

        // Premium abonelik kontrolü — aktifse skora bakma, direkt PASS
        let is_premium = {
            let sub_key = DataKey::Subscription(caller.clone());
            if let Some(sub) = env.storage().instance().get::<DataKey, SubscriptionEntry>(&sub_key) {
                sub.expires_at_ledger > env.ledger().sequence()
            } else {
                false
            }
        };

        let result = if is_premium {
            // Premium kullanıcı — skor ne olursa olsun AccessGranted
            let entry = AccessEntry {
                score,
                timestamp: env.ledger().timestamp(),
            };
            env.storage().instance().set(&DataKey::Entry(caller.clone()), &entry);
            AccessResult::AccessGranted
        } else if score > 60 {
            let entry = AccessEntry {
                score,
                timestamp: env.ledger().timestamp(),
            };
            env.storage().instance().set(&DataKey::Entry(caller.clone()), &entry);
            AccessResult::AccessGranted
        } else if score >= 30 {
            AccessResult::PaymentRequired
        } else {
            AccessResult::AccessDenied
        };

        Ok(result)
    }

    // ── Erişim kaydı sorgula ───────────────────────────────────────────
    pub fn get_entry(env: Env, caller: Address) -> Option<AccessEntry> {
        env.storage().instance().get(&DataKey::Entry(caller))
    }

    // ── Kullanıcı profili kaydet (display_name + SHA-256 pin_hash) ─────
    pub fn register_user(
        env: Env,
        user: Address,
        display_name: String,
        pin_hash: String,   // Frontend SHA-256(PIN) gönderir — ham PIN gelmez
    ) -> UserProfile {
        user.require_auth();
        let profile = UserProfile {
            display_name,
            pin_hash,
            registered_at: env.ledger().timestamp(),
        };
        env.storage()
            .instance()
            .set(&DataKey::UserProfile(user), &profile);
        profile
    }

    // ── Kullanıcı profili sorgula ──────────────────────────────────────
    pub fn get_user_profile(env: Env, user: Address) -> Option<UserProfile> {
        env.storage()
            .instance()
            .get(&DataKey::UserProfile(user))
    }
}

// ─── Testler ───────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env};

    fn setup() -> (Env, soroban_sdk::Address, AccessGateContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, AccessGateContract);
        let client = AccessGateContractClient::new(&env, &contract_id);
        let caller = Address::generate(&env);
        (env, caller, client)
    }

    #[test]
    fn test_access_granted_high_score() {
        let (_, caller, client) = setup();
        assert!(matches!(client.access_gate(&caller, &75), AccessResult::AccessGranted));
    }

    #[test]
    fn test_payment_required_mid_score() {
        let (_, caller, client) = setup();
        assert!(matches!(client.access_gate(&caller, &45), AccessResult::PaymentRequired));
    }

    #[test]
    fn test_access_denied_low_score() {
        let (_, caller, client) = setup();
        assert!(matches!(client.access_gate(&caller, &15), AccessResult::AccessDenied));
    }

    #[test]
    fn test_invalid_score_rejected() {
        let (_, caller, client) = setup();
        assert!(client.try_access_gate(&caller, &101).is_err());
    }

    #[test]
    fn test_boundary_score_60() {
        let (_, caller, client) = setup();
        assert!(matches!(client.access_gate(&caller, &60), AccessResult::PaymentRequired));
    }

    #[test]
    fn test_boundary_score_61() {
        let (_, caller, client) = setup();
        assert!(matches!(client.access_gate(&caller, &61), AccessResult::AccessGranted));
    }

    #[test]
    fn test_boundary_score_30() {
        let (_, caller, client) = setup();
        assert!(matches!(client.access_gate(&caller, &30), AccessResult::PaymentRequired));
    }

    #[test]
    fn test_boundary_score_29() {
        let (_, caller, client) = setup();
        assert!(matches!(client.access_gate(&caller, &29), AccessResult::AccessDenied));
    }

    #[test]
    fn test_get_entry_after_granted() {
        let (_, caller, client) = setup();
        client.access_gate(&caller, &80);
        let entry = client.get_entry(&caller);
        assert!(entry.is_some());
        assert_eq!(entry.unwrap().score, 80);
    }

    #[test]
    fn test_get_entry_none_for_unknown() {
        let (_, caller, client) = setup();
        assert!(client.get_entry(&caller).is_none());
    }

    #[test]
    fn test_entry_updated_on_second_access() {
        let (_, caller, client) = setup();
        client.access_gate(&caller, &70);
        client.access_gate(&caller, &90);
        assert_eq!(client.get_entry(&caller).unwrap().score, 90);
    }

    #[test]
    fn test_rate_limit_exceeded() {
        let (_, caller, client) = setup();
        for _ in 0..10 {
            let _ = client.try_access_gate(&caller, &75);
        }
        assert!(client.try_access_gate(&caller, &75).is_err());
    }

    #[test]
    fn test_is_premium_false_by_default() {
        let (_, caller, client) = setup();
        assert!(!client.is_premium(&caller));
    }
}
