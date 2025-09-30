package db

import (
	"errors"

	"github.com/Rynoo1/PicSort/backend/models"
	"gorm.io/gorm"
)

type EventRepo struct {
	DB *gorm.DB
}

// constructor
func NewEventRepo(db *gorm.DB) *EventRepo {
	return &EventRepo{
		DB: db,
	}
}

// transaction setup
func (r *EventRepo) WithTx(tx *gorm.DB) *EventRepo {
	return &EventRepo{
		DB: tx,
	}
}

// create new event
func (r *EventRepo) CreateEvent(event *models.Event) error {
	return r.DB.Create(event).Error
}

// Add multiple users to an event
func (r *EventRepo) AddUsersToEvent(userID []uint, eventID uint) error {
	users := make([]models.User, len(userID))
	for i, id := range userID {
		users[i] = models.User{ID: id}
	}

	event := models.Event{ID: eventID}

	err := r.DB.Model(&event).Association("Users").Append(users)
	if err != nil {
		return err
	}
	return nil
}

// Remove users from events
func (r *EventRepo) RemoveUsers(userId, eventId uint) error {
	event := models.Event{ID: eventId}
	user := models.User{ID: userId}
	err := r.DB.Model(&event).Association("Users").Delete(user)
	if err != nil {
		return err
	}
	return nil
}

// Check if a user is in an event
func (r *EventRepo) CheckUser(userId, eventId uint) (bool, error) {
	var result struct{}
	err := r.DB.Table("events_users").Where("event_id = ? AND user_id = ?", eventId, userId).First(&result).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return false, nil
	} else if err != nil {
		return false, err
	}
	return true, nil
}
