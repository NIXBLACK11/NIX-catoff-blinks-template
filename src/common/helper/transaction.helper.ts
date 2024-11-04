import * as web3 from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createTransferInstruction,
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import * as dotenv from "dotenv";

import { ONCHAIN_CONFIG } from "./cluster.helper";
import logger from "@/common/logger";
import { CLUSTER_TYPES, ICreateTransaction, VERIFIED_CURRENCY } from "../types";
import { initWeb3, parseToPrecision } from "./helper";

// Helper function to handle SOL and token transactions
export async function createTransaction(
  data: ICreateTransaction,
): Promise<web3.TransactionInstruction[]> {
  logger.info(`[createTransaction] Sending tx with body: 
    [accountPublicKey: ${data.accountPublicKey.toString()}, 
    recipientPublicKey: ${data.recipientPublicKey.toString()},
    currency: ${data.currency},
    amount: ${data.amount},
    cluster: ${data.cluster},
    ]`);

  let ixs: web3.TransactionInstruction[] = [];

  // Retrieve mint decimals from ONCHAIN_CONFIG
  const decimals = ONCHAIN_CONFIG[data.cluster]?.Decimals[data.currency];
  if (!decimals) {
    throw new Error(`Decimals not configured for currency: ${data.currency}`);
  }

  // Handle SOL transfer
  if (data.currency === VERIFIED_CURRENCY.SOL) {
    const lamports = parseToPrecision(data.amount, decimals);
    const transferInstruction = web3.SystemProgram.transfer({
      fromPubkey: data.accountPublicKey,
      toPubkey: data.recipientPublicKey,
      lamports: parseInt(lamports),
    });
    ixs.push(transferInstruction);
  }
  // Handle SPL token transfers like USDC, BONK, etc.
  else {
    const mintPublicKey = await getMintPublicKeyForCurrency(data.currency, data.cluster);
    const senderTokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      data.accountPublicKey,
    );
    const recipientTokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      data.recipientPublicKey,
    );

    const tokenAmount = data.zeroWager ? data.amount : parseToPrecision(data.amount, decimals);

    logger.info(`[createTransaction] token accounts retrieved: [
      mintPublicKey: ${mintPublicKey},
      senderTokenAccount: ${senderTokenAccount},
      recipientTokenAccount: ${recipientTokenAccount},
      tokenAmount: ${tokenAmount},
      ]`);

    // Create token transfer instruction using SPL token program
    const transferInstruction = createTransferInstruction(
      senderTokenAccount,
      recipientTokenAccount,
      data.accountPublicKey,
      new BN(tokenAmount),
      [],
      TOKEN_PROGRAM_ID,
    );

    ixs.push(transferInstruction);
  }

  return ixs;
}

// Helper to get mint public key based on the currency and cluster
async function getMintPublicKeyForCurrency(
  currency: string,
  cluster: keyof typeof ONCHAIN_CONFIG,
): Promise<PublicKey> {
  switch (currency) {
    case "USDC":
      return ONCHAIN_CONFIG[cluster].usdcMintAddress;
    case "BONK":
      return ONCHAIN_CONFIG[cluster].bonkMintAddress;
    case "SEND":
      return ONCHAIN_CONFIG[cluster].sendMintAddress;
    default:
      throw new Error(`Unsupported currency: ${currency}`);
  }
}

export async function transferFromTreasuryToWinner(winnerAddress: string, amount: number, clusterurl: CLUSTER_TYPES) {
  let recipientPublicKey;
  try {
    recipientPublicKey = new PublicKey(winnerAddress);
    logger.info(`Winner PublicKey validated: ${recipientPublicKey.toString()}`);
  } catch (err) {
    logger.error(`Invalid winner public key: ${winnerAddress}`);
    throw new Error("Invalid winner public key");
  }

  const { connection } = await initWeb3(clusterurl);
  const treasuryAddr = ONCHAIN_CONFIG[clusterurl].treasuryWallet;
  const treasuryPublicKey = new PublicKey(treasuryAddr);

  // Read and decode the base64 private key from the environment variable
  const base64PrivateKey = process.env.GAME_WALLET_PRIVATE_KEY;
  if (!base64PrivateKey) {
    throw new Error("GAME_WALLET_PRIVATE_KEY is not defined in the .env.local file");
  }

  // Decode the base64 string into a Uint8Array for the Keypair
  const privateKeyArray = Uint8Array.from(Buffer.from(base64PrivateKey, "base64"));
  const treasuryKeypair = web3.Keypair.fromSecretKey(privateKeyArray);

  // Prepare transaction data
  const createTx = {
    accountPublicKey: treasuryPublicKey,
    recipientPublicKey,
    currency: VERIFIED_CURRENCY.SOL,
    amount,
    connection,
    cluster: clusterurl,
  };

  // Create the transaction
  const tx = await createTransaction(createTx);
  const { blockhash } = await connection.getLatestBlockhash();
  const transaction = new web3.Transaction({
    recentBlockhash: blockhash,
    feePayer: treasuryPublicKey,
  }).add(...tx);

  // Sign the transaction
  transaction.sign(treasuryKeypair);

  try {
    const signature = await web3.sendAndConfirmTransaction(connection, transaction, [treasuryKeypair]);
    logger.info(`Transaction successful with signature: ${signature}`);
  } catch (error: any) {
    logger.error(`Transaction failed: ${error.message}`);
    throw new Error(`Transaction failed: ${error.message}`);
  }
}