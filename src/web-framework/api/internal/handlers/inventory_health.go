package handlers

import (
	"errors"
	"net/url"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"web-framework/internal/models"
	"web-framework/internal/respond"
	"web-framework/internal/safefetch"
)

func validServiceHealthURL(raw string) bool {
	u, err := url.Parse(raw)
	return err == nil && (u.Scheme == "http" || u.Scheme == "https") &&
		u.Hostname() != "" && u.User == nil && u.Fragment == ""
}

func (h *InventoryHandler) CheckService(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil || id == 0 {
		respond.BadRequest(c, "A valid service ID is required")
		return
	}
	db := h.DB.WithContext(c.Request.Context())
	var service models.InventoryService
	if err := db.First(&service, id).Error; err != nil {
		respond.WriteError(c, err, "Could not load service")
		return
	}
	if service.HealthURL == "" {
		respond.Validation(c, "Configure a health URL before checking this service", nil)
		return
	}
	started := time.Now().UTC()
	status, message, code := "Unhealthy", "", 0
	response, fetchErr := safefetch.Get(c.Request.Context(), service.HealthURL)
	if fetchErr != nil {
		switch {
		case errors.Is(fetchErr, safefetch.ErrBlocked):
			status, message = "Unknown", "Target blocked by HTTP safety policy. Private, loopback and metadata addresses are not supported."
		default:
			message = "HTTP request failed. Check DNS, connectivity, TLS certificates and the endpoint timeout (10 seconds)."
		}
	} else {
		response.Body.Close()
		code = response.StatusCode
		if code >= 200 && code < 300 {
			status = "Healthy"
		} else {
			message = "The endpoint returned a non-success HTTP status."
		}
	}
	elapsed := time.Since(started).Milliseconds()
	checked := time.Now().UTC()
	result := db.Model(&models.InventoryService{}).
		Where("id = ? AND health_url = ? AND updated_at = ? AND (checked_at IS NULL OR checked_at <= ?)", id, service.HealthURL, service.UpdatedAt, started).
		Updates(map[string]interface{}{
			"health_status": status, "checked_at": checked, "http_status": code,
			"response_time_ms": elapsed, "check_error": message,
		})
	if result.Error != nil {
		respond.Internal(c, result.Error)
		return
	}
	if result.RowsAffected == 0 {
		respond.WriteError(c, respond.Rule("Service changed during the check. Refresh and try again."), "Could not save check")
		return
	}
	if err := db.Preload("ResponsibleStaff", func(db *gorm.DB) *gorm.DB { return db.Order("name ASC") }).First(&service, id).Error; err != nil {
		respond.WriteError(c, err, "Could not load check result")
		return
	}
	respond.OK(c, service)
}
