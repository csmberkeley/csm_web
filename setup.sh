#!/usr/bin/env bash
# Sets up environment variables and such, assuming requirements already installed.
# Kevin Svetlitski, rev. Jonathan Shi

# check directory
{ [ ! -d 'csm_web' ] || [ ! -f 'package.json' ]; } && echo 'You are in the wrong directory!' 1>&2 && exit 1
# should not have virtual environment enabled
[ -n "$VIRTUAL_ENV" ] && echo 'You must not be in a vritual environment!' 1>&2 && exit 1

# check all required dependencies are installed
if ! ( command -v npm ) > /dev/null
then
    echo 'You must install npm before running this script! (It is recommended to use nvm to manage npm versions; see https://github.com/nvm-sh/nvm#installing-and-updating)' 1>&2
    exit 1
elif ! ( command -v python3 && command -v pip3 ) > /dev/null
then
    echo 'You must have python3 and pip3 installed before running this script! (It is recommended to use pyenv to manage python versions; see https://github.com/pyenv/pyenv#installation)' 1>&2
    exit 1
elif ! ( command -v poetry ) > /dev/null
then
    echo 'You must have poetry installed before running this script! (See https://python-poetry.org/docs/#installation)' 1>&2
    exit 1
elif ! ( command -v psql ) > /dev/null
then
    echo 'You do not have PostgreSQL installed; this is okay, but you will be required to use Docker for any interactions with the database. (See https://www.postgresql.org/download for installation instructions.)' 1>&2
elif ! (command -v docker) > /dev/null
then
    echo 'You must have docker installed before running this script! (See https://www.docker.com)' 1>&2
    exit 1
elif [[ "$(docker info 2>&1)" =~ "Cannot connect to the Docker daemon" ]]
then
    echo "The docker daemon must be running; make sure you've started Docker Desktop, or manually through the terminal." 1>&2
    exit 1
fi

# check python version
EXPECTED_PYTHON_VERSION=$(sed 's/[^0-9.]//g' runtime.txt)
ACTUAL_PYTHON_VERSION=$(python3 --version | sed 's/[^0-9.]//g')
if [[ "$EXPECTED_PYTHON_VERSION" != "$ACTUAL_PYTHON_VERSION" ]]
then
    echo "Expected python version $EXPECTED_PYTHON_VERSION, got $ACTUAL_PYTHON_VERSION; make sure you have the right python version installed." 1>&2
    echo "It is recommended to use pyenv to manage python versions; see https://github.com/pyenv/pyenv#installation. make sure you've created the virtual environment with the correct python version."
    exit 1
fi

echo 'Beginning setup, this may take a while...'
sleep 1 # Give user time to read above message

# Node and Python requirements
npm ci
# Before using Poetry, make sure poetry-plugin-export is added to poetry
poetry self add poetry-plugin-export
# The LDFLAGS are specified so that heroku's implicit psycopg2 (*not* binary) dependency will build successfully on macOS
LDFLAGS="-I/usr/local/opt/openssl/include -L/usr/local/opt/openssl/lib" poetry install --no-root
# Activate virtual environment (only local to this script)
source $(poetry env info --path)/bin/activate

# Set up environment variables
echo "Setting up environment variables..."
echo "BUILDPACK_URL='https://github.com/heroku/heroku-buildpack-python'
DJANGO_ENV='dev'
DEBUG_LOG_OFF='True'
WEB_CONCURRENCY=4" > .env

# Get a new key
echo "Generating Django secret key..."
export SECRET_KEY='temp'  # set temporary secret key
# Note: this secret key doesn't have much cryptographic complexity, but it'll only be used for development
export SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
echo "SECRET_KEY='$SECRET_KEY'" >> .env

# Pull AWS S3 credentials
if ! command -v aws 1>/dev/null
then
	echo "Did not find AWS CLI installation. You will be unable to view/upload resources."
elif ! aws sts get-caller-identity | grep "csm-web-user" 1>/dev/null
then
	echo "You are not logged into the AWS CLI with the credentials for 'csm-web-user'. You will be unable to view/upload resources."
	echo "If calling 'aws sts get-caller-identity' prints 'Partial credentials found in env', check your environment variables. It may be overriding your credentials in ~/.aws."
else
	echo "You are logged in to the AWS CLI with the credentials for 'csm-web-user'."
	echo "AWS_STORAGE_BUCKET_NAME=csm-web-resource-aggregation" >> .env
	echo 'AWS_ACCESS_KEY_ID=$(aws configure get aws_access_key_id)' >> .env
	echo 'AWS_SECRET_ACCESS_KEY=$(aws configure get aws_secret_access_key)' >> .env
	echo 'AWS_S3_REGION_NAME=$(aws configure get region)' >> .env
fi

sleep 1

pwd > "$VIRTUAL_ENV/.project_dir"

# Add env variables to virutalenv activate script so that not everything needs to be run with 'heroku local'
echo 'set -a; source $(cat $VIRTUAL_ENV/.project_dir)/.env; set +a' >> "$VIRTUAL_ENV/bin/activate"

echo "Installing pre-commit hook..."
#ln -s -f ../../.pre-commit.sh .git/hooks/pre-commit
pre-commit install

# Setup environment variables
set +a; source .env; set -a

# Build docker containers
docker compose build
docker compose up -d

echo
echo "Done installing."
echo "Please activate the virtual environment before running other commands."
