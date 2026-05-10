use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("8cChvKd5QmU6CyHcaXKiYgBfFWkX4cQaYbh6FAYDCBwk");

#[program]
pub mod trustlayer {
    use super::*;

    pub fn initialize_job(
        ctx: Context<InitializeJob>,
        job_id: u64,
        amount: u64,
        arbiter: Pubkey,
        title: String,
        description: String,
        milestone_amounts: Option<Vec<u64>>,
        decimals: u8,
    ) -> Result<()> {
        let job = &mut ctx.accounts.job;
        job.client = ctx.accounts.client.key();
        job.arbiter = arbiter;
        job.freelancer = Pubkey::default();
        job.mint = ctx.accounts.mint.key();
        job.amount = amount;
        job.status = JobStatus::Open;
        job.job_id = job_id;
        job.title = title;
        job.description = description;
        job.bump = ctx.bumps.job;
        job.decimals = decimals;

        // Initialize milestones if provided
        if let Some(amounts) = milestone_amounts {
            let count = amounts.len().min(5);
            job.milestone_count = count as u8;
            for i in 0..count {
                job.milestone_amounts[i] = amounts[i];
                job.milestone_status[i] = 0;
            }
        } else {
            job.milestone_count = 0;
        }

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

    pub fn apply_for_job(ctx: Context<ApplyForJob>, message: String) -> Result<()> {
        let application = &mut ctx.accounts.application;
        application.job = ctx.accounts.job.key();
        application.freelancer = ctx.accounts.freelancer.key();
        application.message = message;
        application.status = ApplicationStatus::Pending;
        application.bump = ctx.bumps.application;
        Ok(())
    }

    pub fn hire_freelancer(ctx: Context<HireFreelancer>) -> Result<()> {
        let job = &mut ctx.accounts.job;
        let application = &mut ctx.accounts.application;
        
        require!(job.status == JobStatus::Open, ErrorCode::InvalidStatus);
        require!(application.status == ApplicationStatus::Pending, ErrorCode::InvalidStatus);

        job.status = JobStatus::InProgress;
        job.freelancer = application.freelancer;
        application.status = ApplicationStatus::Accepted;
        
        Ok(())
    }

    pub fn initialize_profile(ctx: Context<InitializeProfile>, username: String, bio: String) -> Result<()> {
        let profile = &mut ctx.accounts.profile;
        profile.user = ctx.accounts.user.key();
        profile.username = username;
        profile.bio = bio;
        profile.jobs_completed = 0;
        profile.total_earned = 0;
        profile.bump = ctx.bumps.profile;
        Ok(())
    }

    pub fn submit_work(ctx: Context<SubmitWork>, submission_link: String) -> Result<()> {
        let job = &mut ctx.accounts.job;
        require!(job.status == JobStatus::InProgress, ErrorCode::InvalidStatus);
        require!(job.freelancer == ctx.accounts.freelancer.key(), ErrorCode::Unauthorized);

        job.status = JobStatus::InReview;
        job.submission_link = submission_link;
        Ok(())
    }

    pub fn release_milestone(ctx: Context<ApproveAndRelease>, index: u8) -> Result<()> {
        let job = &mut ctx.accounts.job;
        let idx = index as usize;
        
        require!(idx < job.milestone_count as usize, ErrorCode::InvalidStatus);
        require!(job.milestone_status[idx] == 0, ErrorCode::InvalidStatus);
        require!(job.status != JobStatus::Completed, ErrorCode::InvalidStatus);

        let amount = job.milestone_amounts[idx];
        job.milestone_status[idx] = 1;

        // Check if all milestones are done to mark job as completed
        let all_done = (0..job.milestone_count as usize).all(|i| job.milestone_status[i] == 1);
        if all_done {
            job.status = JobStatus::Completed;
            // Update reputation only on final milestone
            let profile = &mut ctx.accounts.freelancer_profile;
            profile.jobs_completed += 1;
            profile.total_earned += amount;
        } else {
            // Just update earnings for the partial release
            let profile = &mut ctx.accounts.freelancer_profile;
            profile.total_earned += amount;
        }

        let client_key = job.client;
        let job_id_bytes = job.job_id.to_le_bytes();
        let bump = job.bump;

        let seeds = &[
            b"job_v3",
            client_key.as_ref(),
            &job_id_bytes,
            &[bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.freelancer_token_account.to_account_info(),
            authority: job.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        token::transfer(cpi_ctx, amount)?;

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
        
        // Update freelancer profile stats
        let profile = &mut ctx.accounts.freelancer_profile;
        profile.jobs_completed += 1;
        profile.total_earned += amount;

        let client_key = job.client;
        let job_id_bytes = job.job_id.to_le_bytes();
        let bump = job.bump;

        let seeds = &[
            b"job_v3",
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
            b"job_v3",
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
            b"job_v3",
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

    pub fn post_project_update(ctx: Context<PostProjectUpdate>, content: String, timestamp: i64) -> Result<()> {
        let log = &mut ctx.accounts.log;
        log.job = ctx.accounts.job.key();
        log.author = ctx.accounts.author.key();
        log.content = content;
        log.timestamp = timestamp;
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
    pub title: String,
    pub description: String,
    pub submission_link: String,
    pub bump: u8,
    pub milestone_amounts: [u64; 5],
    pub milestone_status: [u8; 5],
    pub milestone_count: u8,
    pub decimals: u8,
}

#[account]
pub struct ProjectLog {
    pub job: Pubkey,
    pub author: Pubkey,
    pub content: String,
    pub timestamp: i64,
}

impl ProjectLog {
    pub const INIT_SPACE: usize = 32 + 32 + (4 + 500) + 8;
}

impl JobEscrow {
    pub const INIT_SPACE: usize = 32 + 32 + 32 + 32 + 8 + 1 + 8 + (4 + 50) + (4 + 200) + (4 + 200) + 1 + (8 * 5) + (1 * 5) + 1;
}

#[account]
pub struct UserProfile {
    pub user: Pubkey,
    pub username: String,
    pub bio: String,
    pub jobs_completed: u32,
    pub total_earned: u64,
    pub bump: u8,
}

impl UserProfile {
    pub const INIT_SPACE: usize = 32 + (4 + 50) + (4 + 200) + 4 + 8 + 1;
}

#[account]
pub struct JobApplication {
    pub job: Pubkey,
    pub freelancer: Pubkey,
    pub message: String,
    pub status: ApplicationStatus,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ApplicationStatus {
    Pending,
    Accepted,
    Rejected,
}


impl JobApplication {
    pub const INIT_SPACE: usize = 32 + 32 + (4 + 200) + 1 + 1;
}

#[derive(Accounts)]
#[instruction(job_id: u64)]
pub struct InitializeJob<'info> {
    #[account(mut)]
    pub client: Signer<'info>,
    pub mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = client,
        associated_token::mint = mint,
        associated_token::authority = client,
    )]
    pub client_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = client,
        space = 8 + JobEscrow::INIT_SPACE,
        seeds = [b"job_v3", client.key().as_ref(), &job_id.to_le_bytes()],
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
#[instruction(message: String)]
pub struct ApplyForJob<'info> {
    #[account(mut)]
    pub freelancer: Signer<'info>,
    pub job: Account<'info, JobEscrow>,
    #[account(
        init,
        payer = freelancer,
        space = 8 + JobApplication::INIT_SPACE,
        seeds = [b"application", job.key().as_ref(), freelancer.key().as_ref()],
        bump
    )]
    pub application: Account<'info, JobApplication>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct HireFreelancer<'info> {
    #[account(mut)]
    pub client: Signer<'info>,
    #[account(
        mut,
        seeds = [b"job_v3", client.key().as_ref(), &job.job_id.to_le_bytes()],
        bump = job.bump,
        constraint = job.client == client.key()
    )]
    pub job: Account<'info, JobEscrow>,
    #[account(
        mut,
        seeds = [b"application", job.key().as_ref(), application.freelancer.as_ref()],
        bump = application.bump,
        constraint = application.job == job.key()
    )]
    pub application: Account<'info, JobApplication>,
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
        init_if_needed,
        payer = client,
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

    #[account(
        mut,
        seeds = [b"user_profile", job.freelancer.as_ref()],
        bump = freelancer_profile.bump,
    )]
    pub freelancer_profile: Account<'info, UserProfile>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct InitializeProfile<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init,
        payer = user,
        space = 8 + UserProfile::INIT_SPACE,
        seeds = [b"user_profile", user.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, UserProfile>,
    pub system_program: Program<'info, System>,
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
    pub mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = client,
        associated_token::mint = mint,
        associated_token::authority = client,
    )]
    pub client_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault", job.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
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
    pub client: SystemAccount<'info>,

    /// CHECK: Safe
    #[account(mut)]
    pub freelancer: SystemAccount<'info>,

    #[account(
        mut,
        has_one = arbiter,
        close = client,
    )]
    pub job: Account<'info, JobEscrow>,
    pub mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = arbiter,
        associated_token::mint = mint,
        associated_token::authority = client,
    )]
    pub client_token_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = arbiter,
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

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
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

#[derive(Accounts)]
#[instruction(content: String, timestamp: i64)]
pub struct PostProjectUpdate<'info> {
    #[account(mut)]
    pub author: Signer<'info>,
    pub job: Account<'info, JobEscrow>,
    #[account(
        init,
        payer = author,
        space = 8 + ProjectLog::INIT_SPACE,
        seeds = [b"log", job.key().as_ref(), author.key().as_ref(), &timestamp.to_le_bytes()],
        bump
    )]
    pub log: Account<'info, ProjectLog>,
    pub system_program: Program<'info, System>,
}
