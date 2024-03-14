import { S3 } from 'aws-sdk';
const archiver = require('archiver');
const stream = require('stream');

const s3 = new S3();

export const handler = async (event: any, context: any): Promise<void> => {
    const bucketName = process.env.bucketName || 'noname';
    const zipFileName = 'output.zip';

    const archive = archiver('zip', {
        zlib: { level: 9 }, // Compression level (0-9)
    });

    // Create a writable stream for archiver
    const archiveStream = new stream.PassThrough();

    // Pipe the archive to the PassThrough stream
    archive.pipe(archiveStream);

    // Add files to the archive
    await listAndAddFilesToArchive(bucketName, archive);

    // Finalize the archiver to complete the zip file
    archive.finalize();

    // Upload the zip file to S3
    const s3Params = { Bucket: bucketName, Key: zipFileName, Body: archiveStream };
    await s3.upload(s3Params).promise();

    // End the Lambda function
    context.succeed('Zip creation and upload successful');
};

async function listAndAddFilesToArchive(bucketName: string, archive: any): Promise<void> {
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
