use anyhow::Result;
use solana_client::rpc_client::RpcClient;
use solana_sdk::pubkey::Pubkey;
use std::{env, str::FromStr};

use voting_client::accounts::CandidateAccount;

#[tokio::main]
async fn main() -> Result<()> {
    println!("--- 🚀 Starting [Step 4: Verify Vote] Rust Client ---");

    dotenvy::from_path("../.env").ok();

    let rpc_url =
        env::var("RPC_URL").unwrap_or_else(|_| "https://api.devnet.solana.com".to_string());

    // !! 重要：请将这里的地址替换为您投票的候选人地址 !!
    let candidate_account_pubkey =
        Pubkey::from_str("D2dmKitcUCCcDYEsd1vT67rzF11xTV1kDZwJoXhRnet1")?;

    let client = RpcClient::new(rpc_url);

    println!(
        "🔍 Checking candidate account: {}",
        candidate_account_pubkey
    );

    let account_info = client.get_account(&candidate_account_pubkey)?;
    let candidate_data = CandidateAccount::from_bytes(&account_info.data)?;

    println!("\n✅ Verification Successful!");
    println!("   - Candidate Name: \"{}\"", candidate_data.name);
    println!("   - Vote Count: {}", candidate_data.votes);

    if candidate_data.votes > 0 {
        println!("\n🎉🎉 Great! The vote was correctly recorded on-chain.");
    } else {
        println!("\n🤔 Hmm, the vote count is still 0. Something might be wrong.");
    }

    Ok(())
}
