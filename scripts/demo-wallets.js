import { toHex } from "viem";
import { mnemonicToAccount } from "viem/accounts";

export const DEFAULT_DEMO_MNEMONIC = "test test test test test test test test test test test junk";

export const DEMO_WALLETS = [
  {
    key: "admin",
    index: 0,
    label: "Admin RBAC / deployer",
    permissions: "DEFAULT_ADMIN_ROLE, mintea dEUR"
  },
  { key: "treasury", index: 1, label: "Tesoreria", permissions: "recibe fees" },
  { key: "citizen", index: 2, label: "Ciudadano", permissions: "crea expediente" },
  {
    key: "foreignAffairs",
    index: 3,
    label: "Extranjeria / Justicia",
    permissions: "FOREIGN_AFFAIRS_ROLE"
  },
  { key: "police", index: 4, label: "Policia", permissions: "POLICE_ROLE" },
  { key: "issuer", index: 5, label: "Emisor credencial", permissions: "CREDENTIAL_ISSUER_ROLE" },
  { key: "revoker", index: 6, label: "Revocador credencial", permissions: "REVOKER_ROLE" },
  {
    key: "tokenOperator",
    index: 7,
    label: "Operador dEUR",
    permissions: "FEE_COLLECTOR_ROLE"
  }
];

export function demoMnemonic() {
  return process.env.DEMO_WALLET_MNEMONIC ?? DEFAULT_DEMO_MNEMONIC;
}

export function demoAccount(index, mnemonic = demoMnemonic()) {
  const account = mnemonicToAccount(mnemonic, { addressIndex: index });
  return {
    index,
    address: account.address,
    privateKey: toHex(account.getHdKey().privateKey)
  };
}

export function demoAccounts(mnemonic = demoMnemonic()) {
  return Object.fromEntries(
    DEMO_WALLETS.map((wallet) => [
      wallet.key,
      { ...wallet, ...demoAccount(wallet.index, mnemonic) }
    ])
  );
}

function printTable() {
  const accounts = demoAccounts();
  console.log("Demo wallet mnemonic:");
  console.log(demoMnemonic());
  console.log("");
  console.log("Importa esa seed en MetaMask solo para esta devnet local.");
  console.log("Nunca uses estas cuentas con fondos reales.");
  console.log("");
  console.log(
    "Index | Actor                  | Address                                    | Permisos"
  );
  console.log(
    "------|------------------------|--------------------------------------------|---------------------------------------------"
  );
  for (const wallet of DEMO_WALLETS) {
    const account = accounts[wallet.key];
    console.log(
      `${String(wallet.index).padStart(5)} | ${wallet.label.padEnd(22)} | ${account.address} | ${
        wallet.permissions
      }`
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] ?? "table";
  if (command === "private-key") {
    const index = Number(process.argv[3] ?? 0);
    process.stdout.write(demoAccount(index).privateKey);
  } else if (command === "addresses") {
    process.stdout.write(DEMO_WALLETS.map((wallet) => demoAccount(wallet.index).address).join(","));
  } else {
    printTable();
  }
}
