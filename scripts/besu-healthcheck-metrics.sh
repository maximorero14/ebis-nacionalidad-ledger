#!/usr/bin/env bash
set -euo pipefail

exec 3<>/dev/tcp/127.0.0.1/9545
printf 'GET /metrics HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n' >&3
timeout 5 head -1 <&3 | grep -q '200 OK'
