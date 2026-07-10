#!/bin/bash
# 互換用 → GitHubにアプデ.command へ委譲
cd "$(dirname "$0")" || exit 1
exec bash "./GitHubにアプデ.command"
