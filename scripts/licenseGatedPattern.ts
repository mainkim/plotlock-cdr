/**
 * License-gated CDR pattern for PlotLock.
 *
 * This file is intentionally a skeleton because a full app must first register
 * the relevant Story IP Asset and mint / pass the correct Story license token.
 *
 * Read condition concept:
 * - write condition: OwnerWriteCondition, so the creator can seal outcomes / insight files
 * - read condition: LicenseReadCondition, so only a valid Story license token holder can decrypt
 * - accessAuxData: encoded license token ID supplied by the reader
 *
 * PlotLock uses this for:
 * 1. IP-gated reveal access
 * 2. IP-owner post-reveal insight report download
 * 3. Optional Prediction Pass participation gates
 */

export function describePlotLockLicenseGate() {
  return {
    app: "PlotLock",
    readCondition: "Story LicenseReadCondition",
    payloads: ["official outcome proof", "post-reveal fan insight report"],
    rule:
      "Only wallets that hold the required Story license token for the IP Asset can request CDR threshold decryption."
  };
}

console.log(describePlotLockLicenseGate());
