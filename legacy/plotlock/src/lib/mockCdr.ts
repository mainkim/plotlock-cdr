import type { CdrVaultKind, MockCdrVault } from "../types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const bytes = base64ToBytes(base64);
  const arrayBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(arrayBuffer).set(bytes);
  return arrayBuffer;
}

function randomHex(bytes = 16): string {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return Array.from(data)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function createCommitment(input: {
  marketId: string;
  wallet: string;
  selectedOption: string;
  salt: string;
}): Promise<string> {
  return sha256Hex(
    [input.marketId, input.wallet.toLowerCase(), input.selectedOption, input.salt].join(":")
  );
}

export async function writeMockCdrVault<T>(args: {
  kind: CdrVaultKind;
  payload: T;
  readCondition: string;
  metadata: Record<string, string>;
}): Promise<MockCdrVault> {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt"
  ]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(JSON.stringify(args.payload, null, 2));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  const exportedKey = await crypto.subtle.exportKey("raw", key);

  return {
    vaultId: `plv_${randomHex(12)}`,
    kind: args.kind,
    readCondition: args.readCondition,
    ciphertextB64: bytesToBase64(new Uint8Array(ciphertext)),
    ivB64: bytesToBase64(iv),
    exportedKeyB64: bytesToBase64(new Uint8Array(exportedKey)),
    metadata: args.metadata,
    createdAt: new Date().toISOString()
  };
}

export async function readMockCdrVault<T>(vault: MockCdrVault, readAllowed: boolean): Promise<T> {
  if (!readAllowed) {
    throw new Error(`CDR read condition failed for ${vault.vaultId}. Payload stays encrypted.`);
  }

  const key = await crypto.subtle.importKey(
    "raw",
    base64ToArrayBuffer(vault.exportedKeyB64),
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToArrayBuffer(vault.ivB64) },
    key,
    base64ToArrayBuffer(vault.ciphertextB64)
  );

  return JSON.parse(decoder.decode(plaintext)) as T;
}

export function compactHash(value: string): string {
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}
