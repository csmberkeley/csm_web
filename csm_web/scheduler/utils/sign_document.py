import os

from botocore.signers import CloudFrontSigner
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

from csm_web import settings

key_id = os.getenv("SIGN_KEY_ID")
private_key_file = os.path.join(settings.BASE_DIR, "private_key.pem")


def sign_document(url, start_time, end_time):
    """Generate a signed URL for accessing a document stored in CloudFront."""
    def signer(message: bytes) -> bytes:
        """Sign the message using the private key."""
        with open(private_key_file, "rb") as key_file:
            private_key = serialization.load_pem_private_key(
                key_file.read(), password=None
            )
        return private_key.sign(
            message, padding=padding.PKCS1v15(), algorithm=hashes.SHA1()
        )

    cloudfront_signer = CloudFrontSigner(key_id, signer)

    policy = cloudfront_signer.build_policy(
        url, date_less_than=end_time, date_greater_than=start_time
    )
    print(policy)
    signed_url = cloudfront_signer.generate_presigned_url(url, policy=policy)

    print(signed_url)
    return signed_url
