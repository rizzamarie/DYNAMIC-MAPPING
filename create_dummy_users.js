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
    role: { type: String, enum: ['staff', 'manager', 'admin', 'cashier'], default: 'staff' },
    email: { type: String, unique: true, sparse: true },
    assignedBranch: { type: String, default: null },
    isActive: { type: Boolean, default: true }
  });
  
  const User = mongoose.models.User || mongoose.model('User', userSchema);
  
  const dummyUsers = [
    { name: 'System Admin', username: 'admin', password: 'admin123', role: 'admin', email: 'admin@maptimize.com' },
    { name: 'Store Manager', username: 'manager', password: 'manager123', role: 'manager', email: 'manager@maptimize.com' },
    { name: 'Store Staff', username: 'staff', password: 'staff123', role: 'staff', email: 'staff@maptimize.com' },
    { name: 'Store Cashier', username: 'cashier', password: 'cashier123', role: 'cashier', email: 'cashier@maptimize.com' }
  ];

  for (const user of dummyUsers) {
    const existingUser = await User.findOne({ username: user.username });
    
    if (existingUser) {
      existingUser.password = user.password;
      existingUser.role = user.role;
      existingUser.isActive = true;
      existingUser.name = user.name;
      existingUser.email = user.email;
      await existingUser.save();
      console.log(`✅ Updated user: ${user.username} / ${user.password} (${user.role})`);
    } else {
      // Check if email exists to avoid duplicate error on email
      const existingEmail = await User.findOne({ email: user.email });
      if (existingEmail) {
         console.log(`⚠️ User with email ${user.email} already exists but username mismatch. Skipping creation.`);
         continue;
      }
      await User.create(user);
      console.log(`✅ Created user: ${user.username} / ${user.password} (${user.role})`);
    }
  }
  
  process.exit(0);
})
.catch(err => {
  console.error('❌ MongoDB error:', err);
  process.exit(1);
});
