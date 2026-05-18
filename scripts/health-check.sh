#!/bin/bash
# Health check script for Course Platform deployment

HOST="${1:-localhost}"
PORT="${2:-8000}"
MAX_RETRIES=30
RETRY_INTERVAL=2

echo "Checking health of $HOST:$PORT..."

for i in $(seq 1 $MAX_RETRIES); do
  echo -n "Attempt $i/$MAX_RETRIES: "
  
  if curl -sf "http://$HOST:$PORT/health" > /dev/null 2>&1; then
    echo "✓ Service is healthy"
    exit 0
  else
    echo "✗ Service not responding"
    if [ $i -lt $MAX_RETRIES ]; then
      sleep $RETRY_INTERVAL
    fi
  fi
done

echo "✗ Service failed health check after $MAX_RETRIES attempts"
exit 1
