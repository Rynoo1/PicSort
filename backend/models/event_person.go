package models

type EventPerson struct {
	ID      uint   `json:"id" gorm:"primaryKey"`
	Name    string `json:"name" gorm:"not null"`
	EventID uint   `json:"event_id" gorm:"not null"` // Foreign Key

	Event Event `json:"event" gorm:"foreignKey:EventID;references:ID;constraint:OnDelete:CASCADE;"` // Relationship - Belongs to Event

	FaceDetections []FaceDetection `json:"face_detections" gorm:"foreignKey:EventPersonID;constraint:OnDelete:SET NULL;"` // One to many relationship with FaceDetections
}
