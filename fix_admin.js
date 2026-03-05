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
  }, { strict: false }); // strict: false to allow us to work with indexes easily
  
  const User = mongoose.model('User', userSchema);
  
  // List indexes
  try {
    const indexes = await User.collection.indexes();
    console.log('Current indexes:', indexes);
    
    const emailIndex = indexes.find(idx => idx.name === 'email_1');
    if (emailIndex) {
      console.log('Found problematic email index. Dropping it...');
      await User.collection.dropIndex('email_1');
      console.log('✅ Dropped email_1 index');
    }
  } catch (err) {
    console.warn('Could not list/drop indexes (might not exist yet):', err.message);
  }
  
  // Check if admin exists by username
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
    try {
      await User.create({
        name: 'System Admin',
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        isActive: true
      });
      console.log('✅ Admin user created: admin / admin123');
    } catch (createErr) {
       console.error('❌ Error creating user:', createErr);
    }
  }
  
  process.exit(0);
})
.catch(err => {
  console.error('❌ MongoDB error:', err);
  process.exit(1);
});
