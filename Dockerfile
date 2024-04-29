# Use the latest Node.js LTS version as the base image
FROM node:latest

# Set the working directory in the container
WORKDIR /split-or-steal-server

# Copy the dependencies file
COPY package.json package.json

RUN npm install

# Copy the 'dist' folder from the current directory to the working directory in the container
COPY dist ./dist

# Copy the 'secrets' folder from the current directory to the working directory in the container
COPY secrets ./secrets

# Copy the '.env' file from the current directory to the working directory in the container
COPY .env .

# Expose port 3030 (or any other port your NestJS application listens on)
EXPOSE 3030

# Start the NestJS application
CMD ["node", "dist/main.js"]