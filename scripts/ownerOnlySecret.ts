/**
 * Owner-only CDR smoke test script.
 *
 * This is adapted for PlotLock developers who want to test the CDR SDK directly
 * on Story Aeneid before replacing the mock demo vaults.
 *
 * Usage:
 *   cp .env.example .env
 *   set WALLET_PRIVATE_KEY to a funded Aeneid testnet wallet
 *   npm run cdr:owner-only
 */

import { CDRClient, initWasm, uuidToLabel } from "@piplabs/cdr-sdk";
import { createPublicClient, createWalletClient, http, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const RPC_URL = process.env.VITE_STORY_RPC_URL ?? "https://aeneid.storyrpc.io";
const STORY_API_URL = process.env.VITE_STORY_API_URL ?? "http://172.192.41.96:1317";
const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY as `0x${string}` | undefined;

if (!PRIVATE_KEY) {
  throw new Error("Set WALLET_PRIVATE_KEY in .env before running this script.");
}

const account = privateKeyToAccount(PRIVATE_KEY);
const publicClient = createPublicClient({ transport: http(RPC_URL) });
const walletClient = createWalletClient({ account, transport: http(RPC_URL) });

await initWasm();

const client = new CDRClient({
  network: "testnet",
  publicClient,
  walletClient,
  apiUrl: STORY_API_URL
});

const { uuid, txHash: allocateTx } = await client.uploader.allocate({
  updatable: false,
  writeConditionAddr: account.address,
  readConditionAddr: account.address,
  writeConditionData: "0x",
  readConditionData: "0x",
  skipConditionValidation: true
});

const payload = JSON.stringify({
  app: "PlotLock",
  type: "sealed-prediction-smoke-test",
  selectedOption: "Rina",
  note: "In the production app, this spoiler payload must not be stored publicly."
});

const globalPubKey = await client.observer.getGlobalPubKey();
const ciphertext = await client.uploader.encryptDataKey({
  dataKey: new TextEncoder().encode(payload),
  globalPubKey,
  label: uuidToLabel(uuid)
});

const { txHash: writeTx } = await client.uploader.write({
  uuid,
  accessAuxData: "0x",
  encryptedData: toHex(ciphertext.raw)
});

const { dataKey, txHash: readTx } = await client.consumer.accessCDR({
  uuid,
  accessAuxData: "0x",
  timeoutMs: 120_000
});

console.log("Vault UUID:", uuid);
console.log("Allocate tx:", allocateTx);
console.log("Write tx:", writeTx);
console.log("Read tx:", readTx);
console.log("Recovered payload:", new TextDecoder().decode(dataKey));
