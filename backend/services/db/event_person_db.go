package db

import (
	"errors"

	"github.com/Rynoo1/PicSort/backend/models"
	"gorm.io/gorm"
)

type EventPersonRepo struct {
	DB *gorm.DB
}

type ReturnPeople struct {
	PersonName string `json:"person_name"`
	PersonId   uint   `json:"person_id"`
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

// Find EventPerson name by EventPerson Id
func (r *EventPersonRepo) FindNameById(personId uint) (string, error) {
	var result string
	err := r.DB.Table("event_person").Select("name").Where("id = ?", personId).First(&result).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return "", nil
	} else if err != nil {
		return "", err
	}
	return result, nil
}

// Find all EventPerson name and id by EventId
func (r *EventPersonRepo) ReturnEventPeople(eventId uint) ([]ReturnPeople, error) {
	var result []ReturnPeople
	err := r.DB.Table("event_person").Select("name", "id").Where("event_id = ?", eventId).First(&result).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	} else if err != nil {
		return nil, err
	}
	return result, nil
}

// Find all photo keys for a specific event person
func (r *EventPersonRepo) FindPhotoKeysForPerson(eventPersonId uint) ([]string, error) {
	var keys []string

	err := r.DB.Table("photos").
		Select("DISTINCT photos.storage_key").
		Joins("JOIN face_detections fd ON fd.photo_id = photos.id").
		Where("fd.event_person_id = ?", eventPersonId).
		Scan(&keys).Error

	if err != nil {
		return nil, err
	}

	return keys, nil
}
