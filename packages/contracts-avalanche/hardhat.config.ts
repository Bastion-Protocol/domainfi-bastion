import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-network-helpers";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import "solidity-coverage";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    doma: {
      url: process.env.DOMA_RPC_URL || "",
      accounts: process.env.DOMA_PRIVATE_KEY ? [process.env.DOMA_PRIVATE_KEY] : [],
      chainId: 12345, // Replace with actual Doma Testnet chainId
      gasPrice: "auto",
      gas: "auto",
      timeout: 60000,
    },
    fuji: {
      url: process.env.FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: process.env.FUJI_PRIVATE_KEY ? [process.env.FUJI_PRIVATE_KEY] : [],
      chainId: 43113,
      gasPrice: 25000000000, // 25 gwei
      gas: 8000000,
      timeout: 60000,
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
      doma: 0,
      fuji: 0,
    },
    admin: {
      default: 1,
      doma: 1,
      fuji: 1,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    gasPrice: 21,
    outputFile: "gas-report.txt",
    noColors: true,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    token: "AVAX",
  },
  etherscan: {
    apiKey: {
      doma: process.env.DOMA_SCAN_API_KEY || "",
      avalancheFujiTestnet: process.env.SNOWTRACE_API_KEY || "",
    },
    customChains: [
      {
        network: "doma",
        chainId: 12345, // Replace with actual Doma Testnet chainId
        urls: {
          apiURL: "https://api.doma.scan/api", // Replace with actual Doma scan API
          browserURL: "https://doma.scan/", // Replace with actual Doma scan URL
        },
      },
    ],
  },
  sourcify: {
    enabled: true,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
    deploy: "./deploy",
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
  mocha: {
    timeout: 60000,
  },
};

export default config;
