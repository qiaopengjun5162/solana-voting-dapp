# Voting

## 实操

部署合约

```bash
➜ make build-one PROGRAM=voting
➜ make deploy CLUSTER=devnet PROGRAM=voting
➜ solana address -k target/deploy/voting-keypair.json 
➜ rm target/deploy/voting-keypair.json 
anchor keys sync
➜ make idl-init CLUSTER=devnet PROGRAM=voting PROGRAM_ID=Doo2arLUifZbfqGVS5Uh7nexAMmsMzaQH5zcwZhSoijz     
➜ make archive-idl PROGRAM=voting                                                                                                           
```

## 参考

- <https://solscan.io/account/Doo2arLUifZbfqGVS5Uh7nexAMmsMzaQH5zcwZhSoijz?cluster=devnet>
