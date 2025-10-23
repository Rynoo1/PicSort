package handlers

import (
	"fmt"
	"os"

	"github.com/Rynoo1/PicSort/backend/services"
	"github.com/gofiber/fiber/v2"
)

// type PersonImages struct {
// 	Name   string                     `json:"name"`
// 	Images []services.PresignedObject `json:"images"`
// }

type SearchPerson struct {
	ID   uint   `json:"id"`
	Name string `json:"name"`
}

// Process single image
func ImageProcessing(c *fiber.Ctx, repo *services.ImageService) error {
	// body format struct
	var body struct {
		StorageKey string `json:"storage_key"`
		UploadedBy uint   `json:"uploaded_by"`
		EventID    uint   `json:"event_id"`
	}

	// pass body into the struct
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "invalid request",
		})
	}

	if _, err := repo.ImageProcessing(c.Context(), body.StorageKey, body.UploadedBy, body.EventID); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status": "ok",
	})
}

// Process multiple images
func ImageProcessingBatch(c *fiber.Ctx, repo *services.ImageService) error {
	var body struct {
		StorageKeys []string `json:"storage_keys"`
		UploadedBy  uint     `json:"uploaded_by"`
		EventId     uint     `json:"event_id"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "invalid request",
		})
	}

	_, errs := repo.BatchImageProcessing(c.Context(), body.StorageKeys, body.UploadedBy, body.EventId)
	if len(errs) > 0 {
		return c.Status(500).JSON(fiber.Map{
			"errors": errs,
		})
	}

	return c.JSON(fiber.Map{
		"status": "ok",
	})
}

// upload image for searching
func GetSearchUpload(c *fiber.Ctx, repo *services.S3Service) error {
	var body struct {
		EventId     uint   `json:"event_id"`
		Filename    string `json:"filename"`
		ContentType string `json:"content_type"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "invalid request",
		})
	}

	allowed := map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
	}
	if !allowed[body.ContentType] {
		return c.Status(400).JSON(fiber.Map{
			"error": "unsupported file type",
		})
	}

	objectKey := fmt.Sprintf("search/%d/%s", body.EventId, body.Filename)
	bucketName := os.Getenv("BUCKET_NAME")

	url, err := repo.PresignPutObject(c.Context(), bucketName, objectKey, body.ContentType, 120)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"upload_url":  url,
		"storage_key": objectKey,
	})
}

// Search Collection for matching faces/event_people
func SearchCollection(c *fiber.Ctx, repo *services.ImageService) error {

	var body struct {
		StorageKey string `json:"storage_key"`
		EventId    uint   `json:"event_id"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "invalid request",
		})
	}

	// find matching faces in the event collection
	matchingId, err := repo.FindFace(c.Context(), body.StorageKey, body.EventId)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// find event person name
	personName, err := repo.EventPersonRepo.FindNameById(matchingId)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// // find all storage keys for specific event person
	// keys, _, err := repo.ImageRepo.FindAllInCollection(matchingId)
	// if err != nil {
	// 	return c.Status(500).JSON(fiber.Map{
	// 		"error": err.Error(),
	// 	})
	// }

	// // generate presigned urls for all images
	// urls, err := repo.S3Service.GetPresignViewObjects(c.Context(), keys, body.EventId)
	// if err != nil {
	// 	return c.Status(500).JSON(fiber.Map{
	// 		"error": err.Error(),
	// 	})
	// }

	// go func() {
	// 	if delErr := repo.S3Service.DeleteObject(c.Context(), body.StorageKey); delErr != nil {
	// 		log.Printf("Failed to delete search image %s: %v", body.StorageKey, delErr)
	// 	}
	// }()

	// out := PersonImages{
	// 	Name:   personName,
	// 	Images: urls,
	// }

	out := SearchPerson{
		ID:   matchingId,
		Name: personName,
	}

	return c.JSON(out)
	// delete reference image from bucket after complete
}

// Generate presign URLs to upload images
func GenerateUploadURLs(c *fiber.Ctx, repo *services.S3Service) error {
	var req struct {
		Files []struct {
			Filename    string `json:"filename"`
			ContentType string `json:"content_type"`
		} `json:"files"`
		Prefix string `json:"prefix"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "invalid request",
		})
	}

	if len(req.Files) == 0 {
		return c.Status(400).JSON(fiber.Map{
			"error": "no files provided",
		})
	}
	if req.Prefix == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "prefix is required",
		})
	}

	uploads, err := repo.GetPresignedUploadURLs(c.Context(), []struct {
		Filename    string
		ContentType string
	}(req.Files), req.Prefix)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(200).JSON(fiber.Map{
		"uploads": uploads,
	})
}
