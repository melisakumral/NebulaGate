/**
 * stellar-utils.ts
 * Freighter cüzdan bağlantısı ve Soroban kontrat çağrıları.
 * DEMO_MODE = true → Freighter/deploy olmadan çalışır.
 * Deploy sonrası: DEMO_MODE = false, CONTRACT_ID = gerçek ID
 */

import {
  Contract,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  SorobanRpc,
  nativeToScVal,
  xdr,
  Address,
  Operation,
  Asset,
} from '@stellar/stellar-sdk'
import type { AccessResult, AccessEntry } from '../types'

// ─── Sabitler ──────────────────────────────────────────────────────────────

export const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org'
export const NETWORK_PASSPHRASE = Networks.TESTNET
export const CONTRACT_ID = 'PLACEHOLDER_CONTRACT_ID'
export const TREASURY_ADDRESS = 'GDQELTAUPWALCHCBDDO34PQ2KQQ2RQYHS247YDLMBO767OFEHXDO6YDZ'

/** true → demo mod (Freighter/deploy gerekmez). Deploy sonrası false yap. */
export const DEMO_MODE = true

// ─── Yardımcılar ───────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt === maxRetries - 1) throw err
      await delay(baseDelay * Math.pow(2, attempt))
    }
  }
  throw new Error('NetworkError: Max retries exceeded')
}

// ─── Freighter API (v3 uyumlu) ─────────────────────────────────────────────

async function freighterIsConnected(): Promise<boolean> {
  try {
    // @stellar/freighter-api v3: default export veya named export
    const mod = await import('@stellar/freighter-api')
    const fn = (mod as Record<string, unknown>).isConnected ?? (mod as Record<string, unknown>).default
    if (typeof fn === 'function') {
      const result = await (fn as () => Promise<boolean | { isConnected: boolean }>)()
      if (typeof result === 'boolean') return result
      if (typeof result === 'object' && result !== null) return (result as { isConnected: boolean }).isConnected
    }
    return false
  } catch {
    return false
  }
}

async function freighterGetPublicKey(): Promise<string> {
  const mod = await import('@stellar/freighter-api')
  // v3: getAddress() veya getPublicKey()
  const getAddress = (mod as Record<string, unknown>).getAddress
  const getPublicKey = (mod as Record<string, unknown>).getPublicKey
  if (typeof getAddress === 'function') {
    const result = await (getAddress as () => Promise<{ address: string } | string>)()
    if (typeof result === 'string') return result
    if (typeof result === 'object' && result !== null) return (result as { address: string }).address
  }
  if (typeof getPublicKey === 'function') {
    const result = await (getPublicKey as () => Promise<string>)()
    return result
  }
  throw new Error('FREIGHTER_API_INCOMPATIBLE')
}

async function freighterSignTransaction(xdrStr: string): Promise<string> {
  const mod = await import('@stellar/freighter-api')
  const signTx = (mod as Record<string, unknown>).signTransaction
  if (typeof signTx === 'function') {
    const result = await (signTx as (
      xdr: string,
      opts: { networkPassphrase: string },
    ) => Promise<string | { signedTxXdr: string }>)(xdrStr, {
      networkPassphrase: NETWORK_PASSPHRASE,
    })
    if (typeof result === 'string') return result
    if (typeof result === 'object' && result !== null) return (result as { signedTxXdr: string }).signedTxXdr
  }
  throw new Error('FREIGHTER_SIGN_FAILED')
}

// ─── Connect Wallet ────────────────────────────────────────────────────────

export async function connectWallet(): Promise<string> {
  if (DEMO_MODE) {
    await delay(700)
    // Demo'da rastgele bir Stellar-benzeri adres üret
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    let addr = 'G'
    for (let i = 0; i < 55; i++) addr += chars[Math.floor(Math.random() * chars.length)]
    return addr
  }

  const connected = await freighterIsConnected()
  if (!connected) throw new Error('FREIGHTER_NOT_INSTALLED')

  const publicKey = await freighterGetPublicKey()
  if (!publicKey) throw new Error('WALLET_NOT_CONNECTED')
  return publicKey
}

// ─── access_gate Kontrat Çağrısı ───────────────────────────────────────────

export async function callAccessGate(
  callerPublicKey: string,
  score: number,
): Promise<AccessResult> {
  if (DEMO_MODE) {
    await delay(1000)
    if (score > 60) return 'AccessGranted'
    if (score >= 30) return 'PaymentRequired'
    return 'AccessDenied'
  }

  const server = new SorobanRpc.Server(SOROBAN_RPC_URL)
  const contract = new Contract(CONTRACT_ID)
  const account = await server.getAccount(callerPublicKey)

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'access_gate',
        new Address(callerPublicKey).toScVal(),
        nativeToScVal(score, { type: 'u32' }),
      ),
    )
    .setTimeout(30)
    .build()

  const simResult = await server.simulateTransaction(tx)
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`SimulationError: ${simResult.error}`)
  }

  const preparedXdr = SorobanRpc.assembleTransaction(tx, simResult).build().toXDR()
  const signedXdr = await freighterSignTransaction(preparedXdr)

  const response = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE),
  )
  if (response.status === 'ERROR') throw new Error('ContractError')

  let getResponse = await server.getTransaction(response.hash)
  let attempts = 0
  while (
    getResponse.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND &&
    attempts < 10
  ) {
    await delay(1000)
    getResponse = await server.getTransaction(response.hash)
    attempts++
  }

  if (getResponse.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
    const rv = getResponse.returnValue
    if (rv) return parseAccessResult(rv)
  }
  throw new Error('TransactionFailed')
}

export async function callAccessGateWithRetry(
  caller: string,
  score: number,
): Promise<AccessResult> {
  return callWithRetry(() => callAccessGate(caller, score))
}

// ─── get_entry ─────────────────────────────────────────────────────────────

export async function getEntry(caller: string): Promise<AccessEntry | null> {
  if (DEMO_MODE) return null
  try {
    const server = new SorobanRpc.Server(SOROBAN_RPC_URL)
    const contract = new Contract(CONTRACT_ID)
    const account = await server.getAccount(caller)
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('get_entry', new Address(caller).toScVal()))
      .setTimeout(30)
      .build()
    const sim = await server.simulateTransaction(tx)
    if (SorobanRpc.Api.isSimulationError(sim)) return null
    const rv = (sim as SorobanRpc.Api.SimulateTransactionSuccessResponse).result?.retval
    if (!rv || rv.switch().name === 'scvVoid') return null
    return { score: 0, timestamp: 0 }
  } catch {
    return null
  }
}

// ─── XLM Transferi ─────────────────────────────────────────────────────────

export async function sendPayment(
  from: string,
  to: string,
  amount: string,
): Promise<boolean> {
  if (DEMO_MODE) {
    await delay(1400)
    return true
  }
  const server = new SorobanRpc.Server(SOROBAN_RPC_URL)
  const account = await server.getAccount(from)
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.payment({ destination: to, asset: Asset.native(), amount }))
    .setTimeout(30)
    .build()
  const signedXdr = await freighterSignTransaction(tx.toXDR())
  const response = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE),
  )
  return response.status !== 'ERROR'
}

// ─── SHA-256 (Tamper Protection & PIN Hash) ────────────────────────────────

export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ─── Kullanıcı Profili ─────────────────────────────────────────────────────

export interface UserProfile {
  displayName: string
  pinHash: string
  registeredAt: number
}

/**
 * Kullanıcı profilini Soroban kontratına kaydeder.
 * PIN ham olarak gönderilmez — SHA-256 hash'i gönderilir.
 */
export async function registerUser(
  callerPublicKey: string,
  displayName: string,
  pin: string,              // 4 haneli PIN — burada hash'lenir, kontrata hash gider
): Promise<boolean> {
  const pinHash = await sha256(pin)

  if (DEMO_MODE) {
    await delay(900)
    // Demo'da localStorage'a kaydet (kontrat simülasyonu)
    localStorage.setItem(
      `nebula_profile_${callerPublicKey}`,
      JSON.stringify({ displayName, pinHash, registeredAt: Date.now() }),
    )
    return true
  }

  const server = new SorobanRpc.Server(SOROBAN_RPC_URL)
  const contract = new Contract(CONTRACT_ID)
  const account = await server.getAccount(callerPublicKey)

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'register_user',
        new Address(callerPublicKey).toScVal(),
        nativeToScVal(displayName, { type: 'string' }),
        nativeToScVal(pinHash, { type: 'string' }),
      ),
    )
    .setTimeout(30)
    .build()

  const simResult = await server.simulateTransaction(tx)
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`SimulationError: ${simResult.error}`)
  }

  const preparedXdr = SorobanRpc.assembleTransaction(tx, simResult).build().toXDR()
  const signedXdr = await freighterSignTransaction(preparedXdr)
  const response = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE),
  )
  return response.status !== 'ERROR'
}

/**
 * Kullanıcı profilini sorgular.
 * Demo modda localStorage'dan okur.
 */
export async function getUserProfile(
  callerPublicKey: string,
): Promise<UserProfile | null> {
  if (DEMO_MODE) {
    const raw = localStorage.getItem(`nebula_profile_${callerPublicKey}`)
    if (!raw) return null
    try {
      return JSON.parse(raw) as UserProfile
    } catch {
      return null
    }
  }

  try {
    const server = new SorobanRpc.Server(SOROBAN_RPC_URL)
    const contract = new Contract(CONTRACT_ID)
    const account = await server.getAccount(callerPublicKey)
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call('get_user_profile', new Address(callerPublicKey).toScVal()),
      )
      .setTimeout(30)
      .build()
    const sim = await server.simulateTransaction(tx)
    if (SorobanRpc.Api.isSimulationError(sim)) return null
    const rv = (sim as SorobanRpc.Api.SimulateTransactionSuccessResponse).result?.retval
    if (!rv || rv.switch().name === 'scvVoid') return null
    // Gerçek ayrıştırma deploy sonrası yapılır
    return null
  } catch {
    return null
  }
}

/**
 * PIN doğrulama — girilen PIN'in hash'i kayıtlı hash ile eşleşiyor mu?
 */
export async function verifyPin(
  callerPublicKey: string,
  enteredPin: string,
): Promise<boolean> {
  const profile = await getUserProfile(callerPublicKey)
  if (!profile) return false
  const enteredHash = await sha256(enteredPin)
  return enteredHash === profile.pinHash
}

// ─── Premium Abonelik ──────────────────────────────────────────────────────

export interface SubscriptionStatus {
  isPremium: boolean
  expiresAt: number | null  // Unix timestamp (ms)
}

/**
 * Kontrata subscribe() çağrısı yapar.
 * Demo modda 5 XLM ödeme simüle edilir, premium aktif olur.
 * Gerçek modda: callerPublicKey → kontrat → 5 XLM transfer
 */
export async function subscribePremium(
  callerPublicKey: string,
): Promise<boolean> {
  if (DEMO_MODE) {
    await delay(1800)
    return true
  }

  const server = new SorobanRpc.Server(SOROBAN_RPC_URL)
  const contract = new Contract(CONTRACT_ID)
  const account = await server.getAccount(callerPublicKey)

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'subscribe',
        new Address(callerPublicKey).toScVal(),
      ),
    )
    .setTimeout(30)
    .build()

  const simResult = await server.simulateTransaction(tx)
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`SimulationError: ${simResult.error}`)
  }

  const preparedXdr = SorobanRpc.assembleTransaction(tx, simResult).build().toXDR()
  const signedXdr = await freighterSignTransaction(preparedXdr)
  const response = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE),
  )
  return response.status !== 'ERROR'
}

/**
 * Kullanıcının premium durumunu sorgular.
 * Demo modda her zaman false döner (subscribe sonrası true olur).
 */
export async function checkSubscription(
  callerPublicKey: string,
): Promise<SubscriptionStatus> {
  if (DEMO_MODE) {
    return { isPremium: false, expiresAt: null }
  }

  try {
    const server = new SorobanRpc.Server(SOROBAN_RPC_URL)
    const contract = new Contract(CONTRACT_ID)
    const account = await server.getAccount(callerPublicKey)

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call('is_premium', new Address(callerPublicKey).toScVal()),
      )
      .setTimeout(30)
      .build()

    const sim = await server.simulateTransaction(tx)
    if (SorobanRpc.Api.isSimulationError(sim)) return { isPremium: false, expiresAt: null }

    const rv = (sim as SorobanRpc.Api.SimulateTransactionSuccessResponse).result?.retval
    if (!rv) return { isPremium: false, expiresAt: null }

    const isPremium = rv.switch().name === 'scvBool' && rv.b()
    return { isPremium: !!isPremium, expiresAt: null }
  } catch {
    return { isPremium: false, expiresAt: null }
  }
}

// ─── Yardımcı: XDR ayrıştırma ─────────────────────────────────────────────

function parseAccessResult(rv: xdr.ScVal): AccessResult {
  try {
    if (rv.switch().name === 'scvVec') {
      const sym = rv.vec()?.[0]?.sym?.()?.toString()
      if (sym === 'AccessGranted') return 'AccessGranted'
      if (sym === 'PaymentRequired') return 'PaymentRequired'
      if (sym === 'AccessDenied') return 'AccessDenied'
    }
    if (rv.switch().name === 'scvSymbol') {
      const sym = rv.sym()?.toString()
      if (sym === 'AccessGranted') return 'AccessGranted'
      if (sym === 'PaymentRequired') return 'PaymentRequired'
      if (sym === 'AccessDenied') return 'AccessDenied'
    }
  } catch { /* */ }
  throw new Error('PARSE_ERROR')
}
