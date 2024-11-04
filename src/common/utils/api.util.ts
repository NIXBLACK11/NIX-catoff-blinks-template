import axios from "axios";
import axiosRetry from "axios-retry";
import logger from "@/common/logger";
import {
  ______________Type,
  Challenge,
  CLUSTER_TYPES,
  FullGameById,
  I______________,
  I______________ById,
  IChallengeById,
  ICreateChallenge,
  IGameById,
  IRouletteGame,
  PARTICIPATION_TYPE,
  ResultWithError,
  RouletteGameType,
  SecondPlayer,
} from "@/common/types";
import { ONCHAIN_CONFIG } from "@/common/helper/cluster.helper";
import { IGenerateAIDescription } from "./apiReturn.types";
import dbConnect from "./dbConnect";
import RouletteGame from "@/models/RouletteGame";
import { PublicKey } from "@solana/web3.js";

// Configure axios retry
axiosRetry(axios, {
  retries: 5,
  retryDelay: (retryCount) => retryCount * 1000,
  retryCondition: (error) =>
    (error.response?.status ?? 0) >= 500 || axiosRetry.isNetworkError(error),
});

// Generate AI Description API
export async function generateAIDescription(
  name: string,
  participationType: PARTICIPATION_TYPE,
): Promise<ResultWithError> {
  try {
    logger.info("Generating AI description for battle: %s", name);
    const response = await axios.post(
      "https://ai-api.catoff.xyz/generate-description-x-api-key/",
      {
        prompt: name,
        participation_type: participationType === PARTICIPATION_TYPE.NVN ? "NvN" : "1v1",
        result_type: "voting",
        additional_info: "",
      },
      { timeout: 200000 },
    );

    const result: IGenerateAIDescription = {
      description: response.data.challenge_description,
      title: response.data.challenge_title,
    };

    logger.info("AI-generated description: %o", response.data);
    return { data: result, error: null };
  } catch (error: any) {
    logger.error("Error generating AI description: %s", error.stack);
    return { data: null, error };
  }
}

// Create Challenge API
export async function createChallenge(
  clusterurl: CLUSTER_TYPES,
  challengeData: ICreateChallenge,
): Promise<ResultWithError> {
  const baseUrl = ONCHAIN_CONFIG[clusterurl].BackendURL;
  const partnerApiKey = ONCHAIN_CONFIG[clusterurl].partnerApiKey;

  try {
    logger.info("Sending request to create challenge at: %s and data: %o", baseUrl, challengeData);
    const response = await axios.post(`${baseUrl}/challenge`, challengeData, {
      headers: {
        "x-api-key": partnerApiKey,
        "Content-Type": "application/json",
      },
      timeout: 100000,
    });
    const result: Challenge = response.data.data;
    logger.info("challenge created successfully: %o", response.data);
    return { data: result, error: null };
  } catch (error: any) {
    logger.error("Error creating challenge: %s", error.stack);
    return { data: null, error };
  }
}

// Get Challenge by ID API
export async function getChallengeById(
  clusterurl: CLUSTER_TYPES,
  challengeId: number,
): Promise<ResultWithError> {
  const baseUrl = ONCHAIN_CONFIG[clusterurl].BackendURL;
  const partnerApiKey = ONCHAIN_CONFIG[clusterurl].partnerApiKey;

  try {
    logger.info("Fetching challenge by ID: %s from %s", challengeId, baseUrl);
    const response = await axios.get(`${baseUrl}/challenge/${challengeId}`, {
      headers: {
        "x-api-key": partnerApiKey,
        "Content-Type": "application/json",
      },
      timeout: 100000,
    });
    const result: IChallengeById = response.data.data;
    logger.info("Successfully fetched challenge: %o", result);
    return { data: result, error: null };
  } catch (error: any) {
    logger.error("Error fetching challenge by ID: %s", error.stack);
    return { data: null, error };
  }
}

// Get Challenge Link by Slug
export async function getChallengeShareLink(
  clusterurl: CLUSTER_TYPES,
  slug: string,
): Promise<ResultWithError> {
  const baseUrl = ONCHAIN_CONFIG[clusterurl].BackendURL;
  const partnerApiKey = ONCHAIN_CONFIG[clusterurl].partnerApiKey;

  try {
    logger.info("Fetching share link for challenge with slug: %s", slug);
    const response = await axios.get(`${baseUrl}/challenge/share/${slug}`, {
      headers: {
        "x-api-key": partnerApiKey,
        "Content-Type": "application/json",
      },
      timeout: 100000,
    });

    const result: string = response.data.data;

    return { data: result, error: null };
  } catch (error: any) {
    logger.error("Error fetching challenge share link: %s", error.stack);
    return { data: null, error };
  }
}

// Template function
export async function create______________(
  clusterurl: CLUSTER_TYPES,
  ______________Data: I______________,
): Promise<ResultWithError> {
  const baseUrl = ONCHAIN_CONFIG[clusterurl].BackendURL;
  const partnerApiKey = ONCHAIN_CONFIG[clusterurl].partnerApiKey;

  try {
    logger.info(
      "Sending request to create ______________ at: %s and data: %o",
      baseUrl,
      ______________Data,
    );
    const response = await axios.post(`${baseUrl}/______________`, ______________Data, {
      headers: {
        "x-api-key": partnerApiKey,
        "Content-Type": "application/json",
      },
      timeout: 100000,
    });
    const result: ______________Type = response.data.data;
    logger.info("______________ created successfully: %o", response.data);
    return { data: result, error: null };
  } catch (error: any) {
    logger.error("Error creating ______________: %s", error.stack);
    return { data: null, error };
  }
}

export async function createRouletteGame(
  clusterurl: CLUSTER_TYPES,
  account: PublicKey,
  rouletteGameData: IRouletteGame,
): Promise<ResultWithError> {
  const baseUrl = ONCHAIN_CONFIG[clusterurl].BackendURL;
  const partnerApiKey = ONCHAIN_CONFIG[clusterurl].partnerApiKey;

  const requestRoute = `${baseUrl}/api/create-roulette-game`;
  try {
    logger.info(
      "Sending request to create roulette game at: %s with data: %o",
      requestRoute,
      rouletteGameData,
    );

    const data = {
      clusterurl,
      account,
      rouletteGameData,
    }

    const response = await axios.post(requestRoute, data, {
      headers: {
        "x-api-key": partnerApiKey,
        "Content-Type": "application/json",
      },
      timeout: 100000,
    });
    const result: RouletteGameType = response.data.gameDetails;
    logger.info("Roulette game created successfully: %o", response.data);
    return { data: result, error: null };
  } catch (error: any) {
    logger.error("Error creating roulette game: %s", error.stack);
    return { data: null, error };
  }
}


// Template get function
export async function get______________ById(
  clusterurl: CLUSTER_TYPES,
  ______________Id: number,
): Promise<ResultWithError> {
  const baseUrl = ONCHAIN_CONFIG[clusterurl].BackendURL;
  const partnerApiKey = ONCHAIN_CONFIG[clusterurl].partnerApiKey;

  try {
    logger.info("Fetching ______________ by ID: %s from %s", ______________Id, baseUrl);
    const response = await axios.get(`${baseUrl}/challenge/${______________Id}`, {
      headers: {
        "x-api-key": partnerApiKey,
        "Content-Type": "application/json",
      },
      timeout: 100000,
    });
    const result: I______________ById = response.data.data;
    logger.info("Successfully fetched ______________: %o", result);
    return { data: result, error: null };
  } catch (error: any) {
    logger.error("Error fetching ______________ by ID: %s", error.stack);
    return { data: null, error };
  }
}

export async function getGameById(clusterurl: CLUSTER_TYPES, gameId: string): Promise<IGameById | null> {
  try {
    // Define the base API URL based on the cluster type
    const baseUrl = ONCHAIN_CONFIG[clusterurl].BackendURL;

    // Construct the URL for fetching the game by its ID
    const url = `${baseUrl}/api/get-roulette-game?gameId=${gameId}`;

    // Make the API call
    const response  = await axios.get(url);
    console.log("This is the reponse"+response);
    const gameData: IGameById = response.data.gameData;

    return gameData;
  } catch (error) {
    console.error(`Error fetching game with ID ${gameId}:`, error);
    return null;
  }
}

export async function getRandomColor(clusterurl: CLUSTER_TYPES): Promise<string> {
  try {
    const baseUrl = ONCHAIN_CONFIG[clusterurl].BackendURL;
    const url = `${baseUrl}/api/random-color`;
    const response = await axios.get(url);
    return response.data.color;
  } catch (error) {
    console.error("Error fetching random color:", error);
    throw new Error("Failed to fetch random color");
  }
}