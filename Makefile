SHELL := /bin/sh

NPM ?= npm
HOST ?= 127.0.0.1
PORT ?= 5173
PREVIEW_PORT ?= 4173
VITEPRESS := ./node_modules/.bin/vitepress
TYPEDOC := ./node_modules/.bin/typedoc

.PHONY: help install docs docs-dev docs-build docs-preview docs-api

help:
	@printf '%s\n' 'AgentCraft Make targets:'
	@printf '%s\n' '  make install       Install project dependencies'
	@printf '%s\n' '  make docs          Start the VitePress dev server'
	@printf '%s\n' '  make docs-dev      Start the VitePress dev server'
	@printf '%s\n' '  make docs-build    Generate API docs and build the VitePress site'
	@printf '%s\n' '  make docs-preview  Preview the built VitePress site'
	@printf '%s\n' '  make docs-api      Generate the TypeDoc API reference'
	@printf '%s\n' ''
	@printf '%s\n' 'Options:'
	@printf '%s\n' '  HOST=127.0.0.1     Host used by VitePress'
	@printf '%s\n' '  PORT=5173          Port used by the dev server'
	@printf '%s\n' '  PREVIEW_PORT=4173  Port used by the preview server'

install:
	$(NPM) install

$(VITEPRESS):
	$(NPM) install
	@test -x $@ || { printf '%s\n' 'Missing executable: $@'; exit 1; }

$(TYPEDOC):
	$(NPM) install
	@test -x $@ || { printf '%s\n' 'Missing executable: $@'; exit 1; }

docs: docs-dev

docs-dev: $(VITEPRESS)
	$(VITEPRESS) dev docs --host $(HOST) --port $(PORT)

docs-build: $(VITEPRESS) $(TYPEDOC)
	$(TYPEDOC) --options typedoc.json
	$(VITEPRESS) build docs

docs-preview: $(VITEPRESS)
	$(VITEPRESS) preview docs --host $(HOST) --port $(PREVIEW_PORT)

docs-api: $(TYPEDOC)
	$(TYPEDOC) --options typedoc.json
