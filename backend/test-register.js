const mongoose = require('mongoose');
const User = require('./models/User');

async function test() {
  await mongoose.connect('mongodb://127.0.0.1:27017/truemerit');
  try {
    // Delete existing test users
    await User.deleteMany({ email: { $in: ['student@test.com', 'recruiter@test.com'] } });
    
    // Create test student
    await User.create({ 
      name: 'John Student', 
      email: 'student@test.com', 
      password: 'password123', 
      role: 'student',
      githubUsername: 'johndoe'
    });
    console.log("✓ Test student created: student@test.com / password123");
    
    // Create test recruiter
    await User.create({ 
      name: 'Jane Recruiter', 
      email: 'recruiter@test.com', 
      password: 'password123', 
      role: 'recruiter'
    });
    console.log("✓ Test recruiter created: recruiter@test.com / password123");
  } catch (e) {
    console.error("Error thrown:", e);
    console.error(e.stack);
  }
  process.exit();
}

test();
