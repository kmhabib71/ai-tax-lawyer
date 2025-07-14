import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/connection";
import { User } from "@/lib/db/models";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const users = await User.find({}, {
      name: 1,
      email: 1,
      userType: 1,
      subscriptionTier: 1,
      language: 1,
      createdAt: 1,
      lastActive: 1,
    }).sort({ createdAt: -1 }).limit(10);
    
    return NextResponse.json({
      count: users.length,
      users: users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}