---
name: github-pr-media
description: Upload an image or video to GitHub's user attachments API and embed it in a pull request description or comment. Use when asked to add screenshots, diagrams, recordings, or other media to a PR or GitHub comment.
user-invocable: false
---

# GitHub PR Media Uploads

Use this skill when a workspace agent needs to attach screenshots, diagrams, or videos to a pull request description or comment.

## When to use it

- Adding before/after screenshots to explain a UI change
- Sharing a diagram that clarifies architecture or flow
- Attaching a short recording that makes behavior easier to review
- Turning a local media file into a GitHub-hosted URL that can be linked from markdown

Only use this when visuals genuinely improve reviewer understanding.

## Instructions

1. Make sure you have the final media file on disk and know its MIME type.

2. Resolve authentication and the repository database ID:
   ```bash
   TOKEN=$(gh auth token)
   REPO_ID=$(gh api "repos/$(gh repo view --json nameWithOwner -q .nameWithOwner)" --jq .id)
   ```

3. Upload the raw media bytes to GitHub:
   ```bash
   curl -s -X POST \
     "https://uploads.github.com/user-attachments/assets?name=diagram.png&content_type=image/png&repository_id=$REPO_ID" \
     -H "Content-Type: application/octet-stream" \
     -H "Accept: application/vnd.github+json" \
     -H "X-GitHub-Api-Version: 2022-11-28" \
     -H "Authorization: Bearer $TOKEN" \
     --data-binary @diagram.png
   ```

4. Parse the response JSON and read the returned `url`, which will look like:
   ```text
   https://github.com/user-attachments/assets/...
   ```

5. Use the hosted URL in markdown:
   - Images: `![alt text](url)`
   - Other media: paste the URL directly or use a markdown link if that reads better in context

## Important details

- Send the file as raw binary bytes with `--data-binary`.
- Do **not** use multipart form uploads, base64 encoding, or JSON wrappers.
- Put metadata in the query string:
  - `name`
  - `content_type`
  - `repository_id`
- For videos, keep the same request shape and set `content_type` to the actual video MIME type, for example `video/mp4`.

## When not to use it

- Text-only changes where the diff already explains everything
- Cases where a simple markdown list or code snippet is clearer than an image
