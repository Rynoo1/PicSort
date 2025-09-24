package db

import (
	"github.com/Rynoo1/PicSort/backend/models"
	"gorm.io/gorm"
)

type EventPersonRepo struct {
	DB *gorm.DB
}

// repo constructor
func NewEventPersonRepo(db *gorm.DB) *EventPersonRepo {
	return &EventPersonRepo{
		DB: db,
	}
}

// db transaction setup
func (r *EventPersonRepo) WithTx(tx *gorm.DB) *EventPersonRepo {
	return &EventPersonRepo{
		DB: tx,
	}
}

// Creates new event person
func (r *EventPersonRepo) NewEventPerson(person *models.EventPerson) (uint, error) {
	result := r.DB.Create(person)
	if result.Error != nil {
		return 0, result.Error
	}
	return person.ID, nil
}
