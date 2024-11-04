import {
  ActionPostResponse,
  createPostResponse,
  ActionGetResponse,
  ActionPostRequest,
  createActionHeaders,
  ActionError,
  LinkedAction,
} from "@solana/actions";
import { PublicKey, Transaction } from "@solana/web3.js";
import logger from "@/common/logger";
import { BN, web3 } from "@coral-xyz/anchor";
import {
  CLUSTER_TYPES,
  IGameById,
  IGetTxObject,
  ONCHAIN_PARTICIPATE_TYPE,
  VERIFIED_CURRENCY,
} from "@/common/types";
import { getRequestParam, validateParameters } from "@/common/helper/getParams";
import { ONCHAIN_CONFIG } from "@/common/helper/cluster.helper";
import { getGameById } from "@/common/utils/api.util";
import { jsonResponse, Promisify } from "@/common/helper/responseMaker";
import { StatusCodes } from "http-status-codes";
import { GenericError } from "@/common/helper/error";
import { getTxObject, initWeb3, parseToPrecision, tokenAccounts } from "@/common/helper/helper";
import { createTransaction } from "@/common/helper/transaction.helper";

// Create standard headers for the route (including CORS)
const headers = createActionHeaders();

export const GET = async (req: Request) => {
  try {
    logger.info("GET request received");

    /////////////////////////////////////
    ///////// Extract Params ////////////
    /////////////////////////////////////
    const requestUrl = new URL(req.url);
    const gameId = getRequestParam<string>(requestUrl, "gameId", false);
    const clusterurl = getRequestParam<CLUSTER_TYPES>(
      requestUrl,
      "clusterurl",
      false,
      Object.values(CLUSTER_TYPES),
      CLUSTER_TYPES.DEVNET,
    );
    const name = getRequestParam<String>(requestUrl, "name");

    const gameData = await getGameById(clusterurl, gameId);
    if(!gameData) {
      throw 'Error fetching game';
    }

    if (gameData.player2Account !== "" || gameData.player2ColorChoice !== "") {
      // If the game is full, return a response early
      const payload: ActionGetResponse = {
        title: `Join Roulette Game ${name}`,
        icon: new URL("/roulette.gif", requestUrl.origin).toString(),
        type: "action",
        description: `This game has been completed, ${gameData.winner} was the color!!`,
        label: "Game Already Full",
        links: { actions: [] },
      };
  
      logger.info("Game already full, returning early.");
      return jsonResponse(payload, StatusCodes.OK, headers);
    }

    const wager = gameData.wager;
    const token = gameData.token;

    if (wager === undefined || token === undefined) {
      throw new Error("Wager or Token property is missing in gameData");
    }

    logger.info(`Wager: ${wager}, Token: ${token}`);

    const href = clusterurl
      ? `/api/actions/join-roulette?clusterurl=${clusterurl}&gameId=${gameId}&colorChoice={colorChoice}&wager=${wager}`
      : `/api/actions/join-roulette?clusterurl={clusterurl}&gameId={gameId}&colorChoice={colorChoice}&wager={wager}`;  
    // const href = `/api/actions/create-roulette?clusterurl=${clusterurl}&name={name}&token={token}&wager={wager}&colorChoice={colorChoice}`;

    const actions: LinkedAction[] = [
      {
        type: "transaction",
        label: `Join Game with ${gameData.wager}${gameData.token}`,
        href,
        parameters: [
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
      title: `Join Roulette Game ${name}`,
      icon: new URL("/roulette.gif", requestUrl.origin).toString(),
      type: "action",
      description: "Join a roulette game",
      label: `Join Game ${name}`,
      links: { actions },
    };

    logger.info("Payload constructed successfully: %o", payload);
    return jsonResponse(payload, StatusCodes.OK, headers);
  } catch (err: any) {
    logger.error("An error occurred in GET handler: %s", err);
    const actionError: ActionError = { message: 'Unknown error occurred' };
    return jsonResponse(actionError, StatusCodes.BAD_REQUEST, headers);
  }
};

export const OPTIONS = async () => Response.json(null, { headers });

export const POST = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);
    logger.info("POST request received to join a roulette game");

    // Retrieve and validate parameters
    const clusterurl = getRequestParam<CLUSTER_TYPES>(
      requestUrl,
      "clusterurl",
      false,
      Object.values(CLUSTER_TYPES),
      CLUSTER_TYPES.DEVNET,
    );
    const gameId = getRequestParam<string>(requestUrl, "gameId", true);
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

    const href = `/api/actions/join-roulette/next-action?clusterurl=${clusterurl}&colorChoice=${colorChoice}&gameId=${gameId}`;
    logger.info(`Redirecting to next action at: ${href}`);

    // Create response payload
    let payload: ActionPostResponse;
    try {
      payload = await createPostResponse({
        fields: {
          type: "transaction",
          transaction,
          message: "Join Roulette Game",
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
