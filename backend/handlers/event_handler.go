package handlers

import (
	"github.com/Rynoo1/PicSort/backend/models"
	"github.com/Rynoo1/PicSort/backend/services"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func CreateEvent(c *fiber.Ctx, eventRepo *services.AppServices) error {

	// format request body
	var body struct {
		EventName string `json:"event_name"`
		UserIDs   []uint `json:"user_ids"`
	}

	// parse body
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "invalid request",
		})
	}

	// convert to model
	event := models.Event{EventName: body.EventName}

	// DB transaction: create event and add users
	err := eventRepo.EventRepo.DB.Transaction(func(tx *gorm.DB) error {
		txEventRepo := eventRepo.EventRepo.WithTx(tx)

		err := txEventRepo.CreateEvent(&event)
		if err != nil {
			return err
		}

		if err := txEventRepo.AddUsersToEvent(body.UserIDs, event.ID); err != nil {
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

// Check if user can add users to this event, then add users to event
func AddUsers(c *fiber.Ctx, eventRepo *services.AppServices) error {

	var body struct {
		EventID   uint   `json:"event_id"`
		AddUserID uint   `json:"add_user_id"`
		NewUserID []uint `json:"new_user_id"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	exists, err := eventRepo.EventRepo.CheckUser(body.AddUserID, body.EventID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "an error occured when checking user in event",
		})
	}
	if !exists {
		return c.Status(400).JSON(fiber.Map{
			"error": "this user cannot add users to this event",
		})
	}

	err = eventRepo.EventRepo.AddUsersToEvent(body.NewUserID, body.EventID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "failed to add new users to event",
		})
	}
	return c.JSON(fiber.Map{
		"message": "users added successfully",
	})
}

// Return all EventPerson names and ids for a specific event
func ReturnAllPeople(c *fiber.Ctx, eventRepo *services.AppServices) error {

	var body struct {
		EventId uint `json:"event_id"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "invalid request",
		})
	}

	people, err := eventRepo.ImageService.EventPersonRepo.ReturnEventPeople(body.EventId)
	if people == nil && err == nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "event not found",
		})
	} else if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "failed to find event people",
		})
	}

	return c.JSON(people)
}

// return all subcollections/folders
// find all eventpersons with event id
// return all event person names
// return all presign urls for images in the event?

// func RemoveUsers(c *fiber.Ctx, eventRepo *services.AppServices) error {

// 	var body struct {
// 		EventId      uint   `json:"event_id"`
// 		UserId       uint   `json:"user_id"`
// 		RemoveUserId []uint `json:"remove_user_id"`
// 	}

// 	if err := c.BodyParser(&body); err != nil {
// 		return c.Status(400).JSON(fiber.Map{
// 			"error": "invalid request body",
// 		})
// 	}

// }
