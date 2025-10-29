package services

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/Rynoo1/PicSort/backend/models"
	"github.com/Rynoo1/PicSort/backend/services/db"
	"github.com/aws/aws-sdk-go-v2/service/rekognition"
)

type EventService struct {
	EventRepo         *db.EventRepo
	S3Service         *S3Service
	RekognitionClient *rekognition.Client
}

// Delete Event
func (s *EventService) DeleteEvent(ctx context.Context, eventID uint) error {
	tx := s.EventRepo.DB.Begin()

	// delete photos + S3 objects
	var photos []models.Photos
	if err := tx.Where("event_id = ?", eventID).Find(&photos).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to find photos for event %d: %w", eventID, err)
	}

	var keys []string
	for _, p := range photos {
		keys = append(keys, p.StorageKey)
	}

	bucketName := os.Getenv("BUCKET_NAME")

	if len(keys) > 0 {
		if err := s.S3Service.DeleteObjects(ctx, bucketName, keys); err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to delete S3 objects for event %d: %w", eventID, err)
		}
	}

	if err := tx.Delete(&models.Event{}, eventID).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to delete event %d from DB: %w", eventID, err)
	}

	collectionID := fmt.Sprintf("event-%d", eventID)
	if err := DeleteCollection(ctx, s.RekognitionClient, collectionID); err != nil {
		log.Printf("[WARN] Could not delete Rekognition collection: %v", err)
	}

	return tx.Commit().Error
}
