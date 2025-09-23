package main

import (
	"fmt"

	"github.com/Rynoo1/PicSort/backend/config"
	"github.com/Rynoo1/PicSort/backend/migrate"
)

func main() {
	// Init DB
	config.InitDB()

	// Run migrations
	migrate.RunMigrations()

	fmt.Println("Database migrated successfully!")
}
