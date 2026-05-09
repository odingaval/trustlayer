import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Trustlayer } from "../target/types/trustlayer";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { expect } from "chai";

describe("trustlayer", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Trustlayer as Program<Trustlayer>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const connection = provider.connection;

  // Participants
  const client = anchor.web3.Keypair.generate();
  const freelancer = anchor.web3.Keypair.generate();
  const arbiter = anchor.web3.Keypair.generate();

  let mint: anchor.web3.PublicKey;
  let clientTokenAccount: anchor.web3.PublicKey;
  let freelancerTokenAccount: anchor.web3.PublicKey;

  const JOB_AMOUNT = new anchor.BN(1000);
  const JOB_ID = new anchor.BN(1);

  // Derive PDAs
  const getJobPDA = (clientKey: anchor.web3.PublicKey, jobId: anchor.BN) => {
    const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("job"), clientKey.toBuffer(), jobId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    return pda;
  };

  const getVaultPDA = (jobPDA: anchor.web3.PublicKey) => {
    const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), jobPDA.toBuffer()],
      program.programId
    );
    return pda;
  };

  before(async () => {
    // Airdrop SOL
    for (const kp of [client, freelancer, arbiter]) {
      await connection.confirmTransaction(
        await connection.requestAirdrop(kp.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
      );
    }

    // Create a single mint (client is mint authority)
    mint = await createMint(connection, client, client.publicKey, null, 6);

    // Create associated token accounts
    clientTokenAccount = (
      await getOrCreateAssociatedTokenAccount(connection, client, mint, client.publicKey)
    ).address;
    freelancerTokenAccount = (
      await getOrCreateAssociatedTokenAccount(connection, freelancer, mint, freelancer.publicKey)
    ).address;

    // Fund client with tokens
    await mintTo(connection, client, mint, clientTokenAccount, client, 5000);
  });

  it("initialize_job: client creates a job and funds the vault", async () => {
    const jobPDA = getJobPDA(client.publicKey, JOB_ID);
    const vaultPDA = getVaultPDA(jobPDA);

    await program.methods
      .initializeJob(JOB_ID, JOB_AMOUNT, arbiter.publicKey)
      .accounts({
        client: client.publicKey,
        mint,
        clientTokenAccount,
        job: jobPDA,
        vault: vaultPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      } as any)
      .signers([client])
      .rpc();

    // Vault should hold the funds
    const vaultBalance = await connection.getTokenAccountBalance(vaultPDA);
    expect(vaultBalance.value.amount).to.equal("1000");

    // Job account should be Open
    const job = await program.account.jobEscrow.fetch(jobPDA);
    expect(job.client.toBase58()).to.equal(client.publicKey.toBase58());
    expect(job.arbiter.toBase58()).to.equal(arbiter.publicKey.toBase58());
    expect(job.amount.toString()).to.equal("1000");
    expect(job.status).to.deep.equal({ open: {} });
  });

  it("accept_job: freelancer accepts the open job", async () => {
    const jobPDA = getJobPDA(client.publicKey, JOB_ID);

    await program.methods
      .acceptJob()
      .accounts({
        freelancer: freelancer.publicKey,
        job: jobPDA,
      } as any)
      .signers([freelancer])
      .rpc();

    const job = await program.account.jobEscrow.fetch(jobPDA);
    expect(job.freelancer.toBase58()).to.equal(freelancer.publicKey.toBase58());
    expect(job.status).to.deep.equal({ inProgress: {} });
  });

  it("submit_work: freelancer submits the completed work", async () => {
    const jobPDA = getJobPDA(client.publicKey, JOB_ID);

    await program.methods
      .submitWork()
      .accounts({
        freelancer: freelancer.publicKey,
        job: jobPDA,
      } as any)
      .signers([freelancer])
      .rpc();

    const job = await program.account.jobEscrow.fetch(jobPDA);
    expect(job.status).to.deep.equal({ inReview: {} });
  });

  it("approve_and_release: client approves and pays the freelancer", async () => {
    const jobPDA = getJobPDA(client.publicKey, JOB_ID);
    const vaultPDA = getVaultPDA(jobPDA);

    await program.methods
      .approveAndRelease()
      .accounts({
        client: client.publicKey,
        freelancer: freelancer.publicKey,
        job: jobPDA,
        mint,
        freelancerTokenAccount,
        vault: vaultPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
      } as any)
      .signers([client])
      .rpc();

    // Freelancer should have received tokens
    const freelancerBalance = await connection.getTokenAccountBalance(freelancerTokenAccount);
    expect(freelancerBalance.value.amount).to.equal("1000");

    // Job account should be closed (lamports returned to client)
    const jobAccount = await connection.getAccountInfo(jobPDA);
    expect(jobAccount).to.be.null;
  });

  it("cancel_job: client can cancel an Open job and get a refund", async () => {
    const cancelJobId = new anchor.BN(2);
    const jobPDA = getJobPDA(client.publicKey, cancelJobId);
    const vaultPDA = getVaultPDA(jobPDA);

    // Create a fresh job
    await program.methods
      .initializeJob(cancelJobId, JOB_AMOUNT, arbiter.publicKey)
      .accounts({
        client: client.publicKey,
        mint,
        clientTokenAccount,
        job: jobPDA,
        vault: vaultPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      } as any)
      .signers([client])
      .rpc();

    const balanceBefore = await connection.getTokenAccountBalance(clientTokenAccount);

    // Cancel it
    await program.methods
      .cancelJob()
      .accounts({
        client: client.publicKey,
        job: jobPDA,
        clientTokenAccount,
        vault: vaultPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
      } as any)
      .signers([client])
      .rpc();

    const balanceAfter = await connection.getTokenAccountBalance(clientTokenAccount);
    // Client should have been refunded 1000 tokens
    expect(
      parseInt(balanceAfter.value.amount) - parseInt(balanceBefore.value.amount)
    ).to.equal(1000);

    // Job and vault should be closed
    const jobAccount = await connection.getAccountInfo(jobPDA);
    expect(jobAccount).to.be.null;
    const vaultAccount = await connection.getAccountInfo(vaultPDA);
    expect(vaultAccount).to.be.null;
  });

  it("dispute_job + resolve_dispute: arbiter splits the funds", async () => {
    const disputeJobId = new anchor.BN(3);
    const jobPDA = getJobPDA(client.publicKey, disputeJobId);
    const vaultPDA = getVaultPDA(jobPDA);

    // Client token account for refund portion
    const clientTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
      connection, client, mint, client.publicKey
    );
    const freelancerTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
      connection, freelancer, mint, freelancer.publicKey
    );

    // Initialize
    await program.methods
      .initializeJob(disputeJobId, JOB_AMOUNT, arbiter.publicKey)
      .accounts({
        client: client.publicKey,
        mint,
        clientTokenAccount,
        job: jobPDA,
        vault: vaultPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      } as any)
      .signers([client])
      .rpc();

    // Accept
    await program.methods
      .acceptJob()
      .accounts({ freelancer: freelancer.publicKey, job: jobPDA } as any)
      .signers([freelancer])
      .rpc();

    // Dispute (called by client)
    await program.methods
      .disputeJob()
      .accounts({ caller: client.publicKey, job: jobPDA } as any)
      .signers([client])
      .rpc();

    const job = await program.account.jobEscrow.fetch(jobPDA);
    expect(job.status).to.deep.equal({ disputed: {} });

    const clientBalBefore = parseInt((await connection.getTokenAccountBalance(clientTokenAccount)).value.amount);
    const freelancerBalBefore = parseInt((await connection.getTokenAccountBalance(freelancerTokenAccount)).value.amount);

    // Resolve: 600 to freelancer, 400 to client
    await program.methods
      .resolveDispute(new anchor.BN(400), new anchor.BN(600))
      .accounts({
        arbiter: arbiter.publicKey,
        client: client.publicKey,
        freelancer: freelancer.publicKey,
        job: jobPDA,
        clientTokenAccount,
        freelancerTokenAccount,
        vault: vaultPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
      } as any)
      .signers([arbiter])
      .rpc();

    const clientBalAfter = parseInt((await connection.getTokenAccountBalance(clientTokenAccount)).value.amount);
    const freelancerBalAfter = parseInt((await connection.getTokenAccountBalance(freelancerTokenAccount)).value.amount);

    expect(clientBalAfter - clientBalBefore).to.equal(400);
    expect(freelancerBalAfter - freelancerBalBefore).to.equal(600);

    // Job closed
    const jobAccount = await connection.getAccountInfo(jobPDA);
    expect(jobAccount).to.be.null;
  });
});
