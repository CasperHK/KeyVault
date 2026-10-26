package models

import "time"

type InventoryStaff struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	Name       string    `json:"name" gorm:"not null"`
	Email      string    `json:"email" gorm:"not null;uniqueIndex"`
	Department string    `json:"department"`
	JobTitle   string    `json:"job_title"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type InventoryAsset struct {
	ID           uint            `json:"id" gorm:"primaryKey"`
	Name         string          `json:"name" gorm:"not null"`
	Tag          string          `json:"tag" gorm:"not null;uniqueIndex"`
	Kind         string          `json:"kind"`
	Model        string          `json:"model"`
	Serial       string          `json:"serial"`
	Status       string          `json:"status"`
	Location     string          `json:"location"`
	OwnerID      *uint           `json:"owner_id"`
	Owner        *InventoryStaff `json:"-" gorm:"foreignKey:OwnerID;constraint:OnDelete:RESTRICT"`
	PurchaseDate string          `json:"purchase_date"`
	WarrantyDate string          `json:"warranty_date"`
	Notes        string          `json:"notes"`
	CreatedAt    time.Time       `json:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"`
}

type InventoryService struct {
	ResponsibleStaff []InventoryStaff `json:"responsible_staff" gorm:"many2many:inventory_service_responsibilities;constraint:OnDelete:RESTRICT"`
	ID               uint             `json:"id" gorm:"primaryKey"`
	Name             string           `json:"name" gorm:"not null;uniqueIndex"`
	Description      string           `json:"description"`
	HostID           uint             `json:"host_id" gorm:"not null"`
	Host             InventoryAsset   `json:"-" gorm:"foreignKey:HostID;constraint:OnDelete:RESTRICT"`
	Environment      string           `json:"environment"`
	Status           string           `json:"status"`
	Port             uint             `json:"port"`
	InstallationPath string           `json:"installation_path"`
	HealthURL        string           `json:"health_url"`
	HealthStatus     string           `json:"health_status"`
	CheckedAt        *time.Time       `json:"checked_at"`
	HTTPStatus       int              `json:"http_status"`
	ResponseTimeMS   int64            `json:"response_time_ms"`
	CheckError       string           `json:"check_error"`
	CreatedAt        time.Time        `json:"created_at"`
	UpdatedAt        time.Time        `json:"updated_at"`
}

type InventoryEvent struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Category  string    `json:"category"`
	Message   string    `json:"message"`
	Actor     string    `json:"actor"`
	CreatedAt time.Time `json:"created_at"`
}
