package database

import (
	"strings"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"web-framework/internal/models"
)

func TestInventorySeedIsDevelopmentOnlyAndIdempotent(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)
	t.Cleanup(func() { require.NoError(t, sqlDB.Close()) })
	require.NoError(t, db.AutoMigrate(&models.InventoryStaff{}, &models.InventoryAsset{}, &models.InventoryService{}, &models.InventoryEvent{}))
	var count int64
	t.Setenv("APP_ENV", "production")
	require.NoError(t, SeedInventory(db))
	require.NoError(t, db.Model(&models.InventoryAsset{}).Count(&count).Error)
	require.Zero(t, count)
	t.Setenv("APP_ENV", "development")
	require.NoError(t, SeedInventory(db))
	require.NoError(t, SeedInventory(db))
	for model, expected := range map[interface{}]int64{
		&models.InventoryStaff{}: 5, &models.InventoryAsset{}: 10, &models.InventoryService{}: 3, &models.InventoryEvent{}: 1,
	} {
		require.NoError(t, db.Model(model).Count(&count).Error)
		require.Equal(t, expected, count)
	}
}

func TestViteClientEnvUsesSameOriginAPI(t *testing.T) {
	body := clientEnvBody("VITE_", "test-publishable-key")
	require.Contains(t, body, "VITE_API_KEY=test-publishable-key\n")
	require.True(t, strings.Contains(body, "VITE_API_URL=\n"))
	require.NotContains(t, body, "VITE_API_URL=http")
}
