import { NextResponse } from "next/server";
import { prisma } from "@lib/prisma";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const deleteOp = await prisma.waitlist.deleteMany({
      where: { email: email.toLowerCase() },
    });

    if (deleteOp.count === 0) {
      return NextResponse.json({ message: "Email not found or already unsubscribed" });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
  }
}