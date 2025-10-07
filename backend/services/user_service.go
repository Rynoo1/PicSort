package services

import (
	"errors"

	"github.com/Rynoo1/PicSort/backend/models"
	"gorm.io/gorm"
)

type UserService struct {
	db *gorm.DB
}

func NewUserService(db *gorm.DB) *UserService {
	return &UserService{db: db}
}

// Create a New User
func (s *UserService) CreateUser(email, username, password string) (*models.User, error) {
	var existing models.User
	err := s.db.Where("email = ?", email).First(&existing).Error
	if err == nil {
		return nil, errors.New("user already exists")
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	user := models.User{
		Email:    email,
		Username: username,
		Password: password,
	}

	if err := s.db.Create(&user).Error; err != nil {
		return nil, err
	}

	return &user, nil
}

// Find User by Email
func (s *UserService) FindByEmail(email string) (*models.User, error) {
	var user models.User
	if err := s.db.Where("email = ?", email).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}
