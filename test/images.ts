// GitHub-hosted runners share IPs. Anonymous Docker Hub pulls hit
// toomanyrequests. These are the official library images via public ECR.
export const POSTGRES_IMAGE =
  'public.ecr.aws/docker/library/postgres:16-alpine';
export const REDIS_IMAGE = 'public.ecr.aws/docker/library/redis:7-alpine';
