# ebis-nacionalidad-ledger

Demo de un trámite de nacionalidad de extranjería llevado a una blockchain permissionada: el expediente, sus aprobaciones y el DNI digital final quedan registrados on-chain, en vez de vivir solo en una base de datos administrativa.

## El negocio

El sistema modela el circuito real de una solicitud de nacionalidad:

1. **El ciudadano** abre un expediente y sube la evidencia documental (como huella/hash, sin subir el documento en claro a la cadena).
2. **Paga la tasa** del trámite con un euro digital de demostración (dEUR).
3. **Extranjería y Policía** aprueban el expediente de forma independiente — hacen falta las dos aprobaciones, y cualquiera de las dos puede pedir subsanación o rechazar.
4. Una vez aprobado por ambas partes, un **Emisor** acuñado emite el **DNI digital**: una credencial no transferible ("soulbound") atada para siempre a la wallet del ciudadano.
5. Cualquiera puede **verificar** ese DNI públicamente (portal verificador, sin login) y comprobar si sigue vigente. Un **Revocador** puede invalidarlo permanentemente si corresponde (documento robado, fraude, etc.) — la revocación no borra el historial, solo marca el DNI como no válido para siempre.

Todo el negocio se apoya en roles separados (ciudadano, extranjería, policía, emisor, revocador, tesorería) para que ningún actor pueda emitir, aprobar y validar su propio trámite.

## Tecnología

- **Blockchain**: Hyperledger Besu (QBFT, red privada de 4 validadores + nodo RPC), desplegada vía Docker Compose. Contratos en Solidity 0.8.31 con OpenZeppelin 5.0.2, compilados y testeados con Hardhat 3 + viem.
- **Explorador**: Blockscout local para inspeccionar bloques, transacciones y contratos de la red.
- **Backend**: Spring Boot 4 (Java) + Web3j como cliente de blockchain, PostgreSQL con migraciones Flyway, expone una API REST documentada con springdoc/OpenAPI.
- **Frontend**: React 19 + TypeScript + Vite, TanStack Query para datos, wagmi/viem/RainbowKit para la conexión de wallet (MetaMask), CSS Modules para estilos.
- **Orquestación**: Docker Compose + `Makefile` con targets (`make up`, `make demo-simple`, `make demo-complete`) que levantan red, contratos, API y frontend en un solo paso.

## Smart contracts

### `NationalityCredential.sol` — el DNI digital
ERC-721 real (hereda de OpenZeppelin) pero **soulbound**: toda transferencia, `approve` o `setApprovalForAll` revierte, el token queda pegado a la wallet que lo recibió. No guarda datos personales, solo un hash (`dataCommitment`) de los datos reales.

- `mintForCase(caseId, holder, expiresAt, dataCommitment, schemaVersion)` — emite el DNI (rol `CREDENTIAL_ISSUER_ROLE`). El `tokenId` es el mismo número que el `caseId`.
- `renew(...)` — incrementa `dataVersion`, actualiza caducidad y compromiso de datos.
- `revoke(tokenId, reasonCode)` — invalida el DNI de forma permanente (rol `REVOKER_ROLE`). No hay función inversa.
- `isValid(tokenId)` / `statusOf(tokenId)` — vigente, caducado, revocado o inexistente.
- `ownerOf`, `balanceOf`, `tokenURI`, `credentialData` — lectura estándar ERC-721 + datos propios del expediente.

### `NationalityCaseRegistry.sol` — el expediente
Orquesta el ciclo de vida completo de la solicitud y es el único autorizado a mintear en `NationalityCredential`.

- `createCase()` — el ciudadano abre su expediente (uno activo por wallet).
- `submitDocuments(caseId, documentCommitment)` — adjunta el hash de la documentación.
- `payFee(caseId)` — cobra la tasa en dEUR vía `transferFrom`/allowance.
- `approveForeignAffairs(caseId, round)` / `approvePolice(caseId, round)` — aprobaciones institucionales independientes.
- `requestRemediation(caseId, reasonCode)` / `rejectCase(caseId, reasonCode)` — devuelve a subsanación o rechaza.
- `issueCredential(...)` / `renewCredential(...)` — dispara el mint/renovación en el contrato de credencial una vez `APPROVED`.
- `getCase`, `currentRound`, `activeCaseOf`, `approvedCaseOf`, `canCreateCase` — lecturas de estado.

### `DigitalEuroDemo.sol` — el euro digital de demo
ERC-20 simple (`dEUR`, 2 decimales) usado solo para pagar la tasa del trámite. No representa dinero real.

- `mint(to, amount)` — acuñación administrativa (`DEFAULT_ADMIN_ROLE`).
- `claimFaucet()` / `setFaucetEnabled(bool)` — grifo de saldo de demo, una vez por cuenta.
- `collectFeeFrom(payer, amount, paymentReference)` — cobra la tasa y la transfiere a tesorería (`FEE_COLLECTOR_ROLE`).

## Métricas y observabilidad

Stack completo levantado por Docker Compose, solo accesible en loopback:

| Herramienta | URL local | Qué hace |
|---|---|---|
| Prometheus | `localhost:9090` | scrapea métricas de la API (`/actuator/prometheus`) y de los nodos Besu (`:9545/metrics`) |
| Grafana | `localhost:3002` | dashboard `EBIS Observabilidad Local` provisionado como código |
| Loki + Promtail | `localhost:3100` | agregación de logs de todos los contenedores |
| Tempo | `localhost:3200` | trazas distribuidas OTLP de la API |
| OpenTelemetry Collector | `localhost:4317`/`4318` | recibe trazas/métricas OTLP y las reenvía a Prometheus/Tempo |
| Blockscout | `localhost:4000` | explorador de la red Besu (bloques, txs, contratos, eventos) |

Métricas clave monitorizadas: altura de bloque y peers por nodo Besu (`ethereum_blockchain_height`, `ethereum_peer_count`), actividad de cadena (`besu_blockchain_chain_head_transaction_count_counter_total`), y latencia/volumen HTTP de la API (`http_server_requests_seconds_*`).

Limitaciones conocidas: no hay Alertmanager ni reglas de alerta configuradas; el panel de latencia usa promedio (Spring Boot no expone buckets de histograma para p95).

## Arranque local

```bash
make up              # red Besu + contratos + API + frontend
make demo-simple     # + wallets/roles listos para MetaMask
make demo-complete   # + expedientes y credenciales de ejemplo precargados
```

Frontend en `http://localhost:5173`, API en `http://localhost:8080`. Importa en MetaMask la seed `DEMO_WALLET_MNEMONIC` de `.env` para operar con las cuentas demo (ciudadano, extranjería, policía, emisor, revocador, tesorería).
