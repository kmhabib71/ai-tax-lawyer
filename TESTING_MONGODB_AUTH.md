# MongoDB Authentication Testing Guide

## Issue Fixed: User Data Storage

I've fixed the issue where user data wasn't being stored in MongoDB during Google authentication. Here's what I changed:

### Changes Made:

1. **Updated JWT callback in auth config** to create/update users in MongoDB during sign-in
2. **Modified profile API** to use database user ID from session
3. **Added user creation logic** that runs when users sign in for the first time
4. **Added debug endpoint** to verify users are being created

### Testing Instructions:

#### Step 1: Start Development Server
```bash
npm run dev
```

#### Step 2: Clear Your Browser Session
1. Go to http://localhost:3000
2. Open Developer Tools (F12)
3. Go to Application tab > Storage > Clear all data
4. Close and reopen browser

#### Step 3: Test User Creation
1. Visit http://localhost:3000
2. Click "Sign In"
3. Sign in with Google
4. **NEW**: User should now be created in MongoDB automatically

#### Step 4: Verify User in Database
Open a new tab and visit:
```
http://localhost:3000/api/debug/users
```

You should see JSON output showing users in database, including your newly created user.

#### Step 5: Test Profile Page
1. Visit http://localhost:3000/profile
2. **Expected**: Profile page should now load with your data
3. **Check**: Name, email, and default preferences should be displayed
4. **Test**: Try updating preferences and saving

#### Step 6: Verify Profile API
Open browser console and run:
```javascript
fetch('/api/user/profile')
  .then(res => res.json())
  .then(data => console.log('Profile data:', data));
```

Expected response:
```json
{
  "id": "user-database-id",
  "name": "Your Name",
  "email": "your@email.com",
  "userType": "other",
  "language": "en",
  "notifications": {
    "email": true,
    "taxReminders": true,
    "newsletterUpdates": false
  },
  "preferences": {
    "theme": "light",
    "currency": "BDT",
    "timezone": "Asia/Dhaka"
  }
}
```

### What Happens During Sign-In:

1. **User signs in with Google** → NextAuth processes OAuth
2. **JWT callback triggers** → Creates/updates user in MongoDB
3. **Session callback adds database ID** → Makes it available to API calls
4. **Profile API uses database ID** → Retrieves user data from MongoDB
5. **Profile page loads** → Shows user data from database

### Database Schema Created:

```javascript
{
  email: "user@email.com",
  name: "User Name",
  image: "profile-image-url",
  userType: "other",
  subscriptionTier: "free",
  language: "en",
  notifications: {
    email: true,
    taxReminders: true,
    newsletterUpdates: false
  },
  preferences: {
    theme: "light",
    currency: "BDT",
    timezone: "Asia/Dhaka"
  },
  profile: {},
  lastActive: new Date(),
  createdAt: new Date(),
  updatedAt: new Date()
}
```

### Troubleshooting:

1. **Still no profile data?**
   - Check browser console for errors
   - Verify MongoDB connection in server logs
   - Check /api/debug/users endpoint

2. **Database connection issues?**
   - Check .env.local has correct MONGODB_URI
   - Verify MongoDB Atlas is accessible

3. **Profile API returning 404?**
   - Sign out and sign in again
   - Check if user was created in /api/debug/users

### Clean Up:

When you're done testing, you can remove the debug endpoint:
```bash
rm src/app/api/debug/users/route.ts
```

This fix ensures that all users who sign in through Google (or Facebook) will have their data properly stored in MongoDB and can access their profile page with all preferences and settings.