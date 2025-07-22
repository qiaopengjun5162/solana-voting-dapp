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

// 导入需要的 codama 生成的函数
import { getAddCandidateInstructionDataEncoder } from "../generated/ts/voting/instructions";
import { getPollAccountDecoder } from "../generated/ts/voting/accounts";

dotenv.config();

// --- 脚本配置 ---
const CONFIG = {
  rpcUrl: process.env.RPC_URL || "https://api.devnet.solana.com",
  walletPath: process.env.WALLET_PATH,
  programId: new PublicKey("Doo2arLUifZbfqGVS5Uh7nexAMmsMzaQH5zcwZhSoijz"),
  // 使用您在第一步中成功创建的投票账户地址
  pollAccountPubkey: new PublicKey(
    "2R3tUpUfQhTjMVowcd8wKhGKzJbQ1HpKc9HPeC5xXLyq",
  ),
};

function loadWallet(path: string): Keypair {
  try {
    if (!path || !fs.existsSync(path)) {
      throw new Error(
        `Wallet file not found. Check WALLET_PATH in .env: ${path}`,
      );
    }
    const fileContent = fs.readFileSync(path, { encoding: "utf8" });
    const secretKey = Uint8Array.from(JSON.parse(fileContent));
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    console.error("❌ Failed to load wallet:", error);
    process.exit(1);
  }
}

async function main() {
  console.log(
    "--- 🚀 Starting [Step 2: Add a Candidate] Script (Corrected Decoder) ---",
  );

  try {
    const connection = new Connection(CONFIG.rpcUrl, "confirmed");
    const signer = loadWallet(CONFIG.walletPath!);

    console.log(`🔑 Signer (Authority): ${signer.publicKey.toBase58()}`);
    console.log(
      `📝 Using Poll Account: ${CONFIG.pollAccountPubkey.toBase58()}`,
    );

    console.log("\n⏳ Fetching poll account data...");
    const pollAccountInfo = await connection.getAccountInfo(
      CONFIG.pollAccountPubkey,
    );
    if (!pollAccountInfo) {
      throw new Error("Poll account not found.");
    }

    const decodedPoll = getPollAccountDecoder().decode(pollAccountInfo.data);
    const currentCandidateCount = decodedPoll.candidateCount;
    console.log(`✅ Current candidate count is: ${currentCandidateCount}`);

    const [candidatePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("candidate"),
        CONFIG.pollAccountPubkey.toBuffer(),
        Buffer.from([currentCandidateCount]),
      ],
      CONFIG.programId,
    );
    console.log(`🌱 New Candidate PDA: ${candidatePda.toBase58()}`);

    const candidateName = "Candidate #" + (currentCandidateCount + 1);
    console.log(`➕ Adding candidate with name: "${candidateName}"`);

    const instructionData = getAddCandidateInstructionDataEncoder().encode({
      candidateName: candidateName,
    });

    const keys = [
      { pubkey: signer.publicKey, isSigner: true, isWritable: true },
      { pubkey: CONFIG.pollAccountPubkey, isSigner: false, isWritable: true },
      { pubkey: candidatePda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];

    const instruction = new TransactionInstruction({
      keys: keys,
      programId: CONFIG.programId,
      data: Buffer.from(instructionData),
    });

    const transaction = new Transaction().add(instruction);
    console.log("\n⏳ Sending transaction to add candidate...");

    const signature = await sendAndConfirmTransaction(connection, transaction, [
      signer,
    ]);

    console.log("\n✅ Success! Candidate has been added.");
    console.log(`   - Transaction Signature: ${signature}`);
    console.log(
      `   - Review on Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    );
  } catch (error) {
    console.error("\n❌ Script failed:", error);
  }
}

main();

/*
voting on  master [!?] via ⬢ v23.11.0 via 🍞 v1.2.17 via 🦀 1.88.0 took 3.5s
➜ bun run scripts/step2_add_candidate.ts
[dotenv@17.2.0] injecting env (0) from .env (tip: ⚙️  write to custom object with { processEnv: myObject })
--- 🚀 Starting [Step 2: Add a Candidate] Script (Corrected Decoder) ---
🔑 Signer (Authority): 6MZDRo5v8K2NfdohdD76QNpSgk3GH3Aup53BeMaRAEpd
📝 Using Poll Account: 2R3tUpUfQhTjMVowcd8wKhGKzJbQ1HpKc9HPeC5xXLyq

⏳ Fetching poll account data...
✅ Current candidate count is: 0
🌱 New Candidate PDA: GZzVP862HEb4dW8VJ5Loixju4dnAFDkApzVbsu2jh6x5
➕ Adding candidate with name: "Candidate #1"

⏳ Sending transaction to add candidate...

✅ Success! Candidate has been added.
   - Transaction Signature: 4sso6XXXyLuubVRGvTTYKEiyRHTizzyvPbKkghFj5mFzCAn6D7bQtGUQwTF7uw3fw2DSSPJXrDY9hhUtCPeii5ZV
   - Review on Explorer: https://explorer.solana.com/tx/4sso6XXXyLuubVRGvTTYKEiyRHTizzyvPbKkghFj5mFzCAn6D7bQtGUQwTF7uw3fw2DSSPJXrDY9hhUtCPeii5ZV?cluster=devnet
*/
