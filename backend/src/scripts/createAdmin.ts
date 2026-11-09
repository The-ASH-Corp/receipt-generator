import dotenv from 'dotenv';
dotenv.config();

import readline from 'readline';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB, isMongoConnected } from '../config/db';
import { AdminModel } from '../models/Admin';
import { createAdminRecord, findAdminByEmail } from '../services/dataStore';

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

function parseArgs(): { name?: string; email?: string; password?: string; update?: boolean } {
  const args = process.argv.slice(2);
  const result: { name?: string; email?: string; password?: string; update?: boolean } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--name' || arg === '-n') {
      result.name = args[++i];
    } else if (arg === '--email' || arg === '-e') {
      result.email = args[++i];
    } else if (arg === '--password' || arg === '-p') {
      result.password = args[++i];
    } else if (arg === '--update' || arg === '-u') {
      result.update = true;
    }
  }

  return result;
}

function prompt(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function run(): Promise<void> {
  console.log('\n=============================================');
  console.log('       Create / Update Administrator');
  console.log('=============================================\n');

  // Connect to DB
  await connectDB();

  const parsed = parseArgs();
  let name = parsed.name;
  let email = parsed.email;
  let password = parsed.password;

  // Prompt interactively for missing fields
  if (!name) {
    name = await prompt('Enter Admin Name: ');
  }

  while (!name || !name.trim()) {
    console.log('Name is required.');
    name = await prompt('Enter Admin Name: ');
  }
  name = name.trim();

  if (!email) {
    email = await prompt('Enter Admin Email: ');
  }

  while (!email || !EMAIL_REGEX.test(email.trim())) {
    console.log('Please enter a valid email address (e.g., admin@example.com).');
    email = await prompt('Enter Admin Email: ');
  }
  email = email.toLowerCase().trim();

  // Check if admin already exists
  const existing = await findAdminByEmail(email);

  if (existing) {
    console.log(`\nNotice: An admin with email "${email}" already exists (Name: ${existing.name}).`);

    let shouldUpdate = parsed.update;
    if (shouldUpdate === undefined) {
      const ans = await prompt('Do you want to update this admin\'s password? (y/N): ');
      shouldUpdate = ans.toLowerCase() === 'y' || ans.toLowerCase() === 'yes';
    }

    if (!shouldUpdate) {
      console.log('\nOperation cancelled. No changes were made.\n');
      if (isMongoConnected()) {
        await mongoose.disconnect();
      }
      process.exit(0);
    }

    if (!password) {
      password = await prompt('Enter New Password (min 6 characters): ');
    }

    while (!password || password.length < 6) {
      console.log('Password must be at least 6 characters long.');
      password = await prompt('Enter New Password (min 6 characters): ');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    if (isMongoConnected()) {
      await AdminModel.findByIdAndUpdate(existing._id, {
        name,
        passwordHash,
      });
    } else {
      existing.name = name;
      existing.passwordHash = passwordHash;
    }

    console.log('\n=============================================');
    console.log(' Admin password updated successfully!');
    console.log(` Email: ${email}`);
    console.log(` Name:  ${name}`);
    console.log('=============================================\n');

    if (isMongoConnected()) {
      await mongoose.disconnect();
    }
    process.exit(0);
  }

  // Create new admin
  if (!password) {
    password = await prompt('Enter Admin Password (min 6 characters): ');
  }

  while (!password || password.length < 6) {
    console.log('Password must be at least 6 characters long.');
    password = await prompt('Enter Admin Password (min 6 characters): ');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const created = await createAdminRecord({
    name,
    email,
    passwordHash,
  });

  console.log('\n=============================================');
  console.log(' Administrator created successfully!');
  console.log(` ID:    ${created._id}`);
  console.log(` Name:  ${created.name}`);
  console.log(` Email: ${created.email}`);
  console.log('=============================================\n');

  if (isMongoConnected()) {
    await mongoose.disconnect();
  }
  process.exit(0);
}

run().catch(async (err) => {
  console.error('\nError creating admin:', err instanceof Error ? err.message : err);
  if (isMongoConnected()) {
    await mongoose.disconnect();
  }
  process.exit(1);
});

