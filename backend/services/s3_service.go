package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type S3Service struct {
	Client    *s3.Client
	Presigner *s3.PresignClient
}

type PresignedObject struct {
	URL       string
	ExpiresAt int64
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

func (s *S3Service) GetPresignViewObjects(ctx context.Context, objectKeys []string, eventID uint) ([]PresignedObject, error) {
	urls := make([]PresignedObject, 0, len(objectKeys))
	for _, key := range objectKeys {
		presigned, err := s.Presigner.PresignGetObject(ctx, &s3.GetObjectInput{
			Bucket: aws.String("picsortstorage"),
			Key:    aws.String(fmt.Sprintf("events/%d/%s", eventID, key)),
		}, s3.WithPresignExpires(time.Hour*4))
		if err != nil {
			return nil, err
		}
		urls = append(urls, PresignedObject{
			URL:       presigned.URL,
			ExpiresAt: int64(time.Now().Add(time.Hour * 4).Unix()),
		})
	}
	return urls, nil
}

// Get presigned URL to upload image
func (s *S3Service) PresignPutObject(ctx context.Context, bucketName string, objectKey string, lifetimeSecs int64) (string, error) {
	request, err := s.Presigner.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(objectKey),
	}, s3.WithPresignExpires(time.Duration(lifetimeSecs)*time.Second))
	if err != nil {
		log.Printf("Couldnt get a presigned request to put %v:%v. Heres why: %v\n", bucketName, objectKey, err)
		return "", err
	}
	return request.URL, err
}

// Get multiple presigned URLs to upload images - one presigned URL per image
func (s *S3Service) GetPresignedUploadURLs(ctx context.Context, filenames []string, prefix string) ([]string, error) {
	urls := make([]string, 0, len(filenames))
	for _, filename := range filenames {
		presigned, err := s.Presigner.PresignPutObject(ctx, &s3.PutObjectInput{
			Bucket: aws.String("picsortstorage"), // REPLACE WITH REAL BUCKET NAME
			Key:    aws.String(fmt.Sprintf("events/%s/%s", prefix, filename)),
		}, s3.WithPresignExpires(time.Minute*3))
		if err != nil {
			return nil, err
		}
		urls = append(urls, presigned.URL)
	}
	return urls, nil
}
