package services

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"slices"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/rekognition"
	"github.com/aws/aws-sdk-go-v2/service/rekognition/types"
)

type BoundingBox struct {
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
	Left   float64 `json:"left"`
	Top    float64 `json:"top"`
}

type FaceDetectionResult struct {
	FaceID     string
	Confidence float32
}

// Calls to check for existing collection and creates one if none
func EnsureCollectionExists(ctx context.Context, client *rekognition.Client, eventID string) (string, error) {
	collectionID := fmt.Sprintf("event-%s", eventID)
	exists, err := CollectionExists(ctx, client, collectionID)
	if err != nil {
		return "", err
	}

	if !exists {
		_, err := client.CreateCollection(ctx, &rekognition.CreateCollectionInput{
			CollectionId: aws.String(collectionID),
		})
		if err != nil {
			return "", fmt.Errorf("failed to create a collection: %w", err)
		}
		log.Printf("Created collection: %s", collectionID)
	} else {
		log.Printf("Collection already exists: %s", collectionID)
	}

	return collectionID, nil
}

// Checks for existing collection
func CollectionExists(ctx context.Context, client *rekognition.Client, collectionID string) (bool, error) {
	input := &rekognition.ListCollectionsInput{}
	for {
		out, err := client.ListCollections(ctx, input)
		if err != nil {
			return false, fmt.Errorf("failed to list collections: %w", err)
		}
		if slices.Contains(out.CollectionIds, collectionID) {
			return true, nil
		}
		if out.NextToken == nil {
			break
		}
		input.NextToken = out.NextToken
	}
	return false, nil
}

// Runs IndexFaces, adds to Rekognition collection, and returns face data
func AddFaceToCollection(ctx context.Context, client *rekognition.Client, collectionID, bucket, key string) ([]FaceDetectionResult, error) {
	out, err := client.IndexFaces(ctx, &rekognition.IndexFacesInput{
		CollectionId: aws.String(collectionID),
		Image: &types.Image{
			S3Object: &types.S3Object{
				Bucket: aws.String(bucket),
				Name:   aws.String(key),
			},
		},
		DetectionAttributes: []types.Attribute{types.AttributeDefault},
	})
	if err != nil {
		return nil, err
	}

	results := []FaceDetectionResult{}
	for _, rec := range out.FaceRecords {
		results = append(results, FaceDetectionResult{
			FaceID:     aws.ToString(rec.Face.FaceId),
			Confidence: *rec.Face.Confidence,
		})
	}

	return results, nil
}

// Compares input face with faces in collection, returns face object
func CompareFaces(ctx context.Context, client *rekognition.Client, collectionID, faceID string) ([]types.FaceMatch, error) {
	out, err := client.SearchFaces(ctx, &rekognition.SearchFacesInput{
		CollectionId:       &collectionID,
		FaceId:             &faceID,
		FaceMatchThreshold: aws.Float32(85.0),
	})

	if err != nil {
		return nil, err
	}

	return out.FaceMatches, nil
}

func SearchFaceByImage(ctx context.Context, client *rekognition.Client, collectionId, storageKey string) ([]types.FaceMatch, error) {
	out, err := client.SearchFacesByImage(ctx, &rekognition.SearchFacesByImageInput{
		CollectionId: aws.String(collectionId),
		Image: &types.Image{
			S3Object: &types.S3Object{
				Bucket: aws.String(os.Getenv("BUCKET_NAME")),
				Name:   aws.String(storageKey),
			},
		},
		MaxFaces:           aws.Int32(5),
		FaceMatchThreshold: aws.Float32(90.0),
	})

	if err != nil {
		return nil, err
	}

	return out.FaceMatches, nil
}

func CheckFaceCount(ctx context.Context, client *rekognition.Client, storageKey string) (int, error) {
	details, err := client.DetectFaces(ctx, &rekognition.DetectFacesInput{
		Image: &types.Image{
			S3Object: &types.S3Object{
				Bucket: aws.String(os.Getenv("BUCKET_NAME")),
				Name:   aws.String(storageKey),
			},
		},
		Attributes: []types.Attribute{types.AttributeDefault},
	})
	if err != nil {
		return 0, err
	}

	return len(details.FaceDetails), nil
}

func DeleteFaces(ctx context.Context, client *rekognition.Client, collectionID string, faceIDs []string) error {
	if len(faceIDs) == 0 {
		return nil
	}

	var faceIdPtrs []string
	faceIdPtrs = append(faceIdPtrs, faceIDs...)

	_, err := client.DeleteFaces(ctx, &rekognition.DeleteFacesInput{
		CollectionId: aws.String(collectionID),
		FaceIds:      faceIdPtrs,
	})
	if err != nil {
		return fmt.Errorf("failed to delete Rekognition faces: %w", err)
	}

	log.Printf("[REKOGNITION] Deleted %d faces from collection %s", len(faceIDs), collectionID)
	return nil
}

func DeleteCollection(ctx context.Context, client *rekognition.Client, collectionID string) error {
	_, err := client.DeleteCollection(ctx, &rekognition.DeleteCollectionInput{
		CollectionId: aws.String(collectionID),
	})
	if err != nil {
		var rnfe *types.ResourceNotFoundException
		if errors.As(err, &rnfe) {
			log.Printf("[REKOGNITION] Collection %s is already deleted", collectionID)
			return nil
		}
		return fmt.Errorf("failed to delete Rekognition collection %s: %w", collectionID, err)
	}

	log.Printf("[REKOGNTION] Deleted collection %s", collectionID)
	return nil
}
