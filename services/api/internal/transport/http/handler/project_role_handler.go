package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/Paca-AI/api/internal/apierr"
	projectdom "github.com/Paca-AI/api/internal/domain/project"
	"github.com/Paca-AI/api/internal/transport/http/dto"
	"github.com/Paca-AI/api/internal/transport/http/middleware"
	"github.com/Paca-AI/api/internal/transport/http/presenter"
)

// ListRoles handles GET /projects/:projectId/roles.
func (h *ProjectHandler) ListRoles(w http.ResponseWriter, r *http.Request) {
	id, err := parseProjectID(r)
	if err != nil {
		presenter.Error(w, r, err)
		return
	}
	roles, err := h.svc.ListRoles(r.Context(), id)
	if err != nil {
		presenter.Error(w, r, err)
		return
	}
	resp := make([]dto.ProjectRoleResponse, 0, len(roles))
	for _, r := range roles {
		resp = append(resp, dto.ProjectRoleFromEntity(r))
	}
	presenter.OK(w, r, resp)
}

// CreateRole handles POST /projects/:projectId/roles.
func (h *ProjectHandler) CreateRole(w http.ResponseWriter, r *http.Request) {
	id, err := parseProjectID(r)
	if err != nil {
		presenter.Error(w, r, err)
		return
	}

	var req dto.CreateProjectRoleRequest
	if !middleware.BindJSON(w, r, &req) {
		return
	}
	if req.RoleName == "" {
		presenter.Error(w, r, apierr.New(apierr.CodeBadRequest, "role_name is required"))
		return
	}

	role, err := h.svc.CreateRole(r.Context(), id, projectdom.CreateRoleInput{
		RoleName:    req.RoleName,
		Permissions: req.Permissions,
	})
	if err != nil {
		presenter.Error(w, r, err)
		return
	}
	presenter.Created(w, r, dto.ProjectRoleFromEntity(role))
}

// UpdateRole handles PATCH /projects/:projectId/roles/:roleId.
func (h *ProjectHandler) UpdateRole(w http.ResponseWriter, r *http.Request) {
	projectID, err := parseProjectID(r)
	if err != nil {
		presenter.Error(w, r, err)
		return
	}
	roleID, err := uuid.Parse(chi.URLParam(r, "roleId"))
	if err != nil {
		presenter.Error(w, r, apierr.New(apierr.CodeBadRequest, "invalid role id"))
		return
	}

	var req dto.UpdateProjectRoleRequest
	if !middleware.BindJSON(w, r, &req) {
		return
	}

	role, err := h.svc.UpdateRole(r.Context(), projectID, roleID, projectdom.UpdateRoleInput{
		RoleName:    req.RoleName,
		Permissions: req.Permissions,
	})
	if err != nil {
		presenter.Error(w, r, err)
		return
	}
	presenter.OK(w, r, dto.ProjectRoleFromEntity(role))
}

// DeleteRole handles DELETE /projects/:projectId/roles/:roleId.
func (h *ProjectHandler) DeleteRole(w http.ResponseWriter, r *http.Request) {
	projectID, err := parseProjectID(r)
	if err != nil {
		presenter.Error(w, r, err)
		return
	}
	roleID, err := uuid.Parse(chi.URLParam(r, "roleId"))
	if err != nil {
		presenter.Error(w, r, apierr.New(apierr.CodeBadRequest, "invalid role id"))
		return
	}
	if err := h.svc.DeleteRole(r.Context(), projectID, roleID); err != nil {
		presenter.Error(w, r, err)
		return
	}
	presenter.OK(w, r, map[string]any{"message": "project role deleted"})
}
