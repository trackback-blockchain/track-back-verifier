variable "key_name" {
  type    = string
  default = "ec2_key"
}


variable "git_token" {
  type = string
  default = ""
}

variable "branch_name" {
  type = string
}

variable "cloud_watch_name" {
  type = string
}


variable "verifiers" {
  type    = list(string)
  default = [ "trackback-dia", "trackback-ta", "trackback-verifier" ]
}