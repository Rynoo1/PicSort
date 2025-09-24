package services

import (
	"context"
	"fmt"
	"os"
	"strconv"

	"github.com/Rynoo1/PicSort/backend/models"
	"github.com/Rynoo1/PicSort/backend/services/db"
	"github.com/aws/aws-sdk-go-v2/service/rekognition"
	"gorm.io/gorm"
)

type ImageBatch struct {
	ImageID    uint   `json:"image_id"`
	PresignUrl string `json:"presign_url"`
	ExpiresAt  int64  `json:"expires_at"`
}

type ImageService struct {
	ImageRepo         *db.ImageRepo
	DetectionRepo     *db.DetectionRepo
	EventPersonRepo   *db.EventPersonRepo
	RekognitionClient *rekognition.Client
	S3Service         *S3Service
}

// Process saved images
func (s *ImageService) ImageProcessing(ctx context.Context, storageKey string, uploadedBy, eventID uint) error {
	// Open a db transaction to only commit db changes if successful
	return s.ImageRepo.DB.Transaction(func(tx *gorm.DB) error {
		txImageRepo := s.ImageRepo.WithTx(tx)
		txDetectRepo := s.DetectionRepo.WithTx(tx)
		txEventPersonRepo := s.EventPersonRepo.WithTx(tx)

		// create var matching models struct
		imageSave := models.Photos{
			StorageKey: storageKey,
			UploadedBy: uploadedBy,
			EventID:    eventID,
		}

		// Save photo record to db, store photoID
		photoID, err := txImageRepo.AddImage(&imageSave)
		if err != nil {
			return fmt.Errorf("failed to save image record to db: %w", err)
		}

		EventID := strconv.FormatUint(uint64(imageSave.EventID), 10)

		// check if collection exists/create collection, store collectionID
		collectionID, err := EnsureCollectionExists(ctx, s.RekognitionClient, EventID)
		if err != nil {
			return fmt.Errorf("collection check failed: %w", err)
		}

		BucketName := os.Getenv("BUCKET_NAME")

		// index and add faces to rekognition collection, store rekognition face data
		detectionResults, err := AddFaceToCollection(ctx, s.RekognitionClient, collectionID, BucketName, imageSave.StorageKey)
		if err != nil {
			return fmt.Errorf("index faces failed: %w", err)
		}

		// convert rekognition face data splice to DetectionResults struct splice
		var results []models.FaceDetection
		for _, dr := range detectionResults {
			results = append(results, models.FaceDetection{
				RekognitionID: dr.FaceID,
				Confidence:    dr.Confidence,
				PhotoID:       photoID,
				EventID:       eventID,
			})
		}

		// save face data to db
		if err = txDetectRepo.SaveDetectionResults(results); err != nil {
			return fmt.Errorf("error saving detection results to db: %w", err)
		}

		// Compare faces to collection, update DB with matches/new faces
		for _, detectres := range results {
			compareResults, err := CompareFaces(ctx, s.RekognitionClient, collectionID, detectres.RekognitionID)
			if err != nil {
				return fmt.Errorf("error comparing faces: %w", err)
			}

			var matchID string
			if len(compareResults) == 0 {
				newPersonID, err := txEventPersonRepo.NewEventPerson(&models.EventPerson{
					Name:    "New Person",
					EventID: eventID,
				})
				if err != nil {
					return fmt.Errorf("error creating new event person: %w", err)
				}
				matchID = fmt.Sprintf("%d", newPersonID)
			} else {
				matchFace := *compareResults[0].Face.FaceId
				matchUint, err := txDetectRepo.FindMatches(matchFace)
				if err != nil {
					return fmt.Errorf("error finding matching face entry: %w", err)
				}
				matchID = strconv.FormatUint(uint64(matchUint), 10)
			}

			err = txDetectRepo.UpdateDetectionsWithPersonID(detectres.RekognitionID, matchID)
			if err != nil {
				return fmt.Errorf("failed updating face_detection table: %w", err)
			}

		}
		return nil
	})
}

// Serve presign URLs for all images in a certain collection
func (s *ImageService) ServeUrls(ctx context.Context, eventPerson models.EventPerson) ([]ImageBatch, error) {
	// Query db for images
	keys, ids, err := s.ImageRepo.FindAllInCollection(eventPerson.ID) // returns keys and ids
	if err != nil {
		return nil, err
	}

	// Generate presign urls for all images
	links, err := s.S3Service.GetPresignViewObjects(ctx, keys, eventPerson.Event.ID) // takes keys - returns links and expiration
	if err != nil {
		return nil, err
	}

	// Combine Links, expiration time and PhotoIDs
	returnLinks := make([]ImageBatch, len(links))
	for c, v := range links {
		returnLinks[c] = ImageBatch{
			PresignUrl: v.URL,
			ExpiresAt:  v.ExpiresAt,
			ImageID:    ids[c],
		}
	}

	return returnLinks, nil
}

// Save to image location DB -> ObjectKey, UploadedByID
// Check Rekognition Collections -> EventID
// IndexFaces -> collectionID
// Save Results to DB -> detectionResults

// {LOOP OVER INDEXFACES OUTPUT}
// Compare face to Collection -> faceID, collectionID
// No matches --> create new event_people, create face_detection entry
// If there are matches --> find matching face_detections entry, get event_people_id, create/update face_detections entry for this detection

// Album images endpoint
// Looks up images in the DB
// Calls AWS SDK to generate presigned URLs for each object
// Returns imageId, presignedUrl, expiresAt
