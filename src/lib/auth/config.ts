import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import connectToDatabase from "@/lib/db/connection";
import { User } from "@/lib/db/models";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token) {
        (session.user as any).id = token.sub;
        (session.user as any).dbId = token.dbId;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      // If this is a new sign in, create/update user in database
      if (user && account) {
        try {
          await connectToDatabase();
          
          // Find or create user in MongoDB
          let dbUser = await User.findOne({ email: user.email });
          
          if (!dbUser) {
            // Create new user
            dbUser = new User({
              email: user.email,
              name: user.name,
              image: user.image,
              userType: 'other',
              subscriptionTier: 'free',
              language: 'en',
              notifications: {
                email: true,
                taxReminders: true,
                newsletterUpdates: false,
              },
              preferences: {
                theme: 'light',
                currency: 'BDT',
                timezone: 'Asia/Dhaka',
              },
              profile: {},
              lastActive: new Date(),
            });
            
            await dbUser.save();
          } else {
            // Update existing user
            dbUser.name = user.name || dbUser.name;
            dbUser.image = user.image || dbUser.image;
            dbUser.lastActive = new Date();
            await dbUser.save();
          }
          
          // Store database user ID in token
          token.dbId = dbUser._id.toString();
        } catch (error) {
          console.error('Error creating/updating user:', error);
        }
      }
      
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};