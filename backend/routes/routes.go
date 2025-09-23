package routes

import (
	"github.com/Rynoo1/PicSort/backend/handlers"
	"github.com/Rynoo1/PicSort/backend/services"
	"github.com/gofiber/fiber/v2"
)

func SetupRoutes(app *fiber.App, repo *services.Repository, s3Service *services.S3Service) {

	app.Post("/image-processing", func(c *fiber.Ctx) error {
		return handlers.ImageProcessing(c, repo, s3Service)
	})
}
