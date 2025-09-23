package migrate

import (
	"log"

	"github.com/Rynoo1/PicSort/backend/config"
	"github.com/Rynoo1/PicSort/backend/models"
)

func RunMigrations() {
	err := config.DB.AutoMigrate(
		&models.EventPerson{},
		&models.Event{},
		&models.FaceDetection{},
		&models.Photos{},
		&models.User{},
	)
	if err != nil {
		log.Fatal("migration failed: ", err)
	}
}
