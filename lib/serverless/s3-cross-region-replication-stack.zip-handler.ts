import {S3} from 'aws-sdk';
import * as archiver from 'archiver';

const s3 = new S3();

export const handler = async (event: any, context: any): Promise<void> => {
    const bucketName = process.env.bucketName || 'noname';
    const zipFileName = 'output.zip';

    const archive = archiver('zip', {
        zlib: { level: 9 }, // Compression level (0-9)
    });

    // Create a writable stream for archiver
    const s3Stream = s3.upload({ Bucket: bucketName, Key: zipFileName }).on('httpUploadProgress', () => {}).promise();

    // Wait for the upload to complete and obtain the writable stream
    const stream = (await s3Stream).on('httpHeaders', () => {}).createWriteStream();

    // Pipe the archive to the S3 writable stream
    archive.pipe(stream);

    // Add files to the archive
    await listAndAddFilesToArchive(bucketName, archive);

    // Finalize the archiver to complete the zip file
    archive.finalize();

    // End the Lambda function
    context.succeed('Zip creation successful');
};

async function listAndAddFilesToArchive(bucketName: string, archive: archiver.Archiver): Promise<void> {
    const listObjectsV2Output = await s3.listObjectsV2({ Bucket: bucketName }).promise();

    // @ts-ignore
    for (const content of listObjectsV2Output.Contents) {
        // Skip directories or other objects if needed
        if (!content.Key) continue;

        // Create a stream for each S3 object
        const s3ObjectStream = s3.getObject({ Bucket: bucketName, Key: content.Key }).createReadStream();

        // Add the stream to the archiver with the appropriate file name
        archive.append(s3ObjectStream, { name: content.Key });
    }
}
