.DEFAULT_GOAL := run

PORT ?= 4173

.PHONY: run install

run:
	PORT=$(PORT) npm --prefix apps/web run dev

install:
	npm --prefix apps/web ci
