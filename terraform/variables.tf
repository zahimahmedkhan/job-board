variable "aws_region" {
  default = "eu-north-1"
}

variable "project_name" {
  default = "job-board"
}

variable "db_username" {
  default = "admin"
}

variable "db_password" {
  description = "RDS master password (pass via -var or TF_VAR_db_password env var, never commit this)"
  type        = string
  sensitive   = true
}

variable "ami_id" {
  description = "Custom AMI ID built by Packer (passed in from GitHub Actions)"
  type        = string
}

variable "instance_type" {
  default = "t3.micro"
}

variable "key_pair_name" {
  description = "EC2 key pair name for SSH access (optional, create in AWS console first)"
  type        = string
  default     = "job-board-key"
}
