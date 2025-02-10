# Gains Agents

This is the Agent repo for the Gains project. Characters will have different capabilies and responsibilites within the gains project.

## Docker
You have to be in this folder to build the docker image.

1. `docker build --platform linux/amd64 -t IMAGE_NAME .`
2. `docker run -it --env-file=.env -p 3000:3000 IMAGE_NAME`
