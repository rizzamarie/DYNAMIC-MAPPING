require("dotenv").config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// ========= Middleware =========
app.use(cors({
  origin: true, // Allow all origins for cross-device access
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ========= Uploads Folder =========
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Serve static files from uploads directory with proper headers
app.use('/uploads', express.static(uploadDir, {
  setHeaders: (res, path) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
}));

// ========= Serve Frontend (Production) =========
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    // Exclude API and Uploads routes from being handled by the SPA
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    }
  });
} else {
  console.log('⚠️ client/dist folder not found. Skipping static file serving for frontend.');
}

// ========= Multer Config =========
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '_');
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed!'), false);
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

console.log('📦 Backend starting...');

// ========= MongoDB Connection =========
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/kioskdb')
.then(async () => {
  console.log('✅ MongoDB connected');
  await initializeDefaultAdmin();
})
.catch(err => console.error('❌ MongoDB error:', err));

// ========= Initialization =========
const initializeDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      console.log('Creating default admin user...');
      await User.create({
        name: 'System Admin',
        username: 'admin',
        password: 'admin123', // In a real app, hash this!
        role: 'admin',
        isActive: true
      });
      console.log('✅ Default admin user created: admin / admin123');
    }
  } catch (err) {
    console.error('Failed to initialize default admin:', err);
  }
};

// ========= Schemas =========
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  details: { type: String, required: true },
  brand: { type: String, required: true },
  category: { type: String, required: true },
  stockQty: { type: Number, default: 0 },
  unit: { type: String, required: true },
  price: { type: Number, required: true },
  image: String,
  sizeOptions: [String],
  colorOptions: [String],
  brandOptions: [String],
  unitOptions: [String],
  sizeColorQuantities: [{ 
    size: String, 
    color: String, 
    quantity: { type: Number, default: 0 },
    price: Number,
    supplyPrice: Number,
    sku: String
  }],
  colorQuantities: [{ 
    color: String, 
    quantity: { type: Number, default: 0 },
    price: Number,
    supplyPrice: Number,
    sku: String
  }],
  sizeQuantities: [{ 
    size: String, 
    quantity: { type: Number, default: 0 },
    price: Number,
    supplyPrice: Number,
    sku: String
  }],
  brandUnitQuantities: [{ brand: String, unit: String, quantity: { type: Number, default: 0 } }],
  brandQuantities: [{ brand: String, quantity: { type: Number, default: 0 } }],
  unitQuantities: [{ unit: String, quantity: { type: Number, default: 0 } }],
  variantSize: String,
  variantColor: String,
  location: { x: Number, y: Number, floor: { type: String, default: 'Ground Floor' } },
  sku: String,
  supplier: String,
  supplyPrice: { type: Number, default: 0 },
  markup: { type: Number, default: 0 },
  minStockLevel: { type: Number, default: 0 },
  maxStockLevel: { type: Number, default: 0 },
  description: String,
  status: { type: String, default: 'active' },
  hasVariants: { type: Boolean, default: false },
  totalStock: { type: Number, default: 0 },
  availableStock: { type: Number, default: 0 },
  size: String,
  color: String,
  deletedAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
  branch: { type: String, default: null }, // Link product to a specific branch
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

const stockHistorySchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String },
  branch: { type: String, default: null },
  type: { type: String, default: 'Stock Change' },
  quantity: { type: Number, default: 0 },
  previousStock: { type: Number, default: 0 },
  newStock: { type: Number, default: 0 },
  previousSellingPrice: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  note: { type: String, default: '' },
  source: { type: String, default: 'unknown' },
  actorRole: { type: String, default: null },
  actorName: { type: String, default: null },
}, { timestamps: true });

const StockHistory = mongoose.model('StockHistory', stockHistorySchema);

const mapHistorySchema = new mongoose.Schema({
  mapId: { type: String, required: false },
  mapName: { type: String, required: true },
  action: { type: String, required: true }, // Created, Edited, Deleted, Restored
  branch: { type: String, default: null },
  actorRole: { type: String, default: null },
  actorName: { type: String, default: null },
  details: { type: String, default: '' }
}, { timestamps: true });

const MapHistory = mongoose.model('MapHistory', mapHistorySchema);

const userHistorySchema = new mongoose.Schema({
  targetUserId: { type: String, required: false },
  targetUserName: { type: String, required: true },
  action: { type: String, required: true }, // Created, Edited, Deleted, Restored
  actorRole: { type: String, default: null },
  actorName: { type: String, default: null },
  details: { type: String, default: '' }
}, { timestamps: true });

const UserHistory = mongoose.model('UserHistory', userHistorySchema);

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

const Category = mongoose.model('Category', categorySchema);

const brandSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

brandSchema.index({ name: 1, deletedAt: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
const Brand = mongoose.model('Brand', brandSchema);

const attributeTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

attributeTypeSchema.index({ name: 1, deletedAt: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
const AttributeType = mongoose.model('AttributeType', attributeTypeSchema);

const unitSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

unitSchema.index({ name: 1, deletedAt: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
const Unit = mongoose.model('Unit', unitSchema);

const branchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: String,
  mapId: { type: mongoose.Schema.Types.ObjectId, ref: 'Map', default: null },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

branchSchema.index({ name: 1, deletedAt: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
const Branch = mongoose.model('Branch', branchSchema);

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['staff', 'manager', 'admin', 'cashier'], default: 'staff' },
    email: { type: String, unique: true, sparse: true },
    phone: { type: String, default: '' },
    assignedBranch: { type: String, default: null },
  profileImage: String,
  lastLogin: { type: Date, default: null },
  loginCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  deviceInfo: { type: String, default: null },
  lastDevice: { type: String, default: null },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// ========= Map Schemas =========
const shapeSchema = new mongoose.Schema({
  id: String, type: String, x: Number, y: Number, width: Number, height: Number,
  rotation: Number, content: String, fontSize: Number, fontFamily: String,
  fontColor: String, color: String, triangleOffset: { x: Number, y: Number }
}, { _id: false });

const pointSchema = new mongoose.Schema({ x: Number, y: Number }, { _id: false });

const widgetSchema = new mongoose.Schema({
  id: String, type: String, content: String, x: Number, y: Number,
  width: Number, height: Number, rotation: Number,
}, { _id: false });

const placedProductSchema = new mongoose.Schema({
  id: String, productId: String, productName: String, widgetId: String,
  x: Number, y: Number, size: Number, timestamp: String,
}, { _id: false });

const productMarkerSchema = new mongoose.Schema({
  id: String, productId: String, productName: String, productImage: String,
  productBrand: String, productPrice: Number, x: Number, y: Number,
  size: Number, timestamp: String, isPlaced: Boolean,
}, { _id: false });

const mapLayoutSchema = new mongoose.Schema({
  name: { type: String, required: true },
  elements: [shapeSchema],
  paths: [[pointSchema]],
  widgets: [widgetSchema],
  placedProducts: [placedProductSchema],
  productMarkers: [productMarkerSchema],
  canvasWidth: { type: Number, default: 3000 },
  canvasHeight: { type: Number, default: 3000 },
  isKioskMap: { type: Boolean, default: false },
  branch: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});
const MapLayout = mongoose.model('Map', mapLayoutSchema);

// ========= Routes =========

// --- Login (Authenticates existing users only)
app.post('/login', async (req, res) => {
  const { username, password, role, branchName, deviceInfo } = req.body;
  
  // Validate all required fields
  if (!username || !password || !role) {
    return res.status(400).json({ message: 'All fields required' });
  }

  // Check if role is valid
    if (!['staff', 'manager', 'admin', 'cashier'].includes(role)) {
      return res.status(400).json({ message: 'Role must be staff, manager, admin, or cashier' });
    }
    try {
    // Check if user exists in database - exact match only
    const user = await User.findOne({ username: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    
    // CRITICAL: User must exist - DO NOT create users during login
    if (!user) {
      console.warn(`Login attempt with non-existent user: ${username}`);
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    // Check if user account is active
    if (user.isActive === false) {
      console.warn(`Login attempt with inactive user: ${username}`);
      return res.status(401).json({ message: 'Account is inactive. Please contact administrator.' });
    }
    
    // Verify password matches - must match exactly
    if (user.password !== password) {
      console.warn(`Login attempt with incorrect password for user: ${username}`);
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    // Verify role matches - must match exactly
    if (user.role.toLowerCase() !== role.toLowerCase()) {
      return res.status(403).json({ message: `Access denied. Your account is configured as ${user.role}, not ${role}` });
    }

    // Verify Branch Assignment (if applicable)
    // If user has an assigned branch, they MUST log in to that branch (unless they are admin?)
    // Let's assume Admin can log into ANY branch, but Staff/Manager must match their assignment if it exists.
    if (user.role !== 'admin' && user.assignedBranch && branchName) {
       if (user.assignedBranch !== branchName) {
         return res.status(403).json({ 
           message: `Access denied. You are assigned to "${user.assignedBranch}", but you are trying to log in to "${branchName}".` 
         });
       }
    }
    
    // All validations passed - update user login stats
    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    user.isActive = true;
    if (deviceInfo) {
      user.deviceInfo = deviceInfo;
      user.lastDevice = deviceInfo;
    }
    await user.save();
    
    console.log(`Successful login: ${username} (${user.role})`);
    
    res.json({ 
      success: true, 
      username: user.username, 
      role: user.role, 
      name: user.name,
      profileImage: user.profileImage,
      lastLogin: user.lastLogin,
      loginCount: user.loginCount,
      deviceInfo: user.deviceInfo
    });
  } catch (err) { 
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during authentication' }); 
  }
});

// --- Users (Registration - separate from login)
app.post('/users', upload.single('profileImage'), async (req, res) => {
  const { name, username, password, role = 'staff', assignedBranch } = req.body;
  
  // Validate all required fields
  if (!name || !username || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  
  // Validate password length
  if (password.length < 3) {
    return res.status(400).json({ message: 'Password must be at least 3 characters long' });
  }
  
  // Validate role
  if (!['staff', 'manager', 'admin', 'cashier'].includes(role)) {
    return res.status(400).json({ message: 'Role must be staff, manager, admin, or cashier' });
  }
  
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ username: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    if (existingUser) {
      return res.status(409).json({ message: 'User with this username already exists' });
    }
    
    const userData = {
      name,
      username,
      password,
      role,
      assignedBranch
    };
    
    if (req.file) {
      userData.profileImage = `/uploads/${req.file.filename}`;
    }
    
    const user = await User.create(userData);
    try {
      const { actorRole, actorName } = req.query || {};
      await UserHistory.create({
        targetUserId: user._id,
        targetUserName: user.username,
        action: 'User Created',
        actorRole: actorRole || null,
        actorName: actorName || null,
        details: `User ${user.username} created`
      });
    } catch (historyErr) {
      console.error('User history logging error (create):', historyErr);
    }
    console.log(`New user created: ${username} (${role})`);
    res.status(201).json({ 
      _id: user._id, 
      name: user.name, 
      username: user.username, 
      role: user.role,
      assignedBranch: user.assignedBranch,
      profileImage: user.profileImage
    });
  } catch (err) { 
    console.error('User creation error:', err);
    res.status(500).json({ message: err.message || 'Failed to create user' }); 
  }
});

app.get('/users', async (_req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (err) {
    console.error('Users fetch error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.put('/users/:id', upload.single('profileImage'), async (req, res) => {
  try {
    const updateData = { ...req.body };
    const { actorRole, actorName } = req.query || {};
    
    if (updateData.assignedBranch === '') {
      updateData.assignedBranch = null;
    }

    if (req.file) {
      // Delete old profile image if exists
      const user = await User.findById(req.params.id);
      if (user && user.profileImage) {
        const oldImagePath = path.join(__dirname, user.profileImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      updateData.profileImage = `/uploads/${req.file.filename}`;
    }
    
    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
    try {
      await UserHistory.create({
        targetUserId: user._id,
        targetUserName: user.username,
        action: 'User Edited',
        actorRole: actorRole || null,
        actorName: actorName || null,
        details: `User ${user.username} updated`
      });
    } catch (historyErr) {
      console.error('User history logging error (edit):', historyErr);
    }
    res.json(user);
  } catch (err) {
    console.error('User update error:', err);
    res.status(500).json({ message: err.message });
  }
});

// --- Bulk Delete Users (Fixed) - MUST come before /users/:id route
app.delete('/users/bulk', async (req, res) => {
  try {
    const { userIds } = req.body;
    const { actorRole, actorName } = req.query || {};
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'User IDs array is required' });
    }
    
    const users = await User.find({ _id: { $in: userIds } });
    
    // Delete profile images
    for (const user of users) {
      if (user.profileImage) {
        const imagePath = path.join(__dirname, user.profileImage);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
    }
    
    const result = await User.deleteMany({ _id: { $in: userIds } });

    try {
      for (const u of users) {
        await UserHistory.create({
          targetUserId: u._id,
          targetUserName: u.username,
          action: 'User Deleted',
          actorRole: actorRole || null,
          actorName: actorName || null,
          details: `User ${u.username} deleted (bulk)`
        });
      }
    } catch (historyErr) {
      console.error('User history logging error (bulk delete):', historyErr);
    }

    res.json({ 
      message: `${result.deletedCount} users deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error('Bulk delete error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const { actorRole, actorName } = req.query || {};
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Delete profile image if exists
    if (user.profileImage) {
      const imagePath = path.join(__dirname, user.profileImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await User.findByIdAndDelete(req.params.id);

    try {
      await UserHistory.create({
        targetUserId: user._id,
        targetUserName: user.username,
        action: 'User Deleted',
        actorRole: actorRole || null,
        actorName: actorName || null,
        details: `User ${user.username} deleted`
      });
    } catch (historyErr) {
      console.error('User history logging error (delete):', historyErr);
    }

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('User delete error:', err);
    res.status(500).json({ message: err.message });
  }
});

// --- Products
app.get('/products', async (req, res) => {
  try {
    const { branch } = req.query;
    const filter = { deletedAt: null, isActive: { $ne: false } };

    if (branch) {
      filter.branch = branch;
    }

    const products = await Product.find(filter);
    res.json(products);
  } catch (err) {
    console.error('Products fetch error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.get('/products/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const { branch } = req.query;
    const filter = {
      deletedAt: null, isActive: { $ne: false }, stockQty: { $gt: 0 },
      $or: [
        { name: new RegExp(query, 'i') }, { details: new RegExp(query, 'i') },
        { brand: new RegExp(query, 'i') }, { category: new RegExp(query, 'i') },
        { sku: new RegExp(query, 'i') }, { supplier: new RegExp(query, 'i') }
      ]
    };

    if (branch) {
      filter.branch = branch;
    }

    const products = await Product.find(filter);
    res.json(products);
  } catch (err) {
    console.error('Product search error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.post('/products', upload.single('image'), async (req, res) => {
  try {
    delete req.body._id;
    const parseJson = f => { 
      try { 
        return typeof f === 'string' ? JSON.parse(f) : f 
      } catch { 
        return f 
      } 
    };
    
    let totalStock = parseInt(req.body.stockQty) || 0;
    const hasVariants = req.body.hasVariants === 'true' || req.body.hasVariants === true;
    
    if (hasVariants) {
      const { sizeColorQuantities = [], colorQuantities = [], sizeQuantities = [], brandUnitQuantities = [], brandQuantities = [], unitQuantities = [] } = req.body;
      const sumList = (x) => parseJson(x || []).reduce((s,i)=> s + (parseInt(i?.quantity)||0), 0);
      const totalFromVariants =
        sumList(sizeColorQuantities) +
        sumList(colorQuantities) +
        sumList(sizeQuantities) +
        sumList(brandUnitQuantities) +
        sumList(brandQuantities) +
        sumList(unitQuantities);
      totalStock = totalFromVariants > 0 ? totalFromVariants : totalStock;
    }
    
    const productData = {
      ...req.body,
      stockQty: hasVariants ? totalStock : (parseInt(req.body.stockQty) || 0),
      price: parseFloat(req.body.price) || 0,
      image: req.file ? `/uploads/${req.file.filename}` : '',
      hasVariants, 
      totalStock, 
      availableStock: totalStock,
      branch: req.body.branch || null, // Save branch
    };
    
    // Parse arrays properly
    if (req.body.sizeOptions) {
      productData.sizeOptions = Array.isArray(req.body.sizeOptions) ? req.body.sizeOptions : 
        (typeof req.body.sizeOptions === 'string' ? req.body.sizeOptions.split(',').map(s => s.trim()) : []);
    }
    if (req.body.colorOptions) {
      productData.colorOptions = Array.isArray(req.body.colorOptions) ? req.body.colorOptions : 
        (typeof req.body.colorOptions === 'string' ? req.body.colorOptions.split(',').map(s => s.trim()) : []);
    }
    if (req.body.brandOptions) {
      productData.brandOptions = Array.isArray(req.body.brandOptions) ? req.body.brandOptions : 
        (typeof req.body.brandOptions === 'string' ? req.body.brandOptions.split(',').map(s => s.trim()) : []);
    }
    if (req.body.unitOptions) {
      productData.unitOptions = Array.isArray(req.body.unitOptions) ? req.body.unitOptions : 
        (typeof req.body.unitOptions === 'string' ? req.body.unitOptions.split(',').map(s => s.trim()) : []);
    }
    if (req.body.sizeColorQuantities) {
      productData.sizeColorQuantities = parseJson(req.body.sizeColorQuantities);
    }
    if (req.body.colorQuantities) {
      productData.colorQuantities = parseJson(req.body.colorQuantities);
    }
    if (req.body.sizeQuantities) {
      productData.sizeQuantities = parseJson(req.body.sizeQuantities);
    }
    if (req.body.brandUnitQuantities) {
      productData.brandUnitQuantities = parseJson(req.body.brandUnitQuantities);
    }
    if (req.body.brandQuantities) {
      productData.brandQuantities = parseJson(req.body.brandQuantities);
    }
    if (req.body.unitQuantities) {
      productData.unitQuantities = parseJson(req.body.unitQuantities);
    }
    if (req.body.location) {
      productData.location = parseJson(req.body.location);
    }
    
    const product = await Product.create(productData);

    // History: Product Added
    try {
      const { actorRole, actorName, source } = req.query || {};
      const getStock = (p) => {
        if (!p) return 0;
        if (typeof p.totalStock === 'number' && !Number.isNaN(p.totalStock)) return p.totalStock;
        if (typeof p.stockQty === 'number' && !Number.isNaN(p.stockQty)) return p.stockQty;
        return 0;
      };
      const getPrice = (p) => {
        if (!p) return 0;
        if (typeof p.price === 'number' && !Number.isNaN(p.price)) return p.price;
        return 0;
      };
      const newStock = getStock(product);
      const newPrice = getPrice(product);
      await StockHistory.create({
        productId: product._id,
        productName: product.name,
        branch: product.branch || null,
        type: 'Product Added',
        quantity: newStock,
        previousStock: 0,
        newStock,
        previousSellingPrice: 0,
        sellingPrice: newPrice,
        note: actorName ? `Added by ${actorName}` : 'Product created',
        source: source || 'admin',
        actorRole: actorRole || null,
        actorName: actorName || null,
      });
    } catch (historyErr) {
      console.error('Stock history logging error (create):', historyErr);
    }

    res.status(201).json(product);
  } catch (err) { 
    console.error('Product creation error:', err);
    res.status(500).json({ message: err.message }); 
  }
});

app.put('/products/:id', upload.single('image'), async (req, res) => {
  try {
    const existing = await Product.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const parseJson = f => { 
      try { 
        return typeof f === 'string' ? JSON.parse(f) : f 
      } catch { 
        return f 
      } 
    };
    
    let totalStock = parseInt(req.body.stockQty) || 0;
    const hasVariants = req.body.hasVariants === 'true' || req.body.hasVariants === true;
    
    if (hasVariants) {
      const { sizeColorQuantities = [], colorQuantities = [], sizeQuantities = [], brandUnitQuantities = [], brandQuantities = [], unitQuantities = [] } = req.body;
      const sumList = (x) => parseJson(x || []).reduce((s,i)=> s + (parseInt(i?.quantity)||0), 0);
      const totalFromVariants =
        sumList(sizeColorQuantities) +
        sumList(colorQuantities) +
        sumList(sizeQuantities) +
        sumList(brandUnitQuantities) +
        sumList(brandQuantities) +
        sumList(unitQuantities);
      totalStock = totalFromVariants > 0 ? totalFromVariants : totalStock;
    }
    
    const update = { 
      ...req.body, 
      stockQty: hasVariants ? totalStock : (parseInt(req.body.stockQty)||0), 
      price: parseFloat(req.body.price)||0, 
      hasVariants, 
      totalStock, 
      availableStock: totalStock, 
      updatedAt: new Date() 
    };
    
    if (req.file) update.image = `/uploads/${req.file.filename}`;
    
    // Parse arrays properly
    if (req.body.sizeOptions) {
      update.sizeOptions = Array.isArray(req.body.sizeOptions) ? req.body.sizeOptions : 
        (typeof req.body.sizeOptions === 'string' ? req.body.sizeOptions.split(',').map(s => s.trim()) : []);
    }
    if (req.body.colorOptions) {
      update.colorOptions = Array.isArray(req.body.colorOptions) ? req.body.colorOptions : 
        (typeof req.body.colorOptions === 'string' ? req.body.colorOptions.split(',').map(s => s.trim()) : []);
    }
    if (req.body.brandOptions) {
      update.brandOptions = Array.isArray(req.body.brandOptions) ? req.body.brandOptions : 
        (typeof req.body.brandOptions === 'string' ? req.body.brandOptions.split(',').map(s => s.trim()) : []);
    }
    if (req.body.unitOptions) {
      update.unitOptions = Array.isArray(req.body.unitOptions) ? req.body.unitOptions : 
        (typeof req.body.unitOptions === 'string' ? req.body.unitOptions.split(',').map(s => s.trim()) : []);
    }
    if (req.body.sizeColorQuantities) {
      update.sizeColorQuantities = parseJson(req.body.sizeColorQuantities);
    }
    if (req.body.colorQuantities) {
      update.colorQuantities = parseJson(req.body.colorQuantities);
    }
    if (req.body.sizeQuantities) {
      update.sizeQuantities = parseJson(req.body.sizeQuantities);
    }
    if (req.body.brandUnitQuantities) {
      update.brandUnitQuantities = parseJson(req.body.brandUnitQuantities);
    }
    if (req.body.brandQuantities) {
      update.brandQuantities = parseJson(req.body.brandQuantities);
    }
    if (req.body.unitQuantities) {
      update.unitQuantities = parseJson(req.body.unitQuantities);
    }
    if (req.body.location) {
      update.location = parseJson(req.body.location);
    }
    
    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true });

    try {
      const { source, actorRole, actorName } = req.query;
      const isCashier = source === 'cashier';

      const getStock = (p) => {
        if (!p) return 0;
        if (typeof p.totalStock === 'number' && !Number.isNaN(p.totalStock)) return p.totalStock;
        if (typeof p.stockQty === 'number' && !Number.isNaN(p.stockQty)) return p.stockQty;
        return 0;
      };

      const getPrice = (p) => {
        if (!p) return 0;
        if (typeof p.price === 'number' && !Number.isNaN(p.price)) return p.price;
        return 0;
      };

      const prevStock = getStock(existing);
      const newStock = getStock(product);
      const prevPrice = getPrice(existing);
      const newPrice = getPrice(product);

      if (isCashier && (prevStock !== newStock || prevPrice !== newPrice)) {
        const diff = newStock - prevStock;
        const quantity = Math.abs(diff);
        const type = diff < 0 ? 'Sale (Cashier)' : 'Stock Change (Cashier)';

        await StockHistory.create({
          productId: product._id,
          productName: product.name,
          branch: product.branch || null,
          type,
          quantity,
          previousStock: prevStock,
          newStock,
          previousSellingPrice: prevPrice,
          sellingPrice: newPrice,
          note: actorName ? `Cashier: ${actorName}` : 'Cashier checkout',
          source: source || 'cashier',
          actorRole: actorRole || null,
          actorName: actorName || null,
        });
      } else {
        // Admin/Manager edits
        const changedStock = prevStock !== newStock;
        const changedPrice = prevPrice !== newPrice;
        const anyChange = changedStock || changedPrice;
        if (anyChange) {
          const diff = newStock - prevStock;
          const quantity = Math.abs(diff);
          const type = changedStock
            ? (diff > 0 ? 'Stock Increase (Admin)' : 'Stock Decrease (Admin)')
            : 'Price Update (Admin)';
          await StockHistory.create({
            productId: product._id,
            productName: product.name,
            branch: product.branch || null,
            type,
            quantity,
            previousStock: prevStock,
            newStock,
            previousSellingPrice: prevPrice,
            sellingPrice: newPrice,
            note: actorName ? `Updated by ${actorName}` : 'Product updated',
            source: source || 'admin',
            actorRole: actorRole || null,
            actorName: actorName || null,
          });
        } else {
          // Log non-stock/price edits as informational
          await StockHistory.create({
            productId: product._id,
            productName: product.name,
            branch: product.branch || null,
            type: 'Product Edited',
            quantity: 0,
            previousStock: prevStock,
            newStock: newStock,
            previousSellingPrice: prevPrice,
            sellingPrice: newPrice,
            note: actorName ? `Edited by ${actorName}` : 'Details edited',
            source: source || 'admin',
            actorRole: actorRole || null,
            actorName: actorName || null,
          });
        }
      }
    } catch (historyErr) {
      console.error('Stock history logging error:', historyErr);
    }

    res.json(product);
  } catch (err) { 
    console.error('Product update error:', err);
    res.status(500).json({ message: err.message }); 
  }
});

app.delete('/products/:id', async (req, res) => {
  try {
    if (req.query.permanent === 'true') {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ message: 'Not found' });

      // Two-step confirmation (optional): requireConfirm=true then confirm=true
      if (req.query.requireConfirm === 'true' && req.query.confirm !== 'true') {
        return res.status(409).json({
          confirmRequired: true,
          action: 'permanent_delete_product',
          id: product._id,
          name: product.name,
          message: 'Re-send with ?permanent=true&confirm=true to permanently delete, or cancel to abort.'
        });
      }

      if (product.image) {
        const filePath = path.join(__dirname, product.image);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      await Product.findByIdAndDelete(req.params.id);
      try {
        const { actorRole, actorName, source } = req.query || {};
        const prevStock = typeof product.totalStock === 'number' ? product.totalStock : (typeof product.stockQty === 'number' ? product.stockQty : 0);
        const prevPrice = typeof product.price === 'number' ? product.price : 0;
        await StockHistory.create({
          productId: product._id,
          productName: product.name,
          branch: product.branch || null,
          type: 'Product Permanently Deleted',
          quantity: prevStock,
          previousStock: prevStock,
          newStock: 0,
          previousSellingPrice: prevPrice,
          sellingPrice: 0,
          note: actorName ? `Deleted by ${actorName}` : 'Permanent delete',
          source: source || 'admin',
          actorRole: actorRole || null,
          actorName: actorName || null,
        });
      } catch (historyErr) {
        console.error('Stock history logging error (permanent delete):', historyErr);
      }
      return res.json({ message: 'Product permanently deleted' });
    }
    const product = await Product.findByIdAndUpdate(req.params.id, { deletedAt: new Date() }, { new: true });
    try {
      const { actorRole, actorName, source } = req.query || {};
      const prevStock = typeof product.totalStock === 'number' ? product.totalStock : (typeof product.stockQty === 'number' ? product.stockQty : 0);
      const prevPrice = typeof product.price === 'number' ? product.price : 0;
      await StockHistory.create({
        productId: product._id,
        productName: product.name,
        branch: product.branch || null,
        type: 'Product Deleted',
        quantity: prevStock,
        previousStock: prevStock,
        newStock: 0,
        previousSellingPrice: prevPrice,
        sellingPrice: prevPrice,
        note: actorName ? `Deleted by ${actorName}` : 'Soft delete',
        source: source || 'admin',
        actorRole: actorRole || null,
        actorName: actorName || null,
      });
    } catch (historyErr) {
      console.error('Stock history logging error (soft delete):', historyErr);
    }
    res.json({ message: 'Product soft-deleted' });
  } catch (err) { 
    console.error('Product delete error:', err);
    res.status(500).json({ message: err.message }); 
  }
});

app.patch('/products/:id/undo', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { deletedAt: null }, { new: true });
    try {
      const { actorRole, actorName, source } = req.query || {};
      const restoredStock = typeof product.totalStock === 'number' ? product.totalStock : (typeof product.stockQty === 'number' ? product.stockQty : 0);
      const restoredPrice = typeof product.price === 'number' ? product.price : 0;
      await StockHistory.create({
        productId: product._id,
        productName: product.name,
        branch: product.branch || null,
        type: 'Product Restored',
        quantity: restoredStock,
        previousStock: 0,
        newStock: restoredStock,
        previousSellingPrice: 0,
        sellingPrice: restoredPrice,
        note: actorName ? `Restored by ${actorName}` : 'Product restored',
        source: source || 'admin',
        actorRole: actorRole || null,
        actorName: actorName || null,
      });
    } catch (historyErr) {
      console.error('Stock history logging error (restore):', historyErr);
    }
    res.json(product);
  } catch (err) {
    console.error('Product undo error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.get('/deleted-products', async (_req, res) => {
  try {
    const products = await Product.find({ deletedAt: { $ne: null } });
    res.json(products);
  } catch (err) {
    console.error('Deleted products fetch error:', err);
    res.status(500).json({ message: err.message });
  }
});

// --- Categories
app.get('/categories', async (_req, res) => {
  try {
    const categories = await Category.find({ deletedAt: null }).sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    console.error('Categories fetch error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.get('/categories/deleted', async (_req, res) => {
  try {
    const categories = await Category.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 });
    res.json(categories);
  } catch (err) {
    console.error('Deleted categories fetch error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Create OR Restore Category by name (supports Category.jsx restore flow)
app.post('/categories', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const softDeleted = await Category.findOne({ name, deletedAt: { $ne: null } });
    if (softDeleted) {
      const restored = await Category.findByIdAndUpdate(
        softDeleted._id,
        { deletedAt: null, ...(description !== undefined ? { description } : {}) },
        { new: true }
      );
      return res.json(restored);
    }

    const existing = await Category.findOne({ name, deletedAt: null });
    if (existing) return res.status(409).json({ message: 'Category already exists' });

    const created = await Category.create({ name, description });
    res.status(201).json(created);
  } catch (err) {
    console.error('Category creation error:', err);
    if (err?.code === 11000) return res.status(409).json({ message: 'Category already exists' });
    res.status(500).json({ message: err.message });
  }
});

app.put('/categories/:id', async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(category);
  } catch (err) {
    console.error('Category update error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.delete('/categories/:id', async (req, res) => {
  try {
    if (req.query.permanent === 'true') {
      const category = await Category.findById(req.params.id);
      if (!category) return res.status(404).json({ message: 'Not found' });

      if (req.query.requireConfirm === 'true' && req.query.confirm !== 'true') {
        return res.status(409).json({
          confirmRequired: true,
          action: 'permanent_delete_category',
          id: category._id,
          name: category.name,
          message: 'Re-send with ?permanent=true&confirm=true to permanently delete, or cancel to abort.'
        });
      }

      await Category.findByIdAndDelete(req.params.id);
      return res.json({ message: 'Category permanently deleted' });
    }
    const category = await Category.findByIdAndUpdate(req.params.id, { deletedAt: new Date() }, { new: true });
    res.json(category);
  } catch (err) {
    console.error('Category delete error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.patch('/categories/:id/undo', async (req, res) => {
  try {
    const restored = await Category.findByIdAndUpdate(req.params.id, { deletedAt: null }, { new: true });
    if (!restored) return res.status(404).json({ message: 'Not found' });
    res.json(restored);
  } catch (err) {
    console.error('Category undo error:', err);
    res.status(500).json({ message: err.message });
  }
});

// --- Units
app.get('/units', async (_req, res) => {
  try {
    const units = await Unit.find({ deletedAt: null }).sort({ name: 1 });
    res.json(units);
  } catch (err) {
    console.error('Units fetch error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.get('/units/deleted', async (_req, res) => {
  try {
    const units = await Unit.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 });
    res.json(units);
  } catch (err) {
    console.error('Deleted units fetch error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.post('/units', async (req, res) => {
  try {
    const { name, description } = req.body || {};
    if (!name) return res.status(400).json({ message: 'Name is required' });

    // Restore by name if soft-deleted
    const softDeleted = await Unit.findOne({ name, deletedAt: { $ne: null } });
    if (softDeleted) {
      const restored = await Unit.findByIdAndUpdate(softDeleted._id, { deletedAt: null, ...(description !== undefined ? { description } : {}) }, { new: true });
      return res.json(restored);
    }

    // Prevent duplicate active names
    const existing = await Unit.findOne({ name, deletedAt: null });
    if (existing) return res.status(409).json({ message: 'Unit already exists' });

    const created = await Unit.create({ name, description });
    res.json(created);
  } catch (err) {
    console.error('Unit creation error:', err);
    if (err?.code === 11000) return res.status(409).json({ message: 'Unit already exists' });
    res.status(500).json({ message: err.message });
  }
});

app.put('/units/:id', async (req, res) => {
  try {
    const unit = await Unit.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(unit);
  } catch (err) {
    console.error('Unit update error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.delete('/units/:id', async (req, res) => {
  try {
    if (req.query.permanent === 'true') {
      const unit = await Unit.findById(req.params.id);
      if (!unit) return res.status(404).json({ message: 'Not found' });

      if (req.query.requireConfirm === 'true' && req.query.confirm !== 'true') {
        return res.status(409).json({
          confirmRequired: true,
          action: 'permanent_delete_unit',
          id: unit._id,
          name: unit.name,
          message: 'Re-send with ?permanent=true&confirm=true to permanently delete, or cancel to abort.'
        });
      }

      await Unit.findByIdAndDelete(req.params.id);
      return res.json({ message: 'Unit permanently deleted' });
    }
    const unit = await Unit.findByIdAndUpdate(req.params.id, { deletedAt: new Date() }, { new: true });
    res.json(unit);
  } catch (err) {
    console.error('Unit delete error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.patch('/units/:id/undo', async (req, res) => {
  try {
    const restored = await Unit.findByIdAndUpdate(req.params.id, { deletedAt: null }, { new: true });
    if (!restored) return res.status(404).json({ message: 'Not found' });
    res.json(restored);
  } catch (err) {
    console.error('Unit undo error:', err);
    res.status(500).json({ message: err.message });
  }
});

// --- Brands
app.get('/brands', async (_req, res) => {
  try {
    const brands = await Brand.find({ deletedAt: null }).sort({ name: 1 });
    res.json(brands);
  } catch (err) {
    console.error('Brands fetch error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.get('/brands/deleted', async (_req, res) => {
  try {
    const brands = await Brand.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 });
    res.json(brands);
  } catch (err) {
    console.error('Deleted brands fetch error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.post('/brands', async (req, res) => {
  try {
    const { name, description } = req.body || {};
    if (!name) return res.status(400).json({ message: 'Name is required' });

    // Restore by name if soft-deleted
    const softDeleted = await Brand.findOne({ name, deletedAt: { $ne: null } });
    if (softDeleted) {
      const restored = await Brand.findByIdAndUpdate(softDeleted._id, { deletedAt: null, ...(description !== undefined ? { description } : {}) }, { new: true });
      return res.json(restored);
    }

    // Prevent duplicate active names
    const existing = await Brand.findOne({ name, deletedAt: null });
    if (existing) return res.status(409).json({ message: 'Brand already exists' });

    const created = await Brand.create({ name, description });
    res.json(created);
  } catch (err) {
    console.error('Brand creation error:', err);
    if (err?.code === 11000) return res.status(409).json({ message: 'Brand already exists' });
    res.status(500).json({ message: err.message });
  }
});

app.put('/brands/:id', async (req, res) => {
  try {
    const brand = await Brand.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(brand);
  } catch (err) {
    console.error('Brand update error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.delete('/brands/:id', async (req, res) => {
  try {
    if (req.query.permanent === 'true') {
      const brand = await Brand.findById(req.params.id);
      if (!brand) return res.status(404).json({ message: 'Not found' });

      if (req.query.requireConfirm === 'true' && req.query.confirm !== 'true') {
        return res.status(409).json({
          confirmRequired: true,
          action: 'permanent_delete_brand',
          id: brand._id,
          name: brand.name,
          message: 'Re-send with ?permanent=true&confirm=true to permanently delete, or cancel to abort.'
        });
      }

      await Brand.findByIdAndDelete(req.params.id);
      return res.json({ message: 'Brand permanently deleted' });
    }
    const brand = await Brand.findByIdAndUpdate(req.params.id, { deletedAt: new Date() }, { new: true });
    res.json(brand);
  } catch (err) {
    console.error('Brand delete error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.patch('/brands/:id/undo', async (req, res) => {
  try {
    const restored = await Brand.findByIdAndUpdate(req.params.id, { deletedAt: null }, { new: true });
    if (!restored) return res.status(404).json({ message: 'Not found' });
    res.json(restored);
  } catch (err) {
    console.error('Brand undo error:', err);
    res.status(500).json({ message: err.message });
  }
});

// --- Attribute Types
app.get('/attribute-types', async (_req, res) => {
  try {
    const list = await AttributeType.find({ deletedAt: null }).sort({ name: 1 });
    res.json(list);
  } catch (err) {
    console.error('Attribute types fetch error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.post('/attribute-types', async (req, res) => {
  try {
    const { name, description } = req.body || {};
    if (!name) return res.status(400).json({ message: 'Name is required' });

    // Restore by name if soft-deleted
    const softDeleted = await AttributeType.findOne({ name, deletedAt: { $ne: null } });
    if (softDeleted) {
      const restored = await AttributeType.findByIdAndUpdate(softDeleted._id, { deletedAt: null, ...(description !== undefined ? { description } : {}) }, { new: true });
      return res.json(restored);
    }

    // Prevent duplicate active names
    const existing = await AttributeType.findOne({ name, deletedAt: null });
    if (existing) return res.status(409).json({ message: 'Attribute type already exists' });

    const created = await AttributeType.create({ name, description });
    res.json(created);
  } catch (err) {
    console.error('Attribute type creation error:', err);
    if (err?.code === 11000) return res.status(409).json({ message: 'Attribute type already exists' });
    res.status(500).json({ message: err.message });
  }
});

app.delete('/attribute-types/:id', async (req, res) => {
  try {
    if (req.query.permanent === 'true') {
      await AttributeType.findByIdAndDelete(req.params.id);
      return res.json({ message: 'Permanently deleted' });
    }
    const updated = await AttributeType.findByIdAndUpdate(req.params.id, { deletedAt: new Date() }, { new: true });
    res.json(updated);
  } catch (err) {
    console.error('Attribute type delete error:', err);
    res.status(500).json({ message: err.message });
  }
});

// --- Branches
app.get('/branches', async (_req, res) => {
  try {
    const branches = await Branch.find({ deletedAt: null }).sort({ name: 1 });
    res.json(branches);
  } catch (err) {
    console.error('Branches fetch error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.get('/branches/deleted', async (_req, res) => {
  try {
    const branches = await Branch.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 });
    res.json(branches);
  } catch (err) {
    console.error('Deleted branches fetch error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.post('/branches', async (req, res) => {
  try {
    const { name, address, mapId } = req.body || {};
    if (!name) return res.status(400).json({ message: 'Name is required' });

    // Restore by name if soft-deleted
    const softDeleted = await Branch.findOne({ name, deletedAt: { $ne: null } });
    if (softDeleted) {
      const updateData = { deletedAt: null };
      if (address !== undefined) updateData.address = address;
      if (mapId !== undefined) updateData.mapId = mapId;
      
      const restored = await Branch.findByIdAndUpdate(softDeleted._id, updateData, { new: true });
      return res.json(restored);
    }

    // Prevent duplicate active names
    const existing = await Branch.findOne({ name, deletedAt: null });
    if (existing) return res.status(409).json({ message: 'Branch already exists' });

    const created = await Branch.create({ name, address, mapId });
    res.json(created);
  } catch (err) {
    console.error('Branch creation error:', err);
    if (err?.code === 11000) return res.status(409).json({ message: 'Branch already exists' });
    res.status(500).json({ message: err.message });
  }
});

app.put('/branches/:id', async (req, res) => {
  try {
    const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(branch);
  } catch (err) {
    console.error('Branch update error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.delete('/branches/:id', async (req, res) => {
  try {
    if (req.query.permanent === 'true') {
      const branch = await Branch.findById(req.params.id);
      if (!branch) return res.status(404).json({ message: 'Not found' });

      if (req.query.requireConfirm === 'true' && req.query.confirm !== 'true') {
        return res.status(409).json({
          confirmRequired: true,
          action: 'permanent_delete_branch',
          id: branch._id,
          name: branch.name,
          message: 'Re-send with ?permanent=true&confirm=true to permanently delete, or cancel to abort.'
        });
      }

      await Branch.findByIdAndDelete(req.params.id);
      return res.json({ message: 'Branch permanently deleted' });
    }
    const branch = await Branch.findByIdAndUpdate(req.params.id, { deletedAt: new Date() }, { new: true });
    res.json(branch);
  } catch (err) {
    console.error('Branch delete error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.patch('/branches/:id/undo', async (req, res) => {
  try {
    const restored = await Branch.findByIdAndUpdate(req.params.id, { deletedAt: null }, { new: true });
    if (!restored) return res.status(404).json({ message: 'Not found' });
    res.json(restored);
  } catch (err) {
    console.error('Branch undo error:', err);
    res.status(500).json({ message: err.message });
  }
});

// --- Maps
app.post('/maps', async (req, res) => {
  try {
    const {
      name,
      elements,
      paths = [],
      widgets = [],
      placedProducts = [],
      productMarkers = [],
      isKioskMap = false,
      canvasWidth = 3000,
      canvasHeight = 3000,
      branch
    } = req.body;

    if (!name || !Array.isArray(elements)) {
      return res.status(400).json({ message: 'Map name & elements required' });
    }

    const update = {
      name,
      elements,
      paths,
      widgets,
      placedProducts,
      productMarkers,
      canvasWidth,
      canvasHeight,
      isKioskMap,
      branch,
    };

    const map = await MapLayout.findOneAndUpdate(
      { name },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    try {
      const { actorRole, actorName } = req.query || {};
      const actionType = update.$setOnInsert ? 'Map Created' : 'Map Edited';
      await MapHistory.create({
        mapId: map._id,
        mapName: map.name,
        action: actionType,
        branch: map.branch || null,
        actorRole: actorRole || null,
        actorName: actorName || null,
        details: actionType === 'Map Created' ? 'Map created' : 'Map edited'
      });
    } catch (historyErr) {
      console.error('Map history logging error:', historyErr);
    }

    res.status(201).json(map);
  } catch (err) {
    console.error('Map creation error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.get('/maps', async (req, res) => {
  try {
    console.log('GET /maps request received');
    const { branch } = req.query;
    const filter = {};
    if (branch) {
      filter.branch = branch;
    }
    console.log('Fetching maps with filter:', filter);
    const maps = await MapLayout.find(filter).sort({ createdAt: -1 });
    console.log(`Found ${maps.length} maps`);
    res.json(maps);
  } catch (err) {
    console.error('Maps fetch error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.get('/stock-history', async (req, res) => {
  try {
    const { branch, limit } = req.query;
    const filter = {};
    if (branch) {
      filter.branch = branch;
    }
    const lim = Math.min(parseInt(limit, 10) || 300, 1000);
    const items = await StockHistory.find(filter)
      .sort({ createdAt: -1 })
      .limit(lim);
    res.json(items);
  } catch (err) {
    console.error('Stock history fetch error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.get('/map-history', async (req, res) => {
  try {
    const history = await MapHistory.find().sort({ createdAt: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/user-history', async (req, res) => {
  try {
    const history = await UserHistory.find().sort({ createdAt: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/maps/kiosk', async (_req, res) => {
  try {
    const map = await MapLayout.findOne({ isKioskMap: true }).sort({ createdAt: -1 });
    if (!map) return res.status(404).json({ message: 'No kiosk map set' });
    res.json(map);
  } catch (err) {
    console.error('Kiosk map fetch error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.get('/maps/:id', async (req, res) => {
  try {
    const map = await MapLayout.findById(req.params.id);
    res.json(map);
  } catch (err) {
    console.error('Map fetch error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.put('/maps/:id', async (req, res) => {
  try {
    const map = await MapLayout.findByIdAndUpdate(req.params.id, req.body, { new: true });
    try {
      const { actorRole, actorName } = req.query || {};
      await MapHistory.create({
        mapId: map._id,
        mapName: map.name,
        action: 'Map Edited',
        branch: map.branch || null,
        actorRole: actorRole || null,
        actorName: actorName || null,
        details: 'Map layout updated'
      });
    } catch (historyErr) {
      console.error('Map history logging error (edit):', historyErr);
    }
    res.json(map);
  } catch (err) {
    console.error('Map update error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.delete('/maps/:id', async (req, res) => {
  try {
    const map = await MapLayout.findById(req.params.id);
    if (!map) return res.status(404).json({ message: 'Not found' });

    // Optional confirmation for map deletion as well
    if (req.query.requireConfirm === 'true' && req.query.confirm !== 'true') {
      return res.status(409).json({
        confirmRequired: true,
        action: 'delete_map',
        id: map._id,
        name: map.name,
        message: 'Re-send with ?confirm=true to delete the map, or cancel to abort.'
      });
    }

    await MapLayout.findByIdAndDelete(req.params.id);
    try {
      const { actorRole, actorName } = req.query || {};
      await MapHistory.create({
        mapId: map._id,
        mapName: map.name,
        action: 'Map Deleted',
        branch: map.branch || null,
        actorRole: actorRole || null,
        actorName: actorName || null,
        details: 'Map deleted'
      });
    } catch (historyErr) {
      console.error('Map history logging error (delete):', historyErr);
    }
    res.json({ message: 'Map deleted' });
  } catch (err) {
    console.error('Map delete error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.patch('/maps/:id/set-kiosk', async (req, res) => {
  try {
    await MapLayout.updateMany({ isKioskMap: true }, { isKioskMap: false });
    const map = await MapLayout.findByIdAndUpdate(req.params.id, { isKioskMap: true }, { new: true });
    res.json(map);
  } catch (err) {
    console.error('Set kiosk map error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ========= Initialize Default Data =========
const initializeDefaultData = async () => {
  try {
    // Initialize default categories
    const defaultCategories = [
      { name: 'Electronics', description: 'Electronic devices and accessories' },
      { name: 'Clothing', description: 'Apparel and fashion items' },
      { name: 'Books', description: 'Books and educational materials' },
      { name: 'Home & Garden', description: 'Home improvement and garden supplies' },
      { name: 'Sports', description: 'Sports equipment and accessories' },
      { name: 'Beauty', description: 'Beauty and personal care products' },
      { name: 'Toys', description: 'Toys and games' },
      { name: 'Food & Beverages', description: 'Food and drink items' }
    ];

    for (const category of defaultCategories) {
      await Category.findOneAndUpdate(
        { name: category.name },
        { $setOnInsert: category },
        { upsert: true, new: true }
      );
    }

    // Initialize default users (only if they don't exist)
    const defaultUsers = [
      { name: 'Admin User', username: 'admin', password: 'admin123', role: 'manager' },
      { name: 'Staff User', username: 'staff', password: 'staff123', role: 'staff' },
      { name: 'Manager User', username: 'manager', password: 'manager123', role: 'manager' }
    ];

    for (const user of defaultUsers) {
      // Check if user exists first to prevent overwriting
      const existingUser = await User.findOne({ username: user.username });
      if (!existingUser) {
        await User.create(user);
        console.log(`Created default user: ${user.username}`);
      }
    }

    

    

    console.log('✅ Default data initialized successfully');
  } catch (err) {
    console.error('❌ Error initializing default data:', err);
  }
};

// ========= Initialize Default Units =========
const initializeDefaultUnits = async () => {
  try {
    const existingUnits = await Unit.countDocuments();
    if (existingUnits === 0) {
      await Unit.insertMany([
        { name: 'pieces', description: 'Individual items' },
        { name: 'boxes', description: 'Boxed items' },
        { name: 'kg', description: 'Kilograms' },
        { name: 'grams', description: 'Grams' },
        { name: 'liters', description: 'Liters' },
        { name: 'meters', description: 'Meters' },
        { name: 'pairs', description: 'Pairs of items' },
        { name: 'sets', description: 'Sets of items' },
        { name: 'bottles', description: 'Bottled items' },
        { name: 'cans', description: 'Canned items' }
      ]);
      console.log('✅ Initialized default units');
    }
  } catch (err) {
    console.error('Default units initialization error:', err);
  }
};

// ========= Cleanup =========
const cleanupExpiredProducts = async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const expiredProducts = await Product.find({ deletedAt: { $lt: thirtyDaysAgo } });
    for (const product of expiredProducts) {
      if (product.image) {
        const filePath = path.join(__dirname, product.image);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      await Product.findByIdAndDelete(product._id);
    }
    if (expiredProducts.length) console.log(`🧹 Auto-deleted ${expiredProducts.length} expired products`);
  } catch (err) {
    console.error('Cleanup error:', err);
  }
};
setInterval(cleanupExpiredProducts, 15 * 60 * 1000);
cleanupExpiredProducts();

const cleanupExpiredUnits = async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await Unit.deleteMany({ deletedAt: { $lt: thirtyDaysAgo } });
  } catch (err) {
    console.error('Unit cleanup error:', err);
  }
};

const cleanupExpiredCategories = async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await Category.deleteMany({ deletedAt: { $lt: thirtyDaysAgo } });
  } catch (err) {
    console.error('Category cleanup error:', err);
  }
};

setInterval(cleanupExpiredUnits, 60 * 60 * 1000);
setInterval(cleanupExpiredCategories, 60 * 60 * 1000);
cleanupExpiredUnits();
cleanupExpiredCategories();

// ========= Migration =========
const migrateExistingMaps = async () => {
  try {
    const maps = await MapLayout.find({});
    for (const map of maps) {
      const update = {};
      if (map.productMarkers == null) update.productMarkers = [];
      if (!map.canvasWidth) update.canvasWidth = 3000;
      if (!map.canvasHeight) update.canvasHeight = 3000;

      const newPlaced = Array.isArray(map.placedProducts)
        ? map.placedProducts.map(p => ({ ...p.toObject?.() || p, size: p.size || 12 }))
        : [];
      const newMarkers = Array.isArray(map.productMarkers)
        ? map.productMarkers.map(m => ({ ...m.toObject?.() || m, size: m.size || 40 }))
        : [];

      if (Array.isArray(map.placedProducts)) update.placedProducts = newPlaced;
      if (Array.isArray(map.productMarkers)) update.productMarkers = newMarkers;

      if (Object.keys(update).length) {
        await MapLayout.findByIdAndUpdate(map._id, { $set: update });
      }
    }
  } catch (err) {
    console.error('Migration error:', err);
  }
};
migrateExistingMaps();

// ========= Start Server =========
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Access from other devices: http://[YOUR_IP]:${PORT}`);
  console.log('📱 Mobile-friendly interface enabled');
  
  // Initialize default data and units after server starts
  setTimeout(async () => {
    await initializeDefaultData();
    await initializeDefaultUnits();
  }, 2000);
});
