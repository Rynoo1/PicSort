package main

import (
	"context"
	"fmt"
	"log"

	"github.com/Rynoo1/PicSort/backend/config"
	"github.com/Rynoo1/PicSort/backend/migrate"
	"github.com/Rynoo1/PicSort/backend/routes"
	"github.com/Rynoo1/PicSort/backend/services"
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

	s3Service := services.NewS3Service(cfg)
	rekClient := rekognition.NewFromConfig(cfg)
	repo := services.NewRepository(db, rekClient)

	app := fiber.New()

	routes.SetupRoutes(app, repo, s3Service)

	log.Fatal(app.Listen(":8080"))
}
