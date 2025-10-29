package services

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/Rynoo1/PicSort/backend/models"
	"github.com/Rynoo1/PicSort/backend/services/db"
	"github.com/aws/aws-sdk-go-v2/service/rekognition"
	"gorm.io/gorm"
)

type ImageBatch struct {
	ImageID    uint   `json:"image_id"`
	PresignUrl string `json:"presign_url"`
	ExpiresAt  string `json:"expires_at"`
}

type ImageService struct {
	ImageRepo         *db.ImageRepo
	DetectionRepo     *db.DetectionRepo
	EventPersonRepo   *db.EventPersonRepo
	RekognitionClient *rekognition.Client
	S3Service         *S3Service
}

var (
	ErrNoFaceMatch = errors.New("no matching face found")
)

// Batch Image Processing using concurrency (waitgroups and goroutines)
func (s *ImageService) BatchImageProcessing(ctx context.Context, storageKeys []string, uploadedBy, eventId uint) ([]uint, []error) {
	log.Printf("[Batch] Starting batch processing for event %d with %d images", eventId, len(storageKeys))
	// start waitgroup
	var wg sync.WaitGroup
	errChan := make(chan error, len(storageKeys))
	idChan := make(chan uint, len(storageKeys))

	// loop through keys - create a waitgroup for each image
	for _, key := range storageKeys {
		wg.Add(1)
		// start a goroutine in each waitgroup - run image indexing concurrently
		go func(k string) {
			defer wg.Done()
			log.Printf("[Image %s] Starting processing...", key)
			photoId, err := s.ImageProcessing(ctx, k, uploadedBy, eventId)
			if err != nil {
				errChan <- err
				return
			}
			idChan <- photoId
			log.Printf("[Image %s] Successfully processed: id - %v", key, photoId)
		}(key)
	}

	// wait for all waitgroups to finish/close
	wg.Wait()
	close(errChan)
	close(idChan)

	// collect errors and ids
	var errs []error
	var photoIds []uint
	for e := range errChan {
		errs = append(errs, e)
	}
	for id := range idChan {
		photoIds = append(photoIds, id)
	}
	log.Printf("Photo Ids: %v", photoIds)

	// Call matching and linking function
	if len(photoIds) > 0 {
		if err := s.MatchAndLinkFaces(ctx, eventId, photoIds); err != nil {
			errs = append(errs, err)
		}
	}

	return photoIds, errs
}

// Process saved images
func (s *ImageService) ImageProcessing(ctx context.Context, storageKey string, uploadedBy, eventID uint) (uint, error) {
	var photoId uint
	// Open a db transaction to only commit db changes if successful
	err := s.ImageRepo.DB.Transaction(func(tx *gorm.DB) error {
		txImageRepo := s.ImageRepo.WithTx(tx)
		txDetectRepo := s.DetectionRepo.WithTx(tx)

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

		photoId = photoID

		EventID := strconv.FormatUint(uint64(imageSave.EventID), 10)

		// check if collection exists/create collection, store collectionID
		collectionID, err := EnsureCollectionExists(ctx, s.RekognitionClient, EventID)
		if err != nil {
			return fmt.Errorf("collection check failed: %w", err)
		}

		BucketName := os.Getenv("BUCKET_NAME")
		if BucketName == "" {
			return fmt.Errorf("BUCKET_NAME environment variable not set")
		}
		log.Printf("Using bucket: %s, collection: %s, storage key: %s", BucketName, collectionID, imageSave.StorageKey)

		// index and add faces to rekognition collection, store rekognition face data
		detectionResults, err := AddFaceToCollection(ctx, s.RekognitionClient, collectionID, BucketName, imageSave.StorageKey)
		if err != nil {
			return fmt.Errorf("index faces failed: %w", err)
		}
		log.Printf("detected %d faces in image", len(detectionResults))

		// convert rekognition face data splice to DetectionResults struct splice
		if len(detectionResults) > 0 {
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
		}

		return nil
	})

	if err != nil {
		log.Printf("Image processing failed: %v", err)
		return 0, err
	}

	return photoId, err
}

// find matches for faces, and link to correct event_person
func (s *ImageService) MatchAndLinkFaces(ctx context.Context, eventId uint, photoIds []uint) error {
	log.Printf("[Matching] Starting face linking for event %d", eventId)

	// start db transaction
	return s.ImageRepo.DB.Transaction(func(tx *gorm.DB) error {
		txDetectRepo := s.DetectionRepo.WithTx(tx)
		txEventPersonRepo := s.EventPersonRepo.WithTx(tx)

		collectionID := fmt.Sprintf("event-%s", strconv.FormatUint(uint64(eventId), 10))

		// check that collection exists
		exists, err := CollectionExists(ctx, s.RekognitionClient, collectionID)
		if err != nil {
			return fmt.Errorf("error finding collections: %w", err)
		} else if !exists {
			return fmt.Errorf("no such collection")
		}

		// fetch all detections for the event
		detections, err := txDetectRepo.GetDetectionsByPhotoIds(photoIds)
		if err != nil {
			return fmt.Errorf("error fetching detections: %w", err)
		}
		log.Printf("[Matching] Detections: %v", detections)

		for _, detectres := range detections {
			compareResults, err := CompareFaces(ctx, s.RekognitionClient, collectionID, detectres.RekognitionID)
			if err != nil {
				return fmt.Errorf("error comparing faces: %w", err)
			}
			log.Printf("[Matching] Comparison Results: %v", compareResults)

			var matchId string
			if len(compareResults) == 0 {
				newPersonId, err := txEventPersonRepo.NewEventPerson(&models.EventPerson{
					Name:    "New Person",
					EventID: eventId,
				})
				if err != nil {
					return fmt.Errorf("error creating new event person: %w", err)
				}
				matchId = fmt.Sprintf("%d", newPersonId)
				log.Printf("[Matching] New Person created - id: %d, converted: %v", newPersonId, matchId)
			} else {
				matchFace := *compareResults[0].Face.FaceId
				matchUint, err := txDetectRepo.FindMatches(matchFace)
				if err != nil {
					if errors.Is(err, gorm.ErrRecordNotFound) {
						newPersonId, err := txEventPersonRepo.NewEventPerson(&models.EventPerson{
							Name:    "New Person",
							EventID: eventId,
						})
						if err != nil {
							return fmt.Errorf("error creating new event person: %w", err)
						}
						matchId = fmt.Sprintf("%d", newPersonId)
						log.Printf("[Matching] Matched face not in DB, New Person created - id: %d", newPersonId)

						if err := txDetectRepo.UpdateDetectionsWithPersonID(matchFace, matchId); err != nil {
							return fmt.Errorf("failed updating matched face: %w", err)
						}
					} else {
						return fmt.Errorf("error finding matching face entry: %w", err)
					}
				} else if matchUint == 0 {
					log.Printf("[Matching] Matched face - id: %d", matchUint)
					newPersonId, err := txEventPersonRepo.NewEventPerson(&models.EventPerson{
						Name:    "New Person",
						EventID: eventId,
					})
					if err != nil {
						return fmt.Errorf("error creating new event person: %w", err)
					}
					matchId = fmt.Sprintf("%d", newPersonId)
					log.Printf("[Matching] Matched face has no person, New Person created - id: %d", newPersonId)

					if err := txDetectRepo.UpdateDetectionsWithPersonID(matchFace, matchId); err != nil {
						return fmt.Errorf("failed updating matched face: %w", err)
					}
				} else {
					matchId = strconv.FormatUint(uint64(matchUint), 10)
					log.Printf("[Matching] Face Recognised - id: %d", matchUint)
				}
			}
			if err := txDetectRepo.UpdateDetectionsWithPersonID(detectres.RekognitionID, matchId); err != nil {
				return fmt.Errorf("failed updating face_detection table: %w", err)
			}
		}
		return nil
	})
}

// find matching face in event, return matching event person id
func (s *ImageService) FindFace(ctx context.Context, storageKey string, eventId uint) (uint, error) {
	// check if rekognition collection exists
	EventId := strconv.FormatUint(uint64(eventId), 10)
	collectionId := fmt.Sprintf("event-%s", EventId)

	exists, err := CollectionExists(ctx, s.RekognitionClient, collectionId)
	if err != nil {
		return 0, fmt.Errorf("error finding collection: %w", err)
	}
	if !exists {
		return 0, fmt.Errorf("collection does not exist, check the event/collection id")
	}

	// validate number of faces in image
	faceCount, err := CheckFaceCount(ctx, s.RekognitionClient, storageKey)
	if err != nil {
		return 0, fmt.Errorf("error detecting faces: %w", err)
	}
	if faceCount != 1 {
		return 0, fmt.Errorf("invalid image: expected 1 face, found %d", faceCount)
	}

	// search collection for given face
	searchOutput, err := SearchFaceByImage(ctx, s.RekognitionClient, collectionId, storageKey)
	if err != nil {
		return 0, fmt.Errorf("error searching collection for face: %w", err)
	}

	// if no matches - return no matches found
	if len(searchOutput) == 0 {
		return 0, ErrNoFaceMatch
	}

	// find event person id for matching person (using highest similarity entry)
	matchId, err := s.DetectionRepo.FindMatches(*searchOutput[0].Face.FaceId)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, ErrNoFaceMatch
		}
		return 0, fmt.Errorf("error finding matching event person id: %w", err)
	}

	return matchId, nil
}

// Serve presign URLs for all images in a certain collection (all images for an event person)
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

// Delete image from DB and S3
func (s *ImageService) DeletePhoto(ctx context.Context, photoID uint) error {
	tx := s.ImageRepo.DB.Begin()

	var photo models.Photos
	if err := tx.First(&photo, photoID).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("photo not found: %w", err)
	}

	BucketName := os.Getenv("BUCKET_NAME")

	// delete rekognition entries
	if len(photo.FaceDetections) > 0 {
		var faceIDs []string
		for _, fd := range photo.FaceDetections {
			if fd.RekognitionID != "" {
				faceIDs = append(faceIDs, fd.RekognitionID)
			}
		}

		collectionID := fmt.Sprintf("event-%d", photo.EventID)
		if err := DeleteFaces(ctx, s.RekognitionClient, collectionID, faceIDs); err != nil {
			log.Printf("[WARN] failed to delete Rekognition faces for photo %d: %v", photo.ID, err)
		}
	}

	// delete S3 file
	if err := s.S3Service.DeleteFile(ctx, BucketName, photo.StorageKey); err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to delete photo from S3: %w", err)
	}

	// delete DB record
	if err := tx.Delete(&photo).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to photo from DB: %w", err)
	}

	// update event timestamp
	if err := tx.Model(&models.Event{}).Where("id = ?", photo.EventID).Update("updated_at", time.Now()).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to update event tinmestamp: %w", err)
	}

	return tx.Commit().Error
}

// Save to image location DB -> ObjectKey, UploadedByID
// Check Rekognition Collections -> EventID
// IndexFaces -> collectionID
// Save Results to DB -> detectionResults

// {LOOP OVER INDEXFACES OUTPUT}
// Compare face to Collection -> faceID, collectionID
// No matches --> create new event_people, create face_detection entry
// If there are matches --> find matching face_detections entry, get event_people_id, create/update face_detections entry for this detection
