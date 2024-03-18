import {CopyObjectCommand, CopyObjectCommandInput, S3Client} from '@aws-sdk/client-s3';
import {tagObject} from "./tag-object";
import {TagKeyEnum, ZipStatusEnum} from "./enums";

export const copyObjectHandler = async (bucket: string, key: string): Promise<Boolean> => {
    const s3Client = new S3Client({});
    const targetBucket = process.env.exportBucketName as string;

    const
        copyParams: CopyObjectCommandInput = {
            Bucket: targetBucket,
            Key: key,
            CopySource: `/${bucket}/${key}`,
        };

    try {
        const data = await s3Client.send(new CopyObjectCommand(copyParams));
        await tagObject(targetBucket, key, TagKeyEnum.ZIP_STATUS, ZipStatusEnum.UNZIPPED);
        console.log('Success copying file', data);
        return true;
    } catch (err) {
        console.error('Error copying file', err);
        return false;
    }
}

