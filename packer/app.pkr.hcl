packer {
  required_plugins {
    amazon = {
      version = ">= 1.2.0"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

variable "aws_region" {
  default = "eu-north-1"
}

source "amazon-ebs" "job_board" {
  region        = var.aws_region
  instance_type = "t3.micro"
  ami_name      = "job-board-{{timestamp}}"
  ssh_username  = "ec2-user"

  source_ami_filter {
    filters = {
      name                = "al2023-ami-*-x86_64"
      root-device-type    = "ebs"
      virtualization-type = "hvm"
    }
    owners      = ["137112412989"]
    most_recent = true
  }
}

build {
  name    = "job-board"
  sources = ["source.amazon-ebs.job_board"]

  provisioner "file" {
    source      = "../backend"
    destination = "/home/ec2-user/backend"
  }

  provisioner "shell" {
    inline = [
      "sudo dnf install -y nodejs npm",
      "cd /home/ec2-user/backend && npm install --production",
      "sudo mv /home/ec2-user/backend /opt/job-board",

      "sudo bash -c 'cat > /etc/systemd/system/job-board.service' <<'EOT'",
      "[Unit]",
      "Description=Job Board Backend",
      "After=network-online.target cloud-final.service",
      "Wants=network-online.target cloud-final.service",
      "",
      "[Service]",
      "EnvironmentFile=/etc/job-board.env",
      "ExecStart=/usr/bin/node /opt/job-board/server.js",
      "Restart=always",
      "RestartSec=5",
      "StartLimitIntervalSec=0",
      "User=ec2-user",
      "",
      "[Install]",
      "WantedBy=multi-user.target",
      "EOT",

      "sudo systemctl daemon-reload",
      "sudo systemctl enable job-board"
    ]
  }
}