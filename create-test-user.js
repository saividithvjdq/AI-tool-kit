const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

async function createTestUser() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check existing users
    console.log('👥 Checking existing users...');
    const users = await User.find({}, 'email name').limit(5);
    console.log('📊 Existing users:');
    users.forEach(user => {
      console.log(`   - ${user.email} (${user.name})`);
    });

    // Create test user
    const testEmail = 'test@marketing.com';
    const testPassword = 'test123';

    console.log(`\n🆕 Creating test user: ${testEmail}`);
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: testEmail });
    if (existingUser) {
      console.log('⚠️ User already exists, updating password...');
      const salt = await bcrypt.genSalt(10);
      existingUser.password = await bcrypt.hash(testPassword, salt);
      await existingUser.save();
      console.log('✅ Password updated');
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(testPassword, salt);

      const newUser = new User({
        name: 'Test Marketing User',
        email: testEmail,
        password: hashedPassword,
        role: 'user'
      });

      await newUser.save();
      console.log('✅ Test user created');
    }

    console.log(`\n🎯 Test credentials:`);
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

createTestUser();
