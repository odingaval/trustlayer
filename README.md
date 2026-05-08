# TrustLayer Escrow Protocol

![TrustLayer Banner](https://img.shields.io/badge/Solana-Protocol-blueviolet?style=for-the-badge&logo=solana)
![Anchor Framework](https://img.shields.io/badge/Anchor-v0.32-blue?style=for-the-badge)
![React](https://img.shields.io/badge/React-v19-61DAFB?style=for-the-badge&logo=react)

**TrustLayer** is a decentralized protocol designed to revolutionize the freelance and peer-to-peer economy by bringing the entire project lifecycle—from escrow to reputation—on-chain. 

Built on the Solana blockchain, TrustLayer eliminates the need for high-fee intermediaries like Upwork or Fiverr, providing a secure, transparent, and trustless environment for global talent and clients to collaborate. By leveraging program-managed vaults and immutable reputation scores, TrustLayer ensures that trust is built into the code, not the platform.

---

## Key Features

-   **Atomic Escrow**: Guaranteed exchange of assets; funds are held in secure, program-derived vaults and only released upon successful completion or agreement.
-   **No Middleman Fees**: Transactions happen directly between parties, bypassing the 10-20% commissions charged by traditional freelance platforms.
-   **Immutable Reputation**: Build a portable, on-chain work history that belongs to you, not a centralized database.
-   **Global Instant Settlement**: Work for anyone, anywhere, with immediate payment finality and zero cross-border friction.
-   **Automatic Rent Recovery**: Optimized account management that returns SOL rent to users upon closing active escrows.

---

## Tech Stack

-   **Smart Contract**: [Anchor Framework](https://www.anchor-lang.com/) (Rust)
-   **Frontend**: React + Vite + TypeScript
-   **Styling**: Vanilla CSS + Framer Motion (Animations)
-   **Blockchain Interaction**: `@solana/web3.js` & `@coral-xyz/anchor`
-   **Icons**: Lucide React

---

## Architecture

TrustLayer uses a dual-account PDA (Program Derived Address) architecture to manage trades:

1.  **Escrow Account**: Stores the trade state (Maker, Mints, Amounts, and status).
    *   *Seeds*: `[b"escrow", maker_pubkey, mint_a_pubkey]`
2.  **Vault Account**: A secure Token Account owned by the Escrow PDA that holds assets during the trade.
    *   *Seeds*: `[b"vault", escrow_pubkey]`

---

## Getting Started

### Prerequisites

-   [Solana CLI](https://docs.solanalabs.com/cli/install)
-   [Anchor CLI](https://www.anchor-lang.com/docs/installation)
-   [Node.js & NPM](https://nodejs.org/)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/odingaval/trustlayer.git
    cd trustlayer
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    cd app && npm install
    ```

3.  **Build the program:**
    ```bash
    anchor build
    ```

---

## Testing

Run the comprehensive test suite to verify all instructions:

```bash
anchor test
```

Tests cover:
-   **Make**: Initialization and secure vault locking.
-   **Take**: Successful atomic swap and automatic account closure.
-   **Refund**: Secure cancellation and asset reclamation by the Maker.

---

## Running Locally

1.  **Start a local validator:**
    ```bash
    solana-test-validator
    ```

2.  **Deploy the program:**
    ```bash
    anchor deploy
    ```

3.  **Start the frontend:**
    ```bash
    cd app
    npm run dev
    ```

---

## License

Distributed under the ISC License. See `LICENSE` for more information.

---

Built with pride on Solana.
