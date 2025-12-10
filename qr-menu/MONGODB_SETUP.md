# MongoDB Setup Guide for QR Menu System

Since the automated installation failed due to permissions, here are **3 easy options** to get MongoDB running:

---

## ⚡ Option 1: Use Temporary Demo Connection (Fastest - 30 seconds)

I can provide a temporary MongoDB connection string for quick testing:

1. **Update your `.env` file**:
   ```powershell
   cd d:\Projectos\restaurante\qr-menu\api
   notepad .env
   ```

2. **Replace the MONGO_URI line** with a demo connection (I'll provide this separately)

3. **Start the backend**:
   ```powershell
   npm run dev
   ```

> ⚠️ **Note**: This is for testing only. For production, use your own database.

---

## 🌐 Option 2: MongoDB Atlas (Recommended - 5 minutes)

**Free forever, no credit card required!**

### Steps:

1. **You're already on the registration page! Complete these fields**:
   - Email address
   - Password  
   - First name / Last name
   - Click "Create your Atlas account"

2. **Answer the quick survey** (skip if you want)

3. **Choose FREE tier (M0)**:
   - Click "Create" on the FREE shared cluster
   - Choose AWS or Google Cloud
   - Choose a region close to you (e.g., Belgium for Europe)
   - Click "Create Deployment"

4. **Create Database User**:
   - Username: `qrmenu`
   - Password: (generate or create your own - save it!)
   - Click "Create Database User"

5. **Add IP Address**:
   - Click "Add My Current IP Address" 
   - Or add `0.0.0.0/0` to allow access from anywhere (less secure but easier for dev)
   - Click "Finish and Close"

6. **Get Connection String**:
   - Click "Connect"
   - Choose "Drivers"
   - Copy the connection string
   - It looks like: `mongodb+srv://qrmenu:<password>@cluster0.xxxxx.mongodb.net/`

7. **Update your `.env` file**:
   ```env
   MONGO_URI=mongodb+srv://qrmenu:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/qrmenu?retryWrites=true&w=majority
   ```
   (Replace `YOUR_PASSWORD` with your actual password)

8. **Start  the backend**:
   ```powershell
   cd d:\Projectos\restaurante\qr-menu\api
   npm run dev
   ```

---

## 💻 Option 3: Install MongoDB Locally (10 minutes)

### Manual Download & Install:

1. **Download MongoDB**:
   - Visit: https://www.mongodb.com/try/download/community
   - Choose: Windows
   - Version: 8.0.4 (current)
   - Package: MSI
   - Click "Download"

2. **Run the Installer**:
   - Double-click the downloaded `.msi` file
   - Choose "Complete" installation
   - Check "Install MongoDB as a Service" (recommended)
   - Check "Install MongoDB Compass" (GUI tool)
   - Click "Next" and "Install"

3. **MongoDB Will Auto-Start**:
   - The service will start automatically
   - Connection string: `mongodb://localhost:27017`

4. **Your `.env` is already configured** for local MongoDB:
   ```env
   MONGO_URI=mongodb://localhost:27017/qr-menu-restaurant
   ```

5.  **Start the backend**:
   ```powershell
   cd d:\Projectos\restaurante\qr-menu\api
   npm run dev
   ```

---

## ✅ How to Verify MongoDB is Working

After setting up, run this command to test the connection:

```powershell
cd d:\Projectos\restaurante\qr-menu\api
npm run dev
```

**Success looks like**:
```
✓ Connected to MongoDB
✓ Subscription monitoring started
✓ API running on port 4000
✓ Environment: development
```

**Failure looks like**:
```
✗ MongoDB connection error
MongooseServerSelectionError: connect ECONNREFUSED
```

---

## 🎯 My Recommendation

**For quickest testing**: Use **Option 2 (MongoDB Atlas)**
- You're already on the registration page
- Takes 5 minutes
- No installation needed
- Works from anywhere
- Free forever (M0 tier)
- 512MB storage (plenty for testing)

**For production/long-term**: Also **Option 2 (MongoDB Atlas)**
- Automated backups
- Automatic scaling
- Global availability
- Professional support

---

## 🆘 Need Help?

Let me know which option you'd like to proceed with, and I can help you through it step-by-step!
