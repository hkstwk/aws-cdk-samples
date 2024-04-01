import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import {Duration, RemovalPolicy} from 'aws-cdk-lib';
import {BlockPublicAccess, BucketEncryption, ObjectOwnership} from 'aws-cdk-lib/aws-s3';
import {constants} from "../utils/constants";

export class S3InventoryStack extends cdk.Stack {
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
                expiration: Duration.days(constants.EXPIRATION_DAYS),
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
                expiration: Duration.days(constants.EXPIRATION_DAYS),
                id: 'expirationLifeCycleRule',
            }]
        });

        // Create inventory bucket
        const inventoryBucket = new s3.Bucket(this, 'inventoryBucket', {
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            encryption: BucketEncryption.S3_MANAGED,
            versioned: true,
            removalPolicy: RemovalPolicy.DESTROY,
            enforceSSL: true,
            autoDeleteObjects: true,
            objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
            lifecycleRules: [{
                expiration: Duration.days(constants.EXPIRATION_DAYS * 2),
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

        // See official CloudFormation docs for enum values
        // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-s3-bucket-inventoryconfiguration.html
        // Properties->OptionalFields
        const optionalFieldsArray: string[] = [
            'IsMultipartUploaded',
            'BucketKeyStatus',
            'ObjectAccessControlList',
            'ObjectOwner',
            'ChecksumAlgorithm',
            'ETag',
            'Size',
            'StorageClass',
            'LastModifiedDate',
            'ReplicationStatus',
            'EncryptionStatus',
            'ObjectLockRetainUntilDate',
            'ObjectLockMode',
            'ObjectLockLegalHoldStatus',
            'IntelligentTieringAccessTier',
        ];

        sourceBucket.addInventory({
            inventoryId: 'sourceInventory',
            format: s3.InventoryFormat.PARQUET,
            optionalFields: optionalFieldsArray,
            destination: {bucket: inventoryBucket},
            frequency: s3.InventoryFrequency.DAILY,
            includeObjectVersions: s3.InventoryObjectVersion.CURRENT
        })

        targetBucket.addInventory({
            inventoryId: 'targetInventory',
            format: s3.InventoryFormat.PARQUET,
            optionalFields: optionalFieldsArray,
            destination: {bucket: inventoryBucket},
            frequency: s3.InventoryFrequency.DAILY,
            includeObjectVersions: s3.InventoryObjectVersion.CURRENT
        })
    }

}
