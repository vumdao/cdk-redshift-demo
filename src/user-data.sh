#!/bin/bash

# Update repo
sudo su
yum update -y

# Install psql
sudo amazon-linux-extras install postgresql10