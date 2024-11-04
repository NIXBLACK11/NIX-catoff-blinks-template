import RouletteGame from "@/models/RouletteGame";
import dbConnect from "./dbConnect";
import logger from "../logger";
import { CLUSTER_TYPES, FullGameById, IGameById, IRouletteGame, RouletteGameType, SecondPlayer } from "../types";
import { PublicKey } from "@solana/web3.js";

export async function getRouletteGameById(gameId: string): Promise<IGameById | null> {
  try {
    await dbConnect(); // Ensure database connection

    // Fetch the game from the database by ID, with an explicit cast to IRouletteGame | null
    const game = await RouletteGame.findById(gameId).lean().exec() as IGameById | null;

    if (!game) return null;

    return game;
  } catch (error) {
    console.error("Error fetching roulette game from MongoDB:", error);
    return null;
  }
}

  export async function createRouletteGameBackend(
    rouletteGameData: IRouletteGame,
    clusterurl: CLUSTER_TYPES,
    account: PublicKey
  ): Promise<{ data: RouletteGameType | null; error: any | null }> {
    try {
      await dbConnect(); // Ensure you connect to the database
      logger.info("Creating a new roulette game in the database: %o", rouletteGameData);
  
      // Create a new instance of the RouletteGame model
      const newGame = new RouletteGame({
        Name: rouletteGameData.Name,
        token: rouletteGameData.token,
        wager: rouletteGameData.wager,
        player1ColorChoice: rouletteGameData.colorChoice,
        player1Account: account,
        clusterurl: clusterurl
      });
  
      // Save the new game to the database
      const savedGame = await newGame.save();
  
      logger.info("Roulette game created successfully with ID: %s", savedGame._id);
  
      // Return the data in the format of RouletteGameType
      const result: RouletteGameType = {
        id: savedGame._id.toString(),
        name: savedGame.Name,
        wager: savedGame.wager,
        token: savedGame.token,
        colorChoice: savedGame.colorChoice,
        status: "created",
      };
  
      return { data: result, error: null };
    } catch (error) {
      logger.error("Error creating roulette game in MongoDB: %s", error);
      return { data: null, error };
    }
  }

  export async function completeRouletteGameBackend(
    gameId: string,
    secondPlayerData: SecondPlayer,
    winnerColor: string
  ): Promise<FullGameById | null> {
    try {
      await dbConnect();
  
      const updatedGame = await RouletteGame.findByIdAndUpdate(
        gameId,
        {
          player2ColorChoice: secondPlayerData.player2ColorChoice,
          player2Account: secondPlayerData.player2Account,
          winner: winnerColor
        },
        { new: true }
      );
  
      if (!updatedGame) {
        throw new Error(`Game with ID ${gameId} not found`);
      }
  
      logger.info("Roulette game updated successfully with ID: %s", updatedGame._id);
  
      // Return the data in the format of RouletteGameType
      const result: FullGameById = {
        id: updatedGame._id.toString(),
        name: updatedGame.Name,
        wager: updatedGame.wager,
        token: updatedGame.token,
        player1ColorChoice: updatedGame.player1ColorChoice,
        player2ColorChoice: updatedGame.player2ColorChoice,
        player1Account: updatedGame.player1Account,
        player2Account: updatedGame.player2Account,
        winner: updatedGame.winner,
        clusterurl: updatedGame.clusterurl,
      };
  
      return result;
    } catch (error) {
      logger.error("Error updating roulette game in MongoDB: %s", error);
      return null;
    }
  }