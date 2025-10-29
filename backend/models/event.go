package models

import "time"

type Event struct {
	ID        uint      `json:"id" gorm:"primaryKey"` // primary key
	EventName string    `json:"event_name" gorm:"not null"`
	UpdatedAt time.Time `json:"updated_at"`

	Users []User `json:"users" gorm:"many2many:event_users;constraint:OnDelete:CASCADE;"` // Many to Many relationship with Users

	Photos         []Photos        `json:"photos" gorm:"foreignKey:EventID;constraint:OnDelete:CASCADE;"`
	FaceDetections []FaceDetection `json:"faces" gorm:"foreignKey:EventID;constraint:OnDelete:CASCADE;"` // One to Many relationship with FaceDetections{HasMany}
	EventPersons   []EventPerson   `json:"people" gorm:"foreignKey:EventID;constraint:OnDelete:CASCADE;"`
}
