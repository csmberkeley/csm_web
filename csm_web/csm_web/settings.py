"""
Django settings for csm_web project.

Generated by 'django-admin startproject' using Django 2.1.2.

For more information on this file, see
https://docs.djangoproject.com/en/2.1/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/2.1/ref/settings/
"""

from factory import DjangoModelFactory
from rest_framework.serializers import ModelSerializer, Serializer
import os

# Analogous to RAILS_ENV, is one of {prod, dev}. Defaults to dev. This default can be
# dangerous, but is worth it to avoid the hassle for developers setting the local ENV
# var
DEVELOPMENT = "dev"
PRODUCTION = "prod"
DJANGO_ENV = os.environ.get("DJANGO_ENV", DEVELOPMENT)
assert DJANGO_ENV in (DEVELOPMENT, PRODUCTION)

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/2.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get("SECRET_KEY")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = DJANGO_ENV == DEVELOPMENT

ALLOWED_HOSTS = []

ADMINS = [
    ("Jonathan Shi", "jhshi@berkeley.edu"),
    ("Kevin Svetlitski", "kevin_svetlitski@berkeley.edu"),
]

# Application definition

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "scheduler.apps.SchedulerConfig",
    "rest_framework",
    "social_django",
    "frontend",
    "django_filters",
    "django_extensions",
]

SHELL_PLUS_SUBCLASSES_IMPORT = [ModelSerializer, Serializer, DjangoModelFactory]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "csm_web.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "social_django.context_processors.backends",
                "social_django.context_processors.login_redirect",
            ]
        },
    }
]

WSGI_APPLICATION = "csm_web.wsgi.application"


# Database
# https://docs.djangoproject.com/en/2.1/ref/settings/#databases

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": os.path.join(BASE_DIR, "db.sqlite3"),
    }
}

if not DEBUG:
    DATABASES["pg"] = {
        "ENGINE": "django.db.backends.postgresql_psycopg2",
        "NAME": "csm_web",
        "USER": "csm_web",
        "PASSWORD": "",
        "HOST": "localhost",
        "PORT": "",
    }


# Password validation
# https://docs.djangoproject.com/en/2.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

AUTH_USER_MODEL = "scheduler.User"


# Internationalization
# https://docs.djangoproject.com/en/2.1/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "America/Los_Angeles"

USE_I18N = True

USE_L10N = True

USE_TZ = True

# Media files and S3 configuration
# https://docs.djangoproject.com/en/3.0/topics/files/
MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

# if DJANGO_ENV == PRODUCTION:
DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
AWS_STORAGE_BUCKET_NAME = os.environ.get("AWS_STORAGE_BUCKET_NAME")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")
AWS_STORAGE_BUCKET_NAME = os.environ.get("AWS_STORAGE_BUCKET_NAME")
# Defaults to public_read, which seems to prevent us from uploading to the bucket
AWS_DEFAULT_ACL = None

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/2.1/howto/static-files/

STATIC_URL = "/static/"

if DJANGO_ENV == PRODUCTION:
    # Enables compression and caching
    STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
    WHITENOISE_MAX_AGE = 31536000  # one year

AUTHENTICATION_BACKENDS = (
    # Google OAuth2
    "social_core.backends.google.GoogleOAuth2",
    # Django
    "django.contrib.auth.backends.ModelBackend",
)

# Python Social Auth

LOGIN_REDIRECT_URL = "/"

LOGIN_URL = "/login"

SOCIAL_AUTH_GOOGLE_OAUTH2_KEY = os.environ.get("SOCIAL_AUTH_GOOGLE_OAUTH2_KEY")

SOCIAL_AUTH_PIPELINE = (
    "social_core.pipeline.social_auth.social_details",
    "social_core.pipeline.social_auth.social_uid",
    "social_core.pipeline.social_auth.auth_allowed",
    "social_core.pipeline.social_auth.social_user",
    "social_core.pipeline.user.get_username",
    "social_core.pipeline.social_auth.associate_by_email",  # enables ghost profiles
    "social_core.pipeline.user.create_user",
    "social_core.pipeline.social_auth.associate_user",
    "social_core.pipeline.social_auth.load_extra_data",
    "social_core.pipeline.user.user_details",
)

SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET = os.environ.get("SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET")
SOCIAL_AUTH_GOOGLE_OAUTH2_IGNORE_DEFAULT_SCOPE = True
SOCIAL_AUTH_GOOGLE_OAUTH2_SCOPE = [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]

# REST Framework
REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": [
        "djangorestframework_camel_case.render.CamelCaseJSONRenderer"
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        'rest_framework.permissions.IsAuthenticated'
    ]
}

if DJANGO_ENV == DEVELOPMENT:
    REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"].append(
        "rest_framework.renderers.BrowsableAPIRenderer"
    )

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
        },
        'scheduler.views': {
            'handlers': ['console'],
            'level': 'INFO',
            'propogate': True,
        },

    },
}

if DJANGO_ENV == PRODUCTION:
    # Security/HTTPS headers
    # https://docs.djangoproject.com/en/2.1/ref/middleware/#module-django.middleware.security
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    # TODO change to 1 year (31536000s) once we're sure this works
    SECURE_HSTS_SECONDS = 3600
    SECURE_HSTS_PRELOAD = True
    # ideally would be handled by nginx or something, but needed for heroku
    SECURE_SSL_REDIRECT = True

    # Heroku setup
    import django_heroku

    django_heroku.settings(locals())
