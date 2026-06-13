require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const authController = require('./controllers/authController');
const mainController = require('./controllers/mainController');
const authMiddleware = require('./middleware/auth');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage setup for invoice & trip uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only JPG, PNG, and PDF files are allowed'));
  }
});

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded files
app.use('/uploads', express.static(uploadsDir));

// --- API ROUTES ---

// 1. Authentication
app.post('/api/auth/signup', authController.signup);
app.post('/api/auth/login', authController.login);

// 2. Dashboard Stats
app.get('/api/dashboard/stats', authMiddleware, mainController.getDashboardStats);

// 3. Tracker (Income & Expenses) - Merged Logic in mainController
app.get('/api/tracker/income', authMiddleware, mainController.getIncome);
app.post('/api/tracker/income', authMiddleware, mainController.addIncome);
app.put('/api/tracker/income/:id', authMiddleware, mainController.updateIncome);
app.delete('/api/tracker/income/:id', authMiddleware, mainController.deleteIncome);

app.get('/api/tracker/expenses', authMiddleware, mainController.getExpenses);
app.post('/api/tracker/expenses', authMiddleware, mainController.addExpense);
app.put('/api/tracker/expenses/:id', authMiddleware, mainController.updateExpense);
app.delete('/api/tracker/expenses/:id', authMiddleware, mainController.deleteExpense);

// 4. Shopping Details & Invoices
app.get('/api/shopping', authMiddleware, mainController.getShopping);
app.post('/api/shopping', authMiddleware, upload.single('invoice'), mainController.addShopping);
app.delete('/api/shopping/:id', authMiddleware, mainController.deleteShopping);

// 5. Investments (Stocks & MFs)
app.get('/api/investments', authMiddleware, mainController.getInvestments);
app.post('/api/investments', authMiddleware, mainController.addInvestment);
app.put('/api/investments/:id/price', authMiddleware, mainController.updateInvestmentPrice);
app.delete('/api/investments/:id', authMiddleware, mainController.deleteInvestment);

// 6. Health (WeightLogs)
app.get('/api/health/weight', authMiddleware, mainController.getWeightLogs);
app.post('/api/health/weight', authMiddleware, mainController.addWeightLog);
app.delete('/api/health/weight/:id', authMiddleware, mainController.deleteWeightLog);

// 7. Trips
app.get('/api/trips', authMiddleware, mainController.getTrips);
app.post('/api/trips', authMiddleware, upload.array('documents', 5), mainController.addTrip);
app.put('/api/trips/:id', authMiddleware, upload.array('documents', 5), mainController.updateTrip);
app.delete('/api/trips/:id', authMiddleware, mainController.deleteTrip);

// Global Error Handler for Upload limits/types
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`TIMORA Backend running on port ${PORT}`);
});
