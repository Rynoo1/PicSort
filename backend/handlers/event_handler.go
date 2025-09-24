package handlers

import (
	"github.com/Rynoo1/PicSort/backend/models"
	"github.com/Rynoo1/PicSort/backend/services"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func CreateEvent(c *fiber.Ctx, eventRepo *services.AppServices) error {

	var body struct {
		EventName string `json:"event_name"`
		UserIDs   []uint `json:"user_ids"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "invalid request",
		})
	}

	event := models.Event{EventName: body.EventName}

	err := eventRepo.EventRepo.DB.Transaction(func(tx *gorm.DB) error {
		txEventRepo := eventRepo.EventRepo.WithTx(tx)

		err := txEventRepo.CreateEvent(&event)
		if err != nil {
			return err
		}

		if err := txEventRepo.AddUsesrToEvent(body.UserIDs, event.ID); err != nil {
			return err
		}

		return nil

	})

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "failed to create event with users",
		})
	}

	return c.Status(201).JSON(event)
}
