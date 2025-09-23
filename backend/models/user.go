package models

type User struct {
	ID       uint   `json:"id" gorm:"primaryKey"`
	Email    string `json:"email" gorm:"uniqueIndex;not null"`
	Password string `json:"-" gorm:"not null"`
	Username string `json:"username"`

	Photos []Photos `json:"photos" gorm:"foreignKey:UploadedBy"` // One to Many relationship with Photos
	Events []Event  `json:"events" gorm:"many2many:event_users"` // Many to Many relationship with Events
}
