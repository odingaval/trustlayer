# TrustLayer Escrow Protocol

![TrustLayer Banner](https://img.shields.io/badge/Solana-Protocol-blueviolet?style=for-the-badge&logo=solana)
![Anchor Framework](https://img.shields.io/badge/Anchor-v0.32-blue?style=for-the-badge)
![React](https://img.shields.io/badge/React-v19-61DAFB?style=for-the-badge&logo=react)

**TrustLayer** is a high-performance, secure, and fully decentralized escrow protocol built on the Solana blockchain. It enables trustless token swaps between two parties using a secure vault system managed entirely by smart contracts.

---

## 🚀 Key Features

-   **Atomic Swaps**: Guaranteed exchange of tokens; either the swap completes fully or assets are returned.
-   **Secure Vault System**: Assets are held in a Program Derived Address (PDA) vault, ensuring no middleman or third party has access.
-   **Full Transparency**: Every state change (Make, Take, Refund) is verifiable on-chain.
-   **Modern UI/UX**: Built with React, Framer Motion, and Tailwind CSS for a premium, responsive trading experience.
-   **Automatic Account Closure**: Program efficiently closes accounts after completion to reclaim SOL rent for the users.

---

## 🛠 Tech Stack

-   **Smart Contract**: [Anchor Framework](https://www.anchor-lang.com/) (Rust)
-   **Frontend**: React + Vite + TypeScript
-   **Styling**: Vanilla CSS + Framer Motion (Animations)
-   **Blockchain Interaction**: `@solana/web3.js` & `@coral-xyz/anchor`
-   **Icons**: Lucide React

---

## 🏗 Architecture

TrustLayer uses a dual-account PDA architecture to manage trades:

1.  **Escrow Account**: Stores the trade state (Maker, Mints, Amounts, Bump).
    *   *Seeds*: `[b"escrow", maker_pubkey, mint_a_pubkey]`
2.  **Vault Account**: A Token Account owned by the Escrow PDA that safely holds the offered assets.
    *   *Seeds*: `[b"vault", escrow_pubkey]`

---

## 🏁 Getting Started

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

## 🧪 Testing

Run the comprehensive test suite to verify all instructions:

```bash
anchor test
```

Tests cover:
-   ✅ **Make**: Initialization and vault locking.
-   ✅ **Take**: Successful atomic swap and account closure.
-   ✅ **Refund**: Secure cancellation by the Maker.

---

## 💻 Running Locally

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

## 📝 License

Distributed under the ISC License. See `LICENSE` for more information.

---

Built with 💜 on Solana.
