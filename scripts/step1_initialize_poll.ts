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

// Import ONLY the instruction data encoder. This is the most reliable method.
import { getInitializePollInstructionDataEncoder } from "../generated/ts/voting/instructions";

// Load .env file
dotenv.config();

// --- Script Configuration ---
const CONFIG = {
  rpcUrl: process.env.RPC_URL || "https://api.devnet.solana.com",
  walletPath: process.env.WALLET_PATH,
  // Your program's public key
  programId: new PublicKey("Doo2arLUifZbfqGVS5Uh7nexAMmsMzaQH5zcwZhSoijz"),
};

/**
 * Loads a Keypair from a file.
 */
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
    "--- 🚀 Starting [Step 1: Initialize Poll] Script (Final Version) ---",
  );

  try {
    // 1. Initialize connection and wallets
    const connection = new Connection(CONFIG.rpcUrl, "confirmed");
    const signer = loadWallet(CONFIG.walletPath!);
    const pollAccount = Keypair.generate();

    console.log(`🔑 Signer (Authority): ${signer.publicKey.toBase58()}`);
    console.log(
      `📝 New Poll Account Address: ${pollAccount.publicKey.toBase58()}`,
    );

    // 2. Get the instruction data using the low-level encoder
    const instructionData = getInitializePollInstructionDataEncoder().encode({
      name: "Final Poll Test",
      description:
        "This test uses the data encoder directly for max compatibility.",
      startTime: BigInt(Math.floor(Date.now() / 1000) - 60),
      endTime: BigInt(Math.floor(Date.now() / 1000) + 3600),
    });

    // 3. Manually define the accounts in the format @solana/web3.js expects.
    // The order MUST match the `InitializePoll` struct in your Rust code.
    const keys = [
      { pubkey: signer.publicKey, isSigner: true, isWritable: true },
      { pubkey: pollAccount.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];

    // 4. Create a standard TransactionInstruction
    const instruction = new TransactionInstruction({
      keys: keys,
      programId: CONFIG.programId,
      data: Buffer.from(instructionData),
    });

    // 5. Create and send the transaction
    const transaction = new Transaction().add(instruction);
    console.log("\n⏳ Sending transaction...");

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [signer, pollAccount], // Both must sign
    );

    console.log("\n✅ Success! The transaction was confirmed.");
    console.log(`   - Transaction Signature: ${signature}`);
    console.log(`   - New Poll Account: ${pollAccount.publicKey.toBase58()}`);
    console.log(
      `   - Review on Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    );
  } catch (error) {
    console.error("\n❌ Script failed:", error);
  }
}

main();

// --- End of Script ---
/*
voting on  master [!?] via ⬢ v23.11.0 via 🍞 v1.2.17 via 🦀 1.88.0
➜ bun run scripts/step1_initialize_poll.ts
[dotenv@17.2.0] injecting env (0) from .env (tip: ⚙️  enable debug logging with { debug: true })
--- 🚀 Starting [Step 1: Initialize Poll] Script (Final Version) ---
🔑 Signer (Authority): 6MZDRo5v8K2NfdohdD76QNpSgk3GH3Aup53BeMaRAEpd
📝 New Poll Account Address: 2R3tUpUfQhTjMVowcd8wKhGKzJbQ1HpKc9HPeC5xXLyq

⏳ Sending transaction...

✅ Success! The transaction was confirmed.
   - Transaction Signature: 2L9HDswXc9MdxoTXoYUt7KBcHtaAgwvoLoRHkMM4Cv17oxE3PzHM7tJgQWLEDvm1qdsUrWx9XseiYp6ng42Z6RcL
   - New Poll Account: 2R3tUpUfQhTjMVowcd8wKhGKzJbQ1HpKc9HPeC5xXLyq
   - Review on Explorer: https://explorer.solana.com/tx/2L9HDswXc9MdxoTXoYUt7KBcHtaAgwvoLoRHkMM4Cv17oxE3PzHM7tJgQWLEDvm1qdsUrWx9XseiYp6ng42Z6RcL?cluster=devnet
*/
