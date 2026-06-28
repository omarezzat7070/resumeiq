import { Storage } from '@google-cloud/storage';
import path from 'path';

const bucketName = process.env.GCS_BUCKET_NAME;
const keyFile = process.env.GCS_KEYFILE || process.env.GOOGLE_APPLICATION_CREDENTIALS;

let storage;
let bucket;
if (bucketName) {
  storage = new Storage({ keyFilename: keyFile });
  bucket = storage.bucket(bucketName);
}

export const uploadFileToGCS = async (localFilePath, destination) => {
  if (!bucket) throw new Error('GCS bucket not configured');
  const dest = destination || path.basename(localFilePath);
  await bucket.upload(localFilePath, { destination: dest });
  const file = bucket.file(dest);

  if (process.env.GCS_MAKE_PUBLIC === 'true') {
    await file.makePublic();
    return `https://storage.googleapis.com/${bucketName}/${dest}`;
  }

  // generate signed URL (valid 7 days)
  const [url] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  return url;
};
