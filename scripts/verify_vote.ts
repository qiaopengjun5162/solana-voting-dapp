import { Connection, PublicKey } from "@solana/web3.js";
import * as dotenv from "dotenv";

// 导入我们需要的候选人账户解码器
import { getCandidateAccountDecoder } from "../generated/ts/voting/accounts";

dotenv.config();

// --- 脚本配置 ---
const CONFIG = {
  rpcUrl: process.env.RPC_URL || "https://api.devnet.solana.com",
  // 这是我们在第二步中添加并为其投票的候选人账户地址
  candidateAccountPubkey: new PublicKey(
    "GZzVP862HEb4dW8VJ5Loixju4dnAFDkApzVbsu2jh6x5",
  ),
};

async function main() {
  console.log("--- 🚀 Starting [Step 4: Verify Vote Result] Script ---");

  try {
    const connection = new Connection(CONFIG.rpcUrl, "confirmed");

    console.log(
      `🔍 Checking candidate account: ${CONFIG.candidateAccountPubkey.toBase58()}`,
    );

    // 1. 从区块链获取账户信息
    const accountInfo = await connection.getAccountInfo(
      CONFIG.candidateAccountPubkey,
    );
    if (!accountInfo) {
      throw new Error("Candidate account not found on the blockchain.");
    }

    // 2. 使用生成的解码器来解析二进制数据
    const decodedCandidate = getCandidateAccountDecoder().decode(
      accountInfo.data,
    );

    const candidateName = decodedCandidate.name;
    const voteCount = decodedCandidate.votes;

    // 3. 打印出验证结果
    console.log("\n✅ Verification Successful!");
    console.log(`   - Candidate Name: "${candidateName}"`);
    console.log(`   - Vote Count: ${voteCount}`);

    // 4. 最终确认
    if (voteCount > 0) {
      console.log(`\n🎉🎉 Great! The vote was correctly recorded on-chain.`);
    } else {
      console.log(
        `\n🤔 Hmm, the vote count is still 0. Something might be wrong.`,
      );
    }
  } catch (error) {
    console.error("\n❌ Script failed:", error);
  }
}

main();

/*
voting on  master [!?] via ⬢ v23.11.0 via 🍞 v1.2.17 via 🦀 1.88.0 took 4.0s
➜ bun run scripts/verify_vote.ts
[dotenv@17.2.0] injecting env (0) from .env (tip: 🔐 encrypt with dotenvx: https://dotenvx.com)
--- 🚀 Starting [Step 4: Verify Vote Result] Script ---
🔍 Checking candidate account: GZzVP862HEb4dW8VJ5Loixju4dnAFDkApzVbsu2jh6x5

✅ Verification Successful!
   - Candidate Name: "Candidate #1"
   - Vote Count: 1

🎉🎉 Great! The vote was correctly recorded on-chain.
*/
