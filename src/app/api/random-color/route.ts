import { NextResponse } from "next/server";

export async function GET() {
  // Randomly select between "red" and "blue"
  const colors = ["RED", "BLUE"];
  const selectedColor = colors[Math.floor(Math.random() * colors.length)];

  return NextResponse.json({ color: selectedColor });
}
