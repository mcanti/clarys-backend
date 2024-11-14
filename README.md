# Clarys AI

This project is containerized for easy setup and deployment. You can use either Docker or Podman to build and run the container, as both tools are compatible with this setup.

## Prerequisites

Ensure you have either Docker or Podman installed on your system.

[Docker Installation Guide](https://docs.docker.com/engine/install/https:/)
[Podman Installation Guide](https://podman.io/docs/installation)

## Building the Docker Image

1. **Clone the Repository:**

```bash
git clone https://github.com/your-username/your-repository.git
cd your-repository

```

2. **Build the Image:**

**Using Docker**

```bash
docker build -t your-image-name .
```

**Using Podman**

```bash
podman build -t your-image-name .
```

This will create an image named your-image-name based on the configuration in the Dockerfile.

## Running the Container

To run the container, you’ll need to map any required ports and pass environment variables.

1. **Run the Container:**

**Using Docker**

```bash
docker run --env-file .env -p 3000:3000 your-image-name
```

**Using Podman**

```bash
podman run --env-file .env -p 3000:3000 your-image-name
```

* --env-file: Specifies environment variables, typically stored in a .env file.
* -p 3000:3000: Maps port 3000 of your local machine to port 3000 in the container.

## Stopping the Container

To stop the running container:

**Using Docker**

```bash
docker stop container_id_or_name

```

**Using Podman**

```bash
podman stop container_id_or_name
```

Use docker ps or podman ps to list running containers and get the container ID or name.

## Saving the Image for Distribution

If you want to export the image to a .tar file for sharing:

**Using Docker**

```bash
docker save -o your-image-name.tar your-image-name
```

**Using Podman**

```bash
podman save -o your-image-name.tar your-image-name
```

This .tar file can then be loaded on another system.

## Loading the Image

To load the saved image on a new system:

**Using Docker**

```bash
docker load -i your-image-name.tar
```

**Using Podman**

```bash
podman load -i your-image-name.tar
```
