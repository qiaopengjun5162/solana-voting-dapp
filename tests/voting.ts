import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Voting } from "../target/types/voting";
import { assert } from "chai";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

describe("voting", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Voting as Program<Voting>;

  const pollAccount = anchor.web3.Keypair.generate();
  const authority = provider.wallet as anchor.Wallet;
  const voter1 = anchor.web3.Keypair.generate();
  const voter2 = anchor.web3.Keypair.generate();
  const unauthorizedUser = anchor.web3.Keypair.generate();

  const confirmTx = async (txSignature: string) => {
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction(
      { signature: txSignature, ...latestBlockhash },
      "confirmed"
    );
  };

  const airdrop = async (account: anchor.web3.Keypair) => {
    const sig = await provider.connection.requestAirdrop(
      account.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await confirmTx(sig);
  };

  const getCandidatePda = (
    pollKey: PublicKey,
    index: number
  ): [PublicKey, number] => {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("candidate"),
        pollKey.toBuffer(),
        // 关键修复：合约中的 candidate_count 是 u8 (1字节)，这里必须匹配
        new BN(index).toArrayLike(Buffer, "le", 1),
      ],
      program.programId
    );
  };

  const getReceiptPda = (
    pollKey: PublicKey,
    voterKey: PublicKey
  ): [PublicKey, number] => {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("receipt"), pollKey.toBuffer(), voterKey.toBuffer()],
      program.programId
    );
  };

  before(async () => {
    await airdrop(voter1);
    await airdrop(voter2);
    await airdrop(unauthorizedUser);
  });

  it("✅ Successfully initializes a poll", async () => {
    const name = "Favorite Framework";
    const description = "Which framework do you prefer?";
    const startTime = new BN(Math.floor(Date.now() / 1000));
    const endTime = new BN(startTime.toNumber() + 3600);

    const tx = await program.methods
      .initializePoll(name, description, startTime, endTime)
      .accounts({
        pollAccount: pollAccount.publicKey,
        signer: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([pollAccount])
      .rpc();
    await confirmTx(tx);

    const fetchedPoll = await program.account.pollAccount.fetch(
      pollAccount.publicKey
    );
    assert.strictEqual(fetchedPoll.name, name, "Poll name does not match");
    assert.strictEqual(
      fetchedPoll.authority.toBase58(),
      authority.publicKey.toBase58()
    );
    assert.ok(fetchedPoll.startTime.eq(startTime), "Start time does not match");
    assert.ok(fetchedPoll.endTime.eq(endTime), "End time does not match");
  });

  it("✅ Successfully adds two candidates", async () => {
    const [candidatePda1] = getCandidatePda(pollAccount.publicKey, 0);
    const tx1 = await program.methods
      .addCandidate("React")
      .accounts({
        pollAccount: pollAccount.publicKey,
        candidateAccount: candidatePda1,
        signer: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    await confirmTx(tx1);

    const [candidatePda2] = getCandidatePda(pollAccount.publicKey, 1);
    const tx2 = await program.methods
      .addCandidate("Vue")
      .accounts({
        pollAccount: pollAccount.publicKey,
        candidateAccount: candidatePda2,
        signer: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    await confirmTx(tx2);

    const fetchedPoll = await program.account.pollAccount.fetch(
      pollAccount.publicKey
    );
    assert.strictEqual(
      fetchedPoll.candidates.length,
      2,
      "Candidate count should be 2"
    );
    assert.strictEqual(
      fetchedPoll.candidateCount,
      2,
      "Candidate counter should be 2"
    );
  });

  it("✅ Two users vote successfully", async () => {
    const [candidatePda1] = getCandidatePda(pollAccount.publicKey, 0);
    const [candidatePda2] = getCandidatePda(pollAccount.publicKey, 1);
    const [receiptPda1] = getReceiptPda(
      pollAccount.publicKey,
      voter1.publicKey
    );

    const tx1 = await program.methods
      .vote()
      .accounts({
        pollAccount: pollAccount.publicKey,
        candidateAccount: candidatePda1,
        voterReceipt: receiptPda1,
        signer: voter1.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([voter1])
      .rpc();
    await confirmTx(tx1);

    const [receiptPda2] = getReceiptPda(
      pollAccount.publicKey,
      voter2.publicKey
    );
    const tx2 = await program.methods
      .vote()
      .accounts({
        pollAccount: pollAccount.publicKey,
        candidateAccount: candidatePda1,
        voterReceipt: receiptPda2,
        signer: voter2.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([voter2])
      .rpc();
    await confirmTx(tx2);

    const candidate1 = await program.account.candidateAccount.fetch(
      candidatePda1
    );
    const candidate2 = await program.account.candidateAccount.fetch(
      candidatePda2
    );
    assert.strictEqual(
      candidate1.votes.toNumber(),
      2,
      "React should have 2 votes"
    );
    assert.strictEqual(
      candidate2.votes.toNumber(),
      0,
      "Vue should have 0 votes"
    );
  });

  it("❌ Fails to vote twice (expected failure)", async () => {
    try {
      const [candidatePda1] = getCandidatePda(pollAccount.publicKey, 0);
      const [receiptPda1] = getReceiptPda(
        pollAccount.publicKey,
        voter1.publicKey
      );
      await program.methods
        .vote()
        .accounts({
          pollAccount: pollAccount.publicKey,
          candidateAccount: candidatePda1,
          voterReceipt: receiptPda1,
          signer: voter1.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([voter1])
        .rpc();
      assert.fail("Double voting should have failed but succeeded");
    } catch (err) {
      assert.include(
        err.toString(),
        "already in use",
        "Expected error for already initialized account"
      );
    }
  });

  it("❌ Unauthorized user fails to add candidate (expected failure)", async () => {
    try {
      const [candidatePda] = getCandidatePda(pollAccount.publicKey, 2);
      await program.methods
        .addCandidate("Svelte")
        .accounts({
          pollAccount: pollAccount.publicKey,
          candidateAccount: candidatePda,
          signer: unauthorizedUser.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([unauthorizedUser])
        .rpc();
      assert.fail("Unauthorized candidate addition should have failed");
    } catch (err) {
      assert.equal(err.error.errorCode.code, "Unauthorized");
    }
  });

  it("❌ Fails to vote before poll starts (expected failure)", async () => {
    const futurePoll = anchor.web3.Keypair.generate();
    const startTime = new BN(Date.now() / 1000 + 3600);
    const endTime = new BN(startTime.toNumber() + 3600);

    const tx1 = await program.methods
      .initializePoll("Future", "", startTime, endTime)
      .accounts({
        pollAccount: futurePoll.publicKey,
        signer: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([futurePoll])
      .rpc();
    await confirmTx(tx1);

    const [candidatePda] = getCandidatePda(futurePoll.publicKey, 0);
    const tx2 = await program.methods
      .addCandidate("Future Cand")
      .accounts({
        pollAccount: futurePoll.publicKey,
        candidateAccount: candidatePda,
        signer: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    await confirmTx(tx2);

    try {
      const [receiptPda] = getReceiptPda(
        futurePoll.publicKey,
        voter1.publicKey
      );
      await program.methods
        .vote()
        .accounts({
          pollAccount: futurePoll.publicKey,
          candidateAccount: candidatePda,
          voterReceipt: receiptPda,
          signer: voter1.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([voter1])
        .rpc();
      assert.fail("Voting before poll start should have failed");
    } catch (err) {
      assert.equal(err.error.errorCode.code, "PollNotStarted");
    }
  });

  it("❌ Fails to vote after poll ends (expected failure)", async () => {
    const pastPoll = anchor.web3.Keypair.generate();
    const startTime = new BN(Math.floor(Date.now() / 1000) - 7200);
    const endTime = new BN(Math.floor(Date.now() / 1000) - 3600);

    const tx1 = await program.methods
      .initializePoll("Past", "", startTime, endTime)
      .accounts({
        pollAccount: pastPoll.publicKey,
        signer: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([pastPoll])
      .rpc();
    await confirmTx(tx1);

    const [candidatePda] = getCandidatePda(pastPoll.publicKey, 0);
    const tx2 = await program.methods
      .addCandidate("Past Cand")
      .accounts({
        pollAccount: pastPoll.publicKey,
        candidateAccount: candidatePda,
        signer: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    await confirmTx(tx2);

    try {
      const [receiptPda] = getReceiptPda(pastPoll.publicKey, voter1.publicKey);
      await program.methods
        .vote()
        .accounts({
          pollAccount: pastPoll.publicKey,
          candidateAccount: candidatePda,
          voterReceipt: receiptPda,
          signer: voter1.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([voter1])
        .rpc();
      assert.fail("Voting after poll end should have failed");
    } catch (err) {
      assert.equal(err.error.errorCode.code, "PollEnded");
    }
  });

  it("❌ Fails to add more than 15 candidates (expected failure)", async () => {
    for (let i = 2; i < 15; i++) {
      const [candidatePda] = getCandidatePda(pollAccount.publicKey, i);
      const tx = await program.methods
        .addCandidate(`Cand ${i}`)
        .accounts({
          pollAccount: pollAccount.publicKey,
          candidateAccount: candidatePda,
          signer: authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      await confirmTx(tx);
    }

    try {
      const [candidatePda] = getCandidatePda(pollAccount.publicKey, 15);
      await program.methods
        .addCandidate("Cand 15")
        .accounts({
          pollAccount: pollAccount.publicKey,
          candidateAccount: candidatePda,
          signer: authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      assert.fail("Adding more than 15 candidates should have failed");
    } catch (err) {
      assert.equal(err.error.errorCode.code, "MaxCandidatesReached");
    }
  });
});
