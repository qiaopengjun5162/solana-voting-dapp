use anyhow::Result;
use chrono::Utc;
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    transaction::Transaction,
};
use std::convert::TryFrom;
use std::{env, fs};

// 导入所有需要的生成代码
use voting_client::{
    accounts::{CandidateAccount, PollAccount},
    instructions::{AddCandidateBuilder, InitializePollBuilder, VoteBuilder},
    programs::VOTING_ID,
};

/// 从文件加载钱包 Keypair
fn load_wallet(path: &str) -> Result<Keypair> {
    let content = fs::read_to_string(path)?;
    let bytes: Vec<u8> = serde_json::from_str(&content)?;
    Ok(Keypair::try_from(bytes.as_slice())?)
}

#[tokio::main]
async fn main() -> Result<()> {
    println!("--- 🚀 Starting Full Integration Test ---");

    // --- 设置 ---
    dotenvy::from_path("../.env").ok();
    let rpc_url =
        env::var("RPC_URL").unwrap_or_else(|_| "https://api.devnet.solana.com".to_string());
    let wallet_path = env::var("WALLET_PATH").unwrap_or_else(|_| {
        let home = env::var("HOME").expect("HOME not set");
        format!("{}/.config/solana/id.json", home)
    });
    let client = RpcClient::new(rpc_url);
    let signer = load_wallet(&wallet_path)?;
    println!("🔑 Signer Wallet: {}", signer.pubkey());

    // --- 步骤 1: 初始化投票 ---
    let poll_account = Keypair::new();
    let init_instruction = InitializePollBuilder::new()
        .signer(signer.pubkey())
        .poll_account(poll_account.pubkey())
        .name("Full Integration Test Poll".to_string())
        .description("Automated test poll.".to_string())
        .start_time((Utc::now().timestamp() - 60) as u64)
        .end_time((Utc::now().timestamp() + 3600) as u64)
        .instruction();

    let recent_blockhash = client.get_latest_blockhash()?;
    let init_tx = Transaction::new_signed_with_payer(
        &[init_instruction],
        Some(&signer.pubkey()),
        &[&signer, &poll_account],
        recent_blockhash,
    );
    let init_sig = client.send_and_confirm_transaction(&init_tx)?;
    println!(
        "\n[✅ Step 1 SUCCESS] Poll initialized. Signature: {}",
        init_sig
    );
    println!("   Poll Account: {}", poll_account.pubkey());

    // --- 步骤 2: 添加候选人 ---
    let poll_account_info = client.get_account(&poll_account.pubkey())?;
    let poll_account_data = PollAccount::from_bytes(&poll_account_info.data)?;
    let (candidate_pda, _) = Pubkey::find_program_address(
        &[
            b"candidate",
            &poll_account.pubkey().to_bytes(),
            &[poll_account_data.candidate_count],
        ],
        &VOTING_ID,
    );

    let add_cand_instruction = AddCandidateBuilder::new()
        .signer(signer.pubkey())
        .poll_account(poll_account.pubkey())
        .candidate_account(candidate_pda)
        .candidate_name("Candidate A".to_string())
        .instruction();

    let recent_blockhash = client.get_latest_blockhash()?;
    let add_cand_tx = Transaction::new_signed_with_payer(
        &[add_cand_instruction],
        Some(&signer.pubkey()),
        &[&signer],
        recent_blockhash,
    );
    let add_cand_sig = client.send_and_confirm_transaction(&add_cand_tx)?;
    println!(
        "\n[✅ Step 2 SUCCESS] Candidate added. Signature: {}",
        add_cand_sig
    );
    println!("   Candidate Account: {}", candidate_pda);

    // --- 步骤 3: 投票 ---
    let (receipt_pda, _) = Pubkey::find_program_address(
        &[
            b"receipt",
            &poll_account.pubkey().to_bytes(),
            &signer.pubkey().to_bytes(),
        ],
        &VOTING_ID,
    );
    let vote_instruction = VoteBuilder::new()
        .signer(signer.pubkey())
        .poll_account(poll_account.pubkey())
        .candidate_account(candidate_pda)
        .voter_receipt(receipt_pda)
        .instruction();

    let recent_blockhash = client.get_latest_blockhash()?;
    let vote_tx = Transaction::new_signed_with_payer(
        &[vote_instruction],
        Some(&signer.pubkey()),
        &[&signer],
        recent_blockhash,
    );
    let vote_sig = client.send_and_confirm_transaction(&vote_tx)?;
    println!("\n[✅ Step 3 SUCCESS] Vote cast. Signature: {}", vote_sig);

    // --- 步骤 4: 验证结果 ---
    let candidate_info = client.get_account(&candidate_pda)?;
    let candidate_data = CandidateAccount::from_bytes(&candidate_info.data)?;
    println!("\n[✅ Step 4 SUCCESS] Verification complete.");
    println!(
        "   Candidate \"{}\" has {} vote(s).",
        candidate_data.name, candidate_data.votes
    );

    if candidate_data.votes == 1 {
        println!("\n🎉🎉🎉 INTEGRATION TEST PASSED! 🎉🎉🎉");
    } else {
        anyhow::bail!(
            "Verification failed! Expected 1 vote, but found {}.",
            candidate_data.votes
        );
    }

    Ok(())
}
