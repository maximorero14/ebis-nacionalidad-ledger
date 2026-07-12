import { demoAccount } from "./demo-wallets.js";

const index = Number(process.argv[2] ?? 0);
process.stdout.write(demoAccount(index).privateKey);
