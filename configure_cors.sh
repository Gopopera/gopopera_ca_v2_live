#!/bin/bash
# CORS Configuration Script for Firebase Storage
# Run this script to configure CORS for your Firebase Storage bucket

set -e  # Exit on error

echo "🔧 Firebase Storage CORS Configuration"
echo "======================================="
echo ""

# Add Google Cloud SDK to PATH
export PATH=/opt/homebrew/share/google-cloud-sdk/bin:"$PATH"

# Check if gsutil is available
if ! command -v gsutil &> /dev/null; then
    echo "❌ Error: gsutil not found. Please install Google Cloud SDK first:"
    echo "   brew install --cask google-cloud-sdk"
    exit 1
fi

echo "✅ gsutil found"
echo ""

# Check authentication
echo "Checking authentication..."
AUTH_OUTPUT=$(gcloud auth list 2>&1)
if ! echo "$AUTH_OUTPUT" | grep -q "ACTIVE"; then
    echo "⚠️  You need to authenticate first."
    echo ""
    echo "Starting authentication process..."
    echo ""
    echo "This will open your browser. Please sign in with the account that has access to gopopera2026."
    echo ""
    
    # Try to authenticate (this will open browser)
    if gcloud auth login --no-launch-browser 2>&1 | head -5; then
        echo ""
        echo "✅ Authentication initiated. Please complete the process in your browser."
        echo ""
        echo "If browser didn't open, copy the URL above and open it manually."
        echo ""
        read -p "Press Enter after you've completed authentication..."
    else
        # Fallback: try with browser launch
        echo "Attempting to open browser for authentication..."
        gcloud auth login
    fi
    
    # Verify authentication worked
    if ! gcloud auth list 2>&1 | grep -q "ACTIVE"; then
        echo ""
        echo "❌ Authentication failed or incomplete. Please try again:"
        echo "   gcloud auth login"
        exit 1
    fi
fi

# Set project
echo "Setting project to gopopera2026..."
gcloud config set project gopopera2026

# Verify project
PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$PROJECT" != "gopopera2026" ]; then
    echo "❌ Error: Project not set correctly. Current project: $PROJECT"
    exit 1
fi
echo "✅ Project set to: $PROJECT"
echo ""

# Find storage bucket
echo "Finding your storage bucket..."
BUCKETS=$(gsutil ls 2>&1)
if [ $? -ne 0 ]; then
    echo "❌ Error: Could not list buckets. Make sure you're authenticated and have permissions."
    exit 1
fi

# Try to find the bucket
# IMPORTANT: Firebase Storage uses .appspot.com bucket name, not .firebasestorage.app
# The .firebasestorage.app is just the HTTP endpoint, but gsutil needs the actual bucket name
BUCKET=""
if echo "$BUCKETS" | grep -q "gs://gopopera2026.appspot.com"; then
    BUCKET="gs://gopopera2026.appspot.com"
    echo "✅ Found Firebase Storage bucket: $BUCKET"
elif echo "$BUCKETS" | grep -q "gs://gopopera2026.firebasestorage.app"; then
    echo "⚠️  WARNING: Found .firebasestorage.app bucket, but CORS should be set on .appspot.com"
    echo "   The .firebasestorage.app is just an HTTP endpoint, not the actual bucket name."
    echo "   Trying to find the correct .appspot.com bucket..."
    # Don't use .firebasestorage.app - it's not the real bucket
    BUCKET=""
else
    echo "Available buckets:"
    echo "$BUCKETS"
    echo ""
    read -p "Enter your bucket name (should be gs://gopopera2026.appspot.com): " BUCKET
fi

# If still no bucket, default to appspot.com (standard Firebase Storage bucket name)
if [ -z "$BUCKET" ]; then
    echo "⚠️  No bucket found automatically. Using default Firebase Storage bucket name:"
    BUCKET="gs://gopopera2026.appspot.com"
    echo "   $BUCKET"
    echo ""
    read -p "Press Enter to continue with this bucket, or Ctrl+C to cancel..."
fi

if [ -z "$BUCKET" ]; then
    echo "❌ Error: No bucket specified"
    exit 1
fi

echo "✅ Using bucket: $BUCKET"
echo ""

# Check if cors.json exists
if [ ! -f "cors.json" ]; then
    echo "❌ Error: cors.json not found in current directory"
    echo "   Current directory: $(pwd)"
    exit 1
fi

echo "✅ Found cors.json"
echo ""

# Apply CORS configuration
echo "Applying CORS configuration..."
if gsutil cors set cors.json "$BUCKET"; then
    echo ""
    echo "✅ CORS configuration applied successfully!"
    echo ""
    
    # Verify CORS
    echo "Verifying CORS configuration..."
    echo ""
    gsutil cors get "$BUCKET"
    echo ""
    echo "✅ CORS configuration complete!"
    echo ""
    echo "Next steps:"
    echo "1. Clear your browser cache (important!)"
    echo "2. Try uploading an image in your app"
    echo "3. Check Network tab for OPTIONS request - should be 200 OK"
else
    echo ""
    echo "❌ Error: Failed to apply CORS configuration"
    exit 1
fi

