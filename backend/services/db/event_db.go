package db

import (
	"fmt"
	"time"

	"github.com/Rynoo1/PicSort/backend/models"
	"gorm.io/gorm"
)

type EventRepo struct {
	DB *gorm.DB
}

type ReturnEvents struct {
	EventName string `json:"event_name"`
	EventId   uint   `json:"event_id"`
}

type ReturnEventWithImages struct {
	EventId   uint           `json:"id"`
	EventName string         `json:"name"`
	Images    []ImageResults `json:"images"`
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
func (r *EventRepo) AddUsersToEvent(userIDs []uint, eventID uint) error {
	if len(userIDs) == 0 {
		return fmt.Errorf("no user IDs provided")
	}

	event := models.Event{ID: eventID}

	var existing []models.User
	if err := r.DB.Model(&event).Association("Users").Find(&existing); err != nil {
		return fmt.Errorf("failed to fetch existing users: %w", err)
	}

	existingIDs := make(map[uint]struct{})
	for _, u := range existing {
		existingIDs[u.ID] = struct{}{}
	}

	for _, id := range userIDs {
		if _, exists := existingIDs[id]; exists {
			continue
		}
		user := models.User{ID: id}
		if err := r.DB.Model(&event).Association("Users").Append(&user); err != nil {
			return fmt.Errorf("failed to add user %d: %w", id, err)
		}
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
	var count int64
	err := r.DB.Table("event_users").Where("event_id = ? AND user_id = ?", eventId, userId).Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// Returns all event names and ids for a specific user,
func (r *EventRepo) FindAllEvents(userId uint) ([]ReturnEventWithImages, error) {
	var user models.User
	err := r.DB.Preload("Events").First(&user, userId).Error
	if err != nil {
		return nil, err
	}

	result := make([]ReturnEventWithImages, 0, len(user.Events))
	for _, ev := range user.Events {
		var images []ImageResults
		err := r.DB.Model(&models.Photos{}).
			Select("id, storage_key").
			Where("event_id = ?", ev.ID).
			Limit(4).
			Find(&images).Error
		if err != nil {
			return nil, err
		}

		result = append(result, ReturnEventWithImages{
			EventId:   ev.ID,
			EventName: ev.EventName,
			Images:    images,
		})
	}
	return result, nil
}

// Find all users who are in the same events as the given user
func (r *EventRepo) FindAllUsers(userId uint) ([]models.User, error) {
	var users []models.User

	err := r.DB.Table("users").
		Select("DISTINCT users.id, users.name").
		Joins("JOIN user_events ue on ue.user_id = users.id").
		Where("ue.event_id IN (?)",
			r.DB.Table("user_events").
				Select("event_id").
				Where("user_id = ?", userId),
		).
		Where("users.id <> ?", userId).
		Scan(&users).Error

	if err != nil {
		return nil, err
	}
	return users, nil
}

// Find event updated at for specific event
func (r *EventRepo) FindEventMeta(eventId uint) (string, error) {
	var result models.Event

	err := r.DB.Where("id = ?", eventId).First(&result).Error
	if err != nil {
		return "", err
	}
	return result.UpdatedAt.UTC().Format(time.RFC3339), nil
}
