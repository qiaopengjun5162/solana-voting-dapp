mod idl;
mod pb;

use anchor_lang::AnchorDeserialize;
use anchor_lang::Discriminator;
use base64::prelude::*;
use pb::substreams::v1::program::Data;
use pb::substreams::v1::program::AddCandidateInstruction;
use pb::substreams::v1::program::InitializePollInstruction;
use pb::substreams::v1::program::VoteInstruction;







use sologger_log_context::programs_selector::ProgramsSelector;
use sologger_log_context::sologger_log_context::LogContext;
use substreams_solana::pb::sf::solana::r#type::v1::Block;

const PROGRAM_ID: &str = "Doo2arLUifZbfqGVS5Uh7nexAMmsMzaQH5zcwZhSoijz";

#[substreams::handlers::map]
fn map_program_data(blk: Block) -> Data {
    let mut add_candidate_instruction_list: Vec<AddCandidateInstruction> = Vec::new();
    let mut initialize_poll_instruction_list: Vec<InitializePollInstruction> = Vec::new();
    let mut vote_instruction_list: Vec<VoteInstruction> = Vec::new();

    blk.transactions().for_each(|transaction| {

        // ------------- INSTRUCTIONS -------------
        transaction
        .walk_instructions()
        .into_iter()
        .filter(|inst| inst.program_id().to_string() == PROGRAM_ID)
        .for_each(|inst| {
            let slice_u8: &[u8] = &inst.data()[..];

            /*
                CPI events are contained inside the instruction data
            */
            if slice_u8.len() >= 16 {
            }
            if &slice_u8[0..8] == idl::idl::program::client::args::AddCandidate::DISCRIMINATOR {
                if let Ok(instruction) =
                    idl::idl::program::client::args::AddCandidate::deserialize(&mut &slice_u8[8..])
                {
                    let accts = inst.accounts();
                    add_candidate_instruction_list.push(AddCandidateInstruction {
                        trx_hash: transaction.id(),
                        candidate_name: instruction.candidate_name,
                        acct_signer: accts[0].to_string(),
                        acct_poll_account: accts[1].to_string(),
                        acct_candidate_account: accts[2].to_string(),
                    });
                }
            }
            if &slice_u8[0..8] == idl::idl::program::client::args::InitializePoll::DISCRIMINATOR {
                if let Ok(instruction) =
                    idl::idl::program::client::args::InitializePoll::deserialize(&mut &slice_u8[8..])
                {
                    let accts = inst.accounts();
                    initialize_poll_instruction_list.push(InitializePollInstruction {
                        trx_hash: transaction.id(),
                        name: instruction.name,
                        description: instruction.description,
                        start_time: instruction.start_time,
                        end_time: instruction.end_time,
                        acct_signer: accts[0].to_string(),
                        acct_poll_account: accts[1].to_string(),
                    });
                }
            }
            if &slice_u8[0..8] == idl::idl::program::client::args::Vote::DISCRIMINATOR {
                if let Ok(instruction) =
                    idl::idl::program::client::args::Vote::deserialize(&mut &slice_u8[8..])
                {
                    let accts = inst.accounts();
                    vote_instruction_list.push(VoteInstruction {
                        trx_hash: transaction.id(),
                        acct_signer: accts[0].to_string(),
                        acct_poll_account: accts[1].to_string(),
                        acct_candidate_account: accts[2].to_string(),
                        acct_voter_receipt: accts[3].to_string(),
                    });
                }
            }
        });
    });


    Data {
        add_candidate_instruction_list,
        initialize_poll_instruction_list,
        vote_instruction_list,
    }
}















