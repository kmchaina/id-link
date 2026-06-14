-- Seed: initial branches and admin user
-- Password for all seeded staff is "Admin@1234" (bcrypt hash below)
-- Change immediately after first login.

INSERT INTO branches (name, region, district, contact_phone) VALUES
  ('Arusha Main Post Office',    'Arusha',     'Arusha CBD',   '+255272503601'),
  ('Dar es Salaam Posta House',  'Dar es Salaam', 'Ilala',     '+255222110857'),
  ('Moshi Post Office',          'Kilimanjaro', 'Moshi Urban', '+255272752341'),
  ('Dodoma Main Post Office',    'Dodoma',     'Dodoma Urban', '+255262350100'),
  ('Mwanza Post Office',         'Mwanza',     'Nyamagana',   '+255282500234');

-- bcrypt hash of "Admin@1234" (rounds=12) — change after first login
INSERT INTO staff (branch_id, full_name, phone, password_hash, role) VALUES
  (1, 'System Administrator', '+255700000001',
   '$2b$12$pMo91F.FnTttjM09sSREHezELIgdCoW83pB5EnIuUeM14ZV4dp/ZS', 'admin'),
  (1, 'Demo Clerk Arusha', '+255700000002',
   '$2b$12$pMo91F.FnTttjM09sSREHezELIgdCoW83pB5EnIuUeM14ZV4dp/ZS', 'clerk');
