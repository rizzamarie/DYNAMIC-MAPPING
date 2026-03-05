const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/kioskdb', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  const userSchema = new mongoose.Schema({
    username: String,
    role: String,
    password: String,
    isActive: Boolean
  }, { strict: false });
  
  const User = mongoose.model('User', userSchema);
  
  const admin = await User.findOne({ username: 'admin' });
  if (admin) {
    console.log('✅ Admin user found:');
    console.log(`Username: ${admin.username}`);
    console.log(`Role: ${admin.role}`);
    console.log(`Password: ${admin.password}`);
    console.log(`Active: ${admin.isActive}`);
  } else {
    console.log('❌ Admin user NOT found');
  }
  
  process.exit(0);
})
.catch(err => {
  console.error('❌ MongoDB error:', err);
  process.exit(1);
});
