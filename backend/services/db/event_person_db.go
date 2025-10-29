package db

import (
	"errors"
	"fmt"
	"time"

	"github.com/Rynoo1/PicSort/backend/models"
	"gorm.io/gorm"
)

type EventPersonRepo struct {
	DB *gorm.DB
}

type ReturnPeople struct {
	PersonName string `json:"person_name"`
	PersonId   uint   `json:"person_id"`
	Key        string `json:"key"`
	PhotoId    uint   `json:"photo_id"`
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
	var count int64

	if err := r.DB.Model(&models.EventPerson{}).Where("event_id = ?", person.EventID).Count(&count).Error; err != nil {
		return 0, err
	}

	if person.Name == "" || person.Name == "New Person" {
		person.Name = fmt.Sprintf("person %d", count+1)
	}

	result := r.DB.Create(person)
	if result.Error != nil {
		return 0, result.Error
	}
	if err := r.DB.Model(models.Event{}).Where("id = ?", person.EventID).Update("updated_at", time.Now()).Error; err != nil {
		return 0, err
	}
	return person.ID, nil
}

// Update Event Person name
func (r *EventPersonRepo) UpdatePersonName(personId uint, newName string) error {
	// fetch the person's event id
	var person models.EventPerson
	if err := r.DB.Select("event_id").First(&person, personId).Error; err != nil {
		return err
	}

	if err := r.DB.Model(&models.EventPerson{}).Where("id = ?", personId).Update("name", newName).Error; err != nil {
		return err
	}

	if err := r.DB.Model(models.Event{}).Where("id = ?", person.EventID).Update("updated_at", time.Now()).Error; err != nil {
		return err
	}
	return nil
}

// Find EventPerson name by EventPerson Id
func (r *EventPersonRepo) FindNameById(personId uint) (string, error) {
	var result models.EventPerson
	err := r.DB.Table("event_people").Select("name").Where("id = ?", personId).First(&result).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return "", nil
	} else if err != nil {
		return "", err
	}
	return result.Name, nil
}

// Find all EventPerson name and id by EventId
func (r *EventPersonRepo) ReturnEventPeople(eventId uint) ([]ReturnPeople, error) {
	var result []ReturnPeople
	err := r.DB.Table("event_people").
		Select("DISTINCT ON (event_people.id) event_people.name as person_name",
			"event_people.id as person_id",
			"photos.storage_key as key",
			"photos.id as photo_id").
		Joins("LEFT JOIN face_detections ON face_detections.event_person_id = event_people.id").
		Joins("LEFT JOIN photos ON photos.id = face_detections.photo_id").
		Where("event_people.event_id = ?", eventId).
		Order("event_people.id, photos.id").
		Find(&result).Error
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
