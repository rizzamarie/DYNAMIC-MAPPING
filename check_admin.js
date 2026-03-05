const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/kioskdb', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('✅ MongoDB connected');
  
  const userSchema = new mongoose.Schema({
    username: String,
    role: String,
    password: String, // We want to see the password
    isActive: Boolean
  });
  
  const User = mongoose.model('User', userSchema);
  
  const users = await User.find({});
  console.log('--- All Users ---');
  users.forEach(u => {
    console.log(`Username: ${u.username}, Role: ${u.role}, Password: ${u.password}, Active: ${u.isActive}`);
  });
  console.log('-----------------');
  
  process.exit(0);
})
.catch(err => {
  console.error('❌ MongoDB error:', err);
  process.exit(1);
});
