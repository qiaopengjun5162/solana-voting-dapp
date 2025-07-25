/**
 * This code was AUTOGENERATED using the codama library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun codama to update it.
 *
 * @see https://github.com/codama-idl/codama
 */

import {
  addDecoderSizePrefix,
  addEncoderSizePrefix,
  combineCodec,
  fixDecoderSize,
  fixEncoderSize,
  getBytesDecoder,
  getBytesEncoder,
  getStructDecoder,
  getStructEncoder,
  getU32Decoder,
  getU32Encoder,
  getUtf8Decoder,
  getUtf8Encoder,
  transformEncoder,
  type AccountMeta,
  type AccountSignerMeta,
  type Address,
  type Codec,
  type Decoder,
  type Encoder,
  type Instruction,
  type InstructionWithAccounts,
  type InstructionWithData,
  type ReadonlyAccount,
  type ReadonlyUint8Array,
  type TransactionSigner,
  type WritableAccount,
  type WritableSignerAccount,
} from "@solana/kit";
import { VOTING_PROGRAM_ADDRESS } from "../programs";
import { getAccountMetaFactory, type ResolvedAccount } from "../shared";

export const ADD_CANDIDATE_DISCRIMINATOR = new Uint8Array([
  172, 34, 30, 247, 165, 210, 224, 164,
]);

export function getAddCandidateDiscriminatorBytes() {
  return fixEncoderSize(getBytesEncoder(), 8).encode(
    ADD_CANDIDATE_DISCRIMINATOR,
  );
}

export type AddCandidateInstruction<
  TProgram extends string = typeof VOTING_PROGRAM_ADDRESS,
  TAccountSigner extends string | AccountMeta<string> = string,
  TAccountPollAccount extends string | AccountMeta<string> = string,
  TAccountCandidateAccount extends string | AccountMeta<string> = string,
  TAccountSystemProgram extends
    | string
    | AccountMeta<string> = "11111111111111111111111111111111",
  TRemainingAccounts extends readonly AccountMeta<string>[] = [],
> = Instruction<TProgram> &
  InstructionWithData<ReadonlyUint8Array> &
  InstructionWithAccounts<
    [
      TAccountSigner extends string
        ? WritableSignerAccount<TAccountSigner> &
            AccountSignerMeta<TAccountSigner>
        : TAccountSigner,
      TAccountPollAccount extends string
        ? WritableAccount<TAccountPollAccount>
        : TAccountPollAccount,
      TAccountCandidateAccount extends string
        ? WritableAccount<TAccountCandidateAccount>
        : TAccountCandidateAccount,
      TAccountSystemProgram extends string
        ? ReadonlyAccount<TAccountSystemProgram>
        : TAccountSystemProgram,
      ...TRemainingAccounts,
    ]
  >;

export type AddCandidateInstructionData = {
  discriminator: ReadonlyUint8Array;
  candidateName: string;
};

export type AddCandidateInstructionDataArgs = { candidateName: string };

export function getAddCandidateInstructionDataEncoder(): Encoder<AddCandidateInstructionDataArgs> {
  return transformEncoder(
    getStructEncoder([
      ["discriminator", fixEncoderSize(getBytesEncoder(), 8)],
      [
        "candidateName",
        addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()),
      ],
    ]),
    (value) => ({ ...value, discriminator: ADD_CANDIDATE_DISCRIMINATOR }),
  );
}

export function getAddCandidateInstructionDataDecoder(): Decoder<AddCandidateInstructionData> {
  return getStructDecoder([
    ["discriminator", fixDecoderSize(getBytesDecoder(), 8)],
    ["candidateName", addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
  ]);
}

export function getAddCandidateInstructionDataCodec(): Codec<
  AddCandidateInstructionDataArgs,
  AddCandidateInstructionData
> {
  return combineCodec(
    getAddCandidateInstructionDataEncoder(),
    getAddCandidateInstructionDataDecoder(),
  );
}

export type AddCandidateInput<
  TAccountSigner extends string = string,
  TAccountPollAccount extends string = string,
  TAccountCandidateAccount extends string = string,
  TAccountSystemProgram extends string = string,
> = {
  signer: TransactionSigner<TAccountSigner>;
  pollAccount: Address<TAccountPollAccount>;
  candidateAccount: Address<TAccountCandidateAccount>;
  systemProgram?: Address<TAccountSystemProgram>;
  candidateName: AddCandidateInstructionDataArgs["candidateName"];
};

export function getAddCandidateInstruction<
  TAccountSigner extends string,
  TAccountPollAccount extends string,
  TAccountCandidateAccount extends string,
  TAccountSystemProgram extends string,
  TProgramAddress extends Address = typeof VOTING_PROGRAM_ADDRESS,
>(
  input: AddCandidateInput<
    TAccountSigner,
    TAccountPollAccount,
    TAccountCandidateAccount,
    TAccountSystemProgram
  >,
  config?: { programAddress?: TProgramAddress },
): AddCandidateInstruction<
  TProgramAddress,
  TAccountSigner,
  TAccountPollAccount,
  TAccountCandidateAccount,
  TAccountSystemProgram
> {
  // Program address.
  const programAddress = config?.programAddress ?? VOTING_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    signer: { value: input.signer ?? null, isWritable: true },
    pollAccount: { value: input.pollAccount ?? null, isWritable: true },
    candidateAccount: {
      value: input.candidateAccount ?? null,
      isWritable: true,
    },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
  };
  const accounts = originalAccounts as Record<
    keyof typeof originalAccounts,
    ResolvedAccount
  >;

  // Original args.
  const args = { ...input };

  // Resolve default values.
  if (!accounts.systemProgram.value) {
    accounts.systemProgram.value =
      "11111111111111111111111111111111" as Address<"11111111111111111111111111111111">;
  }

  const getAccountMeta = getAccountMetaFactory(programAddress, "programId");
  const instruction = {
    accounts: [
      getAccountMeta(accounts.signer),
      getAccountMeta(accounts.pollAccount),
      getAccountMeta(accounts.candidateAccount),
      getAccountMeta(accounts.systemProgram),
    ],
    programAddress,
    data: getAddCandidateInstructionDataEncoder().encode(
      args as AddCandidateInstructionDataArgs,
    ),
  } as AddCandidateInstruction<
    TProgramAddress,
    TAccountSigner,
    TAccountPollAccount,
    TAccountCandidateAccount,
    TAccountSystemProgram
  >;

  return instruction;
}

export type ParsedAddCandidateInstruction<
  TProgram extends string = typeof VOTING_PROGRAM_ADDRESS,
  TAccountMetas extends readonly AccountMeta[] = readonly AccountMeta[],
> = {
  programAddress: Address<TProgram>;
  accounts: {
    signer: TAccountMetas[0];
    pollAccount: TAccountMetas[1];
    candidateAccount: TAccountMetas[2];
    systemProgram: TAccountMetas[3];
  };
  data: AddCandidateInstructionData;
};

export function parseAddCandidateInstruction<
  TProgram extends string,
  TAccountMetas extends readonly AccountMeta[],
>(
  instruction: Instruction<TProgram> &
    InstructionWithAccounts<TAccountMetas> &
    InstructionWithData<ReadonlyUint8Array>,
): ParsedAddCandidateInstruction<TProgram, TAccountMetas> {
  if (instruction.accounts.length < 4) {
    // TODO: Coded error.
    throw new Error("Not enough accounts");
  }
  let accountIndex = 0;
  const getNextAccount = () => {
    const accountMeta = instruction.accounts![accountIndex]!;
    accountIndex += 1;
    return accountMeta;
  };
  return {
    programAddress: instruction.programAddress,
    accounts: {
      signer: getNextAccount(),
      pollAccount: getNextAccount(),
      candidateAccount: getNextAccount(),
      systemProgram: getNextAccount(),
    },
    data: getAddCandidateInstructionDataDecoder().decode(instruction.data),
  };
}
