import { NextRequest, NextResponse } from "next/server";
import logger from "@/common/logger";
import { StatusCodes } from "http-status-codes";
import { getRouletteGameById } from "@/common/utils/dbFunctions";
import { getRequestParam } from "@/common/helper/getParams";

export async function GET(req: NextRequest) {
  try {
    const requestUrl = new URL(req.url);
    const gameId = getRequestParam<string>(requestUrl, "gameId");
    if (!gameId) {
      return NextResponse.json(
        { message: "Game ID is required" },
        { status: StatusCodes.BAD_REQUEST }
      );
    }

    // Fetch the game data from the backend
    const gameData = await getRouletteGameById(gameId);

    if (!gameData) {
      logger.error("Failed to fetch roulette game");
      return NextResponse.json(
        { message: "Failed to fetch roulette game" },
        { status: StatusCodes.INTERNAL_SERVER_ERROR }
      );
    }

    // Return the fetched game details
    return NextResponse.json(
      {
        message: "Roulette game fetched successfully",
        gameData: gameData,
      },
      { status: StatusCodes.OK }
    );
  } catch (error) {
    logger.error("Error fetching roulette game: %s", error);
    return NextResponse.json(
      { message: "An error occurred while fetching the roulette game" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
