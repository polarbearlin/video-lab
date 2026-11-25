#!/bin/bash
# 监听一个 PR：Grokbot 推了新提交、或者有人留了新评论，就退出并打印内容（Bash 后台任务退出会唤醒 Claude）。
# 用法：bash pr_watch.sh <owner/repo> <PR号>        例：bash pr_watch.sh polarbearlin/video-lab 5
# 用 Bash 的 run_in_background 跑，timeout 给 7200000（2 小时上限，到点会被停，处理完要重新起）。
#
# 规则
# - 每 60 秒查一次。
# - 新提交：等这一批停 3 分钟没有新推送再唤醒（Grokbot 一批常推好几次，避免被唤醒好几回）。
# - 自己的提交（提交信息里有 "Claude-Session:"）和自己的评论（含 "Generated with [Claude Code]"）不算。
# - 新评论由 subscribe_pr_activity 实时推送，这里只兜底。
# gh 的 GraphQL 在云端被拦，全部用 REST（gh api）。
R=${1:?用法: pr_watch.sh owner/repo PR号}; N=${2:?缺 PR 号}
BASE_SHA=$(gh api repos/$R/pulls/$N --jq .head.sha)
BASE_CID=$(gh api "repos/$R/issues/$N/comments?per_page=100" --paginate --jq '.[-1].id' | tail -1)
BASE_CID=${BASE_CID:-0}
echo "监听 $R#$N  起点 sha=$BASE_SHA comment=$BASE_CID  $(date -u +%H:%M:%S) UTC"
LAST_SHA=$BASE_SHA; QUIET=0; PENDING=0
while true; do
  sleep 60
  SHA=$(gh api repos/$R/pulls/$N --jq .head.sha 2>/dev/null) || continue
  if [ -n "$SHA" ] && [ "$SHA" != "$LAST_SHA" ]; then
    NEW=$(gh api "repos/$R/compare/$LAST_SHA...$SHA" --jq '.commits[] | select(.commit.message | contains("Claude-Session:") | not) | .sha' 2>/dev/null)
    [ -n "$NEW" ] && PENDING=1
    LAST_SHA=$SHA; QUIET=0
  else
    QUIET=$((QUIET+1))
  fi
  if [ $PENDING = 1 ] && [ $QUIET -ge 3 ]; then
    echo "新提交（这一批已停 3 分钟） $(date -u +%H:%M:%S) UTC"
    gh api "repos/$R/compare/$BASE_SHA...$LAST_SHA" --jq '.commits[] | select(.commit.message | contains("Claude-Session:") | not) | "\(.sha[0:8]) \(.commit.message | split("\n")[0])"'
    gh api "repos/$R/issues/$N/comments?per_page=100" --paginate --jq ".[] | select(.id > $BASE_CID) | select(.body | contains(\"Generated with [Claude Code]\") | not) | \"--- 评论 \(.id) \(.created_at)\n\(.body[0:2500])\"" 2>/dev/null
    exit 0
  fi
  OUT=$(gh api "repos/$R/issues/$N/comments?per_page=100" --paginate --jq ".[] | select(.id > $BASE_CID) | select(.body | contains(\"Generated with [Claude Code]\") | not) | \"\(.id) \(.created_at)\n\(.body[0:2500])\n----\"" 2>/dev/null)
  if [ -n "$OUT" ] && [ $PENDING = 0 ]; then echo "新评论 $(date -u +%H:%M:%S) UTC"; echo "$OUT"; exit 0; fi
  if [ $PENDING = 0 ]; then
    L=$(gh api "repos/$R/issues/$N/comments?per_page=100" --paginate --jq '.[-1].id' 2>/dev/null | tail -1)
    [ -n "$L" ] && BASE_CID=$L; BASE_SHA=$LAST_SHA
  fi
done
