 Both workflows created and configured! Here's what you got:

  1. Docker Publishing (.github/workflows/docker-publish.yml)

  Triggers: Every push to main

  What it does:
  - Builds backend and frontend Docker images in parallel
  - Publishes to GitHub Container Registry (ghcr.io)
  - Tags images with:
    - latest (for main branch)
    - main-<commit-sha> (specific commit)
    - main (branch name)
  - Generates https://docs.github.com/en/actions/publishing-packages/publishing-docker-images for security
  - Uses build cache for faster builds

  Published images:
  ghcr.io/hardmax71/charon-backend:latest
  ghcr.io/hardmax71/charon-frontend:latest

  Best practices used:
  - Proper GITHUB_TOKEN authentication
  - Docker Buildx for multi-platform support
  - GitHub Actions cache for layers
  - Build provenance attestations (https://medium.com/devopsturkiye/pushing-docker-images-to-githubs-registry-manual-and-automated-methods-19cce3544eb1)

  2. GitHub Releases (.github/workflows/release.yml)

  Triggers: When you push version tags (v*)

  What it does:
  - Creates GitHub Release with the tag name
  - Auto-generates release notes from commits/PRs
  - Makes it visible on /releases page

  How to create a release:
  git tag v0.0.9
  git push origin v0.0.9

  This will:
  - Trigger the release workflow
  - Create release "v0.0.9" with auto-generated changelog
  - Also trigger Docker publish with v0.0.9 tag

  3. README Updates

  Added badges for both workflows:
  - Docker Publish status
  - Release status

  Added documentation about using published images from GHCR.

  Next Steps

  1. First push to main will publish Docker images to ghcr.io/hardmax71/charon-*:latest
  2. When ready for a release, push a version tag: git tag v0.0.9 && git push origin v0.0.9
  3. Users can pull images without building: docker pull ghcr.io/hardmax71/charon-backend:latest

  Sources:
  - https://docs.github.com/en/actions/publishing-packages/publishing-docker-images
  - https://medium.com/devopsturkiye/pushing-docker-images-to-githubs-registry-manual-and-automated-methods-19cce3544eb1
