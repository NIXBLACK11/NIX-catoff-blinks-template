import { NextRequest, NextResponse } from "next/server";
import { IRouletteGame } from "@/common/types";
import logger from "@/common/logger";
import { StatusCodes } from "http-status-codes";
import { createRouletteGameBackend } from "@/common/utils/dbFunctions";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clusterurl, account, rouletteGameData } = body; // Adjust this line
    const { Name, token, wager, colorChoice } = rouletteGameData; // Adjust this line as well

    // Validate input data
    if (!Name || !token || typeof wager !== "number" || !["RED", "BLUE"].includes(colorChoice)) {
      return NextResponse.json(
        { message: "Invalid input data" },
        { status: StatusCodes.BAD_REQUEST }
      );
    }

    // Prepare roulette game data
    const rouletteGameDataValidated: IRouletteGame = { Name, token, wager, colorChoice };
    
    // Create the roulette game in the backend
    const rouletteGame = await createRouletteGameBackend(rouletteGameDataValidated, clusterurl, account);
    logger.info("Roulette game creation response: %o", rouletteGame);
    // Check for errors in the response
    if (!rouletteGame.data || rouletteGame.error) {
      logger.error("Failed to create roulette game in the backend: %o", rouletteGame.error);
      return NextResponse.json(
        { message: "Failed to create roulette game" },
        { status: StatusCodes.INTERNAL_SERVER_ERROR }
      );
    }

    // Return success response with game details
    return NextResponse.json(
      {
        message: "Roulette game created successfully",
        gameDetails: rouletteGame.data,
      },
      { status: StatusCodes.OK }
    );
  } catch (error) {
    logger.error("Error creating roulette game: %s", error);
    return NextResponse.json(
      { message: "An error occurred while creating the roulette game" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}