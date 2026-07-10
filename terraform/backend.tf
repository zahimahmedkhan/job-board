terraform {
  backend "s3" {
    bucket         = "job-board-tfstate-zahim"
    key            = "job-board/terraform.tfstate"
    region         = "eu-north-1"
    dynamodb_table = "job-board-tf-lock"
    encrypt        = true
  }
}