const path = require('path');
const fs = require('fs');

// Do not load .env file on Vercel (production), rely on Vercel Dashboard Environment Variables
if (!process.env.VERCEL) {
  const pathsToTry = [
    path.join(process.cwd(), 'backend', '.env'),
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', '..', 'backend', '.env'),
    path.join(__dirname, '.env')
  ];

  let envPath = null;
  for (const p of pathsToTry) {
    if (fs.existsSync(p)) {
      envPath = p;
      break;
    }
  }

  if (envPath) {
    require('dotenv').config({ path: envPath });
  } else {
    require('dotenv').config();
  }
}
