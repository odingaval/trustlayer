/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL.
 */
export type Trustlayer = {
  "address": "8cChvKd5QmU6CyHcaXKiYgBfFWkX4cQaYbh6FAYDCBwk",
  "metadata": {
    "name": "trustlayer",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "applyForJob",
      "discriminator": [74, 175, 208, 93, 192, 106, 92, 85],
      "accounts": [
        { "name": "freelancer", "writable": true, "signer": true },
        { "name": "job" },
        { "name": "application", "writable": true },
        { "name": "systemProgram", "address": "11111111111111111111111111111111" }
      ],
      "args": [{ "name": "message", "type": "string" }]
    },
    {
      "name": "approveAndRelease",
      "discriminator": [63, 254, 154, 45, 149, 32, 80, 236],
      "accounts": [
        { "name": "client", "writable": true, "signer": true },
        { "name": "freelancer" },
        { "name": "job", "writable": true },
        { "name": "mint" },
        { "name": "freelancerTokenAccount", "writable": true },
        { "name": "vault", "writable": true },
        { "name": "freelancerProfile", "writable": true },
        { "name": "systemProgram", "address": "11111111111111111111111111111111" },
        { "name": "tokenProgram", "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { "name": "associatedTokenProgram", "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL" },
        { "name": "rent", "address": "SysvarRent111111111111111111111111111111111" }
      ],
      "args": []
    },
    {
      "name": "cancelJob",
      "discriminator": [126, 241, 155, 241, 50, 236, 83, 118],
      "accounts": [
        { "name": "client", "writable": true, "signer": true },
        { "name": "job", "writable": true },
        { "name": "mint" },
        { "name": "clientTokenAccount", "writable": true },
        { "name": "vault", "writable": true },
        { "name": "systemProgram", "address": "11111111111111111111111111111111" },
        { "name": "tokenProgram", "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { "name": "associatedTokenProgram", "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL" },
        { "name": "rent", "address": "SysvarRent111111111111111111111111111111111" }
      ],
      "args": []
    },
    {
      "name": "dispute",
      "discriminator": [101, 104, 253, 231, 1, 139, 108, 100],
      "accounts": [
        { "name": "user", "writable": true, "signer": true },
        { "name": "job", "writable": true }
      ],
      "args": []
    },
    {
      "name": "hireFreelancer",
      "discriminator": [175, 60, 90, 213, 132, 66, 16, 133],
      "accounts": [
        { "name": "client", "writable": true, "signer": true },
        { "name": "job", "writable": true },
        { "name": "application", "writable": true }
      ],
      "args": []
    },
    {
      "name": "initializeJob",
      "discriminator": [137, 22, 138, 41, 76, 208, 114, 50],
      "accounts": [
        { "name": "client", "writable": true, "signer": true },
        { "name": "mint" },
        { "name": "clientTokenAccount", "writable": true },
        { "name": "job", "writable": true },
        { "name": "vault", "writable": true },
        { "name": "systemProgram", "address": "11111111111111111111111111111111" },
        { "name": "tokenProgram", "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { "name": "associatedTokenProgram", "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL" },
        { "name": "rent", "address": "SysvarRent111111111111111111111111111111111" }
      ],
      "args": [
        { "name": "jobId", "type": "u64" },
        { "name": "amount", "type": "u64" },
        { "name": "arbiter", "type": "pubkey" },
        { "name": "title", "type": "string" },
        { "name": "description", "type": "string" },
        { "name": "milestoneAmounts", "type": { "option": { "vec": "u64" } } },
        { "name": "decimals", "type": "u8" }
      ]
    },
    {
      "name": "initializeProfile",
      "discriminator": [32, 145, 77, 213, 58, 39, 251, 234],
      "accounts": [
        { "name": "user", "writable": true, "signer": true },
        { "name": "profile", "writable": true },
        { "name": "systemProgram", "address": "11111111111111111111111111111111" }
      ],
      "args": [
        { "name": "username", "type": "string" },
        { "name": "bio", "type": "string" }
      ]
    },
    {
      "name": "postProjectUpdate",
      "discriminator": [112, 147, 137, 224, 38, 23, 116, 215],
      "accounts": [
        { "name": "author", "writable": true, "signer": true },
        { "name": "job" },
        { "name": "log", "writable": true },
        { "name": "systemProgram", "address": "11111111111111111111111111111111" }
      ],
      "args": [
        { "name": "content", "type": "string" },
        { "name": "timestamp", "type": "i64" }
      ]
    },
    {
      "name": "releaseMilestone",
      "discriminator": [128, 204, 18, 102, 15, 119, 206, 126],
      "accounts": [
        { "name": "client", "writable": true, "signer": true },
        { "name": "freelancer" },
        { "name": "job", "writable": true },
        { "name": "mint" },
        { "name": "freelancerTokenAccount", "writable": true },
        { "name": "vault", "writable": true },
        { "name": "freelancerProfile", "writable": true },
        { "name": "systemProgram", "address": "11111111111111111111111111111111" },
        { "name": "tokenProgram", "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { "name": "associatedTokenProgram", "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL" },
        { "name": "rent", "address": "SysvarRent111111111111111111111111111111111" }
      ],
      "args": [{ "name": "index", "type": "u8" }]
    },
    {
      "name": "resolveDispute",
      "discriminator": [231, 6, 202, 6, 96, 103, 12, 230],
      "accounts": [
        { "name": "arbiter", "writable": true, "signer": true },
        { "name": "client", "writable": true },
        { "name": "freelancer", "writable": true },
        { "name": "job", "writable": true },
        { "name": "mint" },
        { "name": "clientTokenAccount", "writable": true },
        { "name": "freelancerTokenAccount", "writable": true },
        { "name": "vault", "writable": true },
        { "name": "systemProgram", "address": "11111111111111111111111111111111" },
        { "name": "tokenProgram", "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { "name": "associatedTokenProgram", "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL" },
        { "name": "rent", "address": "SysvarRent111111111111111111111111111111111" }
      ],
      "args": [
        { "name": "clientAward", "type": "u64" },
        { "name": "freelancerAward", "type": "u64" }
      ]
    },
    {
      "name": "submitWork",
      "discriminator": [158, 80, 101, 51, 114, 130, 101, 253],
      "accounts": [
        { "name": "freelancer", "writable": true, "signer": true },
        { "name": "job", "writable": true }
      ],
      "args": [{ "name": "submissionLink", "type": "string" }]
    }
  ],
  "accounts": [
    {
      "name": "jobApplication",
      "discriminator": [114, 250, 212, 242, 162, 108, 58, 20]
    },
    {
      "name": "jobEscrow",
      "discriminator": [189, 224, 160, 70, 105, 78, 115, 151]
    },
    {
      "name": "projectLog",
      "discriminator": [253, 210, 151, 140, 218, 58, 81, 195]
    },
    {
      "name": "userProfile",
      "discriminator": [32, 37, 119, 205, 179, 180, 13, 194]
    }
  ],
  "types": [
    {
      "name": "applicationStatus",
      "type": {
        "kind": "enum",
        "variants": [{ "name": "pending" }, { "name": "accepted" }, { "name": "rejected" }]
      }
    },
    {
      "name": "jobApplication",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "job", "type": "pubkey" },
          { "name": "freelancer", "type": "pubkey" },
          { "name": "message", "type": "string" },
          { "name": "status", "type": { "defined": { "name": "applicationStatus" } } },
          { "name": "bump", "type": "u8" }
        ]
      }
    },
    {
      "name": "jobEscrow",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "client", "type": "pubkey" },
          { "name": "freelancer", "type": "pubkey" },
          { "name": "arbiter", "type": "pubkey" },
          { "name": "mint", "type": "pubkey" },
          { "name": "amount", "type": "u64" },
          { "name": "status", "type": { "defined": { "name": "jobStatus" } } },
          { "name": "jobId", "type": "u64" },
          { "name": "title", "type": "string" },
          { "name": "description", "type": "string" },
          { "name": "submissionLink", "type": "string" },
          { "name": "bump", "type": "u8" },
          { "name": "milestoneAmounts", "type": { "array": ["u64", 5] } },
          { "name": "milestoneStatus", "type": { "array": ["u8", 5] } },
          { "name": "milestoneCount", "type": "u8" },
          { "name": "decimals", "type": "u8" }
        ]
      }
    },
    {
      "name": "jobStatus",
      "type": {
        "kind": "enum",
        "variants": [
          { "name": "open" },
          { "name": "inProgress" },
          { "name": "inReview" },
          { "name": "disputed" },
          { "name": "completed" },
          { "name": "refunded" }
        ]
      }
    },
    {
      "name": "projectLog",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "job", "type": "pubkey" },
          { "name": "author", "type": "pubkey" },
          { "name": "content", "type": "string" },
          { "name": "timestamp", "type": "i64" }
        ]
      }
    },
    {
      "name": "userProfile",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "user", "type": "pubkey" },
          { "name": "username", "type": "string" },
          { "name": "bio", "type": "string" },
          { "name": "jobsCompleted", "type": "u32" },
          { "name": "totalEarned", "type": "u64" },
          { "name": "bump", "type": "u8" }
        ]
      }
    }
  ]
}
