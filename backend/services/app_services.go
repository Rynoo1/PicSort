package services

import "github.com/Rynoo1/PicSort/backend/services/db"

type AppServices struct {
	S3Service    *S3Service
	ImageService *ImageService
	EventRepo    *db.EventRepo
}
