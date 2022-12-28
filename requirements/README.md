# Dependencies

## Overview

We're using [`pip-tools`](https://github.com/jazzband/pip-tools) ([documentation](https://pip-tools.readthedocs.io/en/latest/)) to manage python dependencies for `csm_web`.

The dependencies are split into a couple different files:

- `common`: `common.in`, compiled to `common.txt`

  This houses all of the common dependencies among development and production versions of the application.

- `dev`: `dev.in`, compiled to `dev.txt`

  This houses all of the development-specific dependencies for the application; everything that is required in developing for the application and testing the application should be added to `dev.in` and recompiled.

- `prod`: `prod.in`, compiled to `prod.txt`

  This houses all of the production-speciic dependencies for the application; everything that is required for production deployment should be added to `prod.in` and recompiled.

This separation of requirements allows for more control over what packages are installed in production in Heroku, while giving more freedom to install other packages as dependencies to ease development.

Heroku looks for a `requirements.txt` in the root directory of the repository, which currently has a file directing to the `prod.txt`. No other packages should be added to the `requirements.txt` in the root directory, and instead should be added to one of the above `.in` files.

## Modifying dependencies

If any dependency needs to be changed or added, change the corresponding `.in` file, and recompile using `pip-compile`. Only add the modified top-level dependency; `pip-compile` will figure out the dependency resolution automatically. If any version pinning is required, add that to the `.in` file as well; see the documentation for `pip-tools` for more information.

Do not modify any of the `.txt` files (i.e. `common.txt`, `dev.txt`, `prod.txt`) manually; they'll be automatically generated and overwritten by `pip-compile`

The following are the compilation commands for each file; each should be run in the repository root, not in the `requirements/` folder, for consistency:

- To compile `common`:
  ```sh
  pip-compile --output-file=requirements/common.txt --resolver=backtracking requirements/common.in
  ```
- To compile `dev`:
  ```sh
  pip-compile --output-file=requirements/dev.txt --resolver=backtracking requirements/dev.in
  ```
- To compile `prod`:
  ```sh
  pip-compile --output-file=requirements/prod.txt --resolver=backtracking requirements/prod.in
  ```

## Updating packages

To update packages, use `pip-compile --upgrade-package=<package_name> <in_file>` or `pip-compile --upgrade <in_file>`. See the [documentation](https://pip-tools.readthedocs.io/en/latest/#updating-requirements) for more details.

To make sure that your virtual environment has the same packages as specified in the requirements files, use `pip-sync <requirements_file>` to remove/add/upgrade packages as needed to match the requirements file. See the [documentation](https://pip-tools.readthedocs.io/en/latest/#example-usage-for-pip-sync) for more details.

For example, to sync with the development packages, use `pip-sync requirements/dev.txt`; to sync with production packages, use `pip-sync requirements/prod.txt`. By default, `pip-sync` without any additional arguments uses the `requirements.txt` in the root of the repository, which is the same as using production packages.
