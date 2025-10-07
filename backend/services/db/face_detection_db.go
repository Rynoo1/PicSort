package db

import (
	"github.com/Rynoo1/PicSort/backend/models"
	"gorm.io/gorm"
)

type DetectionResults struct {
	RekognitionID string  `json:"rekognition_id"`
	Confidence    float32 `json:"confidence"`
	PhotoID       uint    `json:"photo_id"`
}

type DetectionRepo struct {
	DB *gorm.DB
}

// repo constructor
func NewDetectionRepo(db *gorm.DB) *DetectionRepo {
	return &DetectionRepo{
		DB: db,
	}
}

// db transaction setup
func (r *DetectionRepo) WithTx(tx *gorm.DB) *DetectionRepo {
	return &DetectionRepo{
		DB: tx,
	}
}

// Saves detection results to DB
func (r *DetectionRepo) SaveDetectionResults(results []models.FaceDetection) error {
	return r.DB.Create(&results).Error
}

// Finds Matched FaceDetection table rows ID's
func (r *DetectionRepo) FindMatches(matchID string) (uint, error) {
	var matchedDetection models.FaceDetection
	err := r.DB.Where("rekognition_id = ?", matchID).First(&matchedDetection).Error
	if err != nil {
		return 0, err
	}
	return *matchedDetection.EventPersonID, nil
}

// Updates FaceDetections table with matching event person ID
func (r *DetectionRepo) UpdateDetectionsWithPersonID(faceID string, personID string) error {
	err := r.DB.Model(&models.FaceDetection{}).Where("rekognition_id = ?", faceID).Update("event_person_id", personID).Error
	if err != nil {
		return err
	}
	return nil
}

// Gets all detections for a specific event
func (r *DetectionRepo) GetDetectionsByEvent(eventId uint) ([]models.FaceDetection, error) {
	var results []models.FaceDetection
	err := r.DB.Where("event_id = ?", eventId).Find(&results)
	if err != nil {
		return nil, err.Error
	}
	return results, nil
}

// Gets detections by photo Ids
func (r *DetectionRepo) GetDetectionsByPhotoIds(photoIds []uint) ([]models.FaceDetection, error) {
	var result []models.FaceDetection
	err := r.DB.Where("photo_id IN ?", photoIds).Find(&result).Error
	if err != nil {
		return nil, err
	}
	return result, nil
}
