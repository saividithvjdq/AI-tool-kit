const mongoose = require('mongoose');
require('dotenv').config();

async function fixSchema() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Drop the WebsiteContext collection to reset schema
    console.log('🗑️ Dropping WebsiteContext collection...');
    try {
      await mongoose.connection.db.collection('websitecontexts').drop();
      console.log('✅ Collection dropped');
    } catch (error) {
      console.log('⚠️ Collection might not exist:', error.message);
    }

    // Clear mongoose model cache
    console.log('🧹 Clearing mongoose model cache...');
    if (mongoose.models.WebsiteContext) {
      delete mongoose.models.WebsiteContext;
    }
    if (mongoose.modelSchemas && mongoose.modelSchemas.WebsiteContext) {
      delete mongoose.modelSchemas.WebsiteContext;
    }

    console.log('✅ Schema reset complete');
    
    // Recreate the model to ensure schema is correct
    const WebsiteContext = require('./models/WebsiteContext');
    console.log('✅ WebsiteContext model reloaded');

    // Test creating a context
    console.log('🧪 Testing context creation...');
    const testContext = new WebsiteContext({
      websiteId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      originalPrompt: 'Test prompt',
      businessContext: {
        name: 'Test Business',
        industry: 'Technology',
        description: 'A test business'
      }
    });

    // Test adding notification
    console.log('🧪 Testing notification addition...');
    testContext.pendingNotifications.push({
      targetAgent: 'test-agent',
      type: 'test',
      message: 'Test message',
      data: { test: 'data' },
      createdAt: new Date(),
      processed: false
    });

    await testContext.save();
    console.log('✅ Test context saved successfully');

    // Clean up test data
    await testContext.deleteOne();
    console.log('✅ Test data cleaned up');

    console.log('🎉 Schema fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Schema fix failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

fixSchema();
