package routes

import (
	"github.com/Rynoo1/PicSort/backend/handlers"
	"github.com/Rynoo1/PicSort/backend/middleware"
	"github.com/Rynoo1/PicSort/backend/services"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func SetupRoutes(app *fiber.App, svc *services.AppServices, db *gorm.DB, authService *services.AuthService) {
	authHandler := handlers.NewAuthHandler(db, authService, svc.UserService)

	// Public Routes
	app.Post("/auth/register", authHandler.Register)
	app.Post("/auth/login", authHandler.Login)

	// Protected Routes
	protected := app.Group("/api", middleware.AuthMiddleware(db, authService))

	// **IMAGES**
	// Batch image pipeline
	protected.Post("/image/processing-batch", func(c *fiber.Ctx) error {
		return handlers.ImageProcessingBatch(c, svc.ImageService)
	})

	// Generate upload URLs
	protected.Post("/image/upload-URL", func(c *fiber.Ctx) error {
		return handlers.GenerateUploadURLs(c, svc.S3Service)
	})

	// Delete image
	protected.Post("/image/delete", func(c *fiber.Ctx) error { // photo_id
		return handlers.DeletePhoto(c, svc)
	})

	// **EVENTS**  all images?
	// Create event
	protected.Post("/event/create", func(c *fiber.Ctx) error { // event_mame; []user_ids
		return handlers.CreateEvent(c, svc)
	})

	// Delete event
	protected.Post("/event/delete", func(c *fiber.Ctx) error { // event_id
		return handlers.DeleteEvent(c, svc)
	})

	// Rename event
	protected.Post("/event/rename", func(c *fiber.Ctx) error { // event_id; new_name
		return handlers.RenameEvent(c, svc)
	})

	// Return all info for all events for user
	protected.Post("/event/all", func(c *fiber.Ctx) error {
		return handlers.ReturnAllEvents(c, svc)
	})

	// Return all images and people for specific event
	protected.Post("/event/eventdata", func(c *fiber.Ctx) error {
		return handlers.ReturnEventData(c, svc)
	})

	// Return event updated at value
	protected.Post("/event/eventmeta", func(c *fiber.Ctx) error {
		return handlers.ReturnMeta(c, svc)
	})

	// Return all images for specific event person
	protected.Post("/event/person-images", func(c *fiber.Ctx) error { // event_person_id; event_id
		return handlers.ReturnAllEventPersonImages(c, svc)
	})

	// Return all event_person names and ids for specific event
	protected.Post("/event/people", func(c *fiber.Ctx) error { // event_id
		return handlers.ReturnAllPeople(c, svc)
	})

	// Add users to events
	protected.Post("/event/addusers", func(c *fiber.Ctx) error { // event_id; []new_user_id
		return handlers.AddUsers(c, svc)
	})

	// Update Event Person name
	protected.Post("/event/updatename", func(c *fiber.Ctx) error { // person_id; new_name
		return handlers.UpdatePersonName(c, svc)
	})

	// **USER**
	// Return all events for specific user
	protected.Post("/user/events", func(c *fiber.Ctx) error { // user in locals
		return handlers.ReturnAllEvents(c, svc)
	})

	// Return all related users - users in same events
	protected.Post("/user/related", func(c *fiber.Ctx) error { // user in locals
		return handlers.RelatedUsers(c, svc)
	})

	// Upload search image
	protected.Post("/search/upload-url", func(c *fiber.Ctx) error { // event_id, filename; content_type
		return handlers.GetSearchUpload(c, svc.S3Service)
	})

	// Search using image
	protected.Post("/search", func(c *fiber.Ctx) error { // storage_key; event_id
		return handlers.SearchCollection(c, svc.ImageService)
	})

	// Search users
	protected.Get("/users/search/", func(c *fiber.Ctx) error {
		return handlers.SearchUsers(c, svc)
	})

	// TODO: Remove a user
	// TODO: Leave event
	// TODO: Download images?
}
