package handlers

import (
	"github.com/Rynoo1/PicSort/backend/models"
	"github.com/Rynoo1/PicSort/backend/services"
	"github.com/gofiber/fiber/v2"
)

func RelatedUsers(c *fiber.Ctx, repo *services.AppServices) error {
	user := c.Locals("user").(*models.User)

	results, err := repo.EventRepo.FindAllUsers(user.ID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "error finding related users: " + err.Error(),
		})
	}

	return c.JSON(results)
}

func SearchUsers(c *fiber.Ctx, repo *services.AppServices) error {
	query := c.Query("q")

	users, err := repo.UserService.SearchUsers(query)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(users)
}
