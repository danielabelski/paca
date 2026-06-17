package handler

import (
	"net/http"
	"strconv"
)

// defaultQuery returns the URL query parameter named key, or fallback if missing/empty.
func defaultQuery(r *http.Request, key, fallback string) string {
	v := r.URL.Query().Get(key)
	if v == "" {
		return fallback
	}
	return v
}

// parseOffsetLimit reads offset and limit query parameters with sensible defaults.
func parseOffsetLimit(r *http.Request) (offset, limit int) {
	offset, _ = strconv.Atoi(defaultQuery(r, "offset", "0"))
	limit, _ = strconv.Atoi(defaultQuery(r, "limit", "50"))
	if offset < 0 {
		offset = 0
	}
	if limit < 1 || limit > 200 {
		limit = 50
	}
	return offset, limit
}
