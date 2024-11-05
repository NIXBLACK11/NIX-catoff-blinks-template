import {
  createActionHeaders,
  NextActionPostRequest,
  ActionError,
  CompletedAction,
} from "@solana/actions";
import { PublicKey } from "@solana/web3.js";
import { RouletteGameType, CLUSTER_TYPES, IRouletteGame, VERIFIED_CURRENCY } from "@/common/types";
import logger from "@/common/logger";
import { getRequestParam } from "@/common/helper/getParams";
import { GenericError } from "@/common/helper/error";
import { createRouletteGame } from "@/common/utils/api.util";
import { StatusCodes } from "http-status-codes";
import { jsonResponse, Promisify } from "@/common/helper/responseMaker";

const headers = createActionHeaders();

export const GET = async (req: Request) => {
  return Response.json({ message: "Method not supported" } as ActionError, {
    status: 403,
    headers,
  });
};

export const OPTIONS = async () => Response.json(null, { headers });

export const POST = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);
    const clusterurl = getRequestParam<CLUSTER_TYPES>(requestUrl, "clusterurl");
    const name = getRequestParam<string>(requestUrl, "name");
    const token = getRequestParam<VERIFIED_CURRENCY>(requestUrl, "token");
    const wager = getRequestParam<number>(requestUrl, "wager");
    const colorChoice = getRequestParam<string>(requestUrl, "colorChoice") as "RED" | "BLUE";
    const body: NextActionPostRequest = await req.json();
    let account: PublicKey;
    try {
      account = new PublicKey(body.account);
    } catch {
      throw new GenericError("Invalid account provided", StatusCodes.BAD_REQUEST);
    }

    let signature: string;
    try {
      signature = body.signature!;
      if (!signature) throw "Invalid signature";
    } catch (err) {
      throw new GenericError('Invalid "signature" provided', StatusCodes.BAD_REQUEST);
    }

    const rouletteGameData: IRouletteGame = {
      Name: name,
      token,
      wager,
      colorChoice,
    };
    const rouletteGame = await Promisify<RouletteGameType>(createRouletteGame(clusterurl, account, rouletteGameData));

    const message = `Your roulette game has been created successfully! Join using blink: [https://dial.to/?action=solana-action%3Ahttps%3A%2F%2Froulette.nixblack.site%2Fapi%2Factions%2Fjoin-roulette%3FgameId%3D${rouletteGame.id}%26name%3D${rouletteGame.name}%26clusterurl%3D${clusterurl}&cluster=devnet]`
    // const message = `Your roulette game has been created successfully! Join using blink: [https%3A%2F%2Fdial.to%2F%3Faction%3Dsolana-action%3Ahttps%3A%2F%2Flocalhost%3A3000%2Fapi%2Factions%2Fjoin-roulette%3FgameId%3D${rouletteGame.id}%26name%3D${rouletteGame.name}]`;
    logger.info(`[Create Roulette Game next action] final response: ${message}`);
    
    const payload: CompletedAction = {
      type: "completed",
      icon: new URL("/roulette.gif", requestUrl.origin).toString(),
      title: "Your roulette game has been created successfully!",
      description: message,
      label: "Roulette Game Created",
    };
    console.log(payload)
    return jsonResponse(payload, StatusCodes.OK, headers);
  } catch (err) {
    logger.error(err);
    let actionError: ActionError = { message: "An unknown error occurred" };
    if (typeof err == "string") actionError.message = err;
    return jsonResponse(actionError, StatusCodes.BAD_REQUEST, headers);
  }
};
