import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import * as fs from "fs";
import * as dotenv from "dotenv";
import { Buffer } from "buffer";

// 导入所有需要的生成代码
import {
  getInitializePollInstructionDataEncoder,
  getAddCandidateInstructionDataEncoder,
  getVoteInstructionDataEncoder,
} from "../generated/ts/voting/instructions";
import {
  getPollAccountDecoder,
  getCandidateAccountDecoder,
} from "../generated/ts/voting/accounts";

dotenv.config();

// --- 全局配置 ---
const CONFIG = {
  rpcUrl: process.env.RPC_URL || "https://api.devnet.solana.com",
  walletPath: process.env.WALLET_PATH,
  programId: new PublicKey("Doo2arLUifZbfqGVS5Uh7nexAMmsMzaQH5zcwZhSoijz"),
};

function loadWallet(path: string): Keypair {
  try {
    if (!path || !fs.existsSync(path)) {
      throw new Error(`Wallet file not found: ${path}`);
    }
    const secretKey = Uint8Array.from(
      JSON.parse(fs.readFileSync(path, { encoding: "utf8" })),
    );
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    console.error("❌ Failed to load wallet:", error);
    process.exit(1);
  }
}

async function main() {
  console.log("--- 🚀 Starting Full Integration Test ---");
  const connection = new Connection(CONFIG.rpcUrl, "confirmed");
  const signer = loadWallet(CONFIG.walletPath!);
  console.log(`🔑 Signer Wallet: ${signer.publicKey.toBase58()}`);

  try {
    // === 步骤 1: 初始化投票 ===
    const pollAccount = Keypair.generate();
    const initData = getInitializePollInstructionDataEncoder().encode({
      name: "Full Test Poll",
      description: "A poll created from the integration test script.",
      startTime: BigInt(Math.floor(Date.now() / 1000) - 60),
      endTime: BigInt(Math.floor(Date.now() / 1000) + 3600),
    });
    const initInstruction = new TransactionInstruction({
      keys: [
        { pubkey: signer.publicKey, isSigner: true, isWritable: true },
        { pubkey: pollAccount.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: CONFIG.programId,
      data: Buffer.from(initData),
    });
    const initSig = await sendAndConfirmTransaction(
      connection,
      new Transaction().add(initInstruction),
      [signer, pollAccount],
    );
    console.log(
      `\n[✅ Step 1 SUCCESS] Poll initialized. Signature: ${initSig}`,
    );
    console.log(`   Poll Account: ${pollAccount.publicKey.toBase58()}`);

    // === 步骤 2: 添加候选人 ===
    const pollInfo = await connection.getAccountInfo(pollAccount.publicKey);
    if (!pollInfo) throw new Error("Poll account not found after creation.");
    const decodedPoll = getPollAccountDecoder().decode(pollInfo.data);
    const [candidatePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("candidate"),
        pollAccount.publicKey.toBuffer(),
        Buffer.from([decodedPoll.candidateCount]),
      ],
      CONFIG.programId,
    );
    const addCandidateData = getAddCandidateInstructionDataEncoder().encode({
      candidateName: "Candidate A",
    });
    const addCandidateInstruction = new TransactionInstruction({
      keys: [
        { pubkey: signer.publicKey, isSigner: true, isWritable: true },
        { pubkey: pollAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: candidatePda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: CONFIG.programId,
      data: Buffer.from(addCandidateData),
    });
    const addCandSig = await sendAndConfirmTransaction(
      connection,
      new Transaction().add(addCandidateInstruction),
      [signer],
    );
    console.log(
      `\n[✅ Step 2 SUCCESS] Candidate added. Signature: ${addCandSig}`,
    );
    console.log(`   Candidate Account: ${candidatePda.toBase58()}`);

    // === 步骤 3: 投票 ===
    const [receiptPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("receipt"),
        pollAccount.publicKey.toBuffer(),
        signer.publicKey.toBuffer(),
      ],
      CONFIG.programId,
    );
    const voteData = getVoteInstructionDataEncoder().encode({});
    const voteInstruction = new TransactionInstruction({
      keys: [
        { pubkey: signer.publicKey, isSigner: true, isWritable: true },
        { pubkey: pollAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: candidatePda, isSigner: false, isWritable: true },
        { pubkey: receiptPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: CONFIG.programId,
      data: Buffer.from(voteData),
    });
    const voteSig = await sendAndConfirmTransaction(
      connection,
      new Transaction().add(voteInstruction),
      [signer],
    );
    console.log(`\n[✅ Step 3 SUCCESS] Vote cast. Signature: ${voteSig}`);

    // === 步骤 4: 验证结果 ===
    const candidateInfo = await connection.getAccountInfo(candidatePda);
    if (!candidateInfo)
      throw new Error("Candidate account not found after voting.");
    const decodedCandidate = getCandidateAccountDecoder().decode(
      candidateInfo.data,
    );
    console.log(`\n[✅ Step 4 SUCCESS] Verification complete.`);
    console.log(
      `   Candidate "${decodedCandidate.name}" has ${decodedCandidate.votes} vote(s).`,
    );

    if (decodedCandidate.votes === 1n) {
      console.log("\n🎉🎉🎉 INTEGRATION TEST PASSED! 🎉🎉🎉");
    } else {
      throw new Error(
        `Verification failed! Expected 1 vote, but found ${decodedCandidate.votes}.`,
      );
    }
  } catch (error) {
    console.error("\n❌ INTEGRATION TEST FAILED:", error);
  }
}

main();

/*
voting on  master [!?] via ⬢ v23.11.0 via 🍞 v1.2.17 via 🦀 1.88.0
➜ bun run scripts/run_full_test.ts
[dotenv@17.2.0] injecting env (0) from .env (tip: ⚙️  write to custom object with { processEnv: myObject })
--- 🚀 Starting Full Integration Test ---
🔑 Signer Wallet: 6MZDRo5v8K2NfdohdD76QNpSgk3GH3Aup53BeMaRAEpd

[✅ Step 1 SUCCESS] Poll initialized. Signature: yugFdjbtm4baF52JnmjAwYRFgFagSoppSAkpjM93ZZ68ciiZdxgGaVCEu3ARm8g4GwQJb2FwQoygjVHPjDZxEW4
   Poll Account: Gm2XV7wdVWRYJfKaJqCXTn4j76juLrLhWkn2zAmuuxc2

[✅ Step 2 SUCCESS] Candidate added. Signature: YEpJiUFViK7LNJSTSejYwmGjkNfpbxJFkKFN1cE6QhpvRn4LmsVkfyciUpAtLJqZnoDDhMeV9CT3MaE2Piv2C2b
   Candidate Account: 4usFkw3PgAMNbjvx7sSx8KszfjbgBNsNcqyvYBfhUCe6

[✅ Step 3 SUCCESS] Vote cast. Signature: 5gNoiWjGNCmdbHaLubmp8mgXPwZ7HaibXVNzAP584DATB9C1i5samSAUgc7CoHstLaR2N9EmwTwuzPPnR5U2BbbD

[✅ Step 4 SUCCESS] Verification complete.
   Candidate "Candidate A" has 1 vote(s).

🎉🎉🎉 INTEGRATION TEST PASSED! 🎉🎉🎉

*/
