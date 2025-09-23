package handlers

import (
	"net/http"

	"github.com/Rynoo1/PicSort/backend/models"
	"github.com/Rynoo1/PicSort/backend/services"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type AuthHandler struct {
	db           *gorm.DB
	authServices *services.AuthService
	userService  *services.UserService
}

func NewAuthHandler(db *gorm.DB, authService *services.AuthService, userService *services.UserService) *AuthHandler {
	return &AuthHandler{
		db:           db,
		authServices: authService,
		userService:  userService,
	}
}

type RegisterRrequest struct {
	Email    string `json:"email" validate:"required, email"`
	Password string `json:"password" validate:"required, min=6"`
	Username string `json:"username" validate:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required, email"`
	Password string `json:"password" validate:"required"`
}

type AuthResponse struct {
	Message string       `json:"message"`
	Token   string       `json:"token"`
	User    *models.User `json:"user"`
}

// Create New User
func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req RegisterRrequest
	err := c.BodyParser(&req)
	if err != nil {
		c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
		return err
	}

	user, err := h.userService.CreateUser(req.Email, req.Username, req.Password)
	if err != nil {
		return c.Status(http.StatusConflict).JSON(fiber.Map{"error": err.Error()})
	}

	// Generate JWT token
	token, err := h.authServices.GenerateToken(user)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate token",
		})
	}

	return c.Status(http.StatusCreated).JSON(AuthResponse{
		Message: "User registered successfully",
		Token:   token,
		User:    user,
	})
}

// Login a user and return a JWT token
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	user, err := h.userService.FindByEmail(req.Email)
	if err != nil || !user.CheckPassword(req.Password) {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid credentials",
		})
	}

	// Generate JWT token
	token, err := h.authServices.GenerateToken(user)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate token",
		})
	}

	return c.JSON(AuthResponse{
		Message: "Login successful",
		Token:   token,
		User:    user,
	})
}

func (h *AuthHandler) GetProfile(c *fiber.Ctx) error {
	user := c.Locals("user").(*models.User)

	return c.JSON(fiber.Map{
		"message": "Profile retrieved successfully",
		"user":    user,
	})
}
