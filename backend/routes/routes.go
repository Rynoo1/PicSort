package routes

import (
	"github.com/Rynoo1/PicSort/backend/handlers"
	"github.com/Rynoo1/PicSort/backend/services"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func SetupRoutes(app *fiber.App, svc *services.AppServices, db *gorm.DB, authService *services.AuthService) {

	// Public Routes

	// Protected Routes
	// protected := app.Group("/api", middleware.AuthMiddleware(db, authService))

	// protected.Post("/image-processing", func(c *fiber.Ctx) error {
	// 	return handlers.ImageProcessing(c, svc.ImageService)
	// })
	// protected.Post("/event/create", func(c *fiber.Ctx) error {
	// 	return handlers.CreateEvent(c, svc)
	// })

	// Image Processing Pipeline
	app.Post("/image-processing", func(c *fiber.Ctx) error {
		return handlers.ImageProcessing(c, svc.ImageService)
	})

	// Create Event
	app.Post("/event/create", func(c *fiber.Ctx) error {
		return handlers.CreateEvent(c, svc)
	})
}
