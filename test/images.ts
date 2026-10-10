// GitHub-hosted runners share IPs. Anonymous Docker Hub pulls hit
// toomanyrequests. mirror.gcr.io serves the official library images
// without the public-ECR token step that flaked the first pull.
export const POSTGRES_IMAGE = 'mirror.gcr.io/library/postgres:16-alpine';
export const REDIS_IMAGE = 'mirror.gcr.io/library/redis:7-alpine';
