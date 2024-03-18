import {S3} from 'aws-sdk';
import {tagObject} from "./utils/tag-object";
import {TagKeyEnum, ZipStatusEnum} from "./utils/enums";

import archiver = require('archiver');
import stream = require('stream');

const s3 = new S3();
const batchSize: number = 200;

export const handler = async (event: any, context: any): Promise<void> => {
    const bucketName = process.env.bucketName || 'noname';
    const dateTime = new Date().toISOString().replace(/[-T:]/g, '').split('.')[0]; // Format: YYYYMMDDHHMMSS

    let continuationToken;
    let listObjectsV2Output;
    const allFiles = [];

    // Retrieve all files with the tag 'ZIP-STATUS' = 'UNZIPPED'
    do {
        listObjectsV2Output = await s3.listObjectsV2({ Bucket: bucketName, ContinuationToken: continuationToken }).promise();

        // @ts-ignore
        for (const content of listObjectsV2Output.Contents) {
            // Check if the file has the tag 'ZIP-STATUS' = 'UNZIPPED'
            // @ts-ignore
            const tags = await getObjectTags(bucketName, content.Key);
            const zipStatusTag = tags.find(tag => tag.Key === TagKeyEnum.ZIP_STATUS);
            if (zipStatusTag && zipStatusTag.Value === ZipStatusEnum.UNZIPPED) {
                allFiles.push(content);
            }
        }

        continuationToken = listObjectsV2Output.NextContinuationToken;
    } while (continuationToken);

    let processedFiles = 0;

    while (processedFiles < allFiles.length) {
        const batchFiles = allFiles.slice(processedFiles, processedFiles + batchSize);
        const zipFileName = `output_${dateTime}_batch_${Math.ceil((processedFiles + 1) / batchSize)}.zip`;

        const archive = archiver('zip', {
            zlib: { level: 9 }, // Compression level (0-9)
        });

        let totalSizeProcessed = 0;

        // Create a writable stream for S3
        const archiveStream = new stream.PassThrough();

        // Pipe the archive to the PassThrough stream
        archive.pipe(archiveStream);

        // Add files to the archive
        await addFilesToArchive(bucketName, archive, batchFiles, (size: number) => {
            totalSizeProcessed += size;
        });

        // Finalize the archiver to complete the zip file
        archive.finalize();

        // Upload the zip file to S3
        const s3Params = { Bucket: bucketName, Key: zipFileName, Body: archiveStream };
        await s3.upload(s3Params).promise();

        // Tag processed files as 'zipped'
        await tagFiles(bucketName, batchFiles);

        processedFiles += batchFiles.length;

        console.log(`Processed ${processedFiles} files in total (${totalSizeProcessed} bytes)`);
    }

    // End the Lambda function
    context.succeed('Zip creation and upload successful');
};

async function getObjectTags(bucketName: string, key: string): Promise<any[]> {
    const response = await s3.getObjectTagging({ Bucket: bucketName, Key: key }).promise();
    return response.TagSet;
}

async function addFilesToArchive(bucketName: string, archive: any, files: any[], sizeCallback: (size: number) => void): Promise<void> {
    for (const content of files) {
        // Create a stream for each S3 object
        const s3ObjectStream = s3.getObject({ Bucket: bucketName, Key: content.Key }).createReadStream();

        // Track the size of each file
        let fileSize = 0;
        s3ObjectStream.on('data', (chunk: any) => {
            fileSize += chunk.length;
        });

        // Add the stream to the archiver with the appropriate file name
        archive.append(s3ObjectStream, { name: content.Key });

        // Increase the number of completed files and call the progress callback
        sizeCallback(fileSize);
    }
}

async function tagFiles(bucketName: string, files: S3.Object[]): Promise<void> {
    for (const file of files) {
        if (typeof file.Key === "string") {
            await tagObject(bucketName, file.Key, TagKeyEnum.ZIP_STATUS, ZipStatusEnum.ZIPPED);
        }
    }
}
