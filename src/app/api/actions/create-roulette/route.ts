import {
  ActionPostResponse,
  createPostResponse,
  ActionGetResponse,
  ActionPostRequest,
  createActionHeaders,
  ActionError,
  LinkedAction,
  ActionParameterSelectable,
} from "@solana/actions";
import * as web3 from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import { StatusCodes } from "http-status-codes";

import { initWeb3 } from "@/common/helper/helper";
import { CLUSTER_TYPES, IRouletteGame, VERIFIED_CURRENCY } from "@/common/types";
import { ONCHAIN_CONFIG } from "@/common/helper/cluster.helper";
import { getRequestParam, validateParameters } from "@/common/helper/getParams";
import { GenericError } from "@/common/helper/error";
import logger from "@/common/logger";
import { jsonResponse } from "@/common/helper/responseMaker";
import { createTransaction } from "@/common/helper/transaction.helper";

// Define headers for CORS and other settings
const headers = createActionHeaders();

export const GET = async (req: Request) => {
  try {
    logger.info("GET request received for creating a roulette game");

    // Extract query parameters
    const requestUrl = new URL(req.url);
    const clusterurl = getRequestParam<CLUSTER_TYPES>(requestUrl, "clusterurl", false);

    const clusterOptions: ActionParameterSelectable<"radio">[] = clusterurl
      ? []
      : [
          {
            name: "clusterurl",
            label: "Select Cluster",
            type: "radio",
            required: true,
            options: [
              {
                label: "Devnet",
                value: CLUSTER_TYPES.DEVNET,
                selected: true,
              },
              // {
              //   label: "Mainnet",
              //   value: CLUSTER_TYPES.MAINNET,
              // },
            ],
          },
        ];

    const href = clusterurl
      ? `/api/actions/create-roulette?clusterurl=${clusterurl}&name={name}&token={token}&wager={wager}&colorChoice={colorChoice}`
      : `/api/actions/create-roulette?clusterurl={clusterurl}&name={name}&token={token}&wager={wager}&colorChoice={colorChoice}`;  
    // const href = `/api/actions/create-roulette?clusterurl=${clusterurl}&name={name}&token={token}&wager={wager}&colorChoice={colorChoice}`;

    const actions: LinkedAction[] = [
      {
        type: "transaction",
        label: "Roulette: The Ultimate High-Stakes Showdown!",
        href,
        parameters: [
          ...clusterOptions,
          {
            name: "name",
            label: "Name your game",
            required: true,
          },
          {
            name: "token",
            label: "Choose token",
            type: "radio",
            required: true,
            options: [
              { label: VERIFIED_CURRENCY.SOL, value: VERIFIED_CURRENCY.SOL, selected: true },
              // { label: VERIFIED_CURRENCY.USDC, value: VERIFIED_CURRENCY.USDC },
              // { label: VERIFIED_CURRENCY.BONK, value: VERIFIED_CURRENCY.BONK },
            ],
          },
          {
            name: "wager",
            label: "Set wager amount",
            required: true,
          },
          {
            name: "colorChoice",
            label: "Choose your color",
            type: "radio",
            required: true,
            options: [
              { label: "Red", value: "RED" },
              { label: "Blue", value: "BLUE" },
            ],
          },
        ],
      },
    ];

    const payload: ActionGetResponse = {
      title: "Roulette: The Ultimate High-Stakes Showdown!",
      icon: new URL("/roulette.gif", requestUrl.origin).toString(),
      type: "action",
      description: `Challenge your friends, rivals, or anyone on X to a thrilling game of roulette—with stakes you set!\nPlayer 1, place your wager and spin the wheel to get started. Once your game is created, you’ll receive a unique link to share with Player 2. Let the bets roll in and may the odds be in your favor!`,
      label: "Create Roulette Game",
      links: { actions },
    };

    logger.info("Payload constructed successfully: %o", payload);
    return jsonResponse(payload, StatusCodes.OK, headers);
  } catch (err) {
    logger.error("An error occurred in GET handler: %s", err);
    const actionError: ActionError = { message: "An unknown error occurred" };
    return jsonResponse(actionError, StatusCodes.BAD_REQUEST, headers);
  }
};

export const OPTIONS = async () => Response.json(null, { headers });

export const POST = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);
    logger.info("POST request received to initiate a roulette game");

    // Retrieve and validate parameters
    const clusterurl = getRequestParam<CLUSTER_TYPES>(
      requestUrl,
      "clusterurl",
      false,
      Object.values(CLUSTER_TYPES),
      CLUSTER_TYPES.DEVNET,
    );
    const name = getRequestParam<string>(requestUrl, "name", true);
    const token = getRequestParam<VERIFIED_CURRENCY>(
      requestUrl,
      "token",
      true,
      Object.values(VERIFIED_CURRENCY),
      VERIFIED_CURRENCY.SOL,
    );
    const wager = getRequestParam<number>(requestUrl, "wager", true);
    validateParameters("wager", wager > 0, "Wager must be greater than zero");
    const colorChoice = getRequestParam<string>(requestUrl, "colorChoice", true) as "RED" | "BLUE";

    // Extract and validate account from body
    const body: ActionPostRequest = await req.json();
    let account: PublicKey;
    try {
      account = new PublicKey(body.account);
      logger.info(`Account PublicKey validated: ${account.toString()}`);
    } catch (err) {
      logger.error(`Invalid account public key: ${body.account}`);
      throw new GenericError("Invalid account public key", StatusCodes.BAD_REQUEST);
    }

    // Initiate Solana connection and create a transaction
    const { connection } = await initWeb3(clusterurl);
    const recipientAddr = ONCHAIN_CONFIG[clusterurl].treasuryWallet;
    const recipientPublicKey = new PublicKey(recipientAddr);
    const createTx = {
      accountPublicKey: account,
      recipientPublicKey,
      currency: VERIFIED_CURRENCY.SOL,
      amount: wager,
      connection,
      cluster: clusterurl,
    };
    const tx = await createTransaction(createTx);
    const { blockhash } = await connection.getLatestBlockhash();
    const transaction = new web3.Transaction({
      recentBlockhash: blockhash,
      feePayer: account,
    }).add(...tx);

    const href = `/api/actions/create-roulette/next-action?clusterurl=${clusterurl}&name=${name}&token=${token}&wager=${wager}&colorChoice=${colorChoice}`;
    logger.info(`Redirecting to next action at: ${href}`);

    // Create response payload
    let payload: ActionPostResponse;
    try {
      payload = await createPostResponse({
        fields: {
          type: "transaction",
          transaction,
          message: "Initiate Roulette Game",
          links: { 
            next: { 
              type: "post", 
              href
            } 
          },
        },
      });
    } catch (err) {
      logger.error("Error in createPostResponse:", err);
      return jsonResponse({ error: "Failed to create post response" }, StatusCodes.INTERNAL_SERVER_ERROR, headers);
    }

    logger.info("Response payload created successfully");
    return jsonResponse(payload, StatusCodes.OK, headers);
  } catch (err) {
    logger.error("An error occurred in POST handler:", err);
    const actionError: ActionError = { message: "An unknown error occurred" };
    return jsonResponse(actionError, StatusCodes.BAD_REQUEST, headers);
  }
};
