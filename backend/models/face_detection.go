package models

type FaceDetection struct {
	ID            uint    `json:"id" gorm:"primaryKey"`
	RekognitionID string  `json:"rekognition_id"`
	Confidence    float32 `json:"confidence"`

	PhotoID       uint  `json:"photo_id" gorm:"not null"` // foreign key
	EventPersonID *uint `json:"event_person_id"`          // foreign key
	EventID       uint  `json:"event_id" gorm:"not null"` // foreign key

	Photo  Photos      `json:"photo" gorm:"foreignKey:PhotoID;references:ID"`        // Relationship - Belongs to Photos
	Person EventPerson `json:"person" gorm:"foreignKey:EventPersonID;references:ID"` // Relationship - Belongs to EventPeople
	Event  Event       `json:"event" gorm:"foreignKey:EventID;references:ID"`        // Relationship - Belongs to Events
}
