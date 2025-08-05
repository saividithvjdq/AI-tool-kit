const mongoose = require('mongoose');
const EmailList = require('./models/EmailList');
const User = require('./models/User');
require('dotenv').config();

async function setupDefaultEmailList() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/project');
    console.log('✅ Connected to MongoDB');

    // Define the default email list
    const defaultEmails = [
      'rohithsravani02@gmail.com',
      'rajashekar0561@gmail.com',
      'saividith396@gmail.com', // Fixed typo from saividith@396@gmail.com
      'srishanthpatel2005@gmail.com'
    ];

    const allowedUsers = [
      '23071a67F0@gmail.com',
      'saividith396@gmail.com'
    ];

    // Check if default email list already exists
    const existingList = await EmailList.findOne({ name: 'Default Campaign List', isDefault: true });

    if (existingList) {
      console.log('📧 Default email list already exists, updating...');
      
      // Update the existing list
      existingList.emails = defaultEmails.map(email => ({
        email: email.toLowerCase(),
        name: email.split('@')[0], // Use part before @ as name
        status: 'active',
        addedAt: new Date()
      }));

      existingList.permissions.allowedUsers = allowedUsers.map(email => ({
        email: email.toLowerCase(),
        role: 'admin'
      }));

      await existingList.save();
      console.log('✅ Default email list updated successfully');
    } else {
      console.log('📧 Creating default email list...');
      
      // Create a dummy user ID (in a real scenario, you'd use an actual user)
      // For now, we'll create a mongoose ObjectId
      const dummyUserId = new mongoose.Types.ObjectId();
      
      // Create new default email list
      const emailList = new EmailList({
        userId: dummyUserId, // Required field
        name: 'Default Campaign List',
        description: 'Default list for marketing campaigns',
        emails: defaultEmails.map(email => ({
          email: email.toLowerCase(),
          name: email.split('@')[0], // Use part before @ as name
          status: 'active',
          addedAt: new Date()
        })),
        isDefault: true,
        permissions: {
          allowedUsers: allowedUsers.map(email => ({
            email: email.toLowerCase(),
            role: 'admin'
          }))
        }
      });

      await emailList.save();
      console.log('✅ Default email list created successfully');
    }

    // Display the created/updated list
    const finalList = await EmailList.findOne({ name: 'Default Campaign List', isDefault: true });
    console.log('\n📊 Email List Summary:');
    console.log(`Name: ${finalList.name}`);
    console.log(`Total Emails: ${finalList.totalEmails}`);
    console.log(`Active Emails: ${finalList.activeEmails}`);
    console.log('\n📧 Email Addresses:');
    finalList.emails.forEach((email, index) => {
      console.log(`${index + 1}. ${email.email} (${email.name}) - ${email.status}`);
    });
    console.log('\n👥 Allowed Users:');
    finalList.permissions.allowedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} - ${user.role}`);
    });

    console.log('\n🚀 Setup complete! You can now send campaigns to this email list.');
    console.log('📍 Email List ID:', finalList._id);

  } catch (error) {
    console.error('❌ Error setting up default email list:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📴 Disconnected from MongoDB');
  }
}

// Run the setup
setupDefaultEmailList();
