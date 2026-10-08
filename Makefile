.DEFAULT_GOAL := run

PORT ?= 4173

.PHONY: run install search index lint

run:
	PORT=$(PORT) npm --prefix apps/web run dev

install:
	npm --prefix apps/web ci

# Agent 检索层，复用 apps/web 的解析逻辑，覆盖 content/notes 与 content/inbox。
# 用法：make search q="覆盖索引 回表" / make index / make lint
search:
	@node scripts/retrieve.mjs query $(q) $(ARGS)

index:
	@node scripts/retrieve.mjs index

lint:
	@node scripts/retrieve.mjs lint
