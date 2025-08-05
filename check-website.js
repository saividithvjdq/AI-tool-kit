const mongoose = require('mongoose');
const Website = require('./models/Website');
require('dotenv').config();

async function checkWebsite() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check the latest website
    console.log('🔍 Looking for latest website...');
    const websites = await Website.find().sort({ createdAt: -1 }).limit(5);
    
    console.log(`📊 Found ${websites.length} websites:`);
    
    websites.forEach((website, index) => {
      console.log(`\n${index + 1}. Website ID: ${website._id}`);
      console.log(`   Business Name: ${website.businessInfo?.name || 'N/A'}`);
      console.log(`   Industry: ${website.businessInfo?.industry || 'N/A'}`);
      console.log(`   Status: ${website.status}`);
      console.log(`   Created: ${website.createdAt}`);
      console.log(`   Has Content: ${website.content ? 'Yes' : 'No'}`);
      console.log(`   Has Design: ${website.design ? 'Yes' : 'No'}`);
      
      if (website.content) {
        console.log(`   Content Keys: ${Object.keys(website.content).join(', ')}`);
      }
    });

    // Check the specific website from our test
    const testWebsiteId = '688d9cb375e7819109aadb2a';
    console.log(`\n🎯 Checking specific website: ${testWebsiteId}`);
    
    const testWebsite = await Website.findById(testWebsiteId);
    if (testWebsite) {
      console.log('✅ Test website found!');
      console.log('📄 Website details:');
      console.log(`   Business Name: ${testWebsite.businessInfo?.name}`);
      console.log(`   Industry: ${testWebsite.businessInfo?.industry}`);
      console.log(`   Description: ${testWebsite.businessInfo?.description}`);
      console.log(`   Status: ${testWebsite.status}`);
      console.log(`   Domain: ${testWebsite.domain?.subdomain || 'N/A'}`);
      
      if (testWebsite.content) {
        console.log('📝 Content structure:');
        Object.keys(testWebsite.content).forEach(key => {
          console.log(`   - ${key}: ${typeof testWebsite.content[key]}`);
        });
      }
      
      if (testWebsite.seo) {
        console.log('🔍 SEO data:');
        console.log(`   Title: ${testWebsite.seo.title}`);
        console.log(`   Description: ${testWebsite.seo.description}`);
      }
    } else {
      console.log('❌ Test website not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

checkWebsite();
