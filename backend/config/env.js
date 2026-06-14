const path = require('path');
const fs = require('fs');

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
