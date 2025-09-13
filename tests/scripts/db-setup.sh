#!/bin/bash

# Database setup script for integration tests
set -e

echo "🗄️ Setting up test databases..."

# Environment variables with defaults
POSTGRES_HOST=${POSTGRES_HOST:-localhost}
POSTGRES_PORT=${POSTGRES_PORT:-5433}
POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}
POSTGRES_DB=${POSTGRES_DB:-bastion_test}

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
while ! PGPASSWORD=${POSTGRES_PASSWORD} psql -h ${POSTGRES_HOST} -p ${POSTGRES_PORT} -U ${POSTGRES_USER} -c '\q' 2>/dev/null; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 1
done
echo "✅ PostgreSQL is ready"

# Create test database if it doesn't exist
echo "📦 Creating test database..."
PGPASSWORD=${POSTGRES_PASSWORD} createdb -h ${POSTGRES_HOST} -p ${POSTGRES_PORT} -U ${POSTGRES_USER} ${POSTGRES_DB} 2>/dev/null || true

# Create tables
echo "📋 Creating database tables..."
PGPASSWORD=${POSTGRES_PASSWORD} psql -h ${POSTGRES_HOST} -p ${POSTGRES_PORT} -U ${POSTGRES_USER} -d ${POSTGRES_DB} << 'EOF'

-- Domain ownership tracking
CREATE TABLE IF NOT EXISTS domain_ownership (
    id SERIAL PRIMARY KEY,
    domain_id INTEGER NOT NULL,
    owner VARCHAR(42) NOT NULL,
    previous_owner VARCHAR(42),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(domain_id)
);

-- Custody events from DOMA chain
CREATE TABLE IF NOT EXISTS custody_events (
    id SERIAL PRIMARY KEY,
    domain_id INTEGER NOT NULL,
    previous_owner VARCHAR(42),
    new_owner VARCHAR(42) NOT NULL,
    block_number BIGINT NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(transaction_hash)
);

-- Mirror operations on Avalanche chain
CREATE TABLE IF NOT EXISTS mirror_operations (
    id SERIAL PRIMARY KEY,
    domain_id INTEGER NOT NULL,
    operation_type VARCHAR(20) NOT NULL, -- 'MINT', 'TRANSFER', 'BURN'
    from_address VARCHAR(42),
    to_address VARCHAR(42),
    avalanche_tx_hash VARCHAR(66),
    custody_event_id INTEGER REFERENCES custody_events(id),
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    gas_used BIGINT,
    gas_price BIGINT,
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Collateral positions
CREATE TABLE IF NOT EXISTS collateral_positions (
    id SERIAL PRIMARY KEY,
    domain_id INTEGER NOT NULL,
    owner VARCHAR(42) NOT NULL,
    amount NUMERIC(36, 18) NOT NULL,
    locked_amount NUMERIC(36, 18) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(domain_id, owner)
);

-- Loans and borrowing
CREATE TABLE IF NOT EXISTS loans (
    id SERIAL PRIMARY KEY,
    loan_id VARCHAR(66) NOT NULL UNIQUE,
    borrower VARCHAR(42) NOT NULL,
    collateral_domain_id INTEGER NOT NULL,
    principal_amount NUMERIC(36, 18) NOT NULL,
    interest_rate NUMERIC(8, 6) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    maturity_time TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE', 'REPAID', 'LIQUIDATED'
    repaid_amount NUMERIC(36, 18) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Auction data
CREATE TABLE IF NOT EXISTS auctions (
    id SERIAL PRIMARY KEY,
    domain_id INTEGER NOT NULL UNIQUE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    starting_bid NUMERIC(36, 18) NOT NULL,
    current_bid NUMERIC(36, 18) DEFAULT 0,
    current_bidder VARCHAR(42),
    bid_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE', 'ENDED', 'SETTLED'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Bid history
CREATE TABLE IF NOT EXISTS bids (
    id SERIAL PRIMARY KEY,
    auction_id INTEGER REFERENCES auctions(id),
    domain_id INTEGER NOT NULL,
    bidder VARCHAR(42) NOT NULL,
    amount NUMERIC(36, 18) NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(transaction_hash)
);

-- Domain valuations
CREATE TABLE IF NOT EXISTS domain_valuations (
    id SERIAL PRIMARY KEY,
    domain_id INTEGER NOT NULL,
    estimated_value NUMERIC(36, 18) NOT NULL,
    confidence_score NUMERIC(3, 2) NOT NULL,
    valuation_factors JSONB,
    calculated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Valuation history for trends
CREATE TABLE IF NOT EXISTS valuation_history (
    id SERIAL PRIMARY KEY,
    domain_id INTEGER NOT NULL,
    value NUMERIC(36, 18) NOT NULL,
    confidence NUMERIC(3, 2) NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(domain_id, date)
);

-- System metrics and monitoring
CREATE TABLE IF NOT EXISTS system_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC(20, 8) NOT NULL,
    metric_timestamp TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);

-- Relayer health and status
CREATE TABLE IF NOT EXISTS relayer_status (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'HEALTHY', 'DEGRADED', 'DOWN'
    last_heartbeat TIMESTAMP DEFAULT NOW(),
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    metadata JSONB,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(service_name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_custody_events_domain_id ON custody_events(domain_id);
CREATE INDEX IF NOT EXISTS idx_custody_events_processed ON custody_events(processed);
CREATE INDEX IF NOT EXISTS idx_custody_events_block_number ON custody_events(block_number);

CREATE INDEX IF NOT EXISTS idx_mirror_operations_domain_id ON mirror_operations(domain_id);
CREATE INDEX IF NOT EXISTS idx_mirror_operations_completed ON mirror_operations(completed);
CREATE INDEX IF NOT EXISTS idx_mirror_operations_custody_event_id ON mirror_operations(custody_event_id);

CREATE INDEX IF NOT EXISTS idx_collateral_positions_owner ON collateral_positions(owner);
CREATE INDEX IF NOT EXISTS idx_collateral_positions_domain_id ON collateral_positions(domain_id);

CREATE INDEX IF NOT EXISTS idx_loans_borrower ON loans(borrower);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_collateral_domain_id ON loans(collateral_domain_id);

CREATE INDEX IF NOT EXISTS idx_auctions_domain_id ON auctions(domain_id);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON auctions(end_time);

CREATE INDEX IF NOT EXISTS idx_bids_domain_id ON bids(domain_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder ON bids(bidder);
CREATE INDEX IF NOT EXISTS idx_bids_auction_id ON bids(auction_id);

CREATE INDEX IF NOT EXISTS idx_domain_valuations_domain_id ON domain_valuations(domain_id);
CREATE INDEX IF NOT EXISTS idx_domain_valuations_calculated_at ON domain_valuations(calculated_at);

CREATE INDEX IF NOT EXISTS idx_valuation_history_domain_id ON valuation_history(domain_id);
CREATE INDEX IF NOT EXISTS idx_valuation_history_date ON valuation_history(date);

CREATE INDEX IF NOT EXISTS idx_system_metrics_name_timestamp ON system_metrics(metric_name, metric_timestamp);
CREATE INDEX IF NOT EXISTS idx_relayer_status_service_name ON relayer_status(service_name);

EOF

echo "✅ Database tables created successfully"

# Insert initial test data
echo "🌱 Inserting initial test data..."
PGPASSWORD=${POSTGRES_PASSWORD} psql -h ${POSTGRES_HOST} -p ${POSTGRES_PORT} -U ${POSTGRES_USER} -d ${POSTGRES_DB} << 'EOF'

-- Insert test auctions
INSERT INTO auctions (domain_id, start_time, end_time, starting_bid, status) VALUES
(1000, NOW() - INTERVAL '1 hour', NOW() + INTERVAL '23 hours', '1000000000000000000', 'ACTIVE'),
(1001, NOW() - INTERVAL '2 hours', NOW() + INTERVAL '22 hours', '2000000000000000000', 'ACTIVE'),
(1002, NOW() - INTERVAL '30 minutes', NOW() + INTERVAL '23.5 hours', '500000000000000000', 'ACTIVE');

-- Insert test domain valuations
INSERT INTO domain_valuations (domain_id, estimated_value, confidence_score, valuation_factors) VALUES
(1000, '1500000000000000000', 0.85, '{"traffic": "high", "age": "5 years", "keywords": ["tech", "startup"]}'),
(1001, '3000000000000000000', 0.90, '{"traffic": "very_high", "age": "10 years", "keywords": ["finance", "crypto"]}'),
(1002, '750000000000000000', 0.75, '{"traffic": "medium", "age": "2 years", "keywords": ["blog", "personal"]}');

-- Insert test valuation history
INSERT INTO valuation_history (domain_id, value, confidence, date) VALUES
(1000, '1400000000000000000', 0.82, CURRENT_DATE - INTERVAL '7 days'),
(1000, '1450000000000000000', 0.84, CURRENT_DATE - INTERVAL '3 days'),
(1000, '1500000000000000000', 0.85, CURRENT_DATE),
(1001, '2800000000000000000', 0.88, CURRENT_DATE - INTERVAL '7 days'),
(1001, '2900000000000000000', 0.89, CURRENT_DATE - INTERVAL '3 days'),
(1001, '3000000000000000000', 0.90, CURRENT_DATE);

-- Insert relayer status
INSERT INTO relayer_status (service_name, status, last_heartbeat) VALUES
('custody-monitor', 'HEALTHY', NOW()),
('mirror-processor', 'HEALTHY', NOW()),
('valuation-updater', 'HEALTHY', NOW());

EOF

echo "✅ Initial test data inserted successfully"

# Setup Redis
echo "🔴 Setting up Redis..."
redis-cli -h localhost -p 6380 FLUSHALL > /dev/null 2>&1 || true
echo "✅ Redis setup completed"

echo "🎉 Database setup completed successfully!"
