import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const programId = new PublicKey('8cChvKd5QmU6CyHcaXKiYgBfFWkX4cQaYbh6FAYDCBwk');
const user = new PublicKey('B9Tki7zw5PeL3aWPu8Jfvc5jancmEEzMumZXDBQ53eNJ');

const [profilePDA] = PublicKey.findProgramAddressSync(
  [Buffer.from('user_profile'), user.toBuffer()],
  programId
);

console.log('Profile PDA:', profilePDA.toString());

try {
  const accountInfo = await connection.getAccountInfo(profilePDA);
  if (accountInfo) {
    console.log('Account exists!');
    console.log('Owner:', accountInfo.owner.toString());
    console.log('Data size:', accountInfo.data.length);
  } else {
    console.log('Account does NOT exist (Not initialized yet)');
  }
} catch (err) {
  console.error('Error fetching account:', err);
}
