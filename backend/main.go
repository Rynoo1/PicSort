package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/Rynoo1/PicSort/backend/config"
	"github.com/Rynoo1/PicSort/backend/migrate"
	"github.com/Rynoo1/PicSort/backend/routes"
	"github.com/Rynoo1/PicSort/backend/services"
	servdb "github.com/Rynoo1/PicSort/backend/services/db"
	awsCon "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/rekognition"
	"github.com/gofiber/fiber/v2"
)

func main() {

	// Init DB
	db, err := config.InitDB()
	if err != nil {
		log.Fatalf("Database init failed: %v", err)
	}

	// Ping DB
	sqlDB, _ := db.DB()
	if err := sqlDB.Ping(); err != nil {
		log.Fatalf("Database ping failed: %v", err)
	}
	log.Println("Database connection OK")

	defer func() {
		if err := sqlDB.Close(); err != nil {
			log.Printf("error closing database: %v", err)
		}
	}()

	// Run migrations
	if err := migrate.RunMigrations(db); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}
	fmt.Println("Database migrated successfully!")

	cfg, err := awsCon.LoadDefaultConfig(context.TODO(),
		awsCon.WithSharedConfigFiles([]string{"./.aws/config", "./.aws/credentials"}),
		awsCon.WithSharedConfigProfile("default"))
	if err != nil {
		log.Fatalf("unable to load AWS config: %v", err)
	}

	creds, err := cfg.Credentials.Retrieve(context.TODO())
	if err != nil {
		log.Fatalf("unable to retrieve credentials: %v", err)
	}
	fmt.Println("Access Key ID:", creds.AccessKeyID)
	fmt.Println("Secret Access Key:", creds.SecretAccessKey)

	jwtSecret := os.Getenv("JWT_SECRET")

	// Initialise repos, services, clients
	s3Service := services.NewS3Service(cfg)
	rekClient := rekognition.NewFromConfig(cfg)
	imageRepo := servdb.NewImageRepo(db)
	eventPersonRepo := servdb.NewEventPersonRepo(db)
	detectionRepo := servdb.NewDetectionRepo(db)
	eventRepo := servdb.NewEventRepo(db)
	userService := services.NewUserService(db)
	imageServices := &services.ImageService{
		ImageRepo:         imageRepo,
		EventPersonRepo:   eventPersonRepo,
		DetectionRepo:     detectionRepo,
		RekognitionClient: rekClient,
		S3Service:         s3Service,
	}
	appServices := &services.AppServices{
		S3Service:    s3Service,
		ImageService: imageServices,
		EventRepo:    eventRepo,
		UserService:  userService,
	}
	authService := services.NewAuthService(jwtSecret)

	app := fiber.New()

	routes.SetupRoutes(app, appServices, db, authService)

	log.Fatal(app.Listen(":8080"))
}
