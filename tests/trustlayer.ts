import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { Trustlayer } from "../target/types/trustlayer";
import idl from "../target/idl/trustlayer.json";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  setAuthority,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  AuthorityType,
} from "@solana/spl-token";
import { expect } from "chai";
import { PublicKey, Keypair } from "@solana/web3.js";

describe("trustlayer", () => {
  const provider = AnchorProvider.env();
  anchor.setProvider(provider);
  // Deployed program ID on local validator — override IDL address for local testing
  const LOCAL_PROGRAM_ID = new PublicKey("DA5qsutDnzrU7ErRWh8stvKC7u1BUYzJec8VvNwxqSzU");
  const program = new Program({ ...idl, address: LOCAL_PROGRAM_ID.toBase58() } as any, provider) as Program<Trustlayer>;
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
      [Buffer.from("job_v3"), clientKey.toBuffer(), jobId.toArrayLike(Buffer, "le", 8)],
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

  const getApplicationPDA = (jobPDA: anchor.web3.PublicKey, freelancerKey: anchor.web3.PublicKey) => {
    const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("application"), jobPDA.toBuffer(), freelancerKey.toBuffer()],
      program.programId
    );
    return pda;
  };

  const getProfilePDA = (user: anchor.web3.PublicKey) => {
    const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user_profile"), user.toBuffer()],
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

    // Fund client with tokens (before revoking mint authority)
    await mintTo(connection, client, mint, clientTokenAccount, client, 5000);

    // Revoke mint authority so initialize_job passes UnsupportedMint check
    await setAuthority(connection, client, mint, client.publicKey, AuthorityType.MintTokens, null);
  });

  it("initialize_job: client creates a job and funds the vault", async () => {
    const jobPDA = getJobPDA(client.publicKey, JOB_ID);
    const vaultPDA = getVaultPDA(jobPDA);

    await program.methods
      .initializeJob(JOB_ID, JOB_AMOUNT, "Test Title", "Test Description", null, 6)
      .accounts({
        client: client.publicKey,
        mint,
        arbiter: arbiter.publicKey,
        clientTokenAccount,
        job: jobPDA,
        vault: vaultPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      } as any)
      .signers([client, arbiter])
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

  it("apply_and_hire: freelancer applies and client hires", async () => {
    const jobPDA = getJobPDA(client.publicKey, JOB_ID);
    const appPDA = getApplicationPDA(jobPDA, freelancer.publicKey);

    // Freelancer applies
    await program.methods
      .applyForJob("I want to work!")
      .accounts({
        freelancer: freelancer.publicKey,
        job: jobPDA,
        application: appPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      } as any)
      .signers([freelancer])
      .rpc();

    // Client hires
    await program.methods
      .hireFreelancer()
      .accounts({
        client: client.publicKey,
        job: jobPDA,
        application: appPDA,
      } as any)
      .signers([client])
      .rpc();

    const job = await program.account.jobEscrow.fetch(jobPDA);
    expect(job.freelancer.toBase58()).to.equal(freelancer.publicKey.toBase58());
    expect(job.status).to.deep.equal({ inProgress: {} });
  });

  it("submit_work: freelancer submits the completed work", async () => {
    const jobPDA = getJobPDA(client.publicKey, JOB_ID);

    await program.methods
      .submitWork("https://example.com/work")
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
    const freelancerProfilePDA = getProfilePDA(freelancer.publicKey);

    await program.methods
      .approveAndRelease()
      .accounts({
        client: client.publicKey,
        freelancer: freelancer.publicKey,
        job: jobPDA,
        clientTokenAccount,
        mint,
        freelancerTokenAccount,
        vault: vaultPDA,
        freelancerProfile: freelancerProfilePDA,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
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
      .initializeJob(cancelJobId, JOB_AMOUNT, "Cancel Test", "Testing cancellation", null, 6)
      .accounts({
        client: client.publicKey,
        mint,
        arbiter: arbiter.publicKey,
        clientTokenAccount,
        job: jobPDA,
        vault: vaultPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      } as any)
      .signers([client, arbiter])
      .rpc();

    const balanceBefore = await connection.getTokenAccountBalance(clientTokenAccount);

    // Cancel it
    await program.methods
      .cancelJob()
      .accounts({
        client: client.publicKey,
        job: jobPDA,
        mint,
        clientTokenAccount,
        vault: vaultPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
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

    const clientTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
      connection, client, mint, client.publicKey
    );
    const freelancerTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
      connection, freelancer, mint, freelancer.publicKey
    );
    const appPDA = getApplicationPDA(jobPDA, freelancer.publicKey);
    const freelancerProfilePDA = getProfilePDA(freelancer.publicKey);

    // Initialize
    await program.methods
      .initializeJob(disputeJobId, JOB_AMOUNT, "Dispute Job", "Testing dispute", null, 6)
      .accounts({
        client: client.publicKey,
        mint,
        arbiter: arbiter.publicKey,
        clientTokenAccount,
        job: jobPDA,
        vault: vaultPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      } as any)
      .signers([client, arbiter])
      .rpc();

    // Apply
    await program.methods
      .applyForJob("I can do this")
      .accounts({
        freelancer: freelancer.publicKey,
        job: jobPDA,
        application: appPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      } as any)
      .signers([freelancer])
      .rpc();

    // Hire
    await program.methods
      .hireFreelancer()
      .accounts({
        client: client.publicKey,
        job: jobPDA,
        application: appPDA,
      } as any)
      .signers([client])
      .rpc();

    // Dispute (called by client)
    await program.methods
      .disputeJob()
      .accounts({ caller: client.publicKey, job: jobPDA } as any)
      .signers([client])
      .rpc();

    const job = await program.account.jobEscrow.fetch(jobPDA);
    expect(job.status).to.deep.equal({ disputed: {} });

    const clientBalBefore = parseInt((await connection.getTokenAccountBalance(clientTokenAccountInfo.address)).value.amount);
    const freelancerBalBefore = parseInt((await connection.getTokenAccountBalance(freelancerTokenAccountInfo.address)).value.amount);

    // Resolve: args are (freelancer_award, client_award) — give 600 to freelancer, 400 to client
    await program.methods
      .resolveDispute(new anchor.BN(600), new anchor.BN(400))
      .accounts({
        arbiter: arbiter.publicKey,
        client: client.publicKey,
        freelancer: freelancer.publicKey,
        job: jobPDA,
        mint,
        clientTokenAccount: clientTokenAccountInfo.address,
        freelancerTokenAccount: freelancerTokenAccountInfo.address,
        vault: vaultPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      } as any)
      .signers([arbiter])
      .rpc();

    const clientBalAfter = parseInt((await connection.getTokenAccountBalance(clientTokenAccountInfo.address)).value.amount);
    const freelancerBalAfter = parseInt((await connection.getTokenAccountBalance(freelancerTokenAccountInfo.address)).value.amount);

    expect(clientBalAfter - clientBalBefore).to.equal(400);
    expect(freelancerBalAfter - freelancerBalBefore).to.equal(600);

    // Job closed
    const jobAccount = await connection.getAccountInfo(jobPDA);
    expect(jobAccount).to.be.null;
  });
});
