package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/Paca-AI/api/internal/apierr"
	notificationdom "github.com/Paca-AI/api/internal/domain/notification"
	"github.com/Paca-AI/api/internal/transport/http/dto"
	"github.com/Paca-AI/api/internal/transport/http/middleware"
	"github.com/Paca-AI/api/internal/transport/http/presenter"
)

const defaultNotificationLimit = 50

// NotificationHandler handles notification endpoints.
type NotificationHandler struct {
	svc notificationdom.Service
}

// NewNotificationHandler returns a NotificationHandler wired to svc.
func NewNotificationHandler(svc notificationdom.Service) *NotificationHandler {
	return &NotificationHandler{svc: svc}
}

// List handles GET /users/me/notifications.
// Returns the most recent notifications for the authenticated user together
// with the current unread count.
func (h *NotificationHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.ActorIDFromContext(r.Context())
	if !ok {
		presenter.Error(w, r, apierr.New(apierr.CodeUnauthenticated, "unauthenticated"))
		return
	}

	notifications, err := h.svc.ListNotifications(r.Context(), userID, defaultNotificationLimit)
	if err != nil {
		presenter.Error(w, r, err)
		return
	}

	unreadCount, err := h.svc.UnreadCount(r.Context(), userID)
	if err != nil {
		presenter.Error(w, r, err)
		return
	}

	items := make([]dto.NotificationResponse, 0, len(notifications))
	for _, n := range notifications {
		items = append(items, dto.NotificationFromEntity(n))
	}

	presenter.OK(w, r, dto.NotificationListResponse{
		Items:       items,
		UnreadCount: unreadCount,
	})
}

// MarkAsRead handles PATCH /users/me/notifications/:notificationId/read.
func (h *NotificationHandler) MarkAsRead(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.ActorIDFromContext(r.Context())
	if !ok {
		presenter.Error(w, r, apierr.New(apierr.CodeUnauthenticated, "unauthenticated"))
		return
	}

	notificationID, err := uuid.Parse(chi.URLParam(r, "notificationId"))
	if err != nil {
		presenter.Error(w, r, apierr.New(apierr.CodeBadRequest, "invalid notification id"))
		return
	}

	if err := h.svc.MarkAsRead(r.Context(), notificationID, userID); err != nil {
		presenter.Error(w, r, err)
		return
	}

	presenter.NoContent(w)
}

// MarkAllAsRead handles POST /users/me/notifications/read-all.
func (h *NotificationHandler) MarkAllAsRead(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.ActorIDFromContext(r.Context())
	if !ok {
		presenter.Error(w, r, apierr.New(apierr.CodeUnauthenticated, "unauthenticated"))
		return
	}

	if err := h.svc.MarkAllAsRead(r.Context(), userID); err != nil {
		presenter.Error(w, r, err)
		return
	}

	presenter.NoContent(w)
}
