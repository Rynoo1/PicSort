package handlers

import (
	"log"
	"sync"

	"github.com/Rynoo1/PicSort/backend/models"
	"github.com/Rynoo1/PicSort/backend/services"
	"github.com/Rynoo1/PicSort/backend/services/db"
	"github.com/gofiber/fiber/v2"
	"golang.org/x/sync/errgroup"
	"gorm.io/gorm"
)

// Create a new event
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
		NewUserID []uint `json:"new_user_id"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	addUser := c.Locals("user").(models.User)

	exists, err := eventRepo.EventRepo.CheckUser(addUser.ID, body.EventID)
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

// Return all events for a specific user
func ReturnAllEvents(c *fiber.Ctx, eventRepo *services.AppServices) error {
	user := c.Locals("user").(*models.User)

	events, err := eventRepo.EventRepo.FindAllEvents(user.ID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "could not find events for user",
		})
	}

	var g errgroup.Group

	for i := range events {
		ev := &events[i]
		if len(ev.Images) == 0 {
			continue
		}

		g.Go(func() error {
			keys := make([]string, len(ev.Images))
			for j, img := range ev.Images {
				keys[j] = img.StorageKey
			}

			urls, err := eventRepo.S3Service.GetPresignViewObjects(c.Context(), keys, ev.EventId)
			if err != nil {
				return err
			}

			ev.Images = make([]db.ImageResults, len(urls))
			for j, u := range urls {
				ev.Images[j] = db.ImageResults{
					ID:         ev.Images[j].ID,
					StorageKey: u.URL,
				}
			}
			return nil
		})
	}

	if err := g.Wait(); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "failed to generate presign URLs",
		})
	}

	return c.JSON(events)
}

// Return presign URLs for all images from a specific event person
func ReturnAllEventPersonImages(c *fiber.Ctx, eventRepo *services.AppServices) error {

	var body struct {
		EventPersonId uint `json:"event_person_id"`
		EventId       uint `json:"event_id"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "invalid request",
		})
	}

	imageKeys, err := eventRepo.ImageService.EventPersonRepo.FindPhotoKeysForPerson(body.EventPersonId)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "could not find image keys for that person",
		})
	}

	urlObjects, err := eventRepo.S3Service.GetPresignViewObjects(c.Context(), imageKeys, body.EventId)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "could not get presign URLs for images",
		})
	}

	return c.JSON(urlObjects)
}

// Return all images and people for an event
func ReturnEventData(c *fiber.Ctx, eventRepo *services.AppServices) error {
	var body struct {
		EventId uint `json:"event_id"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request",
		})
	}

	var (
		people     []db.ReturnPeople
		imageKeys  []db.ImageResults
		err1, err2 error
		wg         sync.WaitGroup
	)

	wg.Add(2)

	go func() {
		defer wg.Done()
		people, err1 = eventRepo.EventPersonRepo.ReturnEventPeople(body.EventId)
		log.Printf("people found: %v", people)
	}()

	go func() {
		defer wg.Done()
		imageKeys, err2 = eventRepo.ImageService.ImageRepo.FindAllEventImages(body.EventId)
		log.Printf("images: %v", imageKeys)
	}()

	wg.Wait()

	if err1 != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to find event people",
		})
	}

	if err2 != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to find event images",
		})
	}

	type urlResult struct {
		ID     uint
		URL    string
		Expire string
		Err    error
	}

	urlCh := make(chan urlResult, len(imageKeys))
	for _, img := range imageKeys {
		img := img
		go func() {
			urlObj, err := eventRepo.S3Service.GetPresignViewObjects(c.Context(), []string{img.StorageKey}, body.EventId)
			if err != nil {
				urlCh <- urlResult{ID: img.ID, URL: "", Expire: "", Err: err}
				return
			}
			urlCh <- urlResult{ID: img.ID, URL: urlObj[0].URL, Expire: urlObj[0].ExpiresAt, Err: nil}
		}()
	}

	var urlObjects []map[string]interface{}
	for i := 0; i < len(imageKeys); i++ {
		res := <-urlCh
		if res.Err != nil {
			continue
		}
		urlObjects = append(urlObjects, map[string]interface{}{
			"id":      res.ID,
			"url":     res.URL,
			"expires": res.Expire,
		})
	}

	return c.JSON(fiber.Map{
		"event_id": body.EventId,
		"people":   people,
		"images":   urlObjects,
	})
}

// Return Event meta data
func ReturnMeta(c *fiber.Ctx, eventRepo *services.AppServices) error {
	var body struct {
		EventId uint `json:"event_id"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	meta, err := eventRepo.EventRepo.FindEventMeta(body.EventId)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "error finding event updated at",
		})
	}

	return c.JSON(fiber.Map{
		"updatedAt": meta,
	})
}

// return all users who are in the same events as the input userId

// remove users {admin/permissions?}
//

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
