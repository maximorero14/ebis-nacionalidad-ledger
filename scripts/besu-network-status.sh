#!/usr/bin/env bash
set -euo pipefail

RPC_URL="${BESU_RPC_URL:-http://localhost:8545}"

rpc() {
  local method="$1"
  local params="${2:-[]}"
  curl -fsS \
    -H "Content-Type: application/json" \
    --data "{\"jsonrpc\":\"2.0\",\"method\":\"${method}\",\"params\":${params},\"id\":1}" \
    "${RPC_URL}"
}

echo "RPC: ${RPC_URL}"
echo "Block number:"
rpc eth_blockNumber
echo
echo "Peer count:"
rpc net_peerCount
echo
echo "QBFT validators:"
rpc qbft_getValidatorsByBlockNumber '["latest"]'
echo
echo "Gas price:"
rpc eth_gasPrice
echo

