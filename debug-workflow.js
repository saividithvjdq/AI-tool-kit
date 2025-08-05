const axios = require('axios');

async function debugWorkflow() {
  const baseURL = 'http://localhost:5001/api';
  
  console.log('🔍 Debugging Multi-Agent Workflow...\n');
  
  try {
    // Step 1: Test basic connectivity
    console.log('1️⃣ Testing server connectivity...');
    const healthResponse = await axios.get(`${baseURL}/agents/website-generator/health`);
    console.log('   ✅ Server is responding');
    console.log('   📊 Agent status:', healthResponse.data.status);
    
    // Step 2: Test authentication
    console.log('\n2️⃣ Testing authentication...');
    let token;
    try {
      const authResponse = await axios.post(`${baseURL}/auth/login`, {
        email: 'test@example.com',
        password: 'password123'
      });
      token = authResponse.data.token;
      console.log('   ✅ Login successful');
    } catch (authError) {
      console.log('   📝 Login failed, trying registration...');
      await axios.post(`${baseURL}/auth/register`, {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      });
      
      const authResponse = await axios.post(`${baseURL}/auth/login`, {
        email: 'test@example.com',
        password: 'password123'
      });
      token = authResponse.data.token;
      console.log('   ✅ Registration and login successful');
    }
    
    // Step 3: Test website generation with minimal data
    console.log('\n3️⃣ Testing website generation...');
    const websiteResponse = await axios.post(`${baseURL}/agents/website-generator/generate`, {
      prompt: 'Create a simple website',
      businessContext: {
        name: 'Test Business',
        industry: 'Technology',
        description: 'A test business for debugging'
      }
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('   ✅ Website generation request sent');
    console.log('   📄 Response:', websiteResponse.data);
    
    const websiteId = websiteResponse.data.websiteId;
    
    // Step 4: Wait a moment and test status
    console.log('\n4️⃣ Testing status endpoint...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
    
    try {
      const statusResponse = await axios.get(`${baseURL}/agents/website-generator/status/${websiteId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('   ✅ Status endpoint working');
      console.log('   📊 Status:', statusResponse.data);
      
    } catch (statusError) {
      console.log('   ❌ Status endpoint failed');
      console.log('   📝 Error:', statusError.response?.data || statusError.message);
      
      // Try to check the database directly
      console.log('\n5️⃣ Checking database directly...');
      try {
        const dbResponse = await axios.get(`${baseURL}/websites/${websiteId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('   ✅ Website found in database');
        console.log('   📊 Website data:', dbResponse.data.website);
      } catch (dbError) {
        console.log('   ❌ Website not found in database');
        console.log('   📝 DB Error:', dbError.response?.data || dbError.message);
      }
    }
    
  } catch (error) {
    console.error('\n💥 Debug failed:', error.message);
    if (error.response?.data) {
      console.error('📝 Error details:', error.response.data);
    }
  }
}

// Run the debug
debugWorkflow().then(() => {
  console.log('\n✅ Debug completed');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Debug crashed:', error);
  process.exit(1);
});
