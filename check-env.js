// Quick environment variable checker
console.log('🔍 Checking environment variables...\n');

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');

if (fs.existsSync(envPath)) {
  console.log('✅ .env.local file exists');
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach(line => {
    if (line.includes('STRIPE_WEBHOOK_SECRET')) {
      console.log('\n📋 Found in file:');
      console.log(line);
      
      const match = line.match(/whsec_[a-f0-9]+/);
      if (match) {
        const secret = match[0];
        console.log('\n🔑 Extracted secret prefix:', secret.substring(0, 15) + '...');
        
        const expectedPrefix = 'whsec_a9ae43a7';
        if (secret.startsWith(expectedPrefix)) {
          console.log('✅ SECRET IS CORRECT!');
        } else {
          console.log('❌ SECRET IS WRONG!');
          console.log('Expected to start with:', expectedPrefix);
          console.log('But got:', secret.substring(0, 15));
        }
      }
    }
  });
} else {
  console.log('❌ .env.local file does NOT exist!');
  console.log('📁 Expected location:', envPath);
}

console.log('\n🌐 Runtime environment variable:');
if (process.env.STRIPE_WEBHOOK_SECRET) {
  const runtime = process.env.STRIPE_WEBHOOK_SECRET;
  console.log('Prefix:', runtime.substring(0, 15) + '...');
} else {
  console.log('❌ NOT SET in runtime!');
}

