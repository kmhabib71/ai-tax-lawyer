import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import connectToDatabase from "@/lib/db/connection";
import { User } from "@/lib/db/models";
import { withSecurity } from "@/lib/auth/security";
import { validateUserProfile } from "@/lib/auth/validation";

async function getProfile(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    
    // Use database user ID from session if available, otherwise fall back to email
    const userQuery = (session.user as any).dbId 
      ? { _id: (session.user as any).dbId }
      : { email: session.user?.email };
    
    const user = await User.findOne(userQuery);
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const profile = {
      id: user._id,
      name: user.name || session.user?.name,
      email: user.email,
      userType: user.userType || "salaried",
      language: user.language || "en",
      notifications: {
        email: user.notifications?.email ?? true,
        taxReminders: user.notifications?.taxReminders ?? true,
        newsletterUpdates: user.notifications?.newsletterUpdates ?? false,
      },
      preferences: {
        theme: user.preferences?.theme || "light",
        currency: user.preferences?.currency || "BDT",
        timezone: user.preferences?.timezone || "Asia/Dhaka",
      },
    };

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function updateProfile(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updates = await request.json();
    
    // Validate profile data
    const validation = validateUserProfile(updates);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid profile data", details: validation.errors },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Use database user ID from session if available, otherwise fall back to email
    const userQuery = (session.user as any).dbId 
      ? { _id: (session.user as any).dbId }
      : { email: session.user?.email };
    
    const user = await User.findOneAndUpdate(
      userQuery,
      {
        $set: {
          name: updates.name,
          userType: updates.userType,
          language: updates.language,
          notifications: updates.notifications,
          preferences: updates.preferences,
          updatedAt: new Date(),
        },
      },
      { new: true, upsert: true }
    );

    const profile = {
      id: user._id,
      name: user.name,
      email: user.email,
      userType: user.userType,
      language: user.language,
      notifications: user.notifications,
      preferences: user.preferences,
    };

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Export with security wrappers
export const GET = withSecurity(getProfile, {
  requireAuth: true,
  rateLimit: true,
  validateInput: true,
});

export const PUT = withSecurity(updateProfile, {
  requireAuth: true,
  rateLimit: true,
  validateInput: true,
});