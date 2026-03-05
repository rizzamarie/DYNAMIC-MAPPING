const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/kioskdb', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('✅ MongoDB connected');

  // Define User Schema (including email to satisfy DB index)
  const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['staff', 'manager', 'admin'], default: 'staff' },
    email: { type: String, unique: true, sparse: true }, // Added email field
    isActive: { type: Boolean, default: true }
  });

  const User = mongoose.models.User || mongoose.model('User', userSchema);

  // Define Branch Schema
  const branchSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: String,
    deletedAt: { type: Date, default: null },
  }, { timestamps: true });

  const Branch = mongoose.models.Branch || mongoose.model('Branch', branchSchema);

  // Check/Create Branch
  const branchCount = await Branch.countDocuments({ deletedAt: null });
  if (branchCount === 0) {
    console.log('No branches found. Creating default branch...');
    await Branch.create({
      name: 'Main Branch',
      address: '123 Main St'
    });
    console.log('✅ Default branch created: Main Branch');
  } else {
    console.log(`Found ${branchCount} branches.`);
  }

  // Check/Create Manager User
  const existingManager = await User.findOne({ username: 'manager' });

  if (existingManager) {
    console.log('Manager user already exists. Updating password...');
    existingManager.password = 'manager123';
    existingManager.role = 'manager';
    existingManager.email = 'manager@example.com'; // Ensure email is set
    existingManager.isActive = true;
    await existingManager.save();
    console.log('✅ Manager user updated: manager / manager123');
  } else {
    console.log('Creating manager user...');
    try {
      await User.create({
        name: 'Store Manager',
        username: 'manager',
        password: 'manager123',
        role: 'manager',
        email: 'manager@example.com',
        isActive: true
      });
      console.log('✅ Manager user created: manager / manager123');
    } catch (e) {
      if (e.code === 11000) {
        // If email duplicate, try another email
        console.log('Email duplicate, trying manager2@example.com');
        await User.create({
          name: 'Store Manager',
          username: 'manager',
          password: 'manager123',
          role: 'manager',
          email: 'manager2@example.com',
          isActive: true
        });
         console.log('✅ Manager user created: manager / manager123');
      } else {
        throw e;
      }
    }
  }

  process.exit(0);
})
.catch(err => {
  console.error('❌ MongoDB error:', err);
  process.exit(1);
});
