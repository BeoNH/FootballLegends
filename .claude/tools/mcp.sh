#!/bin/sh
# Gọi tool funplay-cocos-mcp trực tiếp qua HTTP khi MCP chưa nạp vào session.
# Dùng: sh .claude/tools/mcp.sh <tool_name> '<json args>'
curl -s -m "${MCP_TIMEOUT:-60}" -H 'Content-Type: application/json' -H 'Accept: application/json,text/event-stream' \
  -X POST http://127.0.0.1:8765/mcp \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"$1\",\"arguments\":${2:-{\}}}}"
