use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("2Shd1bCR2qrPU9svNZEhi7JMGcnpDqtRr7FrgLckG6ef");

#[program]
pub mod trustlayer {
    use super::*;

    pub fn initialize_job(
        ctx: Context<InitializeJob>,
        job_id: u64,
        amount: u64,
        arbiter: Pubkey,
    ) -> Result<()> {
        let job = &mut ctx.accounts.job;
        job.client = ctx.accounts.client.key();
        job.arbiter = arbiter;
        job.freelancer = Pubkey::default(); // Not assigned yet
        job.mint = ctx.accounts.mint.key();
        job.amount = amount;
        job.status = JobStatus::Open;
        job.job_id = job_id;
        job.bump = ctx.bumps.job;

        // Transfer funds to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.client_token_account.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.client.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        Ok(())
    }

    pub fn accept_job(ctx: Context<AcceptJob>) -> Result<()> {
        let job = &mut ctx.accounts.job;
        require!(job.status == JobStatus::Open, ErrorCode::InvalidStatus);
        
        job.freelancer = ctx.accounts.freelancer.key();
        job.status = JobStatus::InProgress;
        Ok(())
    }

    pub fn submit_work(ctx: Context<SubmitWork>) -> Result<()> {
        let job = &mut ctx.accounts.job;
        require!(job.status == JobStatus::InProgress, ErrorCode::InvalidStatus);
        require!(job.freelancer == ctx.accounts.freelancer.key(), ErrorCode::Unauthorized);
        
        job.status = JobStatus::InReview;
        Ok(())
    }

    pub fn approve_and_release(ctx: Context<ApproveAndRelease>) -> Result<()> {
        let job = &mut ctx.accounts.job;
        require!(
            job.status == JobStatus::InProgress || job.status == JobStatus::InReview,
            ErrorCode::InvalidStatus
        );

        let amount = job.amount;
        job.status = JobStatus::Completed;

        let client_key = job.client;
        let job_id_bytes = job.job_id.to_le_bytes();
        let bump = job.bump;

        let seeds = &[
            b"job",
            client_key.as_ref(),
            &job_id_bytes,
            &[bump],
        ];
        let signer_seeds = &[&seeds[..]];

        // Transfer funds to freelancer
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.freelancer_token_account.to_account_info(),
            authority: job.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program.clone(), cpi_accounts, signer_seeds);
        token::transfer(cpi_ctx, amount)?;

        // Close vault
        let close_accounts = token::CloseAccount {
            account: ctx.accounts.vault.to_account_info(),
            destination: ctx.accounts.client.to_account_info(),
            authority: job.to_account_info(),
        };
        let close_ctx = CpiContext::new_with_signer(cpi_program, close_accounts, signer_seeds);
        token::close_account(close_ctx)?;

        Ok(())
    }

    pub fn cancel_job(ctx: Context<CancelJob>) -> Result<()> {
        let job = &ctx.accounts.job;
        require!(job.status == JobStatus::Open, ErrorCode::CannotCancel);

        let amount = job.amount;
        let client_key = job.client;
        let job_id_bytes = job.job_id.to_le_bytes();
        let bump = job.bump;
        
        let seeds = &[
            b"job",
            client_key.as_ref(),
            &job_id_bytes,
            &[bump],
        ];
        let signer_seeds = &[&seeds[..]];

        // Transfer funds back to client
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.client_token_account.to_account_info(),
            authority: job.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program.clone(), cpi_accounts, signer_seeds);
        token::transfer(cpi_ctx, amount)?;

        // Close vault
        let close_accounts = token::CloseAccount {
            account: ctx.accounts.vault.to_account_info(),
            destination: ctx.accounts.client.to_account_info(),
            authority: job.to_account_info(),
        };
        let close_ctx = CpiContext::new_with_signer(cpi_program, close_accounts, signer_seeds);
        token::close_account(close_ctx)?;

        Ok(())
    }

    pub fn dispute_job(ctx: Context<DisputeJob>) -> Result<()> {
        let job = &mut ctx.accounts.job;
        require!(
            job.status == JobStatus::InProgress || job.status == JobStatus::InReview,
            ErrorCode::InvalidStatus
        );
        job.status = JobStatus::Disputed;
        Ok(())
    }

    pub fn resolve_dispute(
        ctx: Context<ResolveDispute>,
        client_award: u64,
        freelancer_award: u64,
    ) -> Result<()> {
        let job = &mut ctx.accounts.job;
        require!(job.status == JobStatus::Disputed, ErrorCode::InvalidStatus);
        require!(client_award + freelancer_award <= job.amount, ErrorCode::InvalidAmount);

        job.status = JobStatus::Completed;
        
        let client_key = job.client;
        let job_id_bytes = job.job_id.to_le_bytes();
        let bump = job.bump;

        let seeds = &[
            b"job",
            client_key.as_ref(),
            &job_id_bytes,
            &[bump],
        ];
        let signer_seeds = &[&seeds[..]];
        let cpi_program = ctx.accounts.token_program.to_account_info();

        if freelancer_award > 0 {
            let cpi_accounts = Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.freelancer_token_account.to_account_info(),
                authority: job.to_account_info(),
            };
            let cpi_ctx = CpiContext::new_with_signer(cpi_program.clone(), cpi_accounts, signer_seeds);
            token::transfer(cpi_ctx, freelancer_award)?;
        }

        if client_award > 0 {
            let cpi_accounts = Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.client_token_account.to_account_info(),
                authority: job.to_account_info(),
            };
            let cpi_ctx = CpiContext::new_with_signer(cpi_program.clone(), cpi_accounts, signer_seeds);
            token::transfer(cpi_ctx, client_award)?;
        }

        // Close vault
        let close_accounts = token::CloseAccount {
            account: ctx.accounts.vault.to_account_info(),
            destination: ctx.accounts.client.to_account_info(),
            authority: job.to_account_info(),
        };
        let close_ctx = CpiContext::new_with_signer(cpi_program, close_accounts, signer_seeds);
        token::close_account(close_ctx)?;

        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum JobStatus {
    Open,
    InProgress,
    InReview,
    Disputed,
    Completed,
    Refunded,
}

#[account]
pub struct JobEscrow {
    pub client: Pubkey,
    pub freelancer: Pubkey,
    pub arbiter: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub status: JobStatus,
    pub job_id: u64,
    pub bump: u8,
}

impl JobEscrow {
    pub const INIT_SPACE: usize = 32 + 32 + 32 + 32 + 8 + 1 + 8 + 1;
}

#[derive(Accounts)]
#[instruction(job_id: u64)]
pub struct InitializeJob<'info> {
    #[account(mut)]
    pub client: Signer<'info>,
    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = client,
    )]
    pub client_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = client,
        space = 8 + JobEscrow::INIT_SPACE,
        seeds = [b"job", client.key().as_ref(), &job_id.to_le_bytes()],
        bump
    )]
    pub job: Account<'info, JobEscrow>,

    #[account(
        init,
        payer = client,
        seeds = [b"vault", job.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = job,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct AcceptJob<'info> {
    #[account(mut)]
    pub freelancer: Signer<'info>,
    #[account(mut)]
    pub job: Account<'info, JobEscrow>,
}

#[derive(Accounts)]
pub struct SubmitWork<'info> {
    #[account(mut)]
    pub freelancer: Signer<'info>,
    #[account(mut)]
    pub job: Account<'info, JobEscrow>,
}

#[derive(Accounts)]
pub struct ApproveAndRelease<'info> {
    #[account(mut)]
    pub client: Signer<'info>,

    /// CHECK: We don't strictly need the freelancer to sign, but we need their account
    #[account(address = job.freelancer)]
    pub freelancer: UncheckedAccount<'info>,

    #[account(
        mut,
        has_one = client,
        close = client,
    )]
    pub job: Account<'info, JobEscrow>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = freelancer,
    )]
    pub freelancer_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault", job.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelJob<'info> {
    #[account(mut)]
    pub client: Signer<'info>,

    #[account(
        mut,
        has_one = client,
        close = client,
    )]
    pub job: Account<'info, JobEscrow>,

    #[account(
        mut,
        associated_token::mint = job.mint,
        associated_token::authority = client,
    )]
    pub client_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault", job.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DisputeJob<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,
    
    #[account(
        mut,
        constraint = caller.key() == job.client || caller.key() == job.freelancer @ ErrorCode::Unauthorized
    )]
    pub job: Account<'info, JobEscrow>,
}

#[derive(Accounts)]
pub struct ResolveDispute<'info> {
    #[account(mut)]
    pub arbiter: Signer<'info>,

    /// CHECK: Safe
    #[account(mut)]
    pub client: UncheckedAccount<'info>,

    /// CHECK: Safe
    #[account(mut)]
    pub freelancer: UncheckedAccount<'info>,

    #[account(
        mut,
        has_one = arbiter,
        close = client,
    )]
    pub job: Account<'info, JobEscrow>,

    #[account(
        mut,
        associated_token::mint = job.mint,
        associated_token::authority = client,
    )]
    pub client_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = job.mint,
        associated_token::authority = freelancer,
    )]
    pub freelancer_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault", job.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Job is not in the correct status for this action")]
    InvalidStatus,
    #[msg("You are not authorized to perform this action")]
    Unauthorized,
    #[msg("Cannot cancel a job that is already in progress")]
    CannotCancel,
    #[msg("Invalid dispute award amount")]
    InvalidAmount,
}
