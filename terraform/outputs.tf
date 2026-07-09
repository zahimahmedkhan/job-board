output "alb_dns_name" {
  description = "Ye URL browser mein khol ke app access karo"
  value       = aws_lb.app.dns_name
}

output "rds_endpoint" {
  description = "Database endpoint (MySQL Workbench se connect karne ke liye)"
  value       = aws_db_instance.main.address
}

output "s3_bucket_name" {
  value = aws_s3_bucket.artifacts.bucket
}
