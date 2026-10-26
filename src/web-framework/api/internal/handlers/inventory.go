package handlers

import (
	"fmt"
	"net/mail"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"web-framework/internal/models"
	"web-framework/internal/respond"
)

type InventoryHandler struct{ DB *gorm.DB }

func (h *InventoryHandler) Snapshot(c *gin.Context) {
	db := h.DB.WithContext(c.Request.Context())
	assets := []models.InventoryAsset{}
	staff := []models.InventoryStaff{}
	services := []models.InventoryService{}
	events := []models.InventoryEvent{}
	err := db.Transaction(func(tx *gorm.DB) error {
		for _, query := range []struct {
			value interface{}
			order string
			limit int
		}{{&staff, "name ASC", -1}, {&assets, "created_at DESC", -1}, {&events, "id DESC", 100}} {
			if err := tx.Order(query.order).Limit(query.limit).Find(query.value).Error; err != nil {
				return err
			}
		}
		return tx.Preload("ResponsibleStaff", func(db *gorm.DB) *gorm.DB { return db.Order("name ASC") }).Order("name ASC").Find(&services).Error
	})
	if err != nil {
		respond.Internal(c, err)
		return
	}
	respond.OK(c, gin.H{"assets": assets, "staff": staff, "services": services, "events": events})
}

func inventoryID(c *gin.Context) (uint, bool) {
	if c.Request.Method == "POST" {
		return 0, true
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil || id == 0 {
		respond.BadRequest(c, "A valid record ID is required")
		return 0, false
	}
	return uint(id), true
}

func inventoryEvent(tx *gorm.DB, c *gin.Context, category, message string) error {
	return tx.Create(&models.InventoryEvent{
		Category: category, Message: message, Actor: c.GetString("user_email"),
	}).Error
}

func (h *InventoryHandler) SaveAsset(c *gin.Context) {
	id, ok := inventoryID(c)
	if !ok {
		return
	}
	var input struct {
		Name         string `json:"name" binding:"required,max=120"`
		Tag          string `json:"tag" binding:"required,max=60"`
		Kind         string `json:"kind" binding:"required,oneof=Laptop Desktop Server Mobile Network"`
		Model        string `json:"model" binding:"max=120"`
		Serial       string `json:"serial" binding:"max=120"`
		Status       string `json:"status" binding:"required"`
		Location     string `json:"location" binding:"required,max=120"`
		OwnerID      *uint  `json:"owner_id"`
		PurchaseDate string `json:"purchase_date"`
		WarrantyDate string `json:"warranty_date"`
		Notes        string `json:"notes" binding:"max=4000"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		respond.Validation(c, "Check the required asset fields and their lengths", nil)
		return
	}
	input.Name, input.Tag, input.Location = strings.TrimSpace(input.Name), strings.ToUpper(strings.TrimSpace(input.Tag)), strings.TrimSpace(input.Location)
	if input.Name == "" || input.Tag == "" || input.Location == "" {
		respond.Validation(c, "Name, asset tag and location cannot be blank", nil)
		return
	}
	switch input.Status {
	case "In use", "Available", "Maintenance", "Retired":
	default:
		respond.Validation(c, "Choose a valid asset status", nil)
		return
	}
	for _, date := range []string{input.PurchaseDate, input.WarrantyDate} {
		if date != "" {
			if _, err := time.Parse("2006-01-02", date); err != nil {
				respond.Validation(c, "Dates must use YYYY-MM-DD", nil)
				return
			}
		}
	}
	if input.PurchaseDate != "" && input.WarrantyDate != "" && input.WarrantyDate < input.PurchaseDate {
		respond.Validation(c, "Warranty expiry cannot precede purchase", nil)
		return
	}
	if input.OwnerID != nil && (*input.OwnerID == 0 || input.Status == "Available" || input.Status == "Retired") {
		respond.Validation(c, "Available and retired assets cannot have an owner", nil)
		return
	}
	var asset models.InventoryAsset
	err := h.DB.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		var previousOwner *uint
		if id != 0 {
			if err := tx.First(&asset, id).Error; err != nil {
				return err
			}
			previousOwner = asset.OwnerID
		}
		ownerName := "Unassigned"
		if input.OwnerID != nil {
			var owner models.InventoryStaff
			if err := tx.First(&owner, *input.OwnerID).Error; err != nil {
				if err == gorm.ErrRecordNotFound {
					return respond.Rule("Choose an existing staff member")
				}
				return err
			}
			ownerName = owner.Name
		}
		if input.Status == "Retired" {
			var count int64
			if err := tx.Model(&models.InventoryService{}).Where("host_id = ?", id).Count(&count).Error; err != nil {
				return err
			}
			if count > 0 {
				return respond.Rule("Move hosted services before retiring this asset")
			}
		}
		asset.Name, asset.Tag, asset.Kind = input.Name, input.Tag, input.Kind
		asset.Model, asset.Serial, asset.Status = input.Model, input.Serial, input.Status
		asset.Location, asset.OwnerID = input.Location, input.OwnerID
		asset.PurchaseDate, asset.WarrantyDate, asset.Notes = input.PurchaseDate, input.WarrantyDate, input.Notes
		if err := tx.Save(&asset).Error; err != nil {
			return err
		}
		action := "Updated"
		if id == 0 {
			action = "Added"
		}
		if err := inventoryEvent(tx, c, "asset", fmt.Sprintf("%s %s (%s)", action, asset.Name, asset.Tag)); err != nil {
			return err
		}
		ownerChanged := (previousOwner == nil) != (input.OwnerID == nil) ||
			(previousOwner != nil && input.OwnerID != nil && *previousOwner != *input.OwnerID)
		if ownerChanged {
			return inventoryEvent(tx, c, "ownership", fmt.Sprintf("%s ownership set to %s", asset.Tag, ownerName))
		}
		return nil
	})
	if err != nil {
		respond.WriteError(c, err, "Could not save asset")
		return
	}
	respond.OK(c, asset)
}

func (h *InventoryHandler) SaveStaff(c *gin.Context) {
	id, ok := inventoryID(c)
	if !ok {
		return
	}
	var input struct {
		Name       string `json:"name" binding:"required,max=120"`
		Email      string `json:"email" binding:"required,email,max=254"`
		Department string `json:"department" binding:"required,max=120"`
		JobTitle   string `json:"job_title" binding:"max=120"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		respond.Validation(c, "Enter a name, valid email and department", nil)
		return
	}
	input.Name, input.Department = strings.TrimSpace(input.Name), strings.TrimSpace(input.Department)
	input.Email = strings.ToLower(strings.TrimSpace(input.Email))
	if _, err := mail.ParseAddress(input.Email); err != nil || input.Name == "" || input.Department == "" {
		respond.Validation(c, "Name, email and department must be valid and not blank", nil)
		return
	}
	var staff models.InventoryStaff
	err := h.DB.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		if id != 0 {
			if err := tx.First(&staff, id).Error; err != nil {
				return err
			}
		}
		staff.Name, staff.Email, staff.Department, staff.JobTitle = input.Name, input.Email, input.Department, input.JobTitle
		if err := tx.Save(&staff).Error; err != nil {
			return err
		}
		return inventoryEvent(tx, c, "staff", "Saved staff record for "+staff.Name)
	})
	if err != nil {
		respond.WriteError(c, err, "Could not save staff member")
		return
	}
	respond.OK(c, staff)
}

func (h *InventoryHandler) SaveService(c *gin.Context) {
	id, ok := inventoryID(c)
	if !ok {
		return
	}
	var input struct {
		Name                string  `json:"name" binding:"required,max=120"`
		Description         string  `json:"description" binding:"max=2000"`
		HostID              uint    `json:"host_id" binding:"required"`
		Environment         string  `json:"environment" binding:"required,oneof=Production Staging Development"`
		Status              string  `json:"status" binding:"required,oneof=Running Maintenance Stopped"`
		Port                uint    `json:"port" binding:"lte=65535"`
		InstallationPath    *string `json:"installation_path" binding:"omitempty,max=1000"`
		HealthURL           *string `json:"health_url" binding:"omitempty,max=2000"`
		ResponsibleStaffIDs *[]uint `json:"responsible_staff_ids" binding:"omitempty,max=1000,dive,gt=0"`
	}
	if err := c.ShouldBindJSON(&input); err != nil || strings.TrimSpace(input.Name) == "" {
		respond.Validation(c, "Enter valid service details, host, environment and port (0-65535)", nil)
		return
	}
	if input.HealthURL != nil {
		*input.HealthURL = strings.TrimSpace(*input.HealthURL)
		if *input.HealthURL != "" && !validServiceHealthURL(*input.HealthURL) {
			respond.Validation(c, "Health URL must be an absolute HTTP(S) URL without credentials or a fragment", nil)
			return
		}
	}
	var service models.InventoryService
	err := h.DB.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		if id != 0 {
			if err := tx.Preload("ResponsibleStaff").First(&service, id).Error; err != nil {
				return err
			}
		}
		var host models.InventoryAsset
		if err := tx.First(&host, input.HostID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return respond.Rule("Choose an existing host device or server")
			}
			return err
		}
		if host.Status == "Retired" {
			return respond.Rule("A retired asset cannot host a service")
		}
		var responsible []models.InventoryStaff
		if input.ResponsibleStaffIDs != nil {
			ids := *input.ResponsibleStaffIDs
			seen := make(map[uint]bool, len(ids))
			for _, staffID := range ids {
				if seen[staffID] {
					return respond.Rule("Select each responsible staff member only once")
				}
				seen[staffID] = true
			}
			responsible = []models.InventoryStaff{}
			if len(ids) > 0 {
				if err := tx.Where("id IN ?", ids).Order("name ASC").Find(&responsible).Error; err != nil {
					return err
				}
				if len(responsible) != len(ids) {
					return respond.Rule("Choose existing staff members for service responsibility")
				}
			}
		}
		service.Name, service.Description, service.HostID = strings.TrimSpace(input.Name), input.Description, input.HostID
		service.Environment, service.Status, service.Port = input.Environment, input.Status, input.Port
		if input.InstallationPath != nil {
			service.InstallationPath = strings.TrimSpace(*input.InstallationPath)
		}
		if input.HealthURL != nil && service.HealthURL != *input.HealthURL {
			service.HealthURL = *input.HealthURL
			service.HealthStatus, service.CheckError = "", ""
			service.CheckedAt, service.HTTPStatus, service.ResponseTimeMS = nil, 0, 0
		}
		if err := tx.Omit("ResponsibleStaff").Save(&service).Error; err != nil {
			return err
		}
		if input.ResponsibleStaffIDs != nil {
			if err := tx.Model(&service).Association("ResponsibleStaff").Replace(responsible); err != nil {
				return err
			}
			service.ResponsibleStaff = responsible
			names := make([]string, len(responsible))
			for i, person := range responsible {
				names[i] = person.Name
			}
			summary := "Unassigned"
			if len(names) > 0 {
				summary = strings.Join(names, ", ")
			}
			if err := inventoryEvent(tx, c, "responsibility", fmt.Sprintf("%s responsible staff set to %s", service.Name, summary)); err != nil {
				return err
			}
		} else if service.ResponsibleStaff == nil {
			service.ResponsibleStaff = []models.InventoryStaff{}
		}
		return inventoryEvent(tx, c, "service", fmt.Sprintf("%s recorded on %s", service.Name, host.Tag))
	})
	if err != nil {
		respond.WriteError(c, err, "Could not save service")
		return
	}
	respond.OK(c, service)
}

func (h *InventoryHandler) Delete(c *gin.Context) {
	id, ok := inventoryID(c)
	if !ok {
		return
	}
	resource := c.Param("resource")
	err := h.DB.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		var record interface{}
		var count int64
		switch resource {
		case "assets":
			record = &models.InventoryAsset{}
			if err := tx.Model(&models.InventoryService{}).Where("host_id = ?", id).Count(&count).Error; err != nil {
				return err
			}
			if count > 0 {
				return respond.Rule("Move or remove hosted services before deleting this asset")
			}
		case "staff":
			record = &models.InventoryStaff{}
			if err := tx.Model(&models.InventoryAsset{}).Where("owner_id = ?", id).Count(&count).Error; err != nil {
				return err
			}
			if count > 0 {
				return respond.Rule("Reassign this staff member's assets before deleting their record")
			}
			if err := tx.Table("inventory_service_responsibilities").Where("inventory_staff_id = ?", id).Count(&count).Error; err != nil {
				return err
			}
			if count > 0 {
				return respond.Rule("Remove or reassign this staff member's service responsibilities before deleting their record")
			}
		case "services":
			record = &models.InventoryService{}
		default:
			return gorm.ErrRecordNotFound
		}
		if err := tx.First(record, id).Error; err != nil {
			return err
		}
		if resource == "services" {
			if err := tx.Model(record).Association("ResponsibleStaff").Clear(); err != nil {
				return err
			}
		}
		if err := tx.Delete(record).Error; err != nil {
			return err
		}
		return inventoryEvent(tx, c, "deleted", fmt.Sprintf("Deleted %s record #%d", resource, id))
	})
	if err != nil {
		respond.WriteError(c, err, "Could not delete record")
		return
	}
	respond.OK(c, gin.H{"deleted": true})
}
