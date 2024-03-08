#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {Ec2BasicL2Stack} from '../lib/provisioned/ec2-basic-l2-stack';
import {Ec2BasicL1Stack} from "../lib/provisioned/ec2-basic-l1-stack";
import {S3CrossRegionReplicationStack} from "../lib/serverless/s3-cross-region-replication-stack";

const app = new cdk.App();
const props = {env: {account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION}}

new Ec2BasicL2Stack(app, 'Ec2BasicL2Stack', props);
new Ec2BasicL1Stack(app, 'Ec2BasicL1Stack', props);
new S3CrossRegionReplicationStack(app, 'S3CrossRegionReplicationStack', props);

app.synth();


