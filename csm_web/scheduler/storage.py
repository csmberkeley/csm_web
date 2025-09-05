import os

from storages.backends.s3boto3 import S3Boto3Storage

AWS_PROFILE_PICTURE_BUCKET_NAME = os.environ.get("AWS_PROFILE_PICTURE_BUCKET_NAME")


class ProfileImageStorage(S3Boto3Storage):
    bucket_name = AWS_PROFILE_PICTURE_BUCKET_NAME
    file_overwrite = True  # should be true so that we replace one profile for user

    def get_accessed_time(self, name):
        # Implement logic to get the last accessed time
        raise NotImplementedError("This backend does not support this method.")

    def get_created_time(self, name):
        # Implement logic to get the creation time
        raise NotImplementedError("This backend does not support this method.")

    def path(self, name):
        # S3 does not support file paths
        raise NotImplementedError("This backend does not support absolute paths.")
