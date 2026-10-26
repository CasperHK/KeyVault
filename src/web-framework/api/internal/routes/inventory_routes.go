package routes

import (
	"web-framework/internal/handlers"
	"web-framework/internal/middleware"
)

func init() {
	RegisterRoutes(func(m *Mount) {
		h := &handlers.InventoryHandler{DB: m.DB}
		group := m.Protected.Group("/inventory")
		group.Use(middleware.RequireRole("ADMIN", "EDITOR"))
		group.GET("", h.Snapshot)
		group.POST("/assets", h.SaveAsset)
		group.PUT("/assets/:id", h.SaveAsset)
		group.POST("/staff", h.SaveStaff)
		group.PUT("/staff/:id", h.SaveStaff)
		group.POST("/services", h.SaveService)
		group.PUT("/services/:id", h.SaveService)
		group.POST("/services/:id/check", h.CheckService)
		group.DELETE("/:resource/:id", h.Delete)
	})
}
