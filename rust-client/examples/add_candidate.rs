use anyhow::Result;
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    transaction::Transaction,
};
use std::convert::TryFrom;
use std::{env, fs, str::FromStr};

use voting_client::{accounts::PollAccount, instructions::AddCandidateBuilder};

/// 从文件加载钱包 Keypair
fn load_wallet(path: &str) -> Result<Keypair> {
    let content = fs::read_to_string(path)?;
    let bytes: Vec<u8> = serde_json::from_str(&content)?;
    Ok(Keypair::try_from(bytes.as_slice())?)
}

#[tokio::main]
async fn main() -> Result<()> {
    println!("--- 🚀 Starting [Step 2: Add Candidate] Rust Client ---");

    // 从项目根目录加载 .env 文件
    dotenvy::from_path("../.env").ok(); // 注意路径是 ../../

    let rpc_url =
        env::var("RPC_URL").unwrap_or_else(|_| "https://api.devnet.solana.com".to_string());

    let wallet_path = env::var("WALLET_PATH").unwrap_or_else(|_| {
        let home = env::var("HOME").expect("HOME environment variable is not set");
        format!("{}/.config/solana/id.json", home)
    });

    // !! 重要：请将这里的地址替换为您在上一步中创建的 Poll Account 地址 !!
    // 我已为您更新为您刚刚创建的地址
    let poll_account_pubkey_str = "8ucTtmiD8Jw4gCARkfWkVP1fQmfkTnXixEn5enfqCJUy";
    let poll_account_pubkey = Pubkey::from_str(poll_account_pubkey_str)?;

    // 1. 初始化连接和钱包
    let client = RpcClient::new(rpc_url);
    let signer = load_wallet(&wallet_path)?;

    println!("🔑 Signer (Authority): {}", signer.pubkey());
    println!("📝 Using Poll Account: {}", poll_account_pubkey);

    // 2. 获取链上投票账户的数据，以读取当前的 candidate_count
    println!("\n⏳ Fetching poll account data...");
    let poll_account_info = client.get_account(&poll_account_pubkey)?;

    // --- 核心修正: 使用生成的 PollAccount::from_bytes 方法来解码 ---
    let poll_account_data = PollAccount::from_bytes(&poll_account_info.data)?;
    let current_candidate_count = poll_account_data.candidate_count;
    println!("✅ Current candidate count is: {}", current_candidate_count);

    // 3. 计算新候选人账户的 PDA
    let (candidate_pda, _) = Pubkey::find_program_address(
        &[
            b"candidate",
            &poll_account_pubkey.to_bytes(),
            &[current_candidate_count], // count 是 u8
        ],
        &voting_client::programs::VOTING_ID,
    );
    println!("🌱 New Candidate PDA: {}", candidate_pda);

    // 4. 使用 Builder 构造指令
    let candidate_name = format!("Candidate #{}", current_candidate_count + 1);
    println!("➕ Adding candidate with name: \"{}\"", candidate_name);
    let instruction = AddCandidateBuilder::new()
        .signer(signer.pubkey())
        .poll_account(poll_account_pubkey)
        .candidate_account(candidate_pda)
        .candidate_name(candidate_name)
        .instruction();

    // 5. 发送交易
    let recent_blockhash = client.get_latest_blockhash()?;
    let transaction = Transaction::new_signed_with_payer(
        &[instruction],
        Some(&signer.pubkey()),
        &[&signer], // 只有 authority 需要签名
        recent_blockhash,
    );

    println!("\n⏳ Sending transaction...");
    let signature = client.send_and_confirm_transaction(&transaction)?;

    println!("\n✅ Success! Candidate has been added.");
    println!("   - Transaction Signature: {}", signature);
    println!(
        "   - Review on Explorer: https://explorer.solana.com/tx/{}?cluster=devnet",
        signature
    );

    Ok(())
}
