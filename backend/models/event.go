package models

import "time"

type Event struct {
	ID        uint      `json:"id" gorm:"primaryKey"` // primary key
	EventName string    `json:"event_name" gorm:"not null"`
	UpdatedAt time.Time `json:"updated_at"`
	Users     []User    `json:"users" gorm:"many2many:event_users"` // Many to Many relationship with Users

	FaceDetections []FaceDetection `json:"faces" gorm:"foreignKey:EventID"` // One to Many relationship with FaceDetections{HasMany}
}
