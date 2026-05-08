# TrustLayer Escrow Protocol

![TrustLayer Banner](https://img.shields.io/badge/Solana-Protocol-blueviolet?style=for-the-badge&logo=solana)
![Anchor Framework](https://img.shields.io/badge/Anchor-v0.32-blue?style=for-the-badge)
![React](https://img.shields.io/badge/React-v19-61DAFB?style=for-the-badge&logo=react)

**TrustLayer** is a decentralized protocol designed to provide a secure, transparent, and trustless infrastructure for the peer-to-peer economy. By bringing the entire escrow and reputation lifecycle on-chain, TrustLayer empowers global talent and clients to collaborate directly without the need for centralized intermediaries.

Leveraging the high-speed Solana blockchain, the protocol ensures that payments are secured in program-managed vaults and reputation is built through immutable, verifiable work history.

---

## Key Features

-   **Decentralized Escrow**: Payments are secured in specialized vaults governed by smart contract logic, eliminating counterparty risk.
-   **Direct Collaboration**: Facilitates a direct relationship between parties with full transparency and no platform-level interference.
-   **On-Chain Reputation**: Enables users to build a verifiable work history that is permanent, portable, and belongs entirely to them.
-   **Global Instant Finality**: Provides immediate settlement for international transactions with zero cross-border friction or delays.
-   **Automated Rent Management**: Efficiently manages Solana's rent-exemption system by returning SOL to users upon contract closure.

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
