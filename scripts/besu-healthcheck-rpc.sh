#!/usr/bin/env bash
set -euo pipefail

body='{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

exec 3<>/dev/tcp/127.0.0.1/8545
printf 'POST / HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\nContent-Length: %s\r\nConnection: close\r\n\r\n%s' \
  "${#body}" "${body}" >&3
timeout 5 cat <&3 | grep -q '"result"'
