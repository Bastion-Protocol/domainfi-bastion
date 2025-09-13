-- Initialize test database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create test schemas
CREATE SCHEMA IF NOT EXISTS relayer;
CREATE SCHEMA IF NOT EXISTS valuation;

-- Set default search path
ALTER DATABASE bastion_test SET search_path TO relayer, valuation, public;

-- Create test user permissions
GRANT ALL PRIVILEGES ON DATABASE bastion_test TO test_user;
GRANT ALL PRIVILEGES ON SCHEMA relayer TO test_user;
GRANT ALL PRIVILEGES ON SCHEMA valuation TO test_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA relayer TO test_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA valuation TO test_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA relayer TO test_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA valuation TO test_user;

-- Insert initial test data
INSERT INTO relayer.custody_events (id, domain_id, previous_owner, new_owner, block_number, transaction_hash, processed)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 1, '0x0000000000000000000000000000000000000000', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', 100, '0x1234567890abcdef', false),
  ('550e8400-e29b-41d4-a716-446655440002', 2, '0x0000000000000000000000000000000000000000', '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', 101, '0x2345678901bcdef0', false)
ON CONFLICT DO NOTHING;
