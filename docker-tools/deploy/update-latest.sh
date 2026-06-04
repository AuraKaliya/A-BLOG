#!/usr/bin/env sh
set -eu

APP_ROOT=${APP_ROOT:-/root/A-BLOG}
RELEASES_DIR=${RELEASES_DIR:-$APP_ROOT/releases}
ARCHIVE_PATTERN=${ARCHIVE_PATTERN:-aura-blog-*.tar.gz}
KEEP_RELEASES=${KEEP_RELEASES:-5}

mkdir -p "$APP_ROOT" "$RELEASES_DIR" "$APP_ROOT/resource"

LATEST_ARCHIVE=$(
  find "$APP_ROOT" "$RELEASES_DIR" -maxdepth 1 -type f -name "$ARCHIVE_PATTERN" -printf '%T@ %p\n' 2>/dev/null \
    | sort -nr \
    | head -n 1 \
    | cut -d ' ' -f 2-
)

if [ -z "$LATEST_ARCHIVE" ]; then
  echo "No release archive found in $APP_ROOT or $RELEASES_DIR." >&2
  echo "Expected file name pattern: $ARCHIVE_PATTERN" >&2
  exit 1
fi

ARCHIVE_NAME=$(basename "$LATEST_ARCHIVE")
RELEASE_NAME=${ARCHIVE_NAME%.tar.gz}
TARGET_DIR=$RELEASES_DIR/$RELEASE_NAME

echo "Latest release archive: $LATEST_ARCHIVE"

CHECKSUM_FILE=$LATEST_ARCHIVE.sha256
if [ -f "$CHECKSUM_FILE" ]; then
  echo "Verifying checksum: $CHECKSUM_FILE"
  (
    cd "$(dirname "$LATEST_ARCHIVE")"
    sha256sum -c "$(basename "$CHECKSUM_FILE")"
  )
else
  echo "Checksum file not found, skipping checksum verification: $CHECKSUM_FILE"
fi

if [ "$LATEST_ARCHIVE" != "$RELEASES_DIR/$ARCHIVE_NAME" ]; then
  echo "Moving archive into releases directory"
  cp -f "$LATEST_ARCHIVE" "$RELEASES_DIR/$ARCHIVE_NAME"
  if [ -f "$CHECKSUM_FILE" ]; then
    cp -f "$CHECKSUM_FILE" "$RELEASES_DIR/$ARCHIVE_NAME.sha256"
  fi
  LATEST_ARCHIVE=$RELEASES_DIR/$ARCHIVE_NAME
fi

if [ -d "$TARGET_DIR" ]; then
  echo "Removing previous extracted directory: $TARGET_DIR"
  rm -rf "$TARGET_DIR"
fi

echo "Extracting $ARCHIVE_NAME to $RELEASES_DIR"
tar -xzf "$LATEST_ARCHIVE" -C "$RELEASES_DIR"

if [ ! -f "$TARGET_DIR/update.sh" ]; then
  echo "Extracted release is missing update.sh: $TARGET_DIR/update.sh" >&2
  exit 1
fi

echo "Running release update script"
APP_ROOT=$APP_ROOT sh "$TARGET_DIR/update.sh"

if [ "$KEEP_RELEASES" -gt 0 ] 2>/dev/null; then
  echo "Keeping latest $KEEP_RELEASES release archive(s); older archives remain removable."
  find "$RELEASES_DIR" -maxdepth 1 -type f -name "$ARCHIVE_PATTERN" -printf '%T@ %p\n' \
    | sort -nr \
    | tail -n +"$((KEEP_RELEASES + 1))" \
    | cut -d ' ' -f 2- \
    | while IFS= read -r old_archive; do
        [ -n "$old_archive" ] || continue
        echo "Old archive: $old_archive"
      done
fi

echo "Update complete."
