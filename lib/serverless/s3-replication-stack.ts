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

        // create source bucket
        const sourceBucket = new s3.CfnBucket(this, 'sourceBucket', {
            versioningConfiguration: {
                status: 'Enabled'
            },
            ownershipControls: {
                rules: [{objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED}]
            },
            bucketEncryption: {
                serverSideEncryptionConfiguration: [{
                    bucketKeyEnabled: false,
                    serverSideEncryptionByDefault: {
                        sseAlgorithm: "AES256"
                    },
                }]
            },
            lifecycleConfiguration: {
                rules: [{
                    status: 'Enabled',
                    expirationInDays: 7
                }]
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
            assumedBy: new iam.ServicePrincipal('s3.amazonaws.com'),
        });

        replicationRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                "s3:GetReplicationConfiguration",
                "s3:ListBucket"
            ],
            resources: [sourceBucket.attrArn]
        }));

        // Attach policy for reading from the source bucket
        replicationRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                "s3:GetObjectVersionForReplication",
                "s3:GetObjectVersionAcl",
                "s3:GetObjectVersionTagging"
            ],
            resources: [
                `${sourceBucket.attrArn}/*`,
            ]
        }));

        // Attach policy for destination bucket
        replicationRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                "s3:ReplicateObject",
                "s3:ReplicateDelete",
                "s3:ReplicateTags"
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
