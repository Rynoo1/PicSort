package handlers

import (
	"github.com/Rynoo1/PicSort/backend/services"
	"github.com/gofiber/fiber/v2"
)

type PersonImages struct {
	Name   string                     `json:"name"`
	Images []services.PresignedObject `json:"images"`
}

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

	if err := repo.ImageProcessing(c.Context(), body.StorageKey, body.UploadedBy, body.EventID); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status": "ok",
	})
}

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

	errs := repo.BatchImageProcessing(c.Context(), body.StorageKeys, body.UploadedBy, body.EventId)
	if len(errs) > 0 {
		return c.Status(500).JSON(fiber.Map{
			"errors": errs,
		})
	}

	return c.JSON(fiber.Map{
		"status": "ok",
	})
}

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

	// find all storage keys for specific event person
	keys, _, err := repo.ImageRepo.FindAllInCollection(matchingId)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// generate presigned urls for all images
	urls, err := repo.S3Service.GetPresignViewObjects(c.Context(), keys, body.EventId)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	out := PersonImages{
		Name:   personName,
		Images: urls,
	}

	return c.JSON(out)
	// delete reference image from bucket after complete
}
