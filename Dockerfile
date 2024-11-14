# Use a NodeJS base image
FROM node:18

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose the port the application runs on (e.g., 3000)
EXPOSE 3000

# Command to run the application
CMD ["npm", "run", "devStart"]
