#!/bin/bash

echo "🚀 Deploying Email Verification and Tester Code Updates"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found. Please run this script from the Synvoy project root."
    exit 1
fi

echo "📋 Step 1: Setting up environment variables"
echo "-------------------------------------------"
echo ""
echo "⚠️  IMPORTANT: You need to add TESTER_CODE to your docker-compose.env file"
echo ""
echo "Add this line to your docker-compose.env file:"
echo "TESTER_CODE=your-secret-tester-code-here"
echo ""
read -p "Have you added TESTER_CODE to docker-compose.env? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please add TESTER_CODE to docker-compose.env and run this script again."
    exit 1
fi

echo ""
echo "📦 Step 2: Installing new Python dependencies"
echo "-------------------------------------------"
echo "The backend now requires APScheduler. This will be installed when rebuilding."
echo ""

echo "🗄️  Step 3: Creating database tables"
echo "-------------------------------------------"
echo "Creating verification_tokens table..."
docker-compose exec backend python init_db.py
if [ $? -eq 0 ]; then
    echo "✅ Database tables created successfully"
else
    echo "⚠️  Warning: Database initialization had issues. Check logs above."
fi
echo ""

echo "🔨 Step 4: Rebuilding backend with new dependencies"
echo "-------------------------------------------"
echo "This will install APScheduler and update the backend..."
docker-compose build backend
if [ $? -eq 0 ]; then
    echo "✅ Backend built successfully"
else
    echo "❌ Error building backend. Check the output above."
    exit 1
fi
echo ""

echo "🔄 Step 5: Restarting services"
echo "-------------------------------------------"
echo "Restarting backend and frontend to apply changes..."
docker-compose up -d --force-recreate backend frontend
if [ $? -eq 0 ]; then
    echo "✅ Services restarted successfully"
else
    echo "❌ Error restarting services. Check the output above."
    exit 1
fi
echo ""

echo "⏳ Step 6: Waiting for services to be healthy"
echo "-------------------------------------------"
echo "Waiting 30 seconds for services to start..."
sleep 30

echo ""
echo "🔍 Step 7: Verifying services are running"
echo "-------------------------------------------"
docker-compose ps

echo ""
echo "📊 Step 8: Checking backend logs for errors"
echo "-------------------------------------------"
echo "Recent backend logs (last 20 lines):"
docker-compose logs backend | tail -20

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Check that backend is running: docker-compose ps backend"
echo "2. Check backend logs: docker-compose logs -f backend"
echo "3. Verify frontend is accessible"
echo "4. Test registration with tester code"
echo ""
echo "🔧 If you see any errors:"
echo "- Check backend logs: docker-compose logs backend"
echo "- Check frontend logs: docker-compose logs frontend"
echo "- Verify TESTER_CODE is set: docker-compose exec backend env | grep TESTER_CODE"
