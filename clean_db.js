const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://bhumireddysahithi_db_user:DHZnGyO6Do7kxKOC@cluster0.wqeysom.mongodb.net/Prathika_IIT_Academy?retryWrites=true&w=majority';

async function cleanDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully.');

    // Delete collections
    console.log('Clearing mock tests...');
    await mongoose.connection.collection('mocktests').deleteMany({});
    
    console.log('Clearing announcements...');
    await mongoose.connection.collection('announcements').deleteMany({});
    
    console.log('Clearing study materials...');
    await mongoose.connection.collection('studymaterials').deleteMany({});
    
    console.log('Clearing doubts...');
    await mongoose.connection.collection('doubts').deleteMany({});
    
    console.log('Clearing inquiries...');
    await mongoose.connection.collection('inquiries').deleteMany({});
    
    console.log('Clearing student users (keeping admin)...');
    await mongoose.connection.collection('users').deleteMany({ role: { $ne: 'admin' } });

    console.log('Database clean-up finished successfully!');
  } catch (error) {
    console.error('Error cleaning database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

cleanDatabase();
