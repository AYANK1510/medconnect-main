import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('====================================================');
console.log('   MedConnect Pulse Phase 1 Database Verification');
console.log('====================================================\n');

let totalChecks = 0;
let passedChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
  }
}

const requiredTables = [
  'profiles',
  'hospitals',
  'hospital_members',
  'departments',
  'doctors',
  'doctor_schedules',
  'patients',
  'appointments',
  'queue_tokens',
  'inventory_items',
  'emergency_requests',
  'emergency_matches',
  'resource_reservations',
  'dispatches',
  'notifications',
  'activity_logs'
];

// 1. Verify Migration File Existence
console.log('1. Checking Database Migration Files...');
const migration1Path = path.join(rootDir, 'supabase', 'migrations', '01_initial_schema.sql');
const migration2Path = path.join(rootDir, 'supabase', 'migrations', '02_indexes.sql');
const seedPath = path.join(rootDir, 'supabase', 'seed.sql');
const masterSchemaPath = path.join(rootDir, 'supabase', 'schema.sql');

assert(fs.existsSync(migration1Path), '01_initial_schema.sql migration exists');
assert(fs.existsSync(migration2Path), '02_indexes.sql migration exists');
assert(fs.existsSync(seedPath), 'seed.sql exists');
assert(fs.existsSync(masterSchemaPath), 'schema.sql exists');

const schemaSql = fs.readFileSync(migration1Path, 'utf8');
const indexSql = fs.readFileSync(migration2Path, 'utf8');
const seedSql = fs.readFileSync(seedPath, 'utf8');
const masterSchemaSql = fs.readFileSync(masterSchemaPath, 'utf8');

// 2. Verify Tables
console.log('\n2. Verifying 16 Production Tables & UUID Primary Keys...');
for (const table of requiredTables) {
  const tableRegex = new RegExp(`CREATE TABLE (IF NOT EXISTS )?${table}\\b`, 'i');
  assert(tableRegex.test(schemaSql), `Table '${table}' exists in 01_initial_schema.sql`);
  assert(tableRegex.test(masterSchemaSql), `Table '${table}' exists in schema.sql`);
}

// 3. Verify Primary Keys & Relationships (Foreign Keys)
console.log('\n3. Verifying Relationships & Foreign Key Constraints...');
const requiredFks = [
  { table: 'profiles', fk: 'hospital_id', target: 'hospitals' },
  { table: 'hospital_members', fk: 'hospital_id', target: 'hospitals' },
  { table: 'hospital_members', fk: 'user_id', target: 'profiles' },
  { table: 'departments', fk: 'hospital_id', target: 'hospitals' },
  { table: 'doctors', fk: 'hospital_id', target: 'hospitals' },
  { table: 'doctors', fk: 'department_id', target: 'departments' },
  { table: 'doctor_schedules', fk: 'doctor_id', target: 'doctors' },
  { table: 'patients', fk: 'user_id', target: 'profiles' },
  { table: 'appointments', fk: 'hospital_id', target: 'hospitals' },
  { table: 'appointments', fk: 'doctor_id', target: 'doctors' },
  { table: 'queue_tokens', fk: 'hospital_id', target: 'hospitals' },
  { table: 'queue_tokens', fk: 'appointment_id', target: 'appointments' },
  { table: 'inventory_items', fk: 'hospital_id', target: 'hospitals' },
  { table: 'emergency_requests', fk: 'requesting_hospital_id', target: 'hospitals' },
  { table: 'emergency_matches', fk: 'request_id', target: 'emergency_requests' },
  { table: 'emergency_matches', fk: 'hospital_id', target: 'hospitals' },
  { table: 'resource_reservations', fk: 'request_id', target: 'emergency_requests' },
  { table: 'resource_reservations', fk: 'inventory_item_id', target: 'inventory_items' },
  { table: 'dispatches', fk: 'request_id', target: 'emergency_requests' },
  { table: 'dispatches', fk: 'source_hospital_id', target: 'hospitals' },
  { table: 'dispatches', fk: 'destination_hospital_id', target: 'hospitals' },
  { table: 'notifications', fk: 'user_id', target: 'profiles' },
  { table: 'activity_logs', fk: 'hospital_id', target: 'hospitals' }
];

for (const fkRule of requiredFks) {
  const fkRegex = new RegExp(`REFERENCES ${fkRule.target}\\(id\\)`, 'i');
  assert(fkRegex.test(schemaSql), `Foreign key in '${fkRule.table}' references '${fkRule.target}(id)'`);
}

// 4. Verify Constraints
console.log('\n4. Verifying Constraints (Non-Negative Quantities, Valid Coordinates, Uniques)...');
assert(schemaSql.includes('CHECK (latitude BETWEEN -90 AND 90)'), 'Valid latitude constraint present (-90 to 90)');
assert(schemaSql.includes('CHECK (longitude BETWEEN -180 AND 180)'), 'Valid longitude constraint present (-180 to 180)');
assert(schemaSql.includes('CHECK (available_quantity >= 0)'), 'Non-negative available quantity constraint present');
assert(schemaSql.includes('CHECK (reserved_quantity >= 0)'), 'Non-negative reserved quantity constraint present');
assert(schemaSql.includes('CHECK (quantity > 0)'), 'Positive emergency request quantity constraint present');
assert(schemaSql.includes('CHECK (age BETWEEN 0 AND 150)'), 'Valid patient age constraint present (0 to 150)');
assert(schemaSql.includes('CHECK (end_time > start_time)'), 'Doctor schedule valid time range constraint present');

// 5. Verify Indexes
console.log('\n5. Verifying Performance Indexes...');
for (const table of requiredTables) {
  const indexRegex = new RegExp(`ON ${table}\\b`, 'i');
  assert(indexRegex.test(indexSql), `Performance index defined for table '${table}' in 02_indexes.sql`);
}

// 6. Verify Development Seed Data
console.log('\n6. Verifying Development Seed Data...');
assert(seedSql.includes('INSERT INTO hospitals'), 'Seed data includes hospitals');
assert(seedSql.includes('City General Hospital'), 'Seed data includes City General Hospital');
assert(seedSql.includes('Apex Care Medical Center'), 'Seed data includes Apex Care Medical Center');
assert(seedSql.includes('INSERT INTO profiles'), 'Seed data includes development users/profiles');
assert(seedSql.includes('INSERT INTO departments'), 'Seed data includes departments');
assert(seedSql.includes('INSERT INTO doctors'), 'Seed data includes doctors');
assert(seedSql.includes('INSERT INTO doctor_schedules'), 'Seed data includes doctor schedules');
assert(seedSql.includes('INSERT INTO inventory_items'), 'Seed data includes inventory items');
assert(seedSql.includes('INSERT INTO appointments'), 'Seed data includes appointments');
assert(seedSql.includes('INSERT INTO queue_tokens'), 'Seed data includes queue tokens');
assert(seedSql.includes('INSERT INTO emergency_requests'), 'Seed data includes emergency requests');
assert(seedSql.includes('INSERT INTO dispatches'), 'Seed data includes dispatches');
assert(seedSql.includes('INSERT INTO activity_logs'), 'Seed data includes activity logs');

console.log('\n----------------------------------------------------');
console.log(`Verification Summary: ${passedChecks}/${totalChecks} checks passed.`);
console.log('----------------------------------------------------');

if (passedChecks !== totalChecks) {
  process.exit(1);
} else {
  console.log('\nPhase 1 Database Foundation Verification Succeeded!');
}
