package handlers

import (
	"context"

	"github.com/Rynoo1/PicSort/backend/services"
	"github.com/gofiber/fiber/v2"
)

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

	ctx := context.Background()

	if err := repo.ImageProcessing(ctx, body.StorageKey, body.UploadedBy, body.EventID); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status": "ok",
	})
}
