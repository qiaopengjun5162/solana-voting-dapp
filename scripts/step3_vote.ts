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
import { getVoteInstructionDataEncoder } from "../generated/ts/voting/instructions";

dotenv.config();

// --- 脚本配置 ---
const CONFIG = {
  rpcUrl: process.env.RPC_URL || "https://api.devnet.solana.com",
  walletPath: process.env.WALLET_PATH,
  programId: new PublicKey("Doo2arLUifZbfqGVS5Uh7nexAMmsMzaQH5zcwZhSoijz"),
  // 使用之前步骤中创建的账户地址
  pollAccountPubkey: new PublicKey(
    "2R3tUpUfQhTjMVowcd8wKhGKzJbQ1HpKc9HPeC5xXLyq",
  ),
  candidateAccountPubkey: new PublicKey(
    "GZzVP862HEb4dW8VJ5Loixju4dnAFDkApzVbsu2jh6x5",
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
  console.log("--- 🚀 Starting [Step 3: Vote] Script ---");

  try {
    const connection = new Connection(CONFIG.rpcUrl, "confirmed");
    // 在这个测试中，我们让授权方自己作为投票者
    const voter = loadWallet(CONFIG.walletPath!);

    console.log(`🔑 Voter: ${voter.publicKey.toBase58()}`);
    console.log(`📝 Voting in Poll: ${CONFIG.pollAccountPubkey.toBase58()}`);
    console.log(
      `👍 Voting for Candidate: ${CONFIG.candidateAccountPubkey.toBase58()}`,
    );

    // 1. 计算投票回执账户的 PDA (Voter Receipt PDA)
    // 这是为了防止同一个人重复投票
    // seeds 必须与合约匹配: [b"receipt", poll_key, voter_key]
    const [voterReceiptPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("receipt"),
        CONFIG.pollAccountPubkey.toBuffer(),
        voter.publicKey.toBuffer(),
      ],
      CONFIG.programId,
    );
    console.log(`🧾 Voter Receipt PDA: ${voterReceiptPda.toBase58()}`);

    // 2. 获取指令数据 (vote 指令没有参数)
    const instructionData = getVoteInstructionDataEncoder().encode({});

    // 3. 手动定义账户列表
    const keys = [
      { pubkey: voter.publicKey, isSigner: true, isWritable: true },
      { pubkey: CONFIG.pollAccountPubkey, isSigner: false, isWritable: true },
      {
        pubkey: CONFIG.candidateAccountPubkey,
        isSigner: false,
        isWritable: true,
      },
      { pubkey: voterReceiptPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];

    // 4. 创建标准指令
    const instruction = new TransactionInstruction({
      keys: keys,
      programId: CONFIG.programId,
      data: Buffer.from(instructionData),
    });

    // 5. 创建并发送交易
    const transaction = new Transaction().add(instruction);
    console.log("\n⏳ Sending vote transaction...");

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [voter], // 只有投票者需要签名
    );

    console.log("\n✅ Success! Your vote has been cast.");
    console.log(`   - Transaction Signature: ${signature}`);
    console.log(
      `   - Review on Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    );
    console.log("\n🎉 All steps completed successfully! Your contract works.");
  } catch (error) {
    console.error("\n❌ Script failed:", error);
  }
}

main();

/*
voting on  master [!?] via ⬢ v23.11.0 via 🍞 v1.2.17 via 🦀 1.88.0 took 3.9s
➜ bun run scripts/step3_vote.ts
[dotenv@17.2.0] injecting env (0) from .env (tip: 🛠️  run anywhere with `dotenvx run -- yourcommand`)
--- 🚀 Starting [Step 3: Vote] Script ---
🔑 Voter: 6MZDRo5v8K2NfdohdD76QNpSgk3GH3Aup53BeMaRAEpd
📝 Voting in Poll: 2R3tUpUfQhTjMVowcd8wKhGKzJbQ1HpKc9HPeC5xXLyq
👍 Voting for Candidate: GZzVP862HEb4dW8VJ5Loixju4dnAFDkApzVbsu2jh6x5
🧾 Voter Receipt PDA: DAnY27Ei9wyzkwJpTM2Aq29cTxwGHxbCKfoY64C9hdRg

⏳ Sending vote transaction...

✅ Success! Your vote has been cast.
   - Transaction Signature: 6kaULdcvbgwovJLKULXQgpS3Mfihfj4VKY7ruE3kqiggMjqci8RZWcpSs2AF9EawF4wxbVC8HjKJryPFmqPd3pN
   - Review on Explorer: https://explorer.solana.com/tx/6kaULdcvbgwovJLKULXQgpS3Mfihfj4VKY7ruE3kqiggMjqci8RZWcpSs2AF9EawF4wxbVC8HjKJryPFmqPd3pN?cluster=devnet

🎉 All steps completed successfully! Your contract works.
*/
