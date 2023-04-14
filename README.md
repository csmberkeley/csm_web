# CSM Web Applications

This repository contains webapps that help support the infrastructure of CSM. Currently, it only holds Scheduler (our section signup and attendance system), but more are on the way.

If you're unfamiliar with CSM and/or its web applications, check out [this repository's releases](https://github.com/csmberkeley/csm_web/releases) for a peek at what our web applications look like and what we've been working on lately.

## Installing

### Requirements

We don't know what specific minimum version you would need for any of the following software, but the most recent version of any of the below should work.

- Python 3.9.13
  - It is recommended that you use [`pyenv`](https://github.com/pyenv/pyenv) to manage python versions, so that you can use a consistent python version for `csm_web`, and another python version for your other projects.
- [`poetry`](https://python-poetry.org/docs/#installation)
- `npm`
  - It is recommended that you use [`nvm`](https://github.com/nvm-sh/nvm) to manage node/npm versions, so that you can use a consistent node/npm version for `csm_web`, and another verison for your other projects.
- [PostgreSQL](https://www.postgresql.org/download/)
  - This should not be necessary now that we have migrated to Docker, but install it if any issues arise when editing.
- [Docker](https://www.docker.com)
  - Your development environment will be hosted through docker containers, so that you do not need to do much local setup.
- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli#download-and-install) (optional)
  - Create an account on [Heroku](https://id.heroku.com/login) and [login](https://devcenter.heroku.com/articles/heroku-cli#getting-started)
  - This is not completely necessary for the application to work locally; it is only used for interactions with the production/staging environment.
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html)
  - We use an S3 bucket to store course resources. See [here](https://aws.amazon.com/s3/) to get started.
  - Log in to AWS CLI (`aws configure`) This will prompt an interactive session to enter login credentials.
    - AWS Access Key ID: (ask tech chair)
    - AWS Secret Access Key: (ask tech chair)
    - Default region name: `us-east-1`
    - Default output format: `json`
  - This is not completely necessary for the application to work locally; it is only used for interactions with the resources page in production/staging.

Other miscellaneous requirements will be installed by the commands below.

### Setup

To ensure package version consistency and avoid polluting your global package installations, we highly recommend running the server with a virtual environment. Python's standard library includes [venv](https://docs.python.org/3/library/venv.html), so you do not need to install anything new here.

Firstly, make sure you have the right python version (see `runtime.txt` for the expected python version to install). If you're using `pyenv` to manage python versions (this is recommended), you can install the specified python version with `pyenv install <version>`.

From a terminal in the top level of the project directory, run `python3 -m venv venv`; if your system python version is different from the version required here, and you're using `pyenv`, run `PYENV_VERSION=<version> python3 -m venv venv` instead (for example, `PYENV_VERSION=3.9.13 python3 -m venv venv`). This will initialize a new virtual environment in the `venv/` folder, with the correct base python version.

To activate the environment, run `source venv/bin/activate`. You will need to run this command every time you open a new terminal.

Finally, run `./setup.sh`. This will install additional requirements needed by the server, and set up some necessary environment variables. You should _not_ be running this script after it has succeeded and set up the environment for the first time.

## Running

To start the Django server and other services, run `docker compose up -d`. This will start Django, automatically compile and watch frontend files, and start a development database. (The `-d` puts the process in the background.)

To generate test data, run `docker compose exec django python3 csm_web/manage.py runserver`. In general, if you'd like to run any commands in the Django docker container, run `docker compose exec django <command>`.

If all of the above has worked, visit `http://localhost:8000` in your browser and you should see a log in screen; don't actually use this to actually log in locally. Visit `http://localhost:8000/admin/` to log in instead.

Any changes will automatically reload the server in the docker containers, but you will usually need to force refresh (`ctrl + shift + R` or `cmd + shift + R` on most browsers) for frontend changes to be reflected (this clears the browser cache for the page).


## Troubleshooting

### `setup.sh` Errors

- The following errors are likely caused by some quirks in our build system - if you set up a new virtual environment through normal commands, you may run into them. The solution for all of these should be to run `setup.sh` (you should be able to do this even after attempting to run pip/npm commands already).
  - `django.core.exceptions.ImproperlyConfigured: The SECRET_KEY setting must not be empty.`
  - When installing `psycopg2`, console output displays `ld: library not found for -lpq` or similar
- During `./setup.sh` or `pip3 install` I'm getting a `psycopg2` install error that looks like this:

```
Error: pg_config executable not found.

    pg_config is required to build psycopg2 from source.  Please add the directory
    containing pg_config to the $PATH or specify the full executable path with the
    option:
```

- You need to install Postgres locally (see [this](https://stackoverflow.com/a/12037133) SO post)
- During `./setup.sh`, this happens after `pip3 install` runs

```
./setup.sh:41: no such file or directory: /Users/jhshi/Documents/csm/csm_web/venv/.project_dir
./setup.sh:44: no such file or directory: /Users/jhshi/Documents/csm/csm_web/venv/bin/activate
./setup.sh:47: no such file or directory: /Users/jhshi/Documents/csm/csm_web/venv/bin/activate
```

- This likely happens because you moved your folder after creating your virtualenv. Removing
  and recreating your virtualenv should fix it.

### How do I access the `/admin` page?

- The `./setup.sh` script will create a user with username `demo_user` and password `pass`. You can access it by signing in through the admin page.
- If you wish to assign admin permissions to an account that uses OAuth (such as your Berkeley email), run the following commands in the Django shell (accessible by running `python3 csm_web/manage.py shell`):

```py
from scheduler.models import *
# replace "my_username" with the prefix of your Berkeley email, as in "my_username@berkeley.edu"
user = User.objects.get(username="my_username")
user.is_staff = True
user.is_superuser = True
user.save()
```

### Miscellaneous

#### OSX: error on running `pip`

Try replacing `pip` with `pip3` instead.

#### OAuth errors when trying to sign in locally

```
Error 401: invalid_client
The OAuth client was not found.
```

OAuth secrets are sourced from the heroku repository: you'll need to log in to heroku, add the
appropriate remote, rerun `setup.sh`, and then reactivate your virtualenv.

### On `runserver`, long stack trace ending with this:

```
django.db.utils.OperationalError: could not connect to server: Connection refused
        Is the server running on host "localhost" (::1) and accepting
        TCP/IP connections on port 5432?
could not connect to server: Connection refused
        Is the server running on host "localhost" (127.0.0.1) and accepting
        TCP/IP connections on port 5432?
```

Your postgres server is likely not running. On a mac (which is the only platform we've done local
testing on), run `brew services start postgres` before invoking `runserver` again.
