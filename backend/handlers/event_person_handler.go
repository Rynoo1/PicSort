package handlers

import (
	"github.com/Rynoo1/PicSort/backend/services"
	"github.com/gofiber/fiber/v2"
)

func UpdatePersonName(c *fiber.Ctx, eventRepo *services.AppServices) error {
	var body struct {
		PersonId uint   `json:"person_id"`
		NewName  string `json:"new_name"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "invalid request",
		})
	}

	err := eventRepo.EventPersonRepo.UpdatePersonName(body.PersonId, body.NewName)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "error updating persons name",
		})
	}

	return c.Status(200).JSON(fiber.Map{
		"succes": "name changed successfuly",
	})

}
