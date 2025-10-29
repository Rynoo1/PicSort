package services

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/google/uuid"
)

type S3Service struct {
	Client    *s3.Client
	Presigner *s3.PresignClient
}

type PresignedObject struct {
	URL       string
	ExpiresAt string
}

type PresignedUpload struct {
	Filename     string `json:"filename"`
	PresignedURL string `json:"presigned_url"`
}

func NewS3Service(cfg aws.Config) *S3Service {
	client := s3.NewFromConfig(cfg)
	presigner := s3.NewPresignClient(client)

	return &S3Service{
		Client:    client,
		Presigner: presigner,
	}
}

// Get presigned URL to get image
func (s *S3Service) PresignGetObject(ctx context.Context, bucketName string, objectKey string) (string, error) {
	req, err := s.Presigner.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(objectKey),
	}, s3.WithPresignExpires(time.Hour*1))
	if err != nil {
		log.Printf("Could not get a presigned request to %v:%v. Heres why: %v\n", bucketName, objectKey, err)
	}
	return req.URL, err
}

// Get presigned view urls
func (s *S3Service) GetPresignViewObjects(ctx context.Context, objectKeys []string, eventID uint) ([]PresignedObject, error) {
	urls := make([]PresignedObject, 0, len(objectKeys))
	for _, key := range objectKeys {
		presigned, err := s.Presigner.PresignGetObject(ctx, &s3.GetObjectInput{
			Bucket: aws.String("picsortstorage"),
			Key:    aws.String(key),
		}, s3.WithPresignExpires(time.Hour*4))
		if err != nil {
			return nil, err
		}
		urls = append(urls, PresignedObject{
			URL:       presigned.URL,
			ExpiresAt: time.Now().Add(4 * time.Hour).UTC().Format(time.RFC3339),
		})
	}
	return urls, nil
}

// Get presigned URL to upload imag
func (s *S3Service) PresignPutObject(ctx context.Context, bucketName, objectKey, contentType string, lifetimeSecs int64) (string, error) {
	request, err := s.Presigner.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(bucketName),
		Key:         aws.String(objectKey),
		ContentType: aws.String(contentType),
	}, s3.WithPresignExpires(time.Duration(lifetimeSecs)*time.Second))
	if err != nil {
		log.Printf("Couldnt get a presigned request to put %v:%v. Heres why: %v\n", bucketName, objectKey, err)
		return "", err
	}
	return request.URL, nil
}

// Get multiple presigned URLs to upload images - one presigned URL per image
func (s *S3Service) GetPresignedUploadURLs(ctx context.Context, files []struct {
	Filename    string
	ContentType string
}, prefix string) ([]PresignedUpload, error) {
	allowedTypes := map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
	}

	uploads := make([]PresignedUpload, 0, len(files))

	for _, file := range files {
		if !allowedTypes[file.ContentType] {
			return nil, fmt.Errorf("unsopported file type: %s", file.ContentType)
		}

		storageKey := fmt.Sprintf("events/%s/%s-%s", prefix, uuid.NewString(), file.Filename)

		presigned, err := s.Presigner.PresignPutObject(ctx, &s3.PutObjectInput{
			Bucket:      aws.String("picsortstorage"), // REPLACE WITH REAL BUCKET NAME
			Key:         aws.String(storageKey),
			ContentType: aws.String(file.ContentType),
		}, s3.WithPresignExpires(time.Minute*3))
		if err != nil {
			return nil, fmt.Errorf("failed to presign %s:%w", file.Filename, err)
		}

		uploads = append(uploads, PresignedUpload{
			Filename:     storageKey,
			PresignedURL: presigned.URL,
		})
	}

	return uploads, nil
}

// Delete image from S3
func (s *S3Service) DeleteFile(ctx context.Context, bucket, key string) error {
	_, err := s.Client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		var noKey *types.NoSuchKey
		if errors.As(err, &noKey) {
			log.Printf("[S3] File not found: %s", key)
			return nil
		}
		return fmt.Errorf("failed to delete file %s: %w", key, err)
	}

	return nil
}

// Delete multiple images from S3
func (s *S3Service) DeleteObjects(ctx context.Context, bucket string, keys []string) error {
	if len(keys) == 0 {
		return nil
	}

	var identifiers []types.ObjectIdentifier
	for _, key := range keys {
		identifiers = append(identifiers, types.ObjectIdentifier{Key: aws.String(key)})
	}

	input := &s3.DeleteObjectsInput{
		Bucket: aws.String(bucket),
		Delete: &types.Delete{
			Objects: identifiers,
			Quiet:   aws.Bool(true),
		},
	}

	output, err := s.Client.DeleteObjects(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to delete objects from bucket %s: %w", bucket, err)
	}

	if len(output.Errors) > 0 {
		for _, e := range output.Errors {
			log.Printf("[S3] Failed to delete %s: %v", aws.ToString(e.Key), aws.ToString(e.Message))
		}
		return fmt.Errorf("some objects failed to delete")
	}

	log.Printf("[S3] Deleted %d objects from bucket %s", len(output.Deleted), bucket)
	return nil
}
