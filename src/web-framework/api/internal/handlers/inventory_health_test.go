package handlers

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"

	"web-framework/internal/models"
	"web-framework/internal/safefetch"
)

type inventoryHealthTransport func(*http.Request) (*http.Response, error)

func (f inventoryHealthTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func TestInventoryServiceHealth(t *testing.T) {
	r, db := inventoryTestRouter(t, "ADMIN")
	host := models.InventoryAsset{Name: "Host", Tag: "HEALTH-1", Status: "In use"}
	require.NoError(t, db.Create(&host).Error)
	payload := gin.H{
		"name": "Intranet", "host_id": host.ID, "environment": "Production", "status": "Running",
		"installation_path": ` C:\Services\Intranet `, "health_url": " https://health.example.com/ready ",
	}
	response := inventoryRequest(t, r, "POST", "/inventory/services", payload)
	require.Equal(t, 200, response.Code, response.Body.String())
	var service models.InventoryService
	require.NoError(t, db.First(&service).Error)
	require.Equal(t, `C:\Services\Intranet`, service.InstallationPath)
	require.Equal(t, "https://health.example.com/ready", service.HealthURL)
	require.Nil(t, service.CheckedAt)
	path := fmt.Sprintf("/inventory/services/%d", service.ID)

	original := safefetch.Client
	t.Cleanup(func() { safefetch.Client = original })
	for _, test := range []struct {
		name   string
		code   int
		err    error
		health string
	}{
		{"success", 204, nil, "Healthy"},
		{"http failure", 503, nil, "Unhealthy"},
		{"authentication required", 401, nil, "Unhealthy"},
		{"network failure", 0, errors.New("private connection detail"), "Unhealthy"},
	} {
		t.Run(test.name, func(t *testing.T) {
			safefetch.Client = &http.Client{Transport: inventoryHealthTransport(func(req *http.Request) (*http.Response, error) {
				require.Equal(t, http.MethodGet, req.Method)
				require.Equal(t, service.HealthURL, req.URL.String())
				if test.err != nil {
					return nil, test.err
				}
				return &http.Response{StatusCode: test.code, Body: io.NopCloser(strings.NewReader("must not be stored")), Header: http.Header{}}, nil
			})}
			response := inventoryRequest(t, r, "POST", path+"/check", nil)
			require.Equal(t, 200, response.Code, response.Body.String())
			var saved models.InventoryService
			require.NoError(t, db.First(&saved, service.ID).Error)
			require.Equal(t, test.health, saved.HealthStatus)
			require.Equal(t, test.code, saved.HTTPStatus)
			require.NotNil(t, saved.CheckedAt)
			require.WithinDuration(t, time.Now(), *saved.CheckedAt, time.Second)
			require.GreaterOrEqual(t, saved.ResponseTimeMS, int64(0))
			require.Equal(t, "Running", saved.Status)
			require.NotContains(t, response.Body.String(), "private connection detail")
			require.NotContains(t, response.Body.String(), "must not be stored")
			require.Equal(t, test.health != "Healthy", saved.CheckError != "")
		})
	}
	// Older clients can still update inventory without clearing monitoring configuration.
	delete(payload, "installation_path")
	delete(payload, "health_url")
	require.Equal(t, 200, inventoryRequest(t, r, "PUT", path, payload).Code)
	var preserved models.InventoryService
	require.NoError(t, db.First(&preserved, service.ID).Error)
	require.Equal(t, service.InstallationPath, preserved.InstallationPath)
	require.Equal(t, service.HealthURL, preserved.HealthURL)
	require.NotNil(t, preserved.CheckedAt)

	for _, raw := range []string{"file:///etc/passwd", "https://user:pass@example.com", "https://example.com/#secret", "not a url"} {
		payload["health_url"] = raw
		require.Equal(t, 422, inventoryRequest(t, r, "PUT", path, payload).Code, raw)
	}
	payload["health_url"] = "http://127.0.0.1/"
	require.Equal(t, 200, inventoryRequest(t, r, "PUT", path, payload).Code)
	var reset models.InventoryService
	require.NoError(t, db.First(&reset, service.ID).Error)
	require.Nil(t, reset.CheckedAt)
	require.Empty(t, reset.HealthStatus)
	require.Empty(t, reset.CheckError)
	require.Zero(t, reset.HTTPStatus)
	require.Zero(t, reset.ResponseTimeMS)
	response = inventoryRequest(t, r, "POST", path+"/check", nil)
	require.Equal(t, 200, response.Code, response.Body.String())
	require.Contains(t, response.Body.String(), `"health_status":"Unknown"`)
	require.Contains(t, response.Body.String(), "blocked")

	payload["health_url"] = ""
	require.Equal(t, 200, inventoryRequest(t, r, "PUT", path, payload).Code)
	require.Equal(t, 422, inventoryRequest(t, r, "POST", path+"/check", nil).Code)
	for _, id := range []string{"0", "invalid", "-1"} {
		require.Equal(t, 400, inventoryRequest(t, r, "POST", "/inventory/services/"+id+"/check", nil).Code)
	}
	require.Equal(t, 404, inventoryRequest(t, r, "POST", "/inventory/services/99999/check", nil).Code)
}

func TestInventoryServiceHealthAuthorization(t *testing.T) {
	for _, role := range []string{"USER", "ADMIN", "EDITOR"} {
		r, _ := inventoryTestRouter(t, role)
		expected := 404
		if role == "USER" {
			expected = 403
		}
		require.Equal(t, expected, inventoryRequest(t, r, "POST", "/inventory/services/1/check", nil).Code)
	}
}

func TestInventoryServiceHealthRejectsObsoleteResult(t *testing.T) {
	r, db := inventoryTestRouter(t, "ADMIN")
	host := models.InventoryAsset{Name: "Host", Tag: "HEALTH-RACE", Status: "In use"}
	require.NoError(t, db.Create(&host).Error)
	service := models.InventoryService{
		Name: "Intranet", HostID: host.ID, Environment: "Production",
		Status: "Running", HealthURL: "https://health.example.com/old",
	}
	require.NoError(t, db.Create(&service).Error)
	original := safefetch.Client
	t.Cleanup(func() { safefetch.Client = original })
	safefetch.Client = &http.Client{Transport: inventoryHealthTransport(func(req *http.Request) (*http.Response, error) {
		require.NoError(t, db.Model(&service).Update("health_url", "https://health.example.com/new").Error)
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader("")), Header: http.Header{}}, nil
	})}
	response := inventoryRequest(t, r, "POST", fmt.Sprintf("/inventory/services/%d/check", service.ID), nil)
	require.Equal(t, 422, response.Code, response.Body.String())
	var saved models.InventoryService
	require.NoError(t, db.First(&saved, service.ID).Error)
	require.Equal(t, "https://health.example.com/new", saved.HealthURL)
	require.Nil(t, saved.CheckedAt)
	require.Empty(t, saved.HealthStatus)
}

func TestInventoryServiceHealthBlocksPrivateRedirect(t *testing.T) {
	r, db := inventoryTestRouter(t, "ADMIN")
	host := models.InventoryAsset{Name: "Host", Tag: "HEALTH-REDIRECT", Status: "In use"}
	require.NoError(t, db.Create(&host).Error)
	service := models.InventoryService{Name: "Redirect", HostID: host.ID, HealthURL: "https://health.example.com"}
	require.NoError(t, db.Create(&service).Error)
	original := safefetch.Client
	t.Cleanup(func() { safefetch.Client = original })
	client := *original
	calls := 0
	client.Transport = inventoryHealthTransport(func(req *http.Request) (*http.Response, error) {
		calls++
		return &http.Response{
			StatusCode: http.StatusFound, Header: http.Header{"Location": {"http://169.254.169.254/"}},
			Body: io.NopCloser(strings.NewReader("")),
		}, nil
	})
	safefetch.Client = &client
	response := inventoryRequest(t, r, "POST", fmt.Sprintf("/inventory/services/%d/check", service.ID), nil)
	require.Equal(t, 200, response.Code, response.Body.String())
	require.Equal(t, 1, calls)
	require.Contains(t, response.Body.String(), `"health_status":"Unknown"`)
	require.Contains(t, response.Body.String(), "blocked")
}
