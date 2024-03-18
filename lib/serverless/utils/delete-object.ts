import {DeleteObjectCommand, DeleteObjectCommandInput, S3Client} from '@aws-sdk/client-s3';

export const deleteObjectHandler = async (bucket: string, key: string): Promise<Boolean> => {
    const s3Client = new S3Client({});

    const deleteParams: DeleteObjectCommandInput = {
        Bucket: bucket,
        Key: key,
    };

    try {
        const data = await s3Client.send(new DeleteObjectCommand(deleteParams));
        console.info(`Object ${key} successfully deleted: ${data}`);
        return true;
    } catch (err) {
        console.error(`Error deleting object ${key}: ${err}`);
        return false;
    }
}