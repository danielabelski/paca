package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	plugindom "github.com/Paca-AI/api/internal/domain/plugin"
	"github.com/Paca-AI/api/internal/transport/http/handler"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// ---------------------------------------------------------------------------
// Minimal fake
// ---------------------------------------------------------------------------

type mockPluginSvc struct {
	install                func(ctx context.Context, in plugindom.InstallInput) (*plugindom.Plugin, error)
	updateExtensionSetting func(ctx context.Context, in plugindom.UpdateExtensionSettingInput) (*plugindom.PluginExtensionSetting, error)
}

func (m *mockPluginSvc) ListPlugins(_ context.Context) ([]*plugindom.Plugin, error) {
	return nil, nil
}
func (m *mockPluginSvc) InstallPlugin(ctx context.Context, in plugindom.InstallInput) (*plugindom.Plugin, error) {
	if m.install != nil {
		return m.install(ctx, in)
	}
	return nil, errors.New("mock: install not configured")
}
func (m *mockPluginSvc) UpdatePlugin(_ context.Context, _ uuid.UUID, _ plugindom.UpdateInput) (*plugindom.Plugin, error) {
	return nil, errors.New("not found")
}
func (m *mockPluginSvc) DeletePlugin(_ context.Context, _ uuid.UUID) error { return nil }
func (m *mockPluginSvc) UpdateExtensionSetting(ctx context.Context, in plugindom.UpdateExtensionSettingInput) (*plugindom.PluginExtensionSetting, error) {
	if m.updateExtensionSetting != nil {
		return m.updateExtensionSetting(ctx, in)
	}
	return nil, errors.New("mock: updateExtensionSetting not configured")
}
func (m *mockPluginSvc) ListExtensionSettings(_ context.Context, _ uuid.UUID) ([]*plugindom.PluginExtensionSetting, error) {
	return nil, nil
}
func (m *mockPluginSvc) ListExtensionSettingsForPlugins(_ context.Context, _ []uuid.UUID) (map[uuid.UUID][]*plugindom.PluginExtensionSetting, error) {
	return nil, nil
}

var _ plugindom.Service = (*mockPluginSvc)(nil)

// ---------------------------------------------------------------------------
// Router helper
// ---------------------------------------------------------------------------

func newPluginValidationRouter(svc plugindom.Service) chi.Router {
	h := handler.NewPluginHandler(svc, nil, nil)
	r := chi.NewRouter()
	r.Post("/admin/plugins", h.InstallPlugin)
	r.Patch("/admin/plugin-extension-settings", h.UpdateExtensionSetting)
	return r
}

func doPluginRequest(t *testing.T, r chi.Router, method, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var buf *bytes.Buffer
	if body != nil {
		b, _ := json.Marshal(body)
		buf = bytes.NewBuffer(b)
	} else {
		buf = bytes.NewBuffer(nil)
	}
	req := httptest.NewRequestWithContext(context.Background(), method, path, buf)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

func TestInstallPlugin_MissingName_Returns400(t *testing.T) {
	r := newPluginValidationRouter(&mockPluginSvc{})

	w := doPluginRequest(t, r, http.MethodPost, "/admin/plugins",
		map[string]any{"version": "1.0.0"})
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for missing plugin name, got %d: %s", w.Code, w.Body.String())
	}
}

func TestInstallPlugin_MissingVersion_Returns400(t *testing.T) {
	r := newPluginValidationRouter(&mockPluginSvc{})

	w := doPluginRequest(t, r, http.MethodPost, "/admin/plugins",
		map[string]any{"name": "my-plugin", "version": ""})
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for missing version, got %d: %s", w.Code, w.Body.String())
	}
}

func TestUpdateExtensionSetting_MissingPluginID_Returns400(t *testing.T) {
	r := newPluginValidationRouter(&mockPluginSvc{})

	// plugin_id absent → decodes to uuid.Nil → handler returns 400
	w := doPluginRequest(t, r, http.MethodPatch, "/admin/plugin-extension-settings",
		map[string]any{"extension_point": "sidebar.item"})
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for missing plugin_id, got %d: %s", w.Code, w.Body.String())
	}
}

func TestUpdateExtensionSetting_MissingExtensionPoint_Returns400(t *testing.T) {
	r := newPluginValidationRouter(&mockPluginSvc{})

	w := doPluginRequest(t, r, http.MethodPatch, "/admin/plugin-extension-settings",
		map[string]any{"plugin_id": uuid.New(), "extension_point": ""})
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for missing extension_point, got %d: %s", w.Code, w.Body.String())
	}
}
