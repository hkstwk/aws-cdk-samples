import * as cdk from 'aws-cdk-lib';
import {Duration, RemovalPolicy} from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import {NodejsFunction} from 'aws-cdk-lib/aws-lambda-nodejs';
import {Runtime} from 'aws-cdk-lib/aws-lambda';
import {BlockPublicAccess, BucketEncryption, ObjectOwnership} from 'aws-cdk-lib/aws-s3';
import {Construct} from 'constructs';
import * as path from 'path';

export class S3ReplicationImprovedStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Create source bucket
        const sourceBucket = new s3.Bucket(this, 'sourceBucket', {
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

        // Define IAM role for replication
        const replicationRole = new iam.Role(this, 'ReplicationRole', {
            assumedBy: new iam.ServicePrincipal('s3.amazonaws.com'),
        });

        replicationRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                "s3:GetReplicationConfiguration",
                "s3:ListBucket"
            ],
            resources: [sourceBucket.bucketArn]
        }));

        // Attach policy for reading from the source bucket
        replicationRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                "s3:GetObjectVersionForReplication",
                "s3:GetObjectVersionAcl",
                "s3:GetObjectVersionTagging"
            ],
            resources: [
                `${sourceBucket.bucketArn}/*`,
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

        // Create replication rule configuration on source bucket by using escape hatch for L2 construct
        // https://docs.aws.amazon.com/cdk/v2/guide/cfn_layer.html#develop-customize-escape
        const cfnBucket = sourceBucket.node.defaultChild as s3.CfnBucket;
        console.info('Cloud formation resource: ', cfnBucket.replicationConfiguration);
        cfnBucket.replicationConfiguration = {
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
        console.info('Cloud formation resource: ', cfnBucket.replicationConfiguration);

        // Add zipHandler lambda from path other than current directory
        console.log(process.cwd());
        console.log(path.join(process.cwd(),'lib/serverless/lambdas', 'zip-handler.ts'));

        const zipHandler = new NodejsFunction(this, 'zip-handler', {
            runtime: Runtime.NODEJS_20_X,
            entry: path.join(process.cwd(),'lib/serverless/lambdas', 'zip-handler.ts'),
            timeout: Duration.seconds(300),
            memorySize: 1024,
            environment: {
                bucketName: targetBucket.bucketName
            }
        });
        targetBucket.grantReadWrite(zipHandler);

    }
}
