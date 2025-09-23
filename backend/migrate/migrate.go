package migrate

import (
	"fmt"

	"github.com/Rynoo1/PicSort/backend/models"
	"gorm.io/gorm"
)

func RunMigrations(db *gorm.DB) error {
	err := db.AutoMigrate(
		&models.EventPerson{},
		&models.Event{},
		&models.FaceDetection{},
		&models.Photos{},
		&models.User{},
	)
	if err != nil {
		return fmt.Errorf("failed to run migrations: %v", err)
	}
	return nil
}
