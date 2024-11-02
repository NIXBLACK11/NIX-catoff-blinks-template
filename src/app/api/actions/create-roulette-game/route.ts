import { NextRequest, NextResponse } from "next/server";
import { IRouletteGame } from "@/common/types";
import { createRouletteGameBackend } from "@/common/utils/api.util";
import logger from "@/common/logger";
import { StatusCodes } from "http-status-codes";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { Name, token, wager, colorChoice } = body;

    if (!Name || !token || typeof wager !== "number" || !["RED", "BLUE"].includes(colorChoice)) {
      return NextResponse.json(
        { message: "Invalid input data" },
        { status: StatusCodes.BAD_REQUEST }
      );
    }

    const rouletteGameData: IRouletteGame = {
      Name,
      token,
      wager,
      colorChoice,
    };

    const rouletteGame = await createRouletteGameBackend(rouletteGameData);

    if (!rouletteGame || rouletteGame.error) {
      logger.error("Failed to create roulette game in the backend: %o", rouletteGame.error);
      return NextResponse.json(
        { message: "Failed to create roulette game" },
        { status: StatusCodes.INTERNAL_SERVER_ERROR }
      );
    }

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
