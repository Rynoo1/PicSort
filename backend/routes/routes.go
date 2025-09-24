package routes

import (
	"github.com/Rynoo1/PicSort/backend/handlers"
	"github.com/Rynoo1/PicSort/backend/services"
	"github.com/gofiber/fiber/v2"
)

func SetupRoutes(app *fiber.App, svc *services.AppServices) {

	app.Post("/image-processing", func(c *fiber.Ctx) error {
		return handlers.ImageProcessing(c, svc.ImageService)
	})
}
