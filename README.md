# ebis-nacionalidad-ledger
ebis-nacionalidad-ledger es una aplicación demostrativa para gestionar un expediente simplificado de solicitud de nacionalidad sobre una red blockchain permissionada.

## Arranque local con Docker Compose

Para levantar solo la aplicacion desde la raiz del repositorio:

```bash
make up
```

Ese comando limpia volumenes y datos generados de sesiones anteriores, regenera la red Besu QBFT, despliega los contratos base, levanta la API Spring Boot y sirve el frontend en:

```text
http://localhost:5173
```

Para una demo con wallets derivadas y roles cargados:

```bash
make demo-simple
```

`demo-simple` reutiliza `make up`, verifica el despliegue y muestra la tabla de wallets/roles para MetaMask.

Si Docker Desktop falla durante `exporting to image` con un error similar a
`failed to prepare extraction snapshot ... parent snapshot ... does not exist`, suele ser una
inconsistencia de BuildKit/snapshotter local. Ejecuta:

```bash
make demo-simple-clean-build
```

Si el error persiste, reinicia Docker Desktop y repite el comando. Como ultima limpieza local
sin borrar volumenes globales, puedes usar `docker system prune -f` y volver a lanzar
`make demo-simple`.

Para una demo completa con wallets, roles y expedientes precargados:

```bash
make demo-complete
```

`demo-complete` reutiliza `make demo-simple` y luego ejecuta el seed de expedientes y credenciales demo.

Endpoints utiles:

- API: `http://localhost:8080`
- Health backend: `http://localhost:8080/actuator/health`
- Besu RPC local: `http://localhost:8545`
- Blockscout explorer: `http://localhost:4000`
- Blockscout API: `http://localhost:4001`

Las direcciones de contratos que usa la aplicacion siguen saliendo de
`generated/deployments/besuLocal.json` y del endpoint `GET /contracts`. Blockscout es
el explorador local para inspeccionar bloques, transacciones, addresses, contratos y
eventos de la red Besu.

Tambien puedes usar:

```bash
make demo-wallets
make logs
make down
```

Wallets demo:

Importa en MetaMask la seed `DEMO_WALLET_MNEMONIC` de `.env` y cambia entre las cuentas derivadas:

- cuenta 0: admin RBAC / deployer
- cuenta 1: tesoreria
- cuenta 2: ciudadano
- cuenta 3: extranjeria / justicia
- cuenta 4: policia
- cuenta 5: emisor credencial
- cuenta 6: revocador credencial
- cuenta 7: operador dEUR
