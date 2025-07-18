#![allow(unexpected_cfgs, deprecated)]

use anchor_lang::prelude::*;

declare_id!("Doo2arLUifZbfqGVS5Uh7nexAMmsMzaQH5zcwZhSoijz");

#[program]
pub mod voting {
    use super::*;

    // 初始化投票活动
    pub fn initialize_poll(
        ctx: Context<InitializePoll>,
        name: String,
        description: String,
        start_time: u64,
        end_time: u64,
    ) -> Result<()> {
        let poll_account = &mut ctx.accounts.poll_account;
        poll_account.name = name;
        poll_account.description = description;
        poll_account.start_time = start_time;
        poll_account.end_time = end_time;
        poll_account.authority = ctx.accounts.signer.key();
        poll_account.candidates = Vec::new();

        // 关键修复：使用专门的计数器，避免 Vec.len() 的解释错误
        poll_account.candidate_count = 0;

        Ok(())
    }

    // 添加候选人
    pub fn add_candidate(ctx: Context<AddCandidate>, candidate_name: String) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.poll_account.authority,
            ctx.accounts.signer.key(),
            ErrorCode::Unauthorized
        );

        let poll_account = &mut ctx.accounts.poll_account;
        let candidate_account = &mut ctx.accounts.candidate_account;

        // 检查专门的计数器，而不是 Vec.len()
        require!(
            poll_account.candidate_count < 15,
            ErrorCode::MaxCandidatesReached
        );

        candidate_account.name = candidate_name;
        candidate_account.poll = poll_account.key();
        candidate_account.votes = 0;

        poll_account.candidates.push(candidate_account.key());
        // 在成功添加后，手动增加计数器
        poll_account.candidate_count += 1;

        Ok(())
    }

    // 投票
    pub fn vote(ctx: Context<Vote>) -> Result<()> {
        let clock = Clock::get()?;
        let poll_account = &ctx.accounts.poll_account;
        let candidate_account = &mut ctx.accounts.candidate_account;

        if clock.unix_timestamp < poll_account.start_time as i64 {
            return err!(ErrorCode::PollNotStarted);
        }

        if clock.unix_timestamp > poll_account.end_time as i64 {
            return err!(ErrorCode::PollEnded);
        }

        require_keys_eq!(
            candidate_account.poll,
            poll_account.key(),
            ErrorCode::InvalidCandidateForPoll
        );

        candidate_account.votes += 1;

        let receipt = &mut ctx.accounts.voter_receipt;
        receipt.voter = ctx.accounts.signer.key();
        receipt.poll = poll_account.key();

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializePoll<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(init, payer = signer, space = 8 + PollAccount::INIT_SPACE)]
    pub poll_account: Account<'info, PollAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddCandidate<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub poll_account: Account<'info, PollAccount>,
    #[account(
        init,
        payer = signer,
        space = 8 + CandidateAccount::INIT_SPACE,
        // seeds 现在使用更可靠的计数器
        seeds = [b"candidate", poll_account.key().as_ref(), poll_account.candidate_count.to_le_bytes().as_ref()],
        bump
    )]
    pub candidate_account: Account<'info, CandidateAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Vote<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub poll_account: Account<'info, PollAccount>,
    #[account(
        mut,
        constraint = candidate_account.poll == poll_account.key() @ ErrorCode::InvalidCandidateForPoll
    )]
    pub candidate_account: Account<'info, CandidateAccount>,
    #[account(
        init,
        payer = signer,
        space = 8 + VoterReceipt::INIT_SPACE,
        seeds = [b"receipt", poll_account.key().as_ref(), signer.key().as_ref()],
        bump
    )]
    pub voter_receipt: Account<'info, VoterReceipt>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct PollAccount {
    pub authority: Pubkey,
    #[max_len(32)]
    pub name: String,
    #[max_len(280)]
    pub description: String,
    pub start_time: u64,
    pub end_time: u64,
    // 增加专门的计数器
    pub candidate_count: u8,
    #[max_len(15, 32)]
    pub candidates: Vec<Pubkey>,
}

#[account]
#[derive(InitSpace)]
pub struct CandidateAccount {
    pub poll: Pubkey,
    #[max_len(32)]
    pub name: String,
    pub votes: u64,
}

#[account]
#[derive(InitSpace)]
pub struct VoterReceipt {
    pub voter: Pubkey,
    pub poll: Pubkey,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Poll not started yet")]
    PollNotStarted,
    #[msg("Poll ended")]
    PollEnded,
    #[msg("Unauthorized: Only the poll authority can perform this action.")]
    Unauthorized,
    #[msg("Maximum number of candidates reached.")]
    MaxCandidatesReached,
    #[msg("This candidate is not valid for this poll.")]
    InvalidCandidateForPoll,
}
