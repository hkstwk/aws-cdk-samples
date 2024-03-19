import * as cdk from 'aws-cdk-lib';
import {Duration, RemovalPolicy} from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3'; // Import s3 namespace
import {BlockPublicAccess, BucketEncryption, ObjectOwnership} from 'aws-cdk-lib/aws-s3';
import {Construct} from 'constructs';
import {NodejsFunction} from 'aws-cdk-lib/aws-lambda-nodejs';
import {Runtime} from 'aws-cdk-lib/aws-lambda';

export class S3ReplicationStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Apply replication configuration to the source bucket
        const sourceBucket = new s3.CfnBucket(this, 'sourceBucket', {
            accessControl: 'Private',
            versioningConfiguration: {
                status: 'Enabled'
            }
        });

        // Create target bucket
        const targetBucket = new s3.Bucket(this, 'targetBucket', {
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            encryption: BucketEncryption.S3_MANAGED,
            versioned: true,
            removalPolicy: RemovalPolicy.DESTROY,
            enforceSSL: true,
            autoDeleteObjects: true,
            objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
            lifecycleRules: [{
                expiration: Duration.days(1),
                id: 'expirationLifeCycleRule',
            }]
        });

        // Add bucket policy to allow replication
        targetBucket.addToResourcePolicy(new iam.PolicyStatement({
            actions: [
                's3:GetReplicationConfiguration',
                's3:ListBucket',
                's3:GetObjectVersion',
                's3:GetObject',
                's3:ReplicateObject'
            ],
            resources: [
                targetBucket.bucketArn,
                `${targetBucket.bucketArn}/*`
            ],
            principals: [new iam.ServicePrincipal('s3.amazonaws.com')],
            effect: iam.Effect.ALLOW
        }));

        // Create Lambda function
        const zipHandler = new NodejsFunction(this, 'zip-handler', {
            runtime: Runtime.NODEJS_20_X,
            timeout: Duration.seconds(300),
            memorySize: 1024,
            environment: {
                bucketName: targetBucket.bucketName
            }
        });
        targetBucket.grantReadWrite(zipHandler);

        // Define IAM role for replication
        const replicationRole = new iam.Role(this, 'ReplicationRole', {
            assumedBy: new iam.ServicePrincipal('s3.amazonaws.com')
        });

        // Attach policy for reading from the source bucket
        replicationRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                's3:GetObjectVersion',
                's3:GetObject',
                's3:ListBucket'
            ],
            resources: [
                `${targetBucket.bucketArn}/*`,
                targetBucket.bucketArn
            ]
        }));

        // Attach policy for writing to the destination bucket
        replicationRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                's3:PutObject',
                's3:ReplicateObject'
            ],
            resources: [
                `${targetBucket.bucketArn}/*`
            ]
        }));

        // Create replication rule configuration
        sourceBucket.replicationConfiguration = {
            role: replicationRole.roleArn,
            rules: [
                {
                    destination: {
                        bucket: targetBucket.bucketArn
                    },
                    status: "Enabled"
                }
            ]
        };

    }
}
