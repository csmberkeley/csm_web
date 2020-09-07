#!/usr/bin/env bash
# Sets up environment variables and such, assuming requirements already installed.
# Kevin Svetlitski, rev. Jonathan Shi

{ [ ! -d 'csm_web' ] || [ ! -f 'package.json' ]; } && echo 'You are in the wrong directory!' 1>&2 && exit 1
[ -z "$VIRTUAL_ENV" ] && echo 'You must activate your virtualenv first!' 1>&2 && exit 1
if ! ( command -v npm && command -v pip3 && command -v psql ) >/dev/null
then
	echo 'You must install npm, python3, pip, and postgres before running this script!' 1>&2
	exit 1
fi

echo 'Beginning setup, this may take a minute or so...'
sleep 1 # Give user time to read above message 

# Node and Python requirements
npm i
# The LDFLAGS are specified so that heroku's implicit psycopg2 (*not* binary) dependency will build successfully on macOS
LDFLAGS="-I/usr/local/opt/openssl/include -L/usr/local/opt/openssl/lib" pip3 install --no-cache-dir -r requirements.txt

# Set up environment variables
echo "Setting up environment variables..."
echo "BUILDPACK_URL='https://github.com/heroku/heroku-buildpack-python'
DJANGO_ENV='dev'
DEBUG_LOG_OFF='True'
WEB_CONCURRENCY=4" > .env

# Get a new key
echo "Generating Django secret key..."
export SECRET_KEY=$(python3 csm_web/manage.py shell -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())")
echo "SECRET_KEY='$SECRET_KEY'" >> .env

# Must be pulled from Heroku (but not critical to running tests etc.)
if ! command -v heroku 1>/dev/null
then
	echo "Did not find Heroku CLI installation. OAUTH keys have not been set, so you will be unable to log in with your email."
elif heroku whoami 1>/dev/null
then
	echo "Attempting to set OAUTH keys from Heroku config..."
	heroku config:get SOCIAL_AUTH_GOOGLE_OAUTH2_KEY -s >> .env
	heroku config:get SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET -s >> .env
else
	echo "You are not logged into the Heroku CLI. OAUTH keys have not been set, so you will be unable to log in with your email."
fi

pwd > "$VIRTUAL_ENV/.project_dir"

# Add env variables to virutalenv activate script so that not everything needs to be run with 'heroku local'
sed 's/^/export /' .env >> "$VIRTUAL_ENV/bin/activate"

# Setup postgres DB if needed
if ! psql -lt | grep -q '^ *csm_web_dev *'
then
	createdb csm_web_dev
	psql csm_web_dev -c 'CREATE ROLE postgres LOGIN SUPERUSER;'
fi

# Utility function for running the dev server
echo '
function run() {
	start_dir=$(pwd)
	project_dir=$(cat "$VIRTUAL_ENV/.project_dir")
	trap "pkill -P $$ heroku npm python; stty sane; cd $startdir; return" SIGINT
	cd "$project_dir" && npm run dev && python csm_web/manage.py runserver
	cd "$start_dir"
}' >> "$VIRTUAL_ENV/bin/activate"

# Initialize for local development
npm run dev
source .env # need the relevant env variables for django, but can't count on the Heroku CLI being installed
python csm_web/manage.py migrate
python csm_web/manage.py createtestdata --yes 

echo "Installing pre-commit hook..."
ln -s -f ../../.pre-commit.sh .git/hooks/pre-commit

target_version=$(sed 's/[^0-9.]//g' runtime.txt)
installed_version=$(python3 --version | sed 's/[^0-9.]//g')
if [ "$target_version" != "$installed_version" ]
then
   echo "You have python version $installed_version installed, but the expected version is $target_version.
This may cause problems."
fi

echo "Done installing. Please reactivate your virtualenv before running any more commands."
