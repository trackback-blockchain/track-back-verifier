data "aws_lb_target_group" "data_aws_alb_tg_verifier" {
  arn = "arn:aws:elasticloadbalancing:ap-southeast-2:533545012068:targetgroup/Verifier/a0db863014b7a53a"
}
data "aws_lb_target_group" "data_aws_alb_tg_verifier_dia" {
  arn = "arn:aws:elasticloadbalancing:ap-southeast-2:533545012068:targetgroup/Verifier-DIA/a639763c33d9b14f"
}

data "aws_lb_target_group" "data_aws_alb_tg_verifier_tav" {
  arn = "arn:aws:elasticloadbalancing:ap-southeast-2:533545012068:targetgroup/Verifier-Trackback/473103ca42f2f414"
}

resource "aws_security_group" "aws_sg_verifier_demo" {
  name = "security_group for aws_sg_verifier_demo"

  ingress {
    description = "SSH from the internet"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "80 from the internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

}



resource "aws_instance" "verifier_web" {
  count = 3

  ami                         = "ami-0567f647e75c7bc05"
  instance_type               = "t3.medium"
  vpc_security_group_ids      = [aws_security_group.aws_sg_verifier_demo.id]
  associate_public_ip_address = false
  key_name                    = var.key_name
  iam_instance_profile        = aws_iam_instance_profile.aws_iam_instance_profile_verifier_profile.id

  tags = {
    Name = "verifier_web ${var.verifiers[count.index]}"
  }

  root_block_device {
    volume_type = "gp2"
    volume_size = 30
  }

  user_data = <<-EOF
#!/bin/bash
apt-get update
apt-get install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
add-apt-repository \
   "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
   $(lsb_release -cs) \
   stable"
apt-get update
apt-get install -y docker-ce
chmod 666 /var/run/docker.sock
apt-get install -y git
usermod -aG docker ubuntu

# Install docker-compose
curl -L https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m) -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

cd /home/ubuntu

curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
apt install -y unzip
unzip awscliv2.zip
sudo ./aws/install
apt install -y make

git clone --single-branch --branch ${var.branch_name} https://${var.git_token}@github.com/trackback-blockchain/track-back-verifier.git
chown ubuntu:ubuntu -R track-back-verifier

cd track-back-verifier
make run-${var.verifiers[count.index]}

EOF

}


resource "aws_lb_target_group_attachment" "aws_tg_attach_verifier_dia" {
  target_group_arn = data.aws_lb_target_group.data_aws_alb_tg_verifier_dia.arn
  target_id        = aws_instance.verifier_web[0].id
  port             = 80
}

resource "aws_lb_target_group_attachment" "aws_tg_attach_verifier_ta" {
  target_group_arn = data.aws_lb_target_group.data_aws_alb_tg_verifier.arn
  target_id        = aws_instance.verifier_web[1].id
  port             = 80
}

resource "aws_lb_target_group_attachment" "aws_tg_attach_verifier_tav" {
  target_group_arn = data.aws_lb_target_group.data_aws_alb_tg_verifier_tav.arn
  target_id        = aws_instance.verifier_web[2].id
  port             = 80
}


output "verifier_dia_ip" {
  value = aws_instance.verifier_web[0].public_ip
}

output "verifier_ta_ip" {
  value = aws_instance.verifier_web[1].public_ip
}

output "verifier_tav_ip" {
  value = aws_instance.verifier_web[2].public_ip
}
