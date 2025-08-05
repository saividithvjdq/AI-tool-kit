const fetch = require('node-fetch');

async function debugRegistration() {
  console.log('🔍 Debugging Registration Error...\n');
  
  // Test with different user data formats
  const testCases = [
    {
      name: 'Standard Registration',
      data: {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      }
    },
    {
      name: 'Registration with Special Characters',
      data: {
        name: 'Test User!',
        email: 'test+special@example.com',
        password: 'Password123!'
      }
    },
    {
      name: 'Registration with Short Password',
      data: {
        name: 'Test User',
        email: 'test2@example.com',
        password: '123'
      }
    },
    {
      name: 'Registration with Missing Fields',
      data: {
        email: 'test3@example.com',
        password: 'password123'
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.name}`);
    console.log(`   Data: ${JSON.stringify(testCase.data, null, 2)}`);
    
    try {
      const response = await fetch('http://localhost:5001/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(testCase.data),
        timeout: 10000
      });
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      const responseText = await response.text();
      
      if (response.ok) {
        console.log('   ✅ SUCCESS');
        const data = JSON.parse(responseText);
        console.log(`   User ID: ${data.user?.id}`);
        console.log(`   Token: ${data.token ? 'Generated' : 'Missing'}`);
      } else {
        console.log('   ❌ FAILED');
        console.log(`   Response: ${responseText}`);
        
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
  }
  
  // Test server connectivity
  console.log('\n🌐 Testing Server Connectivity...');
  try {
    const healthResponse = await fetch('http://localhost:5001/api/health', {
      timeout: 5000
    });
    console.log(`   Health Check: ${healthResponse.status} ${healthResponse.statusText}`);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log(`   Server Status: ${healthData.status}`);
      console.log(`   Environment: ${healthData.environment}`);
    }
  } catch (error) {
    console.log(`   ❌ Server connectivity error: ${error.message}`);
  }
  
  // Test MongoDB connection
  console.log('\n🗄️ Testing Database Connection...');
  try {
    // Try to access a route that requires database
    const dbTestResponse = await fetch('http://localhost:5001/api/auth/test-db', {
      timeout: 5000
    });
    console.log(`   DB Test Status: ${dbTestResponse.status}`);
  } catch (error) {
    console.log(`   DB Test: ${error.message}`);
  }
}

debugRegistration();
