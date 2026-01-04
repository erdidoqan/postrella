#!/bin/bash

# Send all remaining emails in batches
# Usage: ./scripts/send-all-emails.sh

API_URL="https://postrella.digitexa.com/api/mailing/send"
BATCH_SIZE=100
START_OFFSET=100  # First 100 already sent
MAX_OFFSET=8600   # 8597 emails remaining, so up to 8600

total_sent=0
total_errors=0
batch_num=1

echo "Starting to send remaining emails..."
echo "Will send from offset $START_OFFSET to $MAX_OFFSET in batches of $BATCH_SIZE"
echo ""

for ((offset=$START_OFFSET; offset<=$MAX_OFFSET; offset+=$BATCH_SIZE)); do
  echo "Batch $batch_num: Sending emails from offset $offset..."
  
  response=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{\"offset\": $offset, \"limit\": $BATCH_SIZE}")
  
  # Parse response (basic JSON parsing with grep/sed)
  sent=$(echo "$response" | grep -o '"sent":[0-9]*' | grep -o '[0-9]*')
  errors=$(echo "$response" | grep -o '"errors":[0-9]*' | grep -o '[0-9]*')
  remaining=$(echo "$response" | grep -o '"remaining":[0-9]*' | grep -o '[0-9]*')
  
  if [ -z "$sent" ]; then
    echo "  ❌ Error: Failed to send batch"
    echo "  Response: $response"
    echo ""
    continue
  fi
  
  total_sent=$((total_sent + sent))
  total_errors=$((total_errors + errors))
  
  echo "  ✅ Sent: $sent, Errors: $errors, Remaining: $remaining"
  echo ""
  
  batch_num=$((batch_num + 1))
  
  # Small delay to avoid rate limiting
  sleep 1
done

echo "========================================="
echo "Summary:"
echo "  Total batches processed: $((batch_num - 1))"
echo "  Total emails sent: $total_sent"
echo "  Total errors: $total_errors"
echo "========================================="

