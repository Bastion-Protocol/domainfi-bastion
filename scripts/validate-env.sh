#!/bin/bash

# =============================================================================
# Bastion Protocol - Environment Validation Script
# =============================================================================
# This script validates that all required environment variables are properly configured

set -e

echo "🔍 Validating Bastion Protocol Environment Configuration..."
echo "================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
total_checks=0
passed_checks=0
failed_checks=0

# Function to check if a variable is set
check_var() {
    local var_name=$1
    local file_path=$2
    local required=${3:-true}
    
    total_checks=$((total_checks + 1))
    
    if [ -f "$file_path" ]; then
        if grep -q "^$var_name=" "$file_path" && [ -n "$(grep "^$var_name=" "$file_path" | cut -d'=' -f2-)" ]; then
            echo -e "${GREEN}✅${NC} $var_name is set in $file_path"
            passed_checks=$((passed_checks + 1))
        else
            if [ "$required" = "true" ]; then
                echo -e "${RED}❌${NC} $var_name is missing or empty in $file_path"
                failed_checks=$((failed_checks + 1))
            else
                echo -e "${YELLOW}⚠️${NC}  $var_name is optional but not set in $file_path"
            fi
        fi
    else
        echo -e "${RED}❌${NC} File not found: $file_path"
        failed_checks=$((failed_checks + 1))
    fi
}

# Function to validate file exists
check_file() {
    local file_path=$1
    local description=$2
    
    total_checks=$((total_checks + 1))
    
    if [ -f "$file_path" ]; then
        echo -e "${GREEN}✅${NC} $description exists: $file_path"
        passed_checks=$((passed_checks + 1))
    else
        echo -e "${RED}❌${NC} $description missing: $file_path"
        failed_checks=$((failed_checks + 1))
    fi
}

echo -e "${BLUE}📁 Checking Environment Files...${NC}"
echo "---------------------------------"

# Check if environment files exist
check_file ".env" "Root environment file"
check_file "apps/web/.env.local" "Web environment file"
check_file "apps/relayer/.env" "Relayer environment file"
check_file "apps/valuation-api/.env" "Valuation API environment file"
check_file "packages/contracts-doma/.env" "Doma contracts environment file"
check_file "packages/contracts-avalanche/.env" "Avalanche contracts environment file"

echo ""
echo -e "${BLUE}🌐 Checking Network Configuration...${NC}"
echo "------------------------------------"

# Root environment
if [ -f ".env" ]; then
    check_var "DOMA_RPC_URL" ".env"
    check_var "FUJI_RPC_URL" ".env"
    check_var "ALCHEMY_API_KEY" ".env" false
    check_var "INFURA_PROJECT_ID" ".env" false
fi

echo ""
echo -e "${BLUE}🔐 Checking Security Configuration...${NC}"
echo "------------------------------------"

# Relayer private keys
if [ -f "apps/relayer/.env" ]; then
    check_var "RELAYER_PRIVATE_KEY" "apps/relayer/.env"
    check_var "DATABASE_URL" "apps/relayer/.env"
    check_var "REDIS_URL" "apps/relayer/.env"
fi

# Contract deployment keys
if [ -f "packages/contracts-doma/.env" ]; then
    check_var "DEPLOYER_PRIVATE_KEY" "packages/contracts-doma/.env"
    check_var "SNOWTRACE_API_KEY" "packages/contracts-doma/.env" false
fi

if [ -f "packages/contracts-avalanche/.env" ]; then
    check_var "DEPLOYER_PRIVATE_KEY" "packages/contracts-avalanche/.env"
    check_var "SNOWTRACE_API_KEY" "packages/contracts-avalanche/.env" false
fi

echo ""
echo -e "${BLUE}💰 Checking Price Feed Configuration...${NC}"
echo "---------------------------------------"

if [ -f "apps/valuation-api/.env" ]; then
    check_var "COINMARKETCAP_API_KEY" "apps/valuation-api/.env" false
    check_var "COINGECKO_API_KEY" "apps/valuation-api/.env" false
    check_var "DATABASE_URL" "apps/valuation-api/.env"
fi

echo ""
echo -e "${BLUE}🌍 Checking Frontend Configuration...${NC}"
echo "------------------------------------"

if [ -f "apps/web/.env.local" ]; then
    check_var "NEXT_PUBLIC_DOMA_RPC_URL" "apps/web/.env.local"
    check_var "NEXT_PUBLIC_FUJI_RPC_URL" "apps/web/.env.local"
    check_var "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID" "apps/web/.env.local" false
fi

echo ""
echo "================================================================="
echo -e "${BLUE}📊 Validation Summary${NC}"
echo "================================================================="
echo -e "Total checks: $total_checks"
echo -e "${GREEN}Passed: $passed_checks${NC}"
echo -e "${RED}Failed: $failed_checks${NC}"

if [ $failed_checks -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All critical environment variables are properly configured!${NC}"
    echo -e "${GREEN}✅ Your Bastion Protocol environment is ready for development.${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some critical environment variables are missing or misconfigured.${NC}"
    echo -e "${YELLOW}📋 Please review the failed checks above and update your .env files accordingly.${NC}"
    echo ""
    echo -e "${BLUE}💡 Setup Help:${NC}"
    echo "1. Copy .env.example files to .env files"
    echo "2. Fill in the required values"
    echo "3. Run this script again to validate"
    echo ""
    echo "For detailed setup instructions, see: docs/environment-setup.md"
    exit 1
fi
