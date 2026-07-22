#!/bin/sh
set -eu

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  echo "Usage: $0 /absolute/path/to/odyssey-upload.jks [--generate-password]" >&2
  exit 2
fi

generate_password=false
if [ "${2:-}" = "--generate-password" ]; then
  generate_password=true
elif [ "$#" -eq 2 ]; then
  echo "Unknown option: $2" >&2
  exit 2
fi

case "$1" in
  /*) key_path=$1 ;;
  *) echo "The keystore path must be absolute." >&2; exit 2 ;;
esac

if [ -e "$key_path" ]; then
  echo "Refusing to overwrite existing keystore: $key_path" >&2
  exit 1
fi

key_dir=$(dirname "$key_path")
mkdir -p "$key_dir"

if [ "$generate_password" = true ]; then
  key_password=$(openssl rand -hex 24)
  key_password_repeat=$key_password
else
  printf "Keystore password (store this in a password manager): "
  stty -echo
  IFS= read -r key_password
  stty echo
  printf "\nRepeat password: "
  stty -echo
  IFS= read -r key_password_repeat
  stty echo
  printf "\n"
fi

if [ "$key_password" != "$key_password_repeat" ]; then
  echo "Passwords do not match." >&2
  exit 1
fi
if [ "${#key_password}" -lt 12 ]; then
  echo "Use a password of at least 12 characters." >&2
  exit 1
fi

keytool -genkeypair -v \
  -keystore "$key_path" \
  -storetype PKCS12 \
  -storepass "$key_password" \
  -keypass "$key_password" \
  -alias odyssey-upload \
  -keyalg RSA \
  -keysize 4096 \
  -validity 10000 \
  -dname "CN=Odyssey Upload, OU=Mobile, O=Odyssey, L=Los Angeles, ST=California, C=US"

properties_path="$(CDPATH= cd -- "$(dirname -- "$0")/../android" && pwd)/keystore.properties"
umask 077
{
  printf 'storeFile=%s\n' "$key_path"
  printf 'storePassword=%s\n' "$key_password"
  printf 'keyAlias=odyssey-upload\n'
  printf 'keyPassword=%s\n' "$key_password"
} > "$properties_path"

if [ "$generate_password" = true ] && command -v security >/dev/null 2>&1; then
  if security add-generic-password -U -a "odyssey-upload" -s "Odyssey Android Upload Key" -w "$key_password" >/dev/null; then
    echo "Generated password saved in macOS Keychain as 'Odyssey Android Upload Key'."
  else
    echo "Warning: the generated password is only in $properties_path; back up that file now." >&2
  fi
fi

echo "Upload keystore created at $key_path"
echo "Gradle signing properties created at $properties_path"
echo "Back up both securely. Losing the upload key complicates future updates."
