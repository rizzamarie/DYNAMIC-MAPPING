const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/kioskdb', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('✅ MongoDB connected');
  
  const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['staff', 'manager', 'admin'], default: 'staff' },
    isActive: { type: Boolean, default: true }
  });
  
  const User = mongoose.model('User', userSchema);
  
  // Check if admin exists by username to avoid duplicates
  const existingAdmin = await User.findOne({ username: 'admin' });
  
  if (existingAdmin) {
    console.log('Admin user already exists. Updating password...');
    existingAdmin.password = 'admin123';
    existingAdmin.role = 'admin';
    existingAdmin.isActive = true;
    await existingAdmin.save();
    console.log('✅ Admin user updated: admin / admin123');
  } else {
    console.log('Creating admin user...');
    await User.create({
      name: 'System Admin',
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      isActive: true
    });
    console.log('✅ Admin user created: admin / admin123');
  }
  
  process.exit(0);
})
.catch(err => {
  console.error('❌ MongoDB error:', err);
  process.exit(1);
});
