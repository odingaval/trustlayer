import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Trustlayer } from "../target/types/trustlayer";
import { 
  createMint, 
  getOrCreateAssociatedTokenAccount, 
  mintTo, 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID 
} from "@solana/spl-token";
import { expect } from "chai";

describe("trustlayer", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.trustlayer as Program<Trustlayer>;
  const provider = anchor.getProvider();
  const connection = provider.connection;

  const maker = anchor.web3.Keypair.generate();
  const taker = anchor.web3.Keypair.generate();

  let mintA: anchor.web3.Pubkey;
  let mintB: anchor.web3.Pubkey;
  let makerTokenAccountA: anchor.web3.Pubkey;
  let makerTokenAccountB: anchor.web3.Pubkey;
  let takerTokenAccountA: anchor.web3.Pubkey;
  let takerTokenAccountB: anchor.web3.Pubkey;

  const amountA = new anchor.BN(1000);
  const amountB = new anchor.BN(500);

  before(async () => {
    // Airdrop SOL to maker and taker
    await connection.confirmTransaction(
      await connection.requestAirdrop(maker.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
    );
    await connection.confirmTransaction(
      await connection.requestAirdrop(taker.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
    );

    // Create Mints
    mintA = await createMint(connection, maker, maker.publicKey, null, 6);
    mintB = await createMint(connection, taker, taker.publicKey, null, 6);

    // Create Token Accounts
    makerTokenAccountA = (await getOrCreateAssociatedTokenAccount(connection, maker, mintA, maker.publicKey)).address;
    makerTokenAccountB = (await getOrCreateAssociatedTokenAccount(connection, maker, mintB, maker.publicKey)).address;
    takerTokenAccountA = (await getOrCreateAssociatedTokenAccount(connection, taker, mintA, taker.publicKey)).address;
    takerTokenAccountB = (await getOrCreateAssociatedTokenAccount(connection, taker, mintB, taker.publicKey)).address;

    // Mint tokens to Maker A and Taker B
    await mintTo(connection, maker, mintA, makerTokenAccountA, maker, 1000);
    await mintTo(connection, taker, mintB, takerTokenAccountB, taker, 500);
  });

  it("Escrow: Make!", async () => {
    const [escrowPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), maker.publicKey.toBuffer(), mintA.toBuffer()],
      program.programId
    );

    const [vaultPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), escrowPDA.toBuffer()],
      program.programId
    );

    await program.methods
      .make(amountA, amountB)
      .accounts({
        maker: maker.publicKey,
        mintA: mintA,
        mintB: mintB,
        makerTokenAccountA: makerTokenAccountA,
        escrow: escrowPDA,
        vault: vaultPDA,
      } as any)
      .signers([maker])
      .rpc();

    // Check vault balance
    const vaultTokenAccount = await connection.getTokenAccountBalance(vaultPDA);
    expect(vaultTokenAccount.value.amount).to.equal("1000");

    // Check escrow state
    const escrowState = await program.account.escrow.fetch(escrowPDA);
    expect(escrowState.maker.toBase58()).to.equal(maker.publicKey.toBase58());
    expect(escrowState.amountA.toString()).to.equal("1000");
    expect(escrowState.amountB.toString()).to.equal("500");
  });

  it("Escrow: Take!", async () => {
    const [escrowPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), maker.publicKey.toBuffer(), mintA.toBuffer()],
      program.programId
    );

    const [vaultPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), escrowPDA.toBuffer()],
      program.programId
    );

    await program.methods
      .take()
      .accounts({
        taker: taker.publicKey,
        maker: maker.publicKey,
        mintA: mintA,
        mintB: mintB,
        takerTokenAccountA: takerTokenAccountA,
        takerTokenAccountB: takerTokenAccountB,
        makerTokenAccountB: makerTokenAccountB,
        escrow: escrowPDA,
        vault: vaultPDA,
      } as any)
      .signers([taker])
      .rpc();

    // Check final balances
    const makerTokenAccountBBalance = await connection.getTokenAccountBalance(makerTokenAccountB);
    const takerTokenAccountABalance = await connection.getTokenAccountBalance(takerTokenAccountA);

    expect(makerTokenAccountBBalance.value.amount).to.equal("500");
    expect(takerTokenAccountABalance.value.amount).to.equal("1000");

    // Escrow account should be closed
    const escrowAccount = await connection.getAccountInfo(escrowPDA);
    expect(escrowAccount).to.be.null;
  });
});
