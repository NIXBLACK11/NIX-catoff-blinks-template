import { ActionError, createActionHeaders } from "@solana/actions";

const headers = createActionHeaders();

export const GET = async (req: Request) => {
    return Response.json({ message: "Route not complete" } as ActionError, {
      status: 403,
      headers,
    });
  };