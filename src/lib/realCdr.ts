/**
 * Real CDR integration notes for PlotLock.
 *
 * The live demo UI uses `mockCdr.ts` so judges can click through the full
 * spoilerless flow without a funded wallet. This file shows the production CDR
 * boundary for replacing the mock with Story CDR on Aeneid.
 *
 * CDR protects the encrypted payload, not public metadata. PlotLock must never
 * put `selectedOption`, live vote distribution, answer keys, or spoiler
 * reasoning in public contract events or option-specific storage.
 */

import type { Hex } from "viem";

export interface PlotLockCdrUploadInput {
  payloadBytes: Uint8Array;
  writeConditionAddr: Hex;
  readConditionAddr: Hex;
  writeConditionData: Hex;
  readConditionData: Hex;
  accessAuxData?: Hex;
}

export interface PlotLockCdrVaultRef {
  uuid: string;
  txHash?: Hex;
  mode: "story-cdr";
}

/**
 * Pseudocode adapter for real CDR vault creation.
 *
 * Replace this with a wallet-aware CDRClient from @piplabs/cdr-sdk.
 * Typical flow:
 * 1. await initWasm()
 * 2. create publicClient and walletClient with viem
 * 3. new CDRClient({ network: "testnet", publicClient, walletClient, apiUrl })
 * 4. uploader.allocate(...) or uploader.uploadCDR(...) for small prediction payloads
 * 5. consumer.accessCDR(...) after the market close / license read condition passes
 */
export async function uploadPredictionToStoryCdr(
  _input: PlotLockCdrUploadInput
): Promise<PlotLockCdrVaultRef> {
  throw new Error(
    "Wire this function to @piplabs/cdr-sdk uploader.uploadCDR or allocate/write for Aeneid. The mock demo path is in src/lib/mockCdr.ts."
  );
}

/**
 * Pseudocode adapter for encrypted outcome files.
 *
 * For larger files, Story CDR uses the encrypted file flow:
 * - encrypt file locally with an AES key
 * - upload encrypted bytes to off-chain storage
 * - store the AES key + content pointer inside a CDR vault
 * - recover the key through threshold decryption when the read condition passes
 */
export async function uploadOutcomeFileToStoryCdr(
  _file: File,
  _input: Omit<PlotLockCdrUploadInput, "payloadBytes">
): Promise<PlotLockCdrVaultRef> {
  throw new Error(
    "Wire this function to @piplabs/cdr-sdk uploader.uploadFile with IPFS / Storacha / Supabase storage."
  );
}
