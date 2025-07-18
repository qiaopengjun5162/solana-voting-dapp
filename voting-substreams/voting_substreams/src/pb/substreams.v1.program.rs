// @generated
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct Data {
    #[prost(message, repeated, tag="1")]
    pub add_candidate_instruction_list: ::prost::alloc::vec::Vec<AddCandidateInstruction>,
    #[prost(message, repeated, tag="2")]
    pub initialize_poll_instruction_list: ::prost::alloc::vec::Vec<InitializePollInstruction>,
    #[prost(message, repeated, tag="3")]
    pub vote_instruction_list: ::prost::alloc::vec::Vec<VoteInstruction>,
}
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct AddCandidateInstruction {
    #[prost(string, tag="1")]
    pub trx_hash: ::prost::alloc::string::String,
    #[prost(string, tag="2")]
    pub candidate_name: ::prost::alloc::string::String,
    #[prost(string, tag="3")]
    pub acct_signer: ::prost::alloc::string::String,
    #[prost(string, tag="4")]
    pub acct_poll_account: ::prost::alloc::string::String,
    #[prost(string, tag="5")]
    pub acct_candidate_account: ::prost::alloc::string::String,
}
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct InitializePollInstruction {
    #[prost(string, tag="1")]
    pub trx_hash: ::prost::alloc::string::String,
    #[prost(string, tag="2")]
    pub name: ::prost::alloc::string::String,
    #[prost(string, tag="3")]
    pub description: ::prost::alloc::string::String,
    #[prost(uint64, tag="4")]
    pub start_time: u64,
    #[prost(uint64, tag="5")]
    pub end_time: u64,
    #[prost(string, tag="6")]
    pub acct_signer: ::prost::alloc::string::String,
    #[prost(string, tag="7")]
    pub acct_poll_account: ::prost::alloc::string::String,
}
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct VoteInstruction {
    #[prost(string, tag="1")]
    pub trx_hash: ::prost::alloc::string::String,
    #[prost(string, tag="2")]
    pub acct_signer: ::prost::alloc::string::String,
    #[prost(string, tag="3")]
    pub acct_poll_account: ::prost::alloc::string::String,
    #[prost(string, tag="4")]
    pub acct_candidate_account: ::prost::alloc::string::String,
    #[prost(string, tag="5")]
    pub acct_voter_receipt: ::prost::alloc::string::String,
}
// @@protoc_insertion_point(module)
