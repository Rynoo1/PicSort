package services

import (
	"github.com/Rynoo1/PicSort/backend/models"
	"github.com/aws/aws-sdk-go-v2/service/rekognition"
	"gorm.io/gorm"
)

type UploadImage struct {
	ID         uint   `json:"id" gorm:"primaryKey"`
	StorageKey string `json:"storage_key"`
	UploadedBy uint   `json:"uploaded_by"`
	EventID    uint   `json:"event_id"`
}

type DetectionResults struct {
	RekognitionID string  `json:"rekognition_id"`
	Confidence    float32 `json:"confidence"`
	PhotoID       uint    `json:"photo_id"`
}

type ImageResults struct {
	StorageKey string `json:"storage_key" gorm:"column:storage_key"`
	ID         uint   `json:"id" gorm:"column:id"`
}

type Repository struct {
	DB                *gorm.DB
	RekognitionClient *rekognition.Client
}

func NewRepository(db *gorm.DB, rekClient *rekognition.Client) *Repository {
	return &Repository{
		DB:                db,
		RekognitionClient: rekClient,
	}
}

// Saves image record to DB, return created photoID
func (r *Repository) AddImage(image *models.Photos) (uint, error) {
	result := r.DB.Create(image)
	if result.Error != nil {
		return 0, result.Error
	}
	return image.ID, nil
}

// Saves detection results to DB
func (r *Repository) SaveDetectionResults(results []models.FaceDetection) error {
	return r.DB.Create(&results).Error
}

// Creates new event person
func (r *Repository) NewEventPerson(person *models.EventPerson) (uint, error) {
	result := r.DB.Create(person)
	if result.Error != nil {
		return 0, result.Error
	}
	return person.ID, nil
}

// Finds Matched FaceDetection table rows ID's
func (r *Repository) FindMatches(matchID uint) (uint, error) {
	var matchedDetection models.FaceDetection
	err := r.DB.Where("face_id = ?", matchID).First(&matchedDetection).Error
	if err != nil {
		return 0, err
	}
	return matchedDetection.ID, nil
}

// Updates FaceDetections table with matching event person ID
func (r *Repository) UpdateDetectionsWithPersonID(faceID string, personID string) error {
	err := r.DB.Model(&models.FaceDetection{}).Where("rekognition_id = ?", faceID).Update("event_person_id", personID).Error
	if err != nil {
		return err
	}
	return nil
}

// Queries DB for all storage keys for images for one event_person
func (r *Repository) FindAllInCollection(eventPersonId uint) ([]string, []uint, error) {
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

// Event Metadata endpoint
// Returns high level info
