package models

type Photos struct {
	ID         uint   `json:"id" gorm:"primaryKey"`
	StorageKey string `json:"storage_key" gorm:"not null;uniqueIndex"`

	EventID    uint `json:"event_id" gorm:"not null"`    // foreign key
	UploadedBy uint `json:"uploaded_by" gorm:"not null"` // foreign key

	FaceDetections []FaceDetection `json:"face_detections" gorm:"foreignKey:PhotoID"` // One to Many relationship with FaceDetections{HasMany}

	Event Event `json:"event" gorm:"foreignKey:EventID;references:ID"`   // Relationship - Belongs to Events
	User  User  `json:"user" gorm:"foreignKey:UploadedBy;references:ID"` // Relationship - Belongs to Users
}
