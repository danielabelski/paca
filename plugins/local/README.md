# Local Plugins

This directory is the **local plugin store** for development and self-hosted deployments.

It is split into two sub-directories so that WASM binaries are never served over HTTP:

| Sub-directory | Mounted to | Purpose |
|---|---|---|
| `backend/` | API container at `/plugins` | WASM binary + SQL migrations + manifest |
| `frontend/` | Gateway container at `/var/www/plugins` | Built JS/CSS bundles only |

## Directory layout

```
plugins/local/
  backend/
    <plugin-id>/
      plugin.json          ← plugin manifest
      backend.wasm         ← compiled WASM binary
      migrations/
        0001_*.sql
  frontend/
    <plugin-id>/
      assets/
        remoteEntry.js     ← module-federation entry point
        ...                ← other hashed JS/CSS chunks
```

## remoteEntryUrl

Set `remoteEntryUrl` in `backend/<plugin-id>/plugin.json` to an absolute path — the browser resolves it against the current origin automatically:

```
/plugins/<plugin-id>/assets/remoteEntry.js
```

For the checklist plugin this is:

```
/plugins/com.paca.checklist/assets/remoteEntry.js
```

## Installing the checklist plugin

```sh
# 1. Build backend WASM
cd plugins/first-party/checklist/backend
GOOS=wasip1 GOARCH=wasm go build -buildmode=c-shared -o backend.wasm .

# 2. Populate backend store
BACKEND_DIR=../../local/backend/com.paca.checklist
mkdir -p $BACKEND_DIR/migrations
cp backend.wasm       $BACKEND_DIR/backend.wasm
cp migrations/*.sql   $BACKEND_DIR/migrations/
cp ../plugin.json     $BACKEND_DIR/plugin.json

# 3. Build frontend
cd ../frontend
bun run build

# 4. Populate frontend store
FRONTEND_DIR=../../local/frontend/com.paca.checklist
mkdir -p $FRONTEND_DIR
cp -r dist/assets/. $FRONTEND_DIR/assets/
```

After these steps restart (or start) the stack.
