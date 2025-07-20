# Azure Cosmos DB Setup Guide

## Step 1: Create Azure Account
1. Go to: https://azure.microsoft.com/free/
2. Sign up for free account (no credit card required for free tier)
3. Get $200 credit + lifetime free services

## Step 2: Create Cosmos DB for MongoDB vCore
1. In Azure Portal → "Create a resource"
2. Search "Azure Cosmos DB"
3. Choose "Azure Cosmos DB for MongoDB"
4. Select "vCore cluster" option
5. Choose "Free tier" (32 GB storage, lifetime free)
6. Create the resource

## Step 3: Get Connection String
1. Go to your Cosmos DB resource
2. Navigate to "Connection strings" in left menu
3. Copy the "Primary connection string"
4. Add it to your .env file as AZURE_COSMOS_CONNECTION_STRING

## Step 4: Install Dependencies
```bash
pip install pymongo numpy
```

## Step 5: Run Migration
```bash
python migrate-to-azure-cosmos.py
python setup-azure-cosmos.py
```

## Benefits of Azure Cosmos DB:
- ✅ 32 GB storage (16,000x more than needed)
- ✅ Lifetime free (no upgrade pressure)
- ✅ Dedicated cluster (not shared)
- ✅ Enterprise-grade performance
- ✅ No credit card required
- ✅ MongoDB API (familiar)
- ✅ Built-in vector search capabilities
