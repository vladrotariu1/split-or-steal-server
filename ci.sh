#!/bin/bash

# Exit immediately if any command fails
set -e

# Run npm install
npm install

# Create a folder called "secrets" if it doesn't exist
mkdir -p secrets

# Download the admin-sdk json config from Azure Storage container
firebase_admin_sdk_file_name="firebase-adminsdk.json"
az storage blob download --account-name splitorstealstorage --container-name split-or-steal-configs --name $firebase_admin_sdk_file_name --file secrets/$firebase_admin_sdk_file_name

# Download file containing other firebase configuration
firebase_env_config="firebase-environment-config"
az storage blob download --account-name splitorstealstorage --container-name split-or-steal-configs --name $firebase_env_config --file secrets/$firebase_env_config

#Download stripe api keys
stripe_api_keys_file="stripe-api-keys"
az storage blob download --account-name splitorstealstorage --container-name split-or-steal-configs --name $stripe_api_keys_file --file secrets/$stripe_api_keys_file

# Create the .env file
cp secrets/$firebase_env_config .env
echo "SERVICE_ACCOUNT_KEY_FILE_NAME=$firebase_admin_sdk_file_name" >> .env
cat secrets/$stripe_api_keys_file >> .env

# Build the server app
npm run build
