const db = require('../config/db');

// --- 1. Dashboard Statistics ---
exports.getDashboardStats = async (req, res) => {
  const userId = req.user.id;
  try {
    // 1. Total Income
    const incomeRes = await db.query('SELECT SUM(amount) as total FROM "Income" WHERE user_id = $1', [userId]);
    const totalIncome = parseFloat(incomeRes.rows[0]?.total || 0);

    // 2. Total Expenses
    const expenseRes = await db.query('SELECT SUM(amount) as total FROM "Expenses" WHERE user_id = $1', [userId]);
    const totalExpenses = parseFloat(expenseRes.rows[0]?.total || 0);

    // 3. Investments Value
    const investRes = await db.query('SELECT units, purchase_price, current_price FROM "Investments" WHERE user_id = $1', [userId]);
    let totalInvestValue = 0;
    let totalInvestCost = 0;
    investRes.rows.forEach(inv => {
      const u = parseFloat(inv.units || 0);
      const cp = parseFloat(inv.current_price || 0);
      const pp = parseFloat(inv.purchase_price || 0);
      totalInvestValue += u * cp;
      totalInvestCost += u * pp;
    });
    const investmentGain = totalInvestValue - totalInvestCost;

    // 4. Latest Weight Log
    const weightRes = await db.query('SELECT weight, goal_weight FROM "WeightLogs" WHERE user_id = $1 ORDER BY date DESC LIMIT 1', [userId]);
    const currentWeight = parseFloat(weightRes.rows[0]?.weight || 0);
    const goalWeight = parseFloat(weightRes.rows[0]?.goal_weight || 0);

    // 5. Trips Count
    const tripsRes = await db.query('SELECT COUNT(*) as count FROM "Trips" WHERE user_id = $1 AND end_date >= CURRENT_DATE', [userId]);
    const upcomingTrips = parseInt(tripsRes.rows[0]?.count || 0);

    res.status(200).json({
      summary: {
        totalIncome,
        totalExpenses,
        netBalance: totalIncome - totalExpenses,
        investmentValue: totalInvestValue,
        investmentGain,
        currentWeight,
        goalWeight,
        upcomingTrips
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Error loading dashboard statistics' });
  }
};

// --- 2. Merged Spending Controller Logic (Income & Expenses) ---

// Income
exports.getIncome = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await db.query('SELECT * FROM "Income" WHERE user_id = $1 ORDER BY date DESC', [userId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching income:', error);
    res.status(500).json({ message: 'Error loading income entries' });
  }
};

exports.addIncome = async (req, res) => {
  const userId = req.user.id;
  const { amount, category, description, date } = req.body;
  if (!amount || !category || !date) {
    return res.status(400).json({ message: 'Amount, category, and date are required' });
  }
  try {
    const result = await db.query(
      'INSERT INTO "Income" (user_id, amount, category, description, date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, amount, category, description, date]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding income:', error);
    res.status(500).json({ message: 'Error creating income entry' });
  }
};

exports.updateIncome = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { amount, category, description, date } = req.body;
  try {
    const result = await db.query(
      'UPDATE "Income" SET amount=$1, category=$2, description=$3, date=$4 WHERE id=$5 AND user_id=$6 RETURNING *',
      [amount, category, description, date, id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Income entry not found or unauthorized' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating income:', error);
    res.status(500).json({ message: 'Error updating income entry' });
  }
};

exports.deleteIncome = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM "Income" WHERE id = $1 AND user_id = $2', [id, userId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Income entry not found or unauthorized' });
    }
    res.status(200).json({ message: 'Income entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting income:', error);
    res.status(500).json({ message: 'Error deleting income entry' });
  }
};

// Expenses
exports.getExpenses = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await db.query('SELECT * FROM "Expenses" WHERE user_id = $1 ORDER BY date DESC', [userId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ message: 'Error loading expense entries' });
  }
};

exports.addExpense = async (req, res) => {
  const userId = req.user.id;
  const { amount, category, description, date } = req.body;
  if (!amount || !category || !date) {
    return res.status(400).json({ message: 'Amount, category, and date are required' });
  }
  try {
    const result = await db.query(
      'INSERT INTO "Expenses" (user_id, amount, category, description, date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, amount, category, description, date]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding expense:', error);
    res.status(500).json({ message: 'Error creating expense entry' });
  }
};

exports.updateExpense = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { amount, category, description, date } = req.body;
  try {
    const result = await db.query(
      'UPDATE "Expenses" SET amount=$1, category=$2, description=$3, date=$4 WHERE id=$5 AND user_id=$6 RETURNING *',
      [amount, category, description, date, id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Expense entry not found or unauthorized' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ message: 'Error updating expense entry' });
  }
};

exports.deleteExpense = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM "Expenses" WHERE id = $1 AND user_id = $2', [id, userId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Expense entry not found or unauthorized' });
    }
    res.status(200).json({ message: 'Expense entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ message: 'Error deleting expense entry' });
  }
};

// --- 3. Shopping & Invoices ---
exports.getShopping = async (req, res) => {
  const userId = req.user.id;
  try {
    // Join Shopping with Invoices to easily retrieve file details
    const result = await db.query(
      `SELECT s.*, i.id as invoice_id, i.filename as invoice_filename, i.file_path as invoice_path, i.file_type as invoice_type 
       FROM "Shopping" s 
       LEFT JOIN "Invoices" i ON s.id = i.shopping_id 
       WHERE s.user_id = $1 ORDER BY s.date DESC`,
      [userId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching shopping:', error);
    res.status(500).json({ message: 'Error loading shopping list' });
  }
};

exports.addShopping = async (req, res) => {
  const userId = req.user.id;
  const { item_name, category, price, date } = req.body;
  if (!item_name || !category || !price || !date) {
    return res.status(400).json({ message: 'All shopping fields are required' });
  }
  try {
    const shopResult = await db.query(
      'INSERT INTO "Shopping" (user_id, item_name, category, price, date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, item_name, category, price, date]
    );
    const newItem = shopResult.rows[0];

    // If an invoice file was uploaded
    if (req.file) {
      const fileResult = await db.query(
        'INSERT INTO "Invoices" (user_id, shopping_id, filename, file_path, file_type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [userId, newItem.id, req.file.filename, req.file.path.replace(/\\/g, '/'), req.file.mimetype]
      );
      newItem.invoice = fileResult.rows[0];
    }

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error adding shopping item:', error);
    res.status(500).json({ message: 'Error creating shopping entry' });
  }
};

exports.deleteShopping = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM "Shopping" WHERE id = $1 AND user_id = $2', [id, userId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Shopping item not found or unauthorized' });
    }
    res.status(200).json({ message: 'Shopping item deleted successfully' });
  } catch (error) {
    console.error('Error deleting shopping item:', error);
    res.status(500).json({ message: 'Error deleting shopping item' });
  }
};

// --- 4. Investments (Stocks & MFs) ---
exports.getInvestments = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await db.query('SELECT * FROM "Investments" WHERE user_id = $1 ORDER BY id DESC', [userId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching investments:', error);
    res.status(500).json({ message: 'Error loading investments list' });
  }
};

exports.addInvestment = async (req, res) => {
  const userId = req.user.id;
  const { type, name, symbol, units, purchase_price, current_price, purchase_date } = req.body;
  if (!type || !name || !units || !purchase_price) {
    return res.status(400).json({ message: 'Type, Name, Units, and Purchase Price are required' });
  }
  const currPrice = current_price || purchase_price;
  try {
    const result = await db.query(
      'INSERT INTO "Investments" (user_id, type, name, symbol, units, purchase_price, current_price, purchase_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [userId, type, name, symbol, units, purchase_price, currPrice, purchase_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding investment:', error);
    res.status(500).json({ message: 'Error creating investment entry' });
  }
};

exports.updateInvestmentPrice = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { current_price } = req.body;
  if (current_price === undefined) {
    return res.status(400).json({ message: 'Current price is required' });
  }
  try {
    const result = await db.query(
      'UPDATE "Investments" SET current_price = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING *',
      [current_price, id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Investment not found or unauthorized' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating investment price:', error);
    res.status(500).json({ message: 'Error updating investment value' });
  }
};

exports.deleteInvestment = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM "Investments" WHERE id = $1 AND user_id = $2', [id, userId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Investment entry not found or unauthorized' });
    }
    res.status(200).json({ message: 'Investment entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting investment:', error);
    res.status(500).json({ message: 'Error deleting investment entry' });
  }
};

// --- 5. Health Weight Tracker ---
exports.getWeightLogs = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await db.query('SELECT * FROM "WeightLogs" WHERE user_id = $1 ORDER BY date ASC', [userId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching weight logs:', error);
    res.status(500).json({ message: 'Error loading weight history' });
  }
};

exports.addWeightLog = async (req, res) => {
  const userId = req.user.id;
  const { weight, date, note, goal_weight } = req.body;
  if (!weight || !date) {
    return res.status(400).json({ message: 'Weight and date are required' });
  }
  try {
    const result = await db.query(
      'INSERT INTO "WeightLogs" (user_id, weight, date, note, goal_weight) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, weight, date, note, goal_weight]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding weight log:', error);
    res.status(500).json({ message: 'Error creating weight log entry' });
  }
};

exports.deleteWeightLog = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM "WeightLogs" WHERE id = $1 AND user_id = $2', [id, userId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Weight log entry not found or unauthorized' });
    }
    res.status(200).json({ message: 'Weight log entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting weight log:', error);
    res.status(500).json({ message: 'Error deleting weight log' });
  }
};

// --- 6. Trips & Document Attachments ---
exports.getTrips = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await db.query('SELECT * FROM "Trips" WHERE user_id = $1 ORDER BY start_date ASC', [userId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ message: 'Error loading trips' });
  }
};

exports.addTrip = async (req, res) => {
  const userId = req.user.id;
  const { location, start_date, end_date, notes } = req.body;
  if (!location || !start_date || !end_date) {
    return res.status(400).json({ message: 'Location, start date, and end date are required' });
  }

  let fileDocs = [];
  if (req.files && req.files.length > 0) {
    fileDocs = req.files.map(f => ({
      filename: f.filename,
      file_path: f.path.replace(/\\/g, '/'),
      file_type: f.mimetype
    }));
  }

  try {
    const result = await db.query(
      'INSERT INTO "Trips" (user_id, location, start_date, end_date, notes, documents) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [userId, location, start_date, end_date, notes, JSON.stringify(fileDocs)]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding trip:', error);
    res.status(500).json({ message: 'Error creating trip entry' });
  }
};

exports.updateTrip = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { location, start_date, end_date, notes, existing_documents } = req.body;

  let docs = [];
  if (existing_documents) {
    docs = typeof existing_documents === 'string' ? JSON.parse(existing_documents) : existing_documents;
  }

  if (req.files && req.files.length > 0) {
    const newDocs = req.files.map(f => ({
      filename: f.filename,
      file_path: f.path.replace(/\\/g, '/'),
      file_type: f.mimetype
    }));
    docs = docs.concat(newDocs);
  }

  try {
    const result = await db.query(
      'UPDATE "Trips" SET location=$1, start_date=$2, end_date=$3, notes=$4, documents=$5 WHERE id=$6 AND user_id=$7 RETURNING *',
      [location, start_date, end_date, notes, JSON.stringify(docs), id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Trip not found or unauthorized' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating trip:', error);
    res.status(500).json({ message: 'Error updating trip' });
  }
};

exports.deleteTrip = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM "Trips" WHERE id = $1 AND user_id = $2', [id, userId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Trip entry not found or unauthorized' });
    }
    res.status(200).json({ message: 'Trip entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting trip:', error);
    res.status(500).json({ message: 'Error deleting trip' });
  }
};

// --- 8. Bucket List ---
exports.getBucketList = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await db.query('SELECT * FROM "BucketList" WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching bucket list:', error);
    res.status(500).json({ message: 'Error loading bucket list' });
  }
};

exports.addBucketListItem = async (req, res) => {
  const userId = req.user.id;
  const { title, description, target_date, status } = req.body;
  if (!title) {
    return res.status(400).json({ message: 'Title is required' });
  }
  try {
    const result = await db.query(
      'INSERT INTO "BucketList" (user_id, title, description, target_date, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, title, description || null, target_date || null, status || 'Pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding bucket list item:', error);
    res.status(500).json({ message: 'Error creating bucket list item' });
  }
};

exports.updateBucketListItem = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { title, description, target_date, status } = req.body;
  if (!title) {
    return res.status(400).json({ message: 'Title is required' });
  }
  try {
    const result = await db.query(
      'UPDATE "BucketList" SET title=$1, description=$2, target_date=$3, status=$4 WHERE id=$5 AND user_id=$6 RETURNING *',
      [title, description || null, target_date || null, status, id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Bucket list item not found or unauthorized' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating bucket list item:', error);
    res.status(500).json({ message: 'Error updating bucket list item' });
  }
};

exports.deleteBucketListItem = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM "BucketList" WHERE id = $1 AND user_id = $2', [id, userId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Bucket list item not found or unauthorized' });
    }
    res.status(200).json({ message: 'Bucket list item deleted successfully' });
  } catch (error) {
    console.error('Error deleting bucket list item:', error);
    res.status(500).json({ message: 'Error deleting bucket list item' });
  }
};
