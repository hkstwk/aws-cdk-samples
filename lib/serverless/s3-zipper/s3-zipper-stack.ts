import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import {RemovalPolicy, Duration} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {BlockPublicAccess, Bucket, BucketEncryption, ObjectOwnership} from 'aws-cdk-lib/aws-s3';
import {NodejsFunction} from 'aws-cdk-lib/aws-lambda-nodejs';
import {Runtime} from 'aws-cdk-lib/aws-lambda';

export class S3ZipperStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Create bucket
        const bucket = new Bucket(this, 'sourceBucket', {
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            encryption: BucketEncryption.S3_MANAGED,
            versioned: true,
            removalPolicy: RemovalPolicy.DESTROY,
            enforceSSL: true,
            autoDeleteObjects: true,
            objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
            lifecycleRules: [{
                expiration: Duration.days(7),
                id: 'expirationLifeCycleRule',
            }]
        });

        // Add zipHandler lambda from path other than current directory
        const lambdaPath: string = 'lib/serverless/s3-zipper/lambdas';
        const lambdaHandler: string = 'zip-handler.ts';

        console.log(path.join(process.cwd(),lambdaPath, lambdaHandler));

        const zipHandler = new NodejsFunction(this, 'zip-handler', {
            runtime: Runtime.NODEJS_20_X,
            entry: path.join(process.cwd(),lambdaPath, lambdaHandler),
            timeout: Duration.seconds(60),
            memorySize: 128,
            environment: {
                bucketName: bucket.bucketName
            }
        });
        bucket.grantReadWrite(zipHandler);
    }
}
