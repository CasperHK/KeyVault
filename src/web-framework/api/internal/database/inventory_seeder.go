package database

import (
	"time"

	"gorm.io/gorm"
	"web-framework/internal/models"
)

func SeedInventory(db *gorm.DB) error {
	if !seedDevDefaults() {
		return nil
	}
	return db.Transaction(func(tx *gorm.DB) error {
		var count int64
		if err := tx.Model(&models.InventoryAsset{}).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return nil
		}
		staff := []models.InventoryStaff{
			{Name: "Olivia Rhye", Email: "olivia@example.com", Department: "Design", JobTitle: "Product Designer"},
			{Name: "Phoenix Baker", Email: "phoenix@example.com", Department: "Engineering", JobTitle: "Software Engineer"},
			{Name: "Lana Steiner", Email: "lana@example.com", Department: "Operations", JobTitle: "Operations Lead"},
			{Name: "Demi Wilkinson", Email: "demi@example.com", Department: "Engineering", JobTitle: "Platform Engineer"},
			{Name: "Drew Cano", Email: "drew@example.com", Department: "Marketing", JobTitle: "Marketing Manager"},
		}
		for i := range staff {
			if err := tx.Where("email = ?", staff[i].Email).FirstOrCreate(&staff[i]).Error; err != nil {
				return err
			}
		}
		assets := []models.InventoryAsset{
			{Name: "MacBook Pro 16\"", Tag: "KV-LT-001", Kind: "Laptop", Model: "Apple M3 Pro / 36 GB", Serial: "C02KV1001", Status: "In use", Location: "Hong Kong HQ", OwnerID: &staff[0].ID},
			{Name: "Dell PowerEdge R750", Tag: "KV-SV-001", Kind: "Server", Model: "Intel Xeon / 128 GB", Serial: "DELL75001", Status: "In use", Location: "Data center - Rack A1"},
			{Name: "iPhone 15 Pro", Tag: "KV-MB-001", Kind: "Mobile", Model: "Apple / 256 GB", Serial: "IP15P0001", Status: "In use", Location: "Hong Kong HQ", OwnerID: &staff[2].ID},
			{Name: "ThinkPad X1 Carbon", Tag: "KV-LT-002", Kind: "Laptop", Model: "Lenovo / 32 GB", Serial: "LX1C0001", Status: "Available", Location: "IT storage"},
			{Name: "MacBook Air 13\"", Tag: "KV-LT-003", Kind: "Laptop", Model: "Apple M2 / 16 GB", Serial: "C02KV1003", Status: "In use", Location: "Remote", OwnerID: &staff[1].ID},
			{Name: "HP EliteDesk 800", Tag: "KV-DT-001", Kind: "Desktop", Model: "Intel i7 / 32 GB", Serial: "HP8000001", Status: "Maintenance", Location: "Hong Kong HQ"},
			{Name: "Synology RackStation", Tag: "KV-SV-002", Kind: "Server", Model: "RS2423+ / 48 TB", Serial: "SYNO0001", Status: "In use", Location: "Data center - Rack A2"},
			{Name: "Samsung Galaxy S24", Tag: "KV-MB-002", Kind: "Mobile", Model: "Samsung / 256 GB", Serial: "SGS240001", Status: "Available", Location: "IT storage"},
			{Name: "UniFi Dream Machine", Tag: "KV-NW-001", Kind: "Network", Model: "Ubiquiti / Pro", Serial: "UDMP0001", Status: "In use", Location: "Hong Kong HQ"},
			{Name: "MacBook Pro 14\"", Tag: "KV-LT-004", Kind: "Laptop", Model: "Apple M3 / 18 GB", Serial: "C02KV1004", Status: "In use", Location: "Hong Kong HQ", OwnerID: &staff[3].ID},
		}
		for i := range assets {
			assets[i].PurchaseDate = time.Now().AddDate(-1, 0, 0).Format("2006-01-02")
			assets[i].WarrantyDate = time.Now().AddDate(1, 0, 0).Format("2006-01-02")
			if i == 5 {
				assets[i].WarrantyDate = time.Now().AddDate(0, 0, 14).Format("2006-01-02")
			}
			if err := tx.Create(&assets[i]).Error; err != nil {
				return err
			}
		}
		services := []models.InventoryService{
			{Name: "Company intranet", Description: "Internal employee portal", HostID: assets[1].ID, Environment: "Production", Status: "Running", Port: 443},
			{Name: "PostgreSQL", Description: "Primary application database", HostID: assets[1].ID, Environment: "Production", Status: "Running", Port: 5432},
			{Name: "Backup & recovery", Description: "Nightly company backups", HostID: assets[6].ID, Environment: "Production", Status: "Running", Port: 5001},
		}
		if err := tx.Create(&services).Error; err != nil {
			return err
		}
		return tx.Create(&models.InventoryEvent{Category: "setup", Message: "Your workspace is ready. Demo inventory added.", Actor: "KeyVault"}).Error
	})
}
