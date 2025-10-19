package db

import (
	"time"

	"github.com/Rynoo1/PicSort/backend/models"
	"gorm.io/gorm"
)

type UploadImage struct {
	ID         uint   `json:"id" gorm:"primaryKey"`
	StorageKey string `json:"storage_key"`
	UploadedBy uint   `json:"uploaded_by"`
	EventID    uint   `json:"event_id"`
}

type ImageResults struct {
	StorageKey string `json:"storage_key" gorm:"column:storage_key"`
	ID         uint   `json:"id" gorm:"column:id"`
}

type ImageRepo struct {
	DB *gorm.DB
}

// repo constructor
func NewImageRepo(db *gorm.DB) *ImageRepo {
	return &ImageRepo{
		DB: db,
	}
}

// db transaction setup
func (r *ImageRepo) WithTx(tx *gorm.DB) *ImageRepo {
	return &ImageRepo{
		DB: tx,
	}
}

// Saves image record to DB, return created photoID
func (r *ImageRepo) AddImage(image *models.Photos) (uint, error) {
	result := r.DB.Create(image)
	if result.Error != nil {
		return 0, result.Error
	}
	if err := r.DB.Model(models.Event{}).Where("id = ?", image.EventID).Update("updated_at", time.Now()); err != nil {
		return 0, err.Error
	}
	return image.ID, nil
}

// Queries DB for all storage keys for images for one event_person
func (r *ImageRepo) FindAllInCollection(eventPersonId uint) ([]string, []uint, error) {
	var storageKeys []ImageResults
	err := r.DB.
		Table("photos").
		Select("photos.id, photos.storage_key").
		Joins("JOIN face_detection ON face_detection.photo_id = photos.id").
		Where("face_detection.person_id = ?", eventPersonId).
		Scan(&storageKeys).Error

	if err != nil {
		return nil, nil, err
	}

	keys := make([]string, 0, len(storageKeys))
	ids := make([]uint, 0, len(storageKeys))
	for _, object := range storageKeys {
		keys = append(keys, object.StorageKey)
		ids = append(ids, object.ID)
	}
	return keys, ids, nil
}

// Find all images in a specific event
func (r *ImageRepo) FindAllEventImages(eventId uint) ([]ImageResults, error) {
	var storageKeys []ImageResults
	err := r.DB.Model(&models.Photos{}).Select("id, storage_key").Where("event_id = ?", eventId).Find(&storageKeys).Error
	if err != nil {
		return nil, err
	}
	return storageKeys, nil
}
