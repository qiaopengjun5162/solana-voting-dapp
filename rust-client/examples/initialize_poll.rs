use anyhow::Result;
use chrono::Utc;
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    signature::{Keypair, Signer},
    transaction::Transaction,
};
use std::convert::TryFrom;
use std::{env, fs};

// --- 现在可以直接像使用外部库一样导入 ---
use voting_client::instructions::InitializePollBuilder;

/// 从文件加载钱包 Keypair
fn load_wallet(path: &str) -> Result<Keypair> {
    let content = fs::read_to_string(path)?;
    let bytes: Vec<u8> = serde_json::from_str(&content)?;
    Ok(Keypair::try_from(bytes.as_slice())?)
}

#[tokio::main]
async fn main() -> Result<()> {
    println!("--- 🚀 Starting Final Rust Client ---");

    // 从项目根目录加载 .env 文件
    dotenvy::from_path("../.env").ok();

    let rpc_url =
        env::var("RPC_URL").unwrap_or_else(|_| "https://api.devnet.solana.com".to_string());

    let wallet_path = env::var("WALLET_PATH").unwrap_or_else(|_| {
        let home = env::var("HOME").expect("HOME environment variable is not set");
        format!("{}/.config/solana/id.json", home)
    });

    let client = RpcClient::new(rpc_url);
    let signer = load_wallet(&wallet_path)?;
    let poll_account = Keypair::new();

    println!("🔑 Signer (Authority): {}", signer.pubkey());
    println!("📝 New Poll Account Address: {}", poll_account.pubkey());

    // InitializePollBuilder 会自动处理 program_id 和 system_program
    let instruction = InitializePollBuilder::new()
        .signer(signer.pubkey())
        .poll_account(poll_account.pubkey())
        .name("Poll from Rust Client (Final)".to_string())
        .description("This should finally work!".to_string())
        .start_time((Utc::now().timestamp() - 60) as u64)
        .end_time((Utc::now().timestamp() + 3600) as u64)
        .instruction();

    let recent_blockhash = client.get_latest_blockhash()?;
    let transaction = Transaction::new_signed_with_payer(
        &[instruction],
        Some(&signer.pubkey()),
        &[&signer, &poll_account],
        recent_blockhash,
    );

    println!("\n⏳ Sending transaction...");
    let signature = client.send_and_confirm_transaction(&transaction)?;

    println!("\n✅ Success! The transaction was confirmed.");
    println!("   - Transaction Signature: {}", signature);
    println!(
        "   - Review on Explorer: https://explorer.solana.com/tx/{}?cluster=devnet",
        signature
    );

    Ok(())
}
