import {
    createActionHeaders,
    NextActionPostRequest,
    ActionError,
    CompletedAction,
  } from "@solana/actions";
  import { PublicKey } from "@solana/web3.js";
  import { CLUSTER_TYPES, FullGameById, SecondPlayer } from "@/common/types";
  import logger from "@/common/logger";
  import { getRequestParam } from "@/common/helper/getParams";
  import { GenericError } from "@/common/helper/error";
  import { getRandomColor } from "@/common/utils/api.util";
  import { StatusCodes } from "http-status-codes";
  import { jsonResponse } from "@/common/helper/responseMaker";
import { completeRouletteGameBackend } from "@/common/utils/dbFunctions";
import { transferFromTreasuryToWinner } from "@/common/helper/transaction.helper";
  
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
      const colorChoice = getRequestParam<string>(requestUrl, "colorChoice") as "RED" | "BLUE";
      const gameId = getRequestParam<string>(requestUrl, "gameId");
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

      const winnerColor = await getRandomColor(clusterurl);

      const secondPlayerData: SecondPlayer = {
        player2Account: account.toString(),
        player2ColorChoice: colorChoice
      }

      const completeGame: FullGameById | null = await completeRouletteGameBackend(gameId, secondPlayerData, winnerColor);

      if(!completeGame) {
        throw "Failed to enter game";
      }

      logger.info("Winner color"+winnerColor);
      logger.info("1"+completeGame.player1ColorChoice);
      logger.info("2"+completeGame.player2ColorChoice);

        let message = "";
        if(completeGame.player1ColorChoice==completeGame.player2ColorChoice) {
            if(completeGame.player1ColorChoice === winnerColor) {
                message = `It's a draw! Both players picked the winning color. Each will receive their wager back.`;
                await transferFromTreasuryToWinner(completeGame.player1Account, completeGame.wager, clusterurl);
                await transferFromTreasuryToWinner(completeGame.player2Account, completeGame.wager, clusterurl);
            } else {
                message = `Both players lost the game. The winning color was ${winnerColor}. Better luck next time!`;
            }
        } else {
            if(completeGame.player1ColorChoice===winnerColor) {
                message = `You lost, Player 1 Won the roulette game.`;
                await transferFromTreasuryToWinner(completeGame.player1Account, completeGame.wager * 2, clusterurl);
            } else {
                message = `Congratulations Player 2! You won the roulette game. ${completeGame.wager * 2} SOL will be transferred to your wallet.`;
                await transferFromTreasuryToWinner(completeGame.player2Account, completeGame.wager * 2, clusterurl);
            }
        }
        
        logger.info(message);
        const payload: CompletedAction = {
        type: "completed",
        icon: new URL("/roulette.gif", requestUrl.origin).toString(),
        title: "You have joined the game successfully!",
        description: message,
        label: "Roulette Game Joined",
      };
      return jsonResponse(payload, StatusCodes.OK, headers);
    } catch (err) {
      logger.error(err);
      let actionError: ActionError = { message: "An unknown error occurred" };
      if (typeof err == "string") actionError.message = err;
      return jsonResponse(actionError, StatusCodes.BAD_REQUEST, headers);
    }
  };
  