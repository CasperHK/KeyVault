package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"

	"web-framework/internal/middleware"
	"web-framework/internal/models"
)

func inventoryTestRouter(t *testing.T, role string) (*gin.Engine, *gorm.DB) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	db, err := gorm.Open(sqlite.Open(":memory:?_pragma=foreign_keys(1)"), &gorm.Config{TranslateError: true})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)
	t.Cleanup(func() { require.NoError(t, sqlDB.Close()) })
	require.NoError(t, db.AutoMigrate(&models.InventoryStaff{}, &models.InventoryAsset{}, &models.InventoryService{}, &models.InventoryEvent{}))
	h := &InventoryHandler{DB: db}
	r := gin.New()
	r.Use(func(c *gin.Context) { c.Set("user_role", role); c.Set("user_email", "tester@example.com") })
	r.Use(middleware.RequireRole("ADMIN", "EDITOR"))
	r.GET("/inventory", h.Snapshot)
	r.POST("/inventory/assets", h.SaveAsset)
	r.PUT("/inventory/assets/:id", h.SaveAsset)
	r.POST("/inventory/staff", h.SaveStaff)
	r.PUT("/inventory/staff/:id", h.SaveStaff)
	r.POST("/inventory/services", h.SaveService)
	r.PUT("/inventory/services/:id", h.SaveService)
	r.DELETE("/inventory/:resource/:id", h.Delete)
	return r, db
}

func inventoryRequest(t *testing.T, r http.Handler, method, path string, payload interface{}) *httptest.ResponseRecorder {
	t.Helper()
	var body bytes.Buffer
	if payload != nil {
		require.NoError(t, json.NewEncoder(&body).Encode(payload))
	}
	req := httptest.NewRequest(method, path, &body)
	req.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	r.ServeHTTP(response, req)
	return response
}

func TestInventoryLifecycleAndOwnership(t *testing.T) {
	r, db := inventoryTestRouter(t, "ADMIN")
	response := inventoryRequest(t, r, "GET", "/inventory", nil)
	require.Equal(t, 200, response.Code)
	require.JSONEq(t, `{"data":{"assets":[],"staff":[],"services":[],"events":[]}}`, response.Body.String())

	response = inventoryRequest(t, r, "POST", "/inventory/staff", gin.H{"name": "Alex Morgan", "email": "alex@example.com", "department": "Engineering"})
	require.Equal(t, 200, response.Code, response.Body.String())
	var person models.InventoryStaff
	require.NoError(t, db.First(&person).Error)
	payload := gin.H{"name": "Production host", "tag": " kv-sv-101 ", "kind": "Server", "status": "In use", "location": "Rack A1", "owner_id": person.ID}
	response = inventoryRequest(t, r, "POST", "/inventory/assets", payload)
	require.Equal(t, 200, response.Code, response.Body.String())
	var asset models.InventoryAsset
	require.NoError(t, db.First(&asset).Error)
	require.Equal(t, "KV-SV-101", asset.Tag)
	require.Equal(t, person.ID, *asset.OwnerID)

	var history []models.InventoryEvent
	require.NoError(t, db.Where("category = ?", "ownership").Find(&history).Error)
	require.Len(t, history, 1)
	require.Contains(t, history[0].Message, person.Name)
	require.Equal(t, "tester@example.com", history[0].Actor)

	response = inventoryRequest(t, r, "DELETE", fmt.Sprintf("/inventory/staff/%d", person.ID), nil)
	require.Equal(t, 422, response.Code)
	payload["owner_id"] = nil
	payload["status"] = "Available"
	response = inventoryRequest(t, r, "PUT", fmt.Sprintf("/inventory/assets/%d", asset.ID), payload)
	require.Equal(t, 200, response.Code, response.Body.String())
	require.NoError(t, db.First(&asset, asset.ID).Error)
	require.Nil(t, asset.OwnerID)
	require.NoError(t, db.Where("category = ?", "ownership").Find(&history).Error)
	require.Len(t, history, 2)
	require.Contains(t, history[1].Message, "Unassigned")

	for _, target := range []string{fmt.Sprintf("/inventory/assets/%d", asset.ID), fmt.Sprintf("/inventory/staff/%d", person.ID)} {
		response = inventoryRequest(t, r, "DELETE", target, nil)
		require.Equal(t, 200, response.Code, response.Body.String())
	}
}

func TestInventoryHostingIntegrity(t *testing.T) {
	r, db := inventoryTestRouter(t, "EDITOR")
	host := models.InventoryAsset{Name: "Host", Tag: "SV-1", Kind: "Server", Status: "In use", Location: "HQ"}
	require.NoError(t, db.Create(&host).Error)
	service := gin.H{"name": "Intranet", "host_id": host.ID, "environment": "Production", "status": "Running", "port": 443}
	response := inventoryRequest(t, r, "POST", "/inventory/services", service)
	require.Equal(t, 200, response.Code, response.Body.String())
	response = inventoryRequest(t, r, "DELETE", fmt.Sprintf("/inventory/assets/%d", host.ID), nil)
	require.Equal(t, 422, response.Code)
	response = inventoryRequest(t, r, "PUT", fmt.Sprintf("/inventory/assets/%d", host.ID), gin.H{"name": "Host", "tag": "SV-1", "kind": "Server", "status": "Retired", "location": "HQ"})
	require.Equal(t, 422, response.Code)
	var saved models.InventoryAsset
	require.NoError(t, db.First(&saved, host.ID).Error)
	require.Equal(t, "In use", saved.Status)

	retired := models.InventoryAsset{Name: "Old host", Tag: "SV-2", Kind: "Server", Status: "Retired", Location: "HQ"}
	require.NoError(t, db.Create(&retired).Error)
	for _, hostID := range []uint{retired.ID, 9999} {
		service["host_id"] = hostID
		response = inventoryRequest(t, r, "POST", "/inventory/services", service)
		require.Equal(t, 422, response.Code, response.Body.String())
	}
	var persisted models.InventoryService
	require.NoError(t, db.First(&persisted).Error)
	response = inventoryRequest(t, r, "DELETE", fmt.Sprintf("/inventory/services/%d", persisted.ID), nil)
	require.Equal(t, 200, response.Code)
	response = inventoryRequest(t, r, "DELETE", fmt.Sprintf("/inventory/assets/%d", host.ID), nil)
	require.Equal(t, 200, response.Code)
}

func TestInventoryValidationAndAtomicity(t *testing.T) {
	r, db := inventoryTestRouter(t, "ADMIN")
	valid := gin.H{"name": "Laptop", "tag": "LT-1", "kind": "Laptop", "status": "Available", "location": "HQ"}
	require.Equal(t, 200, inventoryRequest(t, r, "POST", "/inventory/assets", valid).Code)
	require.Equal(t, 409, inventoryRequest(t, r, "POST", "/inventory/assets", valid).Code)
	cases := []gin.H{
		{"name": "   "}, {"tag": " "}, {"location": " "}, {"kind": "Unknown"},
		{"status": "Unknown"}, {"owner_id": 999, "status": "In use"},
		{"owner_id": 0}, {"owner_id": 1}, {"purchase_date": "not-a-date"},
		{"purchase_date": "2026-10-01", "warranty_date": "2026-01-01"},
	}
	for index, overrides := range cases {
		payload := gin.H{}
		for key, value := range valid {
			payload[key] = value
		}
		for key, value := range overrides {
			payload[key] = value
		}
		response := inventoryRequest(t, r, "POST", "/inventory/assets", payload)
		require.Equal(t, 422, response.Code, "case %d: %s", index, response.Body.String())
	}
	var count int64
	require.NoError(t, db.Model(&models.InventoryAsset{}).Count(&count).Error)
	require.EqualValues(t, 1, count)
	require.NoError(t, db.Model(&models.InventoryEvent{}).Count(&count).Error)
	require.EqualValues(t, 1, count)
	for _, path := range []string{"/inventory/assets/invalid", "/inventory/assets/0"} {
		require.Equal(t, 400, inventoryRequest(t, r, "DELETE", path, nil).Code)
	}
	require.Equal(t, 404, inventoryRequest(t, r, "PUT", "/inventory/assets/9999", valid).Code)
}

func TestInventoryRejectsRegularUsers(t *testing.T) {
	r, _ := inventoryTestRouter(t, "USER")
	for _, method := range []string{"GET", "POST", "PUT", "DELETE"} {
		path := "/inventory"
		if method == "POST" {
			path += "/assets"
		} else if method == "PUT" || method == "DELETE" {
			path += "/assets/1"
		}
		require.Equal(t, 403, inventoryRequest(t, r, method, path, gin.H{}).Code)
	}
}
