const { Pool } = require('pg');
const path = require('path');

// Explicitly load env configuration
require('./env');

let pool = null;
let useMock = false;

// Mock database storage
const mockDb = {
  users: [],
  income: [],
  expenses: [],
  shopping: [],
  invoices: [],
  investments: [],
  weightLogs: [],
  trips: []
};

// Auto incrementing IDs
let userSeq = 1;
let incomeSeq = 1;
let expensesSeq = 1;
let shoppingSeq = 1;
let invoicesSeq = 1;
let investmentsSeq = 1;
let weightLogsSeq = 1;
let tripsSeq = 1;

// Function to safely decode and URL-encode the password in connection string if it has special characters
function normalizeConnectionString(str) {
  if (!str) return str;
  if (!str.startsWith('postgresql://') && !str.startsWith('postgres://')) {
    return str;
  }
  const prefix = str.startsWith('postgresql://') ? 'postgresql://' : 'postgres://';
  const remaining = str.slice(prefix.length);
  const lastAtIndex = remaining.lastIndexOf('@');
  if (lastAtIndex === -1) return str;
  const credentials = remaining.slice(0, lastAtIndex);
  const hostAndDb = remaining.slice(lastAtIndex + 1);
  const colonIndex = credentials.indexOf(':');
  if (colonIndex === -1) return str;
  const user = credentials.slice(0, colonIndex);
  let password = credentials.slice(colonIndex + 1);
  try {
    const decodedPassword = decodeURIComponent(password);
    password = encodeURIComponent(decodedPassword);
  } catch (e) {
    password = encodeURIComponent(password);
  }
  return `${prefix}${user}:${password}@${hostAndDb}`;
}

// Default environment credentials, can be customized in a .env file
const rawConnectionString = process.env.DATABASE_URL;
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;

function rewriteConnectionStringForPooler(connStr) {
  if (!connStr) return connStr;
  if (connStr.includes('db.vosknkhyhscsbmqozfly.supabase.co')) {
    console.log('--- Rewriting database connection string for Supabase Pooler (IPv4) ---');
    let rewritten = connStr
      .replace('db.vosknkhyhscsbmqozfly.supabase.co:5432', 'aws-1-ap-south-1.pooler.supabase.com:6543')
      .replace('db.vosknkhyhscsbmqozfly.supabase.co:6543', 'aws-1-ap-south-1.pooler.supabase.com:6543')
      .replace('db.vosknkhyhscsbmqozfly.supabase.co', 'aws-1-ap-south-1.pooler.supabase.com:6543');
    if (rewritten.includes('://postgres:') && !rewritten.includes('://postgres.vosknkhyhscsbmqozfly:')) {
      rewritten = rewritten.replace('://postgres:', '://postgres.vosknkhyhscsbmqozfly:');
    }
    console.log('Rewritten connection string host successfully');
    return rewritten;
  }
  return connStr;
}

let connectionString = null;
if (rawConnectionString) {
  connectionString = rewriteConnectionStringForPooler(normalizeConnectionString(rawConnectionString));
}

const hasDbConfig = !!(rawConnectionString || process.env.DB_HOST);

if (hasDbConfig) {
  const poolConfig = {};
  if (rawConnectionString) {
    poolConfig.connectionString = connectionString;
    const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    if (!isLocalhost) {
      poolConfig.ssl = { rejectUnauthorized: false };
    }
  } else {
    let host = process.env.DB_HOST;
    let user = process.env.DB_USER;
    let port = process.env.DB_PORT || 5432;
    if (host === 'db.vosknkhyhscsbmqozfly.supabase.co') {
      console.log('--- Rewriting database config fields for Supabase Pooler (IPv4) ---');
      host = 'aws-1-ap-south-1.pooler.supabase.com';
      port = 6543;
      if (user === 'postgres') {
        user = 'postgres.vosknkhyhscsbmqozfly';
      }
    }
    poolConfig.host = host;
    poolConfig.user = user;
    poolConfig.password = process.env.DB_PASSWORD;
    poolConfig.database = process.env.DB_NAME;
    poolConfig.port = port;
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
    if (!isLocalhost) {
      poolConfig.ssl = { rejectUnauthorized: false };
    }
  }
  pool = new Pool(poolConfig);

  // Test the connection
  pool.connect((err, client, release) => {
    if (err) {
      console.error('*** PostgreSQL Connection Failed! ***');
      console.error('Reason:', err.message);
      if (isProduction) {
        console.error('CRITICAL: Running in production/Vercel environment. NOT falling back to Mock DB.');
        useMock = false;
      } else {
        console.warn('Falling back to IN-MEMORY Mock DB for local development.');
        useMock = true;
      }
    } else {
      console.log('--- Connected to PostgreSQL successfully ---');
      release();
    }
  });
} else {
  if (isProduction) {
    console.error('*** CRITICAL ERROR: DATABASE_URL/DB_HOST not provided in Production/Vercel environment! ***');
    useMock = false;
  } else {
    console.log('--- DATABASE_URL/DB_HOST not provided. Running in IN-MEMORY Mock DB mode ---');
    useMock = true;
  }
}

// Simple in-memory query simulator for SQL execution
async function mockQuery(text, params = []) {
  // Normalize query: strip double quotes and reduce spacing for easy matching
  const query = text.trim().replace(/\s+/g, ' ').replace(/"/g, '');
  
  // --- A. AGGREGATES & STATS QUERIES (For Dashboard) ---
  if (query.includes('SELECT SUM(amount) as total FROM Income')) {
    const userId = parseInt(params[0]);
    const total = mockDb.income.filter(item => item.user_id === userId).reduce((sum, item) => sum + item.amount, 0);
    return { rows: [{ total }] };
  }
  if (query.includes('SELECT SUM(amount) as total FROM Expenses')) {
    const userId = parseInt(params[0]);
    const total = mockDb.expenses.filter(item => item.user_id === userId).reduce((sum, item) => sum + item.amount, 0);
    return { rows: [{ total }] };
  }
  if (query.includes('units, purchase_price, current_price FROM Investments')) {
    const userId = parseInt(params[0]);
    const list = mockDb.investments.filter(item => item.user_id === userId);
    return { rows: list };
  }
  if (query.includes('weight, goal_weight FROM WeightLogs')) {
    const userId = parseInt(params[0]);
    const list = mockDb.weightLogs.filter(item => item.user_id === userId).sort((a,b) => new Date(b.date) - new Date(a.date));
    return { rows: list.length > 0 ? [list[0]] : [] };
  }
  if (query.includes('SELECT COUNT(*) as count FROM Trips')) {
    const userId = parseInt(params[0]);
    const count = mockDb.trips.filter(item => item.user_id === userId).length;
    return { rows: [{ count }] };
  }

  // --- B. STANDARD MODULE QUERIES ---

  // 1. Users Queries
  if (query.includes('INSERT INTO Users') || query.includes('insert into Users')) {
    const email = params[0];
    const passwordHash = params[1];
    const user = { id: userSeq++, email, password_hash: passwordHash, created_at: new Date() };
    mockDb.users.push(user);
    return { rows: [user] };
  }
  if (query.includes('SELECT * FROM Users WHERE email') || query.includes('select * from Users where email')) {
    const email = params[0];
    const user = mockDb.users.find(u => u.email === email);
    return { rows: user ? [user] : [] };
  }
  if (query.includes('SELECT * FROM Users WHERE id') || query.includes('select * from Users where id')) {
    const id = parseInt(params[0]);
    const user = mockDb.users.find(u => u.id === id);
    return { rows: user ? [user] : [] };
  }

  // 2. Income Queries
  if (query.includes('INSERT INTO Income')) {
    const [userId, amount, category, description, date] = params;
    const item = { id: incomeSeq++, user_id: parseInt(userId), amount: parseFloat(amount), category, description, date, created_at: new Date() };
    mockDb.income.push(item);
    return { rows: [item] };
  }
  if (query.includes('SELECT * FROM Income WHERE user_id')) {
    const userId = parseInt(params[0]);
    const list = mockDb.income.filter(item => item.user_id === userId);
    return { rows: list };
  }
  if (query.includes('DELETE FROM Income WHERE id')) {
    const id = parseInt(params[0]);
    const userId = parseInt(params[1]);
    const index = mockDb.income.findIndex(item => item.id === id && item.user_id === userId);
    if (index !== -1) {
      mockDb.income.splice(index, 1);
      return { rowCount: 1 };
    }
    return { rowCount: 0 };
  }
  if (query.includes('UPDATE Income SET')) {
    const [amount, category, description, date, id, userId] = params;
    const index = mockDb.income.findIndex(item => item.id === parseInt(id) && item.user_id === parseInt(userId));
    if (index !== -1) {
      mockDb.income[index] = { ...mockDb.income[index], amount: parseFloat(amount), category, description, date };
      return { rows: [mockDb.income[index]] };
    }
    return { rows: [] };
  }

  // 3. Expenses Queries
  if (query.includes('INSERT INTO Expenses')) {
    const [userId, amount, category, description, date] = params;
    const item = { id: expensesSeq++, user_id: parseInt(userId), amount: parseFloat(amount), category, description, date, created_at: new Date() };
    mockDb.expenses.push(item);
    return { rows: [item] };
  }
  if (query.includes('SELECT * FROM Expenses WHERE user_id')) {
    const userId = parseInt(params[0]);
    const list = mockDb.expenses.filter(item => item.user_id === userId);
    return { rows: list };
  }
  if (query.includes('DELETE FROM Expenses WHERE id')) {
    const id = parseInt(params[0]);
    const userId = parseInt(params[1]);
    const index = mockDb.expenses.findIndex(item => item.id === id && item.user_id === userId);
    if (index !== -1) {
      mockDb.expenses.splice(index, 1);
      return { rowCount: 1 };
    }
    return { rowCount: 0 };
  }
  if (query.includes('UPDATE Expenses SET')) {
    const [amount, category, description, date, id, userId] = params;
    const index = mockDb.expenses.findIndex(item => item.id === parseInt(id) && item.user_id === parseInt(userId));
    if (index !== -1) {
      mockDb.expenses[index] = { ...mockDb.expenses[index], amount: parseFloat(amount), category, description, date };
      return { rows: [mockDb.expenses[index]] };
    }
    return { rows: [] };
  }

  // 4. Shopping Queries
  if (query.includes('INSERT INTO Shopping')) {
    const [userId, itemName, category, price, date] = params;
    const item = { id: shoppingSeq++, user_id: parseInt(userId), item_name: itemName, category, price: parseFloat(price), date, created_at: new Date() };
    mockDb.shopping.push(item);
    return { rows: [item] };
  }
  if (query.includes('SELECT * FROM Shopping WHERE user_id') || query.includes('SELECT s.*, i.id as invoice_id')) {
    const userId = parseInt(params[0]);
    const list = mockDb.shopping.filter(item => item.user_id === userId);
    return { rows: list };
  }
  if (query.includes('DELETE FROM Shopping WHERE id')) {
    const id = parseInt(params[0]);
    const userId = parseInt(params[1]);
    const index = mockDb.shopping.findIndex(item => item.id === id && item.user_id === userId);
    if (index !== -1) {
      mockDb.shopping.splice(index, 1);
      mockDb.invoices = mockDb.invoices.filter(inv => inv.shopping_id !== id);
      return { rowCount: 1 };
    }
    return { rowCount: 0 };
  }

  // 5. Invoices Queries
  if (query.includes('INSERT INTO Invoices')) {
    const [userId, shoppingId, filename, filePath, fileType] = params;
    const item = { id: invoicesSeq++, user_id: parseInt(userId), shopping_id: shoppingId ? parseInt(shoppingId) : null, filename, file_path: filePath, file_type: fileType, uploaded_at: new Date() };
    mockDb.invoices.push(item);
    return { rows: [item] };
  }
  if (query.includes('SELECT * FROM Invoices WHERE shopping_id')) {
    const shoppingId = parseInt(params[0]);
    const list = mockDb.invoices.filter(item => item.shopping_id === shoppingId);
    return { rows: list };
  }
  if (query.includes('SELECT * FROM Invoices WHERE user_id')) {
    const userId = parseInt(params[0]);
    const list = mockDb.invoices.filter(item => item.user_id === userId);
    return { rows: list };
  }

  // 6. Investments Queries
  if (query.includes('INSERT INTO Investments')) {
    const [userId, type, name, symbol, units, purchasePrice, currentPrice, purchaseDate] = params;
    const item = { 
      id: investmentsSeq++, 
      user_id: parseInt(userId), 
      type, 
      name, 
      symbol, 
      units: parseFloat(units), 
      purchase_price: parseFloat(purchasePrice), 
      current_price: parseFloat(currentPrice), 
      purchase_date: purchaseDate, 
      updated_at: new Date() 
    };
    mockDb.investments.push(item);
    return { rows: [item] };
  }
  if (query.includes('SELECT * FROM Investments WHERE user_id')) {
    const userId = parseInt(params[0]);
    const list = mockDb.investments.filter(item => item.user_id === userId);
    return { rows: list };
  }
  if (query.includes('UPDATE Investments SET current_price')) {
    const [currentPrice, id, userId] = params;
    const index = mockDb.investments.findIndex(item => item.id === parseInt(id) && item.user_id === parseInt(userId));
    if (index !== -1) {
      mockDb.investments[index].current_price = parseFloat(currentPrice);
      mockDb.investments[index].updated_at = new Date();
      return { rows: [mockDb.investments[index]] };
    }
    return { rows: [] };
  }
  if (query.includes('DELETE FROM Investments WHERE id')) {
    const id = parseInt(params[0]);
    const userId = parseInt(params[1]);
    const index = mockDb.investments.findIndex(item => item.id === id && item.user_id === userId);
    if (index !== -1) {
      mockDb.investments.splice(index, 1);
      return { rowCount: 1 };
    }
    return { rowCount: 0 };
  }

  // 7. WeightLogs Queries
  if (query.includes('INSERT INTO WeightLogs')) {
    const [userId, weight, date, note, goalWeight] = params;
    const item = { 
      id: weightLogsSeq++, 
      user_id: parseInt(userId), 
      weight: parseFloat(weight), 
      date, 
      note, 
      goal_weight: goalWeight ? parseFloat(goalWeight) : null, 
      created_at: new Date() 
    };
    mockDb.weightLogs.push(item);
    return { rows: [item] };
  }
  if (query.includes('SELECT * FROM WeightLogs WHERE user_id')) {
    const userId = parseInt(params[0]);
    const list = mockDb.weightLogs.filter(item => item.user_id === userId).sort((a,b) => new Date(a.date) - new Date(b.date));
    return { rows: list };
  }
  if (query.includes('DELETE FROM WeightLogs WHERE id')) {
    const id = parseInt(params[0]);
    const userId = parseInt(params[1]);
    const index = mockDb.weightLogs.findIndex(item => item.id === id && item.user_id === userId);
    if (index !== -1) {
      mockDb.weightLogs.splice(index, 1);
      return { rowCount: 1 };
    }
    return { rowCount: 0 };
  }

  // 8. Trips Queries
  if (query.includes('INSERT INTO Trips')) {
    const [userId, location, startDate, endDate, notes, documents] = params;
    const item = { 
      id: tripsSeq++, 
      user_id: parseInt(userId), 
      location, 
      start_date: startDate, 
      end_date: endDate, 
      notes, 
      documents: typeof documents === 'string' ? JSON.parse(documents) : documents, 
      created_at: new Date() 
    };
    mockDb.trips.push(item);
    return { rows: [item] };
  }
  if (query.includes('SELECT * FROM Trips WHERE user_id')) {
    const userId = parseInt(params[0]);
    const list = mockDb.trips.filter(item => item.user_id === userId);
    return { rows: list };
  }
  if (query.includes('DELETE FROM Trips WHERE id')) {
    const id = parseInt(params[0]);
    const userId = parseInt(params[1]);
    const index = mockDb.trips.findIndex(item => item.id === id && item.user_id === userId);
    if (index !== -1) {
      mockDb.trips.splice(index, 1);
      return { rowCount: 1 };
    }
    return { rowCount: 0 };
  }
  if (query.includes('UPDATE Trips SET')) {
    const [location, startDate, endDate, notes, documents, id, userId] = params;
    const index = mockDb.trips.findIndex(item => item.id === parseInt(id) && item.user_id === parseInt(userId));
    if (index !== -1) {
      mockDb.trips[index] = { 
        ...mockDb.trips[index], 
        location, 
        start_date: startDate, 
        end_date: endDate, 
        notes, 
        documents: typeof documents === 'string' ? JSON.parse(documents) : documents 
      };
      return { rows: [mockDb.trips[index]] };
    }
    return { rows: [] };
  }

  console.warn('Unhandled mock query:', query);
  return { rows: [], rowCount: 0 };
}

module.exports = {
  query: (text, params) => {
    if (useMock) {
      return mockQuery(text, params);
    }
    if (!pool) {
      throw new Error(
        'Database connection pool is not initialized. Please configure the DATABASE_URL environment variable.'
      );
    }
    return pool.query(text, params);
  },
  isMock: () => useMock
};
