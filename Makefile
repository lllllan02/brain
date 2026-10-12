.DEFAULT_GOAL := run

PORT ?= 4173

.PHONY: run install search index lint check test test-browser build

run:
	PORT=$(PORT) npm --prefix apps/web run dev

install:
	npm --prefix apps/web ci

# Agent 检索层，复用 apps/web 的解析逻辑，收录范围来自 apps/web/collections.config.json。
# 用法：make search q="覆盖索引 回表" / make index / make lint
search:
	@npm --silent --prefix apps/web run retrieve -- query $(q) $(ARGS)

index:
	@npm --silent --prefix apps/web run retrieve -- index $(ARGS)

lint:
	@npm --silent --prefix apps/web run retrieve -- lint $(ARGS)

# 项目级代码验收；lint 保持知识库结构巡检的含义。
check:
	npm --prefix apps/web run typecheck
	npm --prefix apps/web run format:check

test:
	npm --prefix apps/web test

test-browser:
	npm --prefix apps/web run test:e2e

build:
	npm --prefix apps/web run build
