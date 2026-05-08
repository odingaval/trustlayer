use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("2Shd1bCR2qrPU9svNZEhi7JMGcnpDqtRr7FrgLckG6ef");

#[program]
pub mod trustlayer {
    use super::*;

    pub fn make(ctx: Context<Make>, amount_a: u64, amount_b: u64) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        escrow.maker = ctx.accounts.maker.key();
        escrow.mint_a = ctx.accounts.mint_a.key();
        escrow.mint_b = ctx.accounts.mint_b.key();
        escrow.amount_a = amount_a;
        escrow.amount_b = amount_b;
        escrow.bump = ctx.bumps.escrow;

        // Transfer Maker's tokens to the vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.maker_token_account_a.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.maker.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount_a)?;

        Ok(())
    }

    pub fn take(ctx: Context<Take>) -> Result<()> {
        let amount_b = ctx.accounts.escrow.amount_b;
        let amount_a = ctx.accounts.escrow.amount_a;

        // 1. Transfer wanted tokens (Mint B) from Taker to Maker
        let cpi_accounts_taker_to_maker = Transfer {
            from: ctx.accounts.taker_token_account_b.to_account_info(),
            to: ctx.accounts.maker_token_account_b.to_account_info(),
            authority: ctx.accounts.taker.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx_taker_to_maker = CpiContext::new(cpi_program.clone(), cpi_accounts_taker_to_maker);
        token::transfer(cpi_ctx_taker_to_maker, amount_b)?;

        // 2. Transfer offered tokens (Mint A) from Vault to Taker
        let seeds = &[
            b"escrow",
            ctx.accounts.escrow.maker.as_ref(),
            ctx.accounts.escrow.mint_a.as_ref(),
            &[ctx.accounts.escrow.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_accounts_vault_to_taker = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.taker_token_account_a.to_account_info(),
            authority: ctx.accounts.escrow.to_account_info(),
        };
        let cpi_ctx_vault_to_taker = CpiContext::new_with_signer(cpi_program.clone(), cpi_accounts_vault_to_taker, signer_seeds);
        token::transfer(cpi_ctx_vault_to_taker, amount_a)?;

        // 3. Close the vault
        let close_accounts = token::CloseAccount {
            account: ctx.accounts.vault.to_account_info(),
            destination: ctx.accounts.maker.to_account_info(),
            authority: ctx.accounts.escrow.to_account_info(),
        };
        let close_ctx = CpiContext::new_with_signer(cpi_program, close_accounts, signer_seeds);
        token::close_account(close_ctx)?;

        Ok(())
    }

    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        let amount_a = ctx.accounts.escrow.amount_a;

        let seeds = &[
            b"escrow",
            ctx.accounts.escrow.maker.as_ref(),
            ctx.accounts.escrow.mint_a.as_ref(),
            &[ctx.accounts.escrow.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        // 1. Transfer tokens back to Maker
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.maker_token_account_a.to_account_info(),
            authority: ctx.accounts.escrow.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program.clone(), cpi_accounts, signer_seeds);
        token::transfer(cpi_ctx, amount_a)?;

        // 2. Close the vault
        let close_accounts = token::CloseAccount {
            account: ctx.accounts.vault.to_account_info(),
            destination: ctx.accounts.maker.to_account_info(),
            authority: ctx.accounts.escrow.to_account_info(),
        };
        let close_ctx = CpiContext::new_with_signer(cpi_program, close_accounts, signer_seeds);
        token::close_account(close_ctx)?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(amount_a: u64, amount_b: u64)]
pub struct Make<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,

    pub mint_a: Account<'info, Mint>,
    pub mint_b: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint_a,
        associated_token::authority = maker,
    )]
    pub maker_token_account_a: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = maker,
        space = 8 + Escrow::INIT_SPACE,
        seeds = [b"escrow", maker.key().as_ref(), mint_a.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(
        init,
        payer = maker,
        seeds = [b"vault", escrow.key().as_ref()],
        bump,
        token::mint = mint_a,
        token::authority = escrow,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Take<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,

    #[account(mut)]
    pub maker: SystemAccount<'info>,

    pub mint_a: Account<'info, Mint>,
    pub mint_b: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint_a,
        associated_token::authority = taker,
    )]
    pub taker_token_account_a: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint_b,
        associated_token::authority = taker,
    )]
    pub taker_token_account_b: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint_b,
        associated_token::authority = maker,
    )]
    pub maker_token_account_b: Account<'info, TokenAccount>,

    #[account(
        mut,
        close = maker,
        seeds = [b"escrow", maker.key().as_ref(), mint_a.key().as_ref()],
        bump = escrow.bump,
        has_one = maker,
        has_one = mint_a,
        has_one = mint_b,
    )]
    pub escrow: Box<Account<'info, Escrow>>,

    #[account(
        mut,
        seeds = [b"vault", escrow.key().as_ref()],
        bump,
        token::mint = mint_a,
        token::authority = escrow,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,

    pub mint_a: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint_a,
        associated_token::authority = maker,
    )]
    pub maker_token_account_a: Account<'info, TokenAccount>,

    #[account(
        mut,
        close = maker,
        seeds = [b"escrow", maker.key().as_ref(), mint_a.key().as_ref()],
        bump = escrow.bump,
        has_one = maker,
        has_one = mint_a,
    )]
    pub escrow: Box<Account<'info, Escrow>>,

    #[account(
        mut,
        seeds = [b"vault", escrow.key().as_ref()],
        bump,
        token::mint = mint_a,
        token::authority = escrow,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[account]
#[derive(InitSpace)]
pub struct Escrow {
    pub maker: Pubkey,
    pub mint_a: Pubkey,
    pub mint_b: Pubkey,
    pub amount_a: u64,
    pub amount_b: u64,
    pub bump: u8,
}
