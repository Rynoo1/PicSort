package middleware

import (
	"net/http"
	"strings"

	"github.com/Rynoo1/PicSort/backend/models"
	"github.com/Rynoo1/PicSort/backend/services"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func AuthMiddleware(db *gorm.DB, authService *services.AuthService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get token from Authorisation header
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(http.StatusUnauthorized).JSON(fiber.Map{
				"error": "Authorisation header required",
			})
		}

		// Extract token (format: "Bearer <token>")
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			return c.Status(http.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid authorization header format",
			})
		}

		// Validate token
		claims, err := authService.ValidateToken(tokenParts[1])
		if err != nil {
			return c.Status(http.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid token",
			})
		}

		// Get user from database
		var user models.User
		if err := db.First(&user, claims.UserID).Error; err != nil {
			return c.Status(http.StatusUnauthorized).JSON(fiber.Map{
				"error": "User not found",
			})
		}

		// Store user in context for use in handlers
		c.Locals("user", &user)

		return c.Next()
	}
}
