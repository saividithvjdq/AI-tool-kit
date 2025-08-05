const fetch = require('node-fetch');

async function testImageGeneration() {
  console.log('🖼️ Testing Image Generation Endpoints...\n');
  
  // First, register a user and get a token
  const testUser = {
    name: `Test User ${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'testpassword123'
  };
  
  console.log('1. Registering user for authentication...');
  const registerResponse = await fetch('http://localhost:5001/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser)
  });
  
  if (!registerResponse.ok) {
    console.log('❌ Failed to register user');
    return;
  }
  
  const { token } = await registerResponse.json();
  console.log('✅ User registered, token obtained');
  
  // Test the current Gemini endpoint (which actually uses Stability AI)
  console.log('\n2. Testing /api/images/generate-with-gemini endpoint...');
  
  const imageRequest = {
    prompt: 'A beautiful sunset over mountains, realistic style',
    style: 'realistic',
    quality: 'high',
    aspectRatio: '1:1',
    numberOfImages: 1
  };
  
  console.log(`   Request: ${JSON.stringify(imageRequest, null, 2)}`);
  
  try {
    const imageResponse = await fetch('http://localhost:5001/api/images/generate-with-gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(imageRequest),
      timeout: 60000 // 60 second timeout for image generation
    });
    
    console.log(`   Status: ${imageResponse.status} ${imageResponse.statusText}`);
    
    const responseText = await imageResponse.text();
    
    if (imageResponse.ok) {
      console.log('   ✅ SUCCESS');
      try {
        const data = JSON.parse(responseText);
        console.log(`   Generated ${data.images?.length || 0} images`);
        console.log(`   Message: ${data.message}`);
      } catch (e) {
        console.log(`   Response: ${responseText.substring(0, 200)}...`);
      }
    } else {
      console.log('   ❌ FAILED');
      console.log(`   Error: ${responseText}`);
      
      // Try to parse error details
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.errors) {
          console.log('   Validation Errors:');
          errorData.errors.forEach(error => {
            console.log(`     - ${error.msg} (${error.path})`);
          });
        }
      } catch (e) {
        // Response is not JSON
      }
    }
    
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
  }
  
  // Test environment variables
  console.log('\n3. Checking environment variables...');
  console.log(`   STABILITY_API_KEY: ${process.env.STABILITY_API_KEY ? 'Set' : 'Missing'}`);
  console.log(`   GOOGLE_AI_API_KEY: ${process.env.GOOGLE_AI_API_KEY ? 'Set' : 'Missing'}`);
  
  // Test Stability AI service directly
  console.log('\n4. Testing Stability AI service directly...');
  try {
    const StabilityImageService = require('./services/stabilityImageService');
    const stabilityService = new StabilityImageService();
    
    console.log('   Stability AI service loaded successfully');
    console.log(`   API Key configured: ${stabilityService.apiKey ? 'Yes' : 'No'}`);
    
  } catch (error) {
    console.log(`   ❌ Error loading Stability AI service: ${error.message}`);
  }
}

// Load environment variables
require('dotenv').config();
testImageGeneration();
