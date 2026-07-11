import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { defineConfig } from "hardhat/config";

const besuDeployerPrivateKey = process.env.BESU_DEPLOYER_PRIVATE_KEY;

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  solidity: {
    version: "0.8.31",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      evmVersion: "london",
      viaIR: false,
      metadata: {
        bytecodeHash: "ipfs"
      }
    }
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
      chainType: "l1"
    },
    besuLocal: {
      type: "http",
      chainType: "l1",
      url: process.env.BESU_LOCAL_RPC_URL ?? "http://127.0.0.1:8545",
      accounts: besuDeployerPrivateKey === undefined ? [] : [besuDeployerPrivateKey]
    }
  },
  test: {
    solidity: {
      fuzz: {
        runs: 256
      }
    }
  }
});
