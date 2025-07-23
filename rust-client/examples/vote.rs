use anyhow::Result;
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    transaction::Transaction,
};
use std::convert::TryFrom;
use std::{env, fs, str::FromStr};

// 导入生成的代码
use voting_client::instructions::VoteBuilder;

/// 从文件加载钱包 Keypair
fn load_wallet(path: &str) -> Result<Keypair> {
    let content = fs::read_to_string(path)?;
    let bytes: Vec<u8> = serde_json::from_str(&content)?;
    Ok(Keypair::try_from(bytes.as_slice())?)
}

#[tokio::main]
async fn main() -> Result<()> {
    println!("--- 🚀 Starting [Step 3: Vote] Rust Client ---");

    dotenvy::from_path("../.env").ok();

    let rpc_url =
        env::var("RPC_URL").unwrap_or_else(|_| "https://api.devnet.solana.com".to_string());

    let wallet_path = env::var("WALLET_PATH").unwrap_or_else(|_| {
        let home = env::var("HOME").expect("HOME environment variable is not set");
        format!("{}/.config/solana/id.json", home)
    });

    // !! 重要：请将这里的地址替换为您之前步骤中创建的账户地址 !!
    let poll_account_pubkey = Pubkey::from_str("8ucTtmiD8Jw4gCARkfWkVP1fQmfkTnXixEn5enfqCJUy")?;
    let candidate_account_pubkey =
        Pubkey::from_str("D2dmKitcUCCcDYEsd1vT67rzF11xTV1kDZwJoXhRnet1")?;

    let client = RpcClient::new(rpc_url);
    let voter = load_wallet(&wallet_path)?;

    println!("🔑 Voter: {}", voter.pubkey());
    println!("📝 Voting in Poll: {}", poll_account_pubkey);
    println!("👍 Voting for Candidate: {}", candidate_account_pubkey);

    // 1. 计算投票回执账户的 PDA
    let (voter_receipt_pda, _) = Pubkey::find_program_address(
        &[
            b"receipt",
            &poll_account_pubkey.to_bytes(),
            &voter.pubkey().to_bytes(),
        ],
        &voting_client::programs::VOTING_ID,
    );
    println!("🧾 Voter Receipt PDA: {}", voter_receipt_pda);

    // 2. 使用 Builder 构造指令
    let instruction = VoteBuilder::new()
        .signer(voter.pubkey())
        .poll_account(poll_account_pubkey)
        .candidate_account(candidate_account_pubkey)
        .voter_receipt(voter_receipt_pda)
        .instruction();

    // 3. 发送交易
    let recent_blockhash = client.get_latest_blockhash()?;
    let transaction = Transaction::new_signed_with_payer(
        &[instruction],
        Some(&voter.pubkey()),
        &[&voter], // 只有投票者需要签名
        recent_blockhash,
    );

    println!("\n⏳ Sending transaction...");
    let signature = client.send_and_confirm_transaction(&transaction)?;

    println!("\n✅ Success! Your vote has been cast.");
    println!("   - Transaction Signature: {}", signature);
    println!(
        "   - Review on Explorer: https://explorer.solana.com/tx/{}?cluster=devnet",
        signature
    );

    Ok(())
}
