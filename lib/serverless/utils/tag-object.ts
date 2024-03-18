import {S3} from "aws-sdk";

const s3: S3 = new S3();

// Function to add/update tag on S3 object
export async function tagObject(bucket: string, key: string, tagKey: string, message: string): Promise<boolean> {
    try {
        // Get the existing tags of the S3 object
        const params: S3.GetObjectTaggingRequest = {
            Bucket: bucket,
            Key: key
        };

        const data = await s3.getObjectTagging(params).promise();

        // Modify the existing tags or add new ones
        const tags = data.TagSet || [];

        // find index of tag, returns -1 if not found
        const tagIndex = tags.findIndex(tag => tag.Key === tagKey);

        // add new tag or update value
        if (tagIndex === -1) {
            tags.push({Key: tagKey, Value: message});
        } else {
            tags[tagIndex].Value = message;
        }

        // Set the updated tags for the S3 object
        const putParams: S3.PutObjectTaggingRequest = {
            Bucket: bucket,
            Key: key,
            Tagging: {
                TagSet: tags
            }
        }

        // Put the updated tags to the S3 object
        await s3.putObjectTagging(putParams).promise();

        console.info(`Tag "${tagKey} : ${message}" was successfully added/updated for S3 object: ${key}`);
        return true;
    } catch (error) {
        console.error(`Error adding/updating tag "${tagKey} : ${message}" for S3 object: ${key}\n${error}`);
        return false;
    }
}
