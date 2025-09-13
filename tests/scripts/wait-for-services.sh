#!/bin/bash

# Wait for all test services to be ready
set -e

echo "🔄 Waiting for test services to be ready..."

# Function to wait for a service to be ready
wait_for_service() {
    local service_name=$1
    local host=$2
    local port=$3
    local max_attempts=${4:-30}
    local attempt=1

    echo "Waiting for ${service_name} at ${host}:${port}..."
    
    while [ $attempt -le $max_attempts ]; do
        if timeout 5 bash -c "</dev/tcp/${host}/${port}"; then
            echo "✅ ${service_name} is ready"
            return 0
        fi
        
        echo "⏳ Attempt ${attempt}/${max_attempts} - ${service_name} not ready yet..."
        sleep 2
        ((attempt++))
    done
    
    echo "❌ ${service_name} failed to start within timeout"
    return 1
}

# Function to wait for HTTP service
wait_for_http_service() {
    local service_name=$1
    local url=$2
    local max_attempts=${3:-30}
    local attempt=1

    echo "Waiting for ${service_name} HTTP service at ${url}..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "${url}/health" > /dev/null 2>&1; then
            echo "✅ ${service_name} HTTP service is ready"
            return 0
        fi
        
        echo "⏳ Attempt ${attempt}/${max_attempts} - ${service_name} HTTP service not ready yet..."
        sleep 2
        ((attempt++))
    done
    
    echo "❌ ${service_name} HTTP service failed to start within timeout"
    return 1
}

# Wait for PostgreSQL
wait_for_service "PostgreSQL" "localhost" "5433"

# Wait for Redis
wait_for_service "Redis" "localhost" "6380"

# Wait for DOMA Chain (Ganache)
wait_for_service "DOMA Chain" "localhost" "8545"

# Wait for Avalanche Chain (Ganache)
wait_for_service "Avalanche Chain" "localhost" "8546"

# Wait for Mock Price Oracle
wait_for_http_service "Mock Price Oracle" "http://localhost:3003"

# Wait for Relayer Service
wait_for_http_service "Relayer Service" "http://localhost:3001"

# Wait for Valuation API
wait_for_http_service "Valuation API" "http://localhost:3002"

echo "🎉 All test services are ready!"

# Additional health checks
echo "🔍 Running additional health checks..."

# Check database connectivity
echo "Checking database connectivity..."
if ! PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d bastion_test -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ Database connectivity check failed"
    exit 1
fi
echo "✅ Database connectivity check passed"

# Check Redis connectivity
echo "Checking Redis connectivity..."
if ! redis-cli -h localhost -p 6380 ping > /dev/null 2>&1; then
    echo "❌ Redis connectivity check failed"
    exit 1
fi
echo "✅ Redis connectivity check passed"

# Check blockchain connectivity
echo "Checking blockchain connectivity..."
if ! curl -s -X POST \
    -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    http://localhost:8545 > /dev/null 2>&1; then
    echo "❌ DOMA chain connectivity check failed"
    exit 1
fi

if ! curl -s -X POST \
    -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    http://localhost:8546 > /dev/null 2>&1; then
    echo "❌ Avalanche chain connectivity check failed"
    exit 1
fi
echo "✅ Blockchain connectivity checks passed"

echo "🚀 All services are healthy and ready for testing!"
